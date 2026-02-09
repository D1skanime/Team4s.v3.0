import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { GlobalBanner } from '@/components/layout/GlobalBanner';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Team4s - Anime Portal',
  description: 'Dein Anime Streaming Portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <GlobalBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
