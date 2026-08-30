/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
