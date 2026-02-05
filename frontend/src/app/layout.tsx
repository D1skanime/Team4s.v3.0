import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
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
        <header style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--bg-hover)',
          padding: 'var(--space-4) 0',
        }}>
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Link href="/" style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--accent-primary)',
            }}>
              Team4s
            </Link>
            <nav style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Link href="/anime" style={{ color: 'var(--text-secondary)' }}>
                Anime
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
