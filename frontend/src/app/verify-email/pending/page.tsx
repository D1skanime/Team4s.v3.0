'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendVerificationEmail, AuthError } from '@/lib/auth';
import styles from './page.module.css';

export default function VerificationPendingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);

  // Countdown timer for retry
  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect if already verified
  useEffect(() => {
    if (user?.email_verified) {
      router.push('/');
    }
  }, [user, router]);

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await sendVerificationEmail();
      setMessage('Verifizierungs-E-Mail wurde gesendet!');
      setRemaining(response.remaining);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.status === 429) {
          setError('Zu viele Anfragen. Bitte warte etwas.');
          setRetryAfter(60); // Default to 60 seconds
        } else if (err.status === 400) {
          // Already verified
          setMessage('E-Mail ist bereits verifiziert!');
          setTimeout(() => router.push('/'), 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError('Fehler beim Senden der E-Mail');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Mail size={48} className={styles.mailIcon} />
        </div>

        <h1 className={styles.title}>Bestaetigen deine E-Mail</h1>

        <p className={styles.description}>
          Wir haben eine Verifizierungs-E-Mail an deine E-Mail-Adresse gesendet.
          Bitte klicke auf den Link in der E-Mail um dein Konto zu aktivieren.
        </p>

        <div className={styles.info}>
          <p>
            <strong>Hinweis:</strong> Der Link ist 24 Stunden gueltig.
            Falls du keine E-Mail erhalten hast, pruefe bitte deinen Spam-Ordner.
          </p>
        </div>

        {message && (
          <div className={styles.success}>
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <button
          className={styles.resendButton}
          onClick={handleResend}
          disabled={isLoading || retryAfter > 0}
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className={styles.spinning} />
              Senden...
            </>
          ) : retryAfter > 0 ? (
            <>Erneut senden ({retryAfter}s)</>
          ) : (
            <>
              <Mail size={18} />
              E-Mail erneut senden
            </>
          )}
        </button>

        {remaining !== null && remaining >= 0 && (
          <p className={styles.remaining}>
            Noch {remaining} Versuche uebrig (pro Stunde)
          </p>
        )}

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
