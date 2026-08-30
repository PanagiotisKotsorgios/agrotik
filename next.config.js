/** @type {import('next').NextConfig} */
const supabaseInternal =
  process.env.SUPABASE_INTERNAL_URL || "http://127.0.0.1:54321";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${supabaseInternal}/:path*` },
    ];
  },
};

module.exports = nextConfig;
