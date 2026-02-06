import Link from 'next/link';
import { ALPHABET } from '@/lib/utils';
import styles from './AlphabetNav.module.css';

interface AlphabetNavProps {
  currentLetter: string;
  basePath?: string;
  preserveParams?: Record<string, string>;
}

function buildUrl(basePath: string, letter: string, preserveParams?: Record<string, string>): string {
  const params = new URLSearchParams();

  // Add preserved params first
  if (preserveParams) {
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value && key !== 'letter' && key !== 'page') {
        params.set(key, value);
      }
    });
  }

  // Add letter if specified
  if (letter) {
    params.set('letter', letter);
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function AlphabetNav({
  currentLetter,
  basePath = '/anime',
  preserveParams,
}: AlphabetNavProps) {
  return (
    <nav className={styles.nav}>
      <Link
        href={buildUrl(basePath, '', preserveParams)}
        className={`${styles.letter} ${currentLetter === '' ? styles.active : ''}`}
      >
        Alle
      </Link>
      {ALPHABET.map((letter) => (
        <Link
          key={letter}
          href={buildUrl(basePath, letter, preserveParams)}
          className={`${styles.letter} ${currentLetter === letter ? styles.active : ''}`}
        >
          {letter === '0' ? '0-9' : letter}
        </Link>
      ))}
    </nav>
  );
}
