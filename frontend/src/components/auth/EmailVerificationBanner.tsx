'use client';

import { useState } from 'react';
import { AlertTriangle, Mail, X, RefreshCw } from 'lucide-react';
import { sendVerificationEmail, AuthError } from '@/lib/auth';
import styles from './EmailVerificationBanner.module.css';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function EmailVerificationBanner({
  onDismiss,
  dismissible = true,
}: EmailVerificationBannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setRetryAfter(null);

    try {
      const response = await sendVerificationEmail();
      setMessage(`E-Mail gesendet! Noch ${response.remaining} Versuche uebrig.`);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.status === 429) {
          // Rate limited - try to parse retry_after
          setError('Zu viele Anfragen. Bitte warte etwas.');
          // The API response might contain retry_after
          setRetryAfter(60); // Default 60 seconds
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

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <AlertTriangle size={20} className={styles.icon} />
        <div className={styles.text}>
          <strong>E-Mail nicht verifiziert</strong>
          <span className={styles.description}>
            Bitte bestaetigen deine E-Mail-Adresse um alle Funktionen nutzen zu koennen.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        {message && <span className={styles.success}>{message}</span>}
        {error && <span className={styles.error}>{error}</span>}

        <button
          className={styles.resendButton}
          onClick={handleResend}
          disabled={isLoading || retryAfter !== null}
        >
          {isLoading ? (
            <RefreshCw size={16} className={styles.spinning} />
          ) : (
            <Mail size={16} />
          )}
          {isLoading ? 'Senden...' : 'Erneut senden'}
        </button>

        {dismissible && onDismiss && (
          <button
            className={styles.dismissButton}
            onClick={onDismiss}
            aria-label="Schliessen"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
