import Link from 'next/link'

import styles from './LetterFilter.module.css'

interface LetterFilterProps {
  currentLetter: string
  perPage: number
  contentType?: string
  status?: string
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function buildHref(letter: string, params: { perPage: number; contentType?: string; status?: string }): string {
  const query = new URLSearchParams()
  if (letter !== '') query.set('letter', letter)
  if (params.perPage !== 24) query.set('per_page', String(params.perPage))
  if (params.contentType) query.set('content_type', params.contentType)
  if (params.status) query.set('status', params.status)

  const queryString = query.toString()
  return queryString ? `/anime?${queryString}` : '/anime'
}

export function LetterFilter({ currentLetter, perPage, contentType, status }: LetterFilterProps) {
  const normalized = currentLetter.toUpperCase()

  return (
    <nav className={styles.nav} aria-label="Anime nach Anfangsbuchstaben filtern">
      {letters.map((letter) => (
        <Link
          key={letter}
          href={buildHref(letter, { perPage, contentType, status })}
          className={`${styles.link} ${normalized === letter ? styles.active : ''}`}
        >
          {letter}
        </Link>
      ))}
      <Link
        href={buildHref('0', { perPage, contentType, status })}
        className={`${styles.link} ${normalized === '0' ? styles.active : ''}`}
      >
        0-9
      </Link>
      <Link
        href={buildHref('', { perPage, contentType, status })}
        className={`${styles.link} ${normalized === '' ? styles.active : ''}`}
      >
        Alle
      </Link>
    </nav>
  )
}
