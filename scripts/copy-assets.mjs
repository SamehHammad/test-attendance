// scripts/copy-assets.mjs
// Cross-platform (Windows + Mac + Linux) replacement for the old xcopy-based
// build:copy-assets script. Works with npm, yarn, and pnpm.

import fs from "node:fs";
import path from "node:path";
const root = process.cwd();

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-assets] Skipping missing source: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  console.log(`[copy-assets] Copied ${src} -> ${dest}`);
}

const standaloneDir = path.join(root, ".next", "standalone");

function assertFile(filePath, description) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(
      `[copy-assets] Missing ${description}: ${filePath}. Run \`npm run build\` before packaging Electron.`,
    );
  }
}

// Fail before electron-builder creates an installer if the standalone output is
// incomplete. Next.js loads these files at runtime; a missing manifest otherwise
// only becomes visible after installing and starting the application.
assertFile(path.join(standaloneDir, "server.js"), "standalone server");
assertFile(
  path.join(standaloneDir, ".next", "server", "middleware-manifest.json"),
  "Next.js middleware manifest",
);
assertFile(
  path.join(standaloneDir, ".next", "required-server-files.json"),
  "Next.js required server files manifest",
);

// 1. Static assets Next.js standalone output doesn't include by default
copyDir(
  path.join(root, ".next", "static"),
  path.join(standaloneDir, ".next", "static"),
);

// 2. Public assets
copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));

// 3. Build Icons
copyDir(path.join(root, "build", "icons"), path.join(standaloneDir, "build", "icons"));
copyDir(path.join(root, "build", "icons"), path.join(root, "dist-electron", "icons"));

console.log("[copy-assets] Done.");
