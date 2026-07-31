import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWAInit from "next-pwa";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // @react-pdf/renderer es ESM puro; transpilarlo permite que webpack (incl. next-pwa)
  // lo empaquete sin el error "import-esm-externals".
  transpilePackages: ['@react-pdf/renderer'],
  // Optimizaciones de rendimiento.
  // optimizePackageImports ya hace tree-shaking de lucide-react de forma segura.
  // NOTA: no añadir aquí un modularizeImports para 'lucide-react': combinar ambos
  // rompía el prerender de producción ("Cannot read properties of undefined (reading 'call')").
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs', '@radix-ui/react-select'],
  },
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
