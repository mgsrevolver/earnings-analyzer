/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.parqet.com',
        pathname: '/logos/**',
      },
    ],
  },
}

module.exports = nextConfig
