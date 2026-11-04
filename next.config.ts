import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  // The embedded demo database loads WASM assets and the SQL migrations at runtime; make sure they ship to serverless.
  outputFileTracingIncludes: { "/**": ["./node_modules/@electric-sql/pglite/dist/**/*", "./drizzle/**/*"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
