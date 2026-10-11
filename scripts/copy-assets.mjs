// scripts/copy-assets.mjs
// Cross-platform (Windows + Mac + Linux) replacement for the old xcopy-based
// build:copy-assets script. Works with npm, yarn, and pnpm.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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

// 4. Resolve Prisma's real location
try {
  const prismaClientPkgJsonPath = require.resolve("@prisma/client/package.json");
  const prismaClientDir = path.dirname(prismaClientPkgJsonPath);
  const nodeModulesDir = path.dirname(path.dirname(prismaClientDir));
  const dotPrismaDir = path.join(nodeModulesDir, ".prisma");

  copyDir(dotPrismaDir, path.join(standaloneDir, "node_modules", ".prisma"));
  copyDir(
    prismaClientDir,
    path.join(standaloneDir, "node_modules", "@prisma", "client"),
  );
} catch (err) {
  console.warn(`[copy-assets] Warning copying Prisma modules: ${err.message}`);
}

// 5. Env file
const envSrc = path.join(root, ".env");
const envDest = path.join(standaloneDir, ".env");
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log(`[copy-assets] Copied ${envSrc} -> ${envDest}`);
} else {
  console.warn(`[copy-assets] No .env file found at ${envSrc}, skipping.`);
}

console.log("[copy-assets] Done.");
