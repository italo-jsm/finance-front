import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/api/accounts",
        destination: "https://finance.italomariano.dev.br/accounts",
      },
    ];
  },
};

export default nextConfig;
