/** @type {import('next').NextConfig} */
const supabaseInternal =
  process.env.SUPABASE_INTERNAL_URL || "http://127.0.0.1:54321";

const nextConfig = {
  reactStrictMode: true,
  // Produce a standalone build for Docker/Coolify (smaller image, no npm at runtime).
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/free-regular-svg-icons",
      "@fortawesome/react-fontawesome",
      "date-fns",
    ],
  },
  // Same-domain routing for Supabase — the browser hits /api/*, Next.js
  // proxies transparently to Kong (or the local Supabase stack in dev).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${supabaseInternal}/:path*` },
    ];
  },
};

module.exports = nextConfig;
