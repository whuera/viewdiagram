import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MobilPymes — Diagramas de Arquitectura',
  description: 'Dashboard de diagramas de arquitectura MobilPymes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
