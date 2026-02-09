'use client';

import { useState } from 'react';
import { User, Link as LinkIcon, Save, Loader2 } from 'lucide-react';
import { authClient, AuthError } from '@/lib/auth';
import styles from './SettingsForms.module.css';

interface ProfileFormProps {
  displayName?: string;
  avatarUrl?: string;
  onSuccess: (user: { display_name?: string; avatar_url?: string }) => void;
}

export function ProfileForm({ displayName: initialDisplayName, avatarUrl: initialAvatarUrl, onSuccess }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedUser = await authClient.updateProfile({
        display_name: displayName || undefined,
        avatar_url: avatarUrl || undefined,
      });
      setSuccess(true);
      onSuccess({
        display_name: updatedUser.display_name,
        avatar_url: updatedUser.avatar_url,
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Profil konnte nicht aktualisiert werden');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="displayName" className={styles.label}>
          <User size={16} />
          Anzeigename
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Dein Anzeigename"
          className={styles.input}
          maxLength={100}
        />
        <p className={styles.hint}>
          Wird anstelle deines Benutzernamens angezeigt
        </p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="avatarUrl" className={styles.label}>
          <LinkIcon size={16} />
          Avatar-URL
        </label>
        <input
          type="url"
          id="avatarUrl"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className={styles.input}
        />
        <p className={styles.hint}>
          URL zu deinem Profilbild (JPG, PNG, GIF)
        </p>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {success && (
        <div className={styles.successMessage}>Profil erfolgreich aktualisiert!</div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className={styles.spinner} />
            Speichern...
          </>
        ) : (
          <>
            <Save size={18} />
            Speichern
          </>
        )}
      </button>
    </form>
  );
}
