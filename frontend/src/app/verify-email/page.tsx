'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { verifyEmail, AuthError } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

type VerificationStatus = 'loading' | 'success' | 'error' | 'already_verified';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Kein Verifizierungstoken gefunden');
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(token);
        if (response.verified) {
          setStatus('success');
          // Refresh user data to update email_verified status
          await refreshUser();
        }
      } catch (err) {
        if (err instanceof AuthError) {
          if (err.message.includes('bereits verifiziert') || err.message.includes('already verified')) {
            setStatus('already_verified');
          } else {
            setStatus('error');
            setErrorMessage(err.message);
          }
        } else {
          setStatus('error');
          setErrorMessage('Ein unerwarteter Fehler ist aufgetreten');
        }
      }
    };

    verify();
  }, [token, refreshUser]);

  const handleContinue = () => {
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <Loader2 size={48} className={styles.loadingIcon} />
          </div>
          <h1 className={styles.title}>E-Mail wird verifiziert...</h1>
          <p className={styles.description}>
            Bitte warte einen Moment.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success' || status === 'already_verified') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.successIcon}`}>
            <CheckCircle size={48} />
          </div>
          <h1 className={styles.title}>
            {status === 'success' ? 'E-Mail verifiziert!' : 'Bereits verifiziert'}
          </h1>
          <p className={styles.description}>
            {status === 'success'
              ? 'Deine E-Mail-Adresse wurde erfolgreich bestaetigt. Du kannst jetzt alle Funktionen nutzen.'
              : 'Deine E-Mail-Adresse ist bereits verifiziert. Du kannst alle Funktionen nutzen.'}
          </p>
          <button className={styles.continueButton} onClick={handleContinue}>
            Weiter zur Startseite
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.errorIconWrapper}`}>
          <XCircle size={48} />
        </div>
        <h1 className={styles.title}>Verifizierung fehlgeschlagen</h1>
        <p className={styles.description}>
          {errorMessage || 'Der Verifizierungslink ist ungueltig oder abgelaufen.'}
        </p>

        <div className={styles.info}>
          <p>
            <strong>Moegliche Gruende:</strong>
          </p>
          <ul>
            <li>Der Link ist abgelaufen (nach 24 Stunden)</li>
            <li>Der Link wurde bereits verwendet</li>
            <li>Der Link ist unvollstaendig</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <Link href="/verify-email/pending" className={styles.resendLink}>
            <RefreshCw size={18} />
            Neue E-Mail anfordern
          </Link>
          <Link href="/" className={styles.homeLink}>
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <Loader2 size={48} className={styles.loadingIcon} />
            </div>
            <h1 className={styles.title}>Laden...</h1>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
