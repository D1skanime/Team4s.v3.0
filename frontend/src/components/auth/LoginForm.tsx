'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AuthForm.module.css';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(formData);
      router.push('/');
    } catch {
      // Error is handled by context
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Anmelden</h1>
          <p className={styles.subtitle}>
            Melde dich an um fortzufahren
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="login">
              Benutzername oder E-Mail
            </label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                id="login"
                type="text"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Benutzername oder E-Mail"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Passwort
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="password"
                type="password"
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="Dein Passwort"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className={styles.footer}>
          Noch kein Konto?{' '}
          <Link href="/register" className={styles.footerLink}>
            Registrieren
          </Link>
        </div>
      </div>
    </div>
  );
}
