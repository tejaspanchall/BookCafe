/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed the redirects configuration to allow the landing page to be displayed at root path
  async redirects() {
    return [
      // Redirect image file paths to the catalog
      {
        source: '/book/:path*',
        destination: '/catalog',
        permanent: false,
        has: [
          {
            type: 'header',
            key: 'accept',
            value: 'image.*'
          }
        ]
      }
    ];
  },
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/**',
      }
    ],
  }
};

export default nextConfig;