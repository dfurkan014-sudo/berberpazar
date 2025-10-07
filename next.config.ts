// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ...
  eslint: {
    // ESLint uyarıları build'i DURSUN istemiyorsak:
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
