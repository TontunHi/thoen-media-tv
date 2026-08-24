import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'

const sarabun = Sarabun({ 
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Thoen Media TV — ระบบจอประชาสัมพันธ์',
  description: 'ระบบจัดการสื่อประชาสัมพันธ์บนจอทีวีโรงพยาบาล',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>{children}</body>
    </html>
  )
}
