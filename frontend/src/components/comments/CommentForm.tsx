'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Send, LogIn } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '@/types';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  onSubmit: (message: string) => Promise<void>;
  isSubmitting: boolean;
  isAuthenticated: boolean;
  placeholder?: string;
}

export function CommentForm({
  onSubmit,
  isSubmitting,
  isAuthenticated,
  placeholder = 'Schreibe einen Kommentar...',
}: CommentFormProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const charCount = message.length;
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;
  const isEmpty = message.trim().length === 0;
  const canSubmit = !isEmpty && !isOverLimit && !isSubmitting;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);

    try {
      await onSubmit(message.trim());
      setMessage(''); // Clear on success
    } catch {
      setError('Kommentar konnte nicht gepostet werden');
    }
  }, [canSubmit, message, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }, [canSubmit, handleSubmit]);

  if (!isAuthenticated) {
    return (
      <div className={styles.loginPrompt}>
        <LogIn size={20} />
        <span>
          <Link href="/login" className={styles.loginLink}>Melde dich an</Link>
          {' '}um einen Kommentar zu schreiben.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputWrapper}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${styles.textarea} ${isOverLimit ? styles.error : ''}`}
          rows={3}
          disabled={isSubmitting}
          maxLength={MAX_COMMENT_LENGTH + 100} // Allow some overage for feedback
        />
        <div className={styles.footer}>
          <div className={styles.charCount}>
            <span className={isOverLimit ? styles.overLimit : ''}>
              {charCount}
            </span>
            <span className={styles.separator}>/</span>
            <span>{MAX_COMMENT_LENGTH}</span>
          </div>
          <div className={styles.hint}>
            Strg+Enter zum Absenden
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <>
            <span className={styles.spinner} />
            Wird gepostet...
          </>
        ) : (
          <>
            <Send size={18} />
            Kommentar posten
          </>
        )}
      </button>
    </form>
  );
}
