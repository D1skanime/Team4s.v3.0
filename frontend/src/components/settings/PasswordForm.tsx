'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authClient, AuthError } from '@/lib/auth';
import styles from './SettingsForms.module.css';

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Die neuen Passwoerter stimmen nicht ueberein');
      return;
    }

    if (newPassword.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setIsLoading(true);

    try {
      await authClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.status === 401) {
          setError('Das aktuelle Passwort ist falsch');
        } else {
          setError(err.message);
        }
      } else {
        setError('Passwort konnte nicht geaendert werden');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="currentPassword" className={styles.label}>
          <Lock size={16} />
          Aktuelles Passwort
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            aria-label={showCurrentPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="newPassword" className={styles.label}>
          <Lock size={16} />
          Neues Passwort
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showNewPassword ? 'text' : 'password'}
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles.input}
            minLength={8}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowNewPassword(!showNewPassword)}
            aria-label={showNewPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className={styles.hint}>Mindestens 8 Zeichen</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="confirmPassword" className={styles.label}>
          <Lock size={16} />
          Neues Passwort bestaetigen
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          minLength={8}
          required
        />
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {success && (
        <div className={styles.successMessage}>Passwort erfolgreich geaendert!</div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className={styles.spinner} />
            Aendern...
          </>
        ) : (
          'Passwort aendern'
        )}
      </button>
    </form>
  );
}
