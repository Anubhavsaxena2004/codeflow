import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fredoka } from 'next/font/google'
import { MotionProvider } from '@/components/ui/motion-provider'
import { SoundProvider } from '@/components/ui/sound'
import { themeScript } from '@/lib/theme'
import './globals.css'

const fredoka = Fredoka({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-game',
})

export const metadata: Metadata = {
  title: 'CodeFlow — Backend Logic Practice',
  description: 'Rebuild backend logic block by block and understand what each piece does and why it comes in that order.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The theme script sets the light/dark class before React hydrates, so the class differs from the server's HTML.
    <html lang="en" suppressHydrationWarning className={fredoka.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <MotionProvider>
          <SoundProvider>
            {children}
          </SoundProvider>
        </MotionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
