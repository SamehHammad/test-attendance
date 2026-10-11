/** Normalize Neon/PostgreSQL URL for Node.js and Electron (drops channel_binding). */
export function normalizeDatabaseUrl(url: string): string {
  let normalized = url.trim();

  normalized = normalized.replace(/([?&])channel_binding=require(&?)/gi, (_, before, after) => {
    if (before === "?" && after) return "?";
    if (before === "?" && !after) return "";
    return after ? "&" : "";
  });

  normalized = normalized.replace(/\?&/, "?").replace(/\?$/, "");

  if (!/connect_timeout=/i.test(normalized)) {
    normalized += `${normalized.includes("?") ? "&" : "?"}connect_timeout=15`;
  }

  if (!/pool_timeout=/i.test(normalized)) {
    normalized += `${normalized.includes("?") ? "&" : "?"}pool_timeout=30`;
  }

  if (!/sslmode=/i.test(normalized) && normalized.startsWith("postgresql")) {
    normalized += `${normalized.includes("?") ? "&" : "?"}sslmode=require`;
  }

  return normalized;
}

export function applyDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const normalized = normalizeDatabaseUrl(raw);
  process.env.DATABASE_URL = normalized;
  return normalized;
}
