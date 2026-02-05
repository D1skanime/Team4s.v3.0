import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: 'var(--space-8)',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: 'var(--text-3xl)',
        fontWeight: 700,
        marginBottom: 'var(--space-4)',
      }}>
        Willkommen bei <span style={{ color: 'var(--accent-primary)' }}>Team4s</span>
      </h1>
      <p style={{
        fontSize: 'var(--text-lg)',
        color: 'var(--text-secondary)',
        maxWidth: '600px',
        marginBottom: 'var(--space-8)',
      }}>
        Dein Anime Streaming Portal - Über 13.000 Anime mit deutschen Untertiteln
      </p>
      <Link
        href="/anime"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 'var(--space-4) var(--space-8)',
          background: 'var(--accent-primary)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          transition: 'background 0.2s',
        }}
      >
        Anime durchsuchen
      </Link>
    </main>
  );
}
