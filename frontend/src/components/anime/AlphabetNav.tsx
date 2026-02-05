import Link from 'next/link';
import { ALPHABET } from '@/lib/utils';
import styles from './AlphabetNav.module.css';

interface AlphabetNavProps {
  currentLetter: string;
  basePath?: string;
}

export function AlphabetNav({ currentLetter, basePath = '/anime' }: AlphabetNavProps) {
  return (
    <nav className={styles.nav}>
      <Link
        href={basePath}
        className={`${styles.letter} ${currentLetter === '' ? styles.active : ''}`}
      >
        Alle
      </Link>
      {ALPHABET.map((letter) => (
        <Link
          key={letter}
          href={`${basePath}?letter=${letter}`}
          className={`${styles.letter} ${currentLetter === letter ? styles.active : ''}`}
        >
          {letter === '0' ? '0-9' : letter}
        </Link>
      ))}
    </nav>
  );
}
