'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AuthForm.module.css';

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    display_name: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwoerter stimmen nicht ueberein');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (formData.username.length < 3) {
      setValidationError('Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        display_name: formData.display_name || undefined,
      });
      router.push('/');
    } catch {
      // Error is handled by context
    }
  };

  const displayError = validationError || error;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Registrieren</h1>
          <p className={styles.subtitle}>
            Erstelle ein neues Konto
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {displayError && (
            <div className={styles.error}>
              {displayError}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="username">
              Benutzername *
            </label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                id="username"
                type="text"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Dein Benutzername"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              E-Mail *
            </label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="deine@email.de"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="display_name">
              Anzeigename (optional)
            </label>
            <div className={styles.inputWrapper}>
              <UserCircle size={18} className={styles.inputIcon} />
              <input
                id="display_name"
                type="text"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Wie moechtest du genannt werden?"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                maxLength={100}
                autoComplete="name"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Passwort *
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="password"
                type="password"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Mindestens 8 Zeichen"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="confirmPassword">
              Passwort bestaetigen *
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="confirmPassword"
                type="password"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Passwort wiederholen"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Registrieren...' : 'Registrieren'}
          </button>
        </form>

        <div className={styles.footer}>
          Bereits ein Konto?{' '}
          <Link href="/login" className={styles.footerLink}>
            Anmelden
          </Link>
        </div>
      </div>
    </div>
  );
}
