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
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
};

export default nextConfig;
