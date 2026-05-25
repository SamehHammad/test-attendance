const path = require("path");
const fs = require("fs");

function loadEnvFile(appDir) {
  const envPath = path.join(appDir, ".env");
  if (!fs.existsSync(envPath)) return {};

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function normalizeDatabaseUrl(url) {
  let normalized = url.trim();

  normalized = normalized.replace(
    /([?&])channel_binding=require(&?)/gi,
    (_, before, after) => {
      if (before === "?" && after) return "?";
      if (before === "?" && !after) return "";
      return after ? "&" : "";
    }
  );

  normalized = normalized.replace(/\?&/, "?").replace(/\?$/, "");

  if (!/connect_timeout=/i.test(normalized)) {
    normalized += `${normalized.includes("?") ? "&" : "?"}connect_timeout=15`;
  }

  if (!/sslmode=/i.test(normalized) && normalized.startsWith("postgresql")) {
    normalized += `${normalized.includes("?") ? "&" : "?"}sslmode=require`;
  }

  return normalized;
}

function resolveDatabaseUrl(appDir) {
  const fileEnv = loadEnvFile(appDir);
  const url = process.env.DATABASE_URL || fileEnv.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL غير موجود. أضفه في ملف .env داخل مجلد التطبيق."
    );
  }

  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL يشير إلى SQLite. استخدم رابط PostgreSQL (Neon) في ملف .env."
    );
  }

  return normalizeDatabaseUrl(url);
}

function prepareAppEnv(appDir) {
  const fileEnv = loadEnvFile(appDir);
  const databaseUrl = resolveDatabaseUrl(appDir);

  return {
    ...fileEnv,
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORT: process.env.PORT || fileEnv.PORT || "3000",
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      fileEnv.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  };
}

module.exports = {
  loadEnvFile,
  normalizeDatabaseUrl,
  resolveDatabaseUrl,
  prepareAppEnv,
};
