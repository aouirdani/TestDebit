import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://cloudflare-speedtest.vercel.app'),
  title: {
    default: 'Cloudflare Speed Test | Instant Internet Diagnostics',
    template: '%s | Cloudflare Speed Test'
  },
  description:
    'Run a Cloudflare-powered internet speed test to measure download, upload, ping, and jitter with real-time insights optimized for Vercel deployment.',
  keywords: [
    'cloudflare',
    'internet speed test',
    'download speed',
    'ping',
    'jitter',
    'vercel'
  ],
  authors: [{ name: 'Cloudflare Speed Test' }],
  openGraph: {
    title: 'Cloudflare Internet Speed Test',
    description:
      'Measure download, upload, ping, and jitter using Cloudflare\'s global CDN. Optimized for Vercel.',
    url: 'https://cloudflare-speedtest.vercel.app',
    siteName: 'Cloudflare Speed Test',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cloudflare Internet Speed Test',
    description:
      'Accurately gauge your connection with Cloudflare download, upload, ping, and jitter metrics.'
  }
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#020617' }, { media: '(prefers-color-scheme: light)', color: '#e2e8f0' }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} transition-colors duration-500`}>{children}</body>
    </html>
  );
}
