import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:9191"}/api/v1/:path*`,
      },
    ]
  },
  allowedDevOrigins: ["10.10.3.141", "localhost", "127.0.0.1"],
}

export default nextConfig
