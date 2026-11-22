/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Optimasi server-to-server timeouts
  serverRuntimeConfig: {},
  publicRuntimeConfig: {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "BAYAN VISITOR",
  },
};

module.exports = nextConfig;
