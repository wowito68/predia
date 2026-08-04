import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Predia – Plataforma Clínica Integral',
  description: 'Sistema integral de gestión de historiales clínicos con módulos de inteligencia artificial para apoyo en la decisión médica',
  generator: 'Next.js',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercelDeployment = process.env.VERCEL === '1'

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {children}
        </Providers>
        {isVercelDeployment ? <Analytics /> : null}
      </body>
    </html>
  )
}
