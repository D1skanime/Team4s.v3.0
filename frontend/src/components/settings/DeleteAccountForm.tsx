'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { authClient, AuthError } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import styles from './SettingsForms.module.css';

export function DeleteAccountForm() {
  const router = useRouter();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleShowConfirmation = () => {
    setShowConfirmation(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPassword('');
    setConfirmText('');
    setError(null);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (confirmText !== 'LOESCHEN') {
      setError('Bitte gib "LOESCHEN" ein, um zu bestaetigen');
      return;
    }

    setIsLoading(true);

    try {
      await authClient.deleteAccount(password);
      await logout();
      router.push('/');
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.status === 401) {
          setError('Das Passwort ist falsch');
        } else {
          setError(err.message);
        }
      } else {
        setError('Account konnte nicht geloescht werden');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!showConfirmation) {
    return (
      <div className={styles.dangerZone}>
        <div className={styles.dangerHeader}>
          <AlertTriangle size={24} />
          <div>
            <h3>Account loeschen</h3>
            <p>Das Loeschen deines Accounts ist dauerhaft und kann nicht rueckgaengig gemacht werden.</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={handleShowConfirmation}
        >
          <Trash2 size={18} />
          Account loeschen
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dangerZone}>
      <div className={styles.dangerWarning}>
        <AlertTriangle size={32} />
        <h3>Bist du sicher?</h3>
        <p>
          Diese Aktion kann nicht rueckgaengig gemacht werden.
          Alle deine Daten, einschliesslich Watchlist, Bewertungen und Kommentare werden dauerhaft geloescht.
        </p>
      </div>

      <form onSubmit={handleDelete} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="deletePassword" className={styles.label}>
            Passwort zur Bestaetigung
          </label>
          <input
            type="password"
            id="deletePassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmDelete" className={styles.label}>
            Gib &quot;LOESCHEN&quot; ein, um zu bestaetigen
          </label>
          <input
            type="text"
            id="confirmDelete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={styles.input}
            placeholder="LOESCHEN"
            required
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={isLoading}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className={styles.dangerSubmitButton}
            disabled={isLoading || confirmText !== 'LOESCHEN'}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Loeschen...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Endgueltig loeschen
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
