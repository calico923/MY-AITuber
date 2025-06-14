import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastManager } from '@/components/ToastNotification'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ASD-AITuber',
  description: 'Educational AITuber platform demonstrating ASD/NT communication patterns',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ToastManager>
          {children}
        </ToastManager>
      </body>
    </html>
  )
}