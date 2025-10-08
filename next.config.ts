// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Next/Image ile harici görselleri gösterebilmek için whitelist
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.boringavatars.com',
        pathname: '/**',
      },
    ],
    // domains: ['res.cloudinary.com', 'source.boringavatars.com'], // (eski Next sürümleri için alternatif)
  },

  // ESLint uyarıları build'i durdurmasın
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
// export default withContentlayer(nextConfig); // eğer contentlayer kullanıyorsanız