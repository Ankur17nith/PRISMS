import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: "http://127.0.0.1:4000/auth/:path*",
      },
      {
        source: "/api/auth/:path*",
        destination: "http://127.0.0.1:4000/auth/:path*",
      },
      {
        source: "/theses/:path*",
        destination: "http://127.0.0.1:4000/theses/:path*",
      },
      {
        source: "/api/theses/:path*",
        destination: "http://127.0.0.1:4000/theses/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/:path*",
      },
    ];
  },
};

export default nextConfig;
