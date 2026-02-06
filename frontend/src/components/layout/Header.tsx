'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContent}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            Team4s
          </Link>
          <nav className={styles.nav}>
            <Link href="/anime" className={styles.navLink}>
              Anime
            </Link>
            <Link href="/watchlist" className={styles.navLink}>
              <Bookmark size={16} />
              <span>Watchlist</span>
            </Link>
          </nav>
        </div>
        <div className={styles.right}>
          <SearchBar placeholder="Suchen..." />
        </div>
      </div>
    </header>
  );
}
