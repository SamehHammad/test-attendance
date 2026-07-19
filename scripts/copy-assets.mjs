// scripts/copy-assets.mjs
// Cross-platform (Windows + Mac + Linux) replacement for the old xcopy-based
// build:copy-assets script. Works with npm, yarn, and pnpm (including pnpm's
// symlinked virtual store), because it resolves real paths via Node's own
// module resolver instead of assuming a fixed folder layout.

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
  // dereference: true -> follow symlinks (needed for pnpm) instead of copying
  // the symlink pointer itself, which would break once moved to another machine.
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

// 3. Resolve Prisma's real location (handles pnpm's virtual store transparently)
const prismaClientPkgJsonPath = require.resolve("@prisma/client/package.json");
const prismaClientDir = path.dirname(prismaClientPkgJsonPath); // .../node_modules/@prisma/client
const nodeModulesDir = path.dirname(path.dirname(prismaClientDir)); // .../node_modules
const dotPrismaDir = path.join(nodeModulesDir, ".prisma");

copyDir(dotPrismaDir, path.join(standaloneDir, "node_modules", ".prisma"));
copyDir(
  prismaClientDir,
  path.join(standaloneDir, "node_modules", "@prisma", "client"),
);

// 4. Env file
const envSrc = path.join(root, ".env");
const envDest = path.join(standaloneDir, ".env");
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log(`[copy-assets] Copied ${envSrc} -> ${envDest}`);
} else {
  console.warn(`[copy-assets] No .env file found at ${envSrc}, skipping.`);
}

console.log("[copy-assets] Done.");
