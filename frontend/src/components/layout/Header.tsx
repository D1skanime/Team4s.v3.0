'use client';

import Link from 'next/link';
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
          </nav>
        </div>
        <div className={styles.right}>
          <SearchBar placeholder="Suchen..." />
        </div>
      </div>
    </header>
  );
}
