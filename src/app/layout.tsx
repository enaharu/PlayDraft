import type { Metadata, Viewport } from 'next'
import { APP_NAME, APP_NAME_JA, CATCH_COPY } from '@/lib/constants'
import './globals.css'

export const metadata: Metadata = {
  title: `${APP_NAME}（${APP_NAME_JA}）`,
  description: CATCH_COPY,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffd33f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
