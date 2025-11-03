/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds, not dev server
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  },
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
