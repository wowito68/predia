/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Optimizaciones de rendimiento
  experimental: {
    // Optimizar imports de paquetes grandes
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs', '@radix-ui/react-select'],
  },
  // Reducir tiempo de compilación
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
}

export default nextConfig