/** @type {import('next').NextConfig} */

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const apiUrl = rawApiUrl.replace(/\/api\/?$/, '');
const apiUrlObj = new URL(apiUrl);

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: apiUrlObj.protocol.replace(':', ''),
        hostname: apiUrlObj.hostname,
        port: apiUrlObj.port || (apiUrlObj.protocol === 'https:' ? '' : ''),
        pathname: '/media/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
