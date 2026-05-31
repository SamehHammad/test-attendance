use std::sync::Mutex;
use std::process::{Child, Command};
use std::net::TcpStream;
use tauri::{Manager, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct NextJsProcess(pub Mutex<Option<Child>>);

fn read_env_file(app_dir: &std::path::Path) -> std::collections::HashMap<String, String> {
    let env_path = app_dir.join(".env");
    let mut map = std::collections::HashMap::new();
    if let Ok(content) = std::fs::read_to_string(&env_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some(eq) = trimmed.find('=') {
                let key = trimmed[..eq].trim().to_string();
                let mut value = trimmed[eq + 1..].trim().to_string();
                if (value.starts_with('"') && value.ends_with('"'))
                    || (value.starts_with('\'') && value.ends_with('\''))
                {
                    value = value[1..value.len() - 1].to_string();
                }
                map.insert(key, value);
            }
        }
    }
    map
}

fn wait_for_port(port: u16, max_secs: u64) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(max_secs);
    loop {
        if std::time::Instant::now() > deadline {
            return false;
        }
        if TcpStream::connect(&addr).is_ok() {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(800));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NextJsProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();

            let resource_dir = app_handle
                .path()
                .resource_dir()
                .expect("Failed to get resource dir");

            log::info!("=== TAURI STARTUP ===");
            log::info!("resource_dir: {:?}", resource_dir);

            // Try loading .env from resource_dir first, then from standalone/
            let env_vars = {
                let mut vars = read_env_file(&resource_dir);
                if vars.get("DATABASE_URL").map(|s| s.is_empty()).unwrap_or(true) {
                    let standalone_env = read_env_file(&resource_dir.join("standalone"));
                    vars.extend(standalone_env);
                }
                vars
            };

            let database_url = env_vars
                .get("DATABASE_URL")
                .cloned()
                .or_else(|| std::env::var("DATABASE_URL").ok())
                .expect("DATABASE_URL is required in .env");

            log::info!("DATABASE_URL found: {}", !database_url.is_empty());
            log::info!("DATABASE_URL starts with: {}", &database_url[..database_url.len().min(30)]);

            let node_bin = resource_dir.join("binaries").join("node.exe");
            let next_server = resource_dir.join("standalone").join("server.js");
            let standalone_dir = resource_dir.join("standalone");

            // Path to the Prisma native query engine binary
            let prisma_engine = standalone_dir
                .join("node_modules")
                .join(".prisma")
                .join("client")
                .join("query_engine-windows.dll.node");

            // Path to the Prisma schema
            let prisma_schema = standalone_dir
                .join("node_modules")
                .join(".prisma")
                .join("client")
                .join("schema.prisma");

            log::info!("node.exe exists: {}", node_bin.exists());
            log::info!("server.js exists: {}", next_server.exists());
            log::info!("prisma engine exists: {}", prisma_engine.exists());
            log::info!("prisma schema exists: {}", prisma_schema.exists());

            let mut cmd = Command::new(&node_bin);
            cmd.arg(&next_server)
                .env("NODE_ENV", "production")
                .env("PORT", "3000")
                .env("HOSTNAME", "127.0.0.1")
                .env("DATABASE_URL", &database_url)
                .env("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
                // Point Prisma to the bundled native query engine (.dll.node file)
                .env("PRISMA_QUERY_ENGINE_LIBRARY", &prisma_engine)
                // Also set engine binary type
                .env("PRISMA_CLIENT_ENGINE_TYPE", "library")
                // Disable Prisma version check (speeds up startup)
                .env("PRISMA_HIDE_UPDATE_MESSAGE", "1")
                // Schema location for Prisma
                .env("PRISMA_SCHEMA_PATH", &prisma_schema)
                // Disable checksum checks (binary is already bundled correctly)
                .env("PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING", "1")
                // Set NODE_PATH so require() can find node_modules
                .env(
                    "NODE_PATH",
                    standalone_dir.join("node_modules").to_string_lossy().to_string(),
                )
                .current_dir(&standalone_dir);

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            let child = cmd.spawn().expect("Failed to spawn Next.js server");
            log::info!("Next.js server spawned with PID: {}", child.id());

            {
                let state: State<NextJsProcess> = app_handle.state();
                let mut lock = state.0.lock().unwrap();
                *lock = Some(child);
            }

            let app_handle2 = app_handle.clone();
            std::thread::spawn(move || {
                log::info!("Waiting for Next.js on port 3000...");
                if wait_for_port(3000, 120) {
                    log::info!("Next.js ready – navigating webview");
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    if let Some(window) = app_handle2.get_webview_window("main") {
                        let _ = window.eval("window.location.replace('http://localhost:3000')");
                    }
                } else {
                    log::error!("Next.js did not start in 120s");
                    if let Some(window) = app_handle2.get_webview_window("main") {
                        let _ = window.eval(
                            "document.getElementById('status').textContent='فشل تشغيل الخادم. تحقق من الاتصال بالإنترنت.'",
                        );
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state: State<NextJsProcess> = window.state();
                let mut lock = state.0.lock().unwrap();
                if let Some(mut child) = lock.take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
