import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Use Webpack externals to keep Prisma native bindings loadable at runtime
  // when app is installed as an exe (Turbopack bundles differently)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep Prisma as external so the standalone server loads it from
      // node_modules at runtime with the correct native .dll.node binary
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [
        ...existingExternals,
        ({ request }: { request: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request === "@prisma/client" || request.startsWith(".prisma/")) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
