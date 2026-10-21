/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets CI/build verification run without clobbering an active `.next` dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
