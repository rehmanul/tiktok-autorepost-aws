/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  eslint: {
    dirs: ['app', 'components', 'lib']
  }
};

export default nextConfig;
