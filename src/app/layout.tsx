import type { Metadata } from 'next';
import { PRODUCT_NAME } from '@/types';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} - Competitive Intelligence Agent`,
  description: 'Turn competitor activity into strategic action. Analyze historical competitor activity, connect signals with what happened before, and turn persistent intelligence into evidence-backed strategic decisions.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;450;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
