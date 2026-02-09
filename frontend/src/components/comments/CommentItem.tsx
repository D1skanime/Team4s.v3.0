'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Comment } from '@/types';
import { formatRelativeTime, formatDate, getAvatarUrl } from '@/lib/utils';
import { Trash2, Clock } from 'lucide-react';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: number) => Promise<void>;
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const displayName = comment.author.display_name || comment.author.username;
  const avatarUrl = getAvatarUrl(comment.author.avatar_url, comment.author.username);
  const relativeTime = formatRelativeTime(comment.created_at);
  const absoluteTime = formatDate(comment.created_at);
  const isEdited = comment.updated_at !== comment.created_at;

  const handleDeleteClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch {
      // Error handled by parent
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }, [comment.id, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <article className={styles.comment}>
      <div className={styles.avatar}>
        <Image
          src={avatarUrl}
          alt={displayName}
          width={40}
          height={40}
          className={styles.avatarImage}
          unoptimized
        />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <Link
            href={`/user/${comment.author.username}`}
            className={styles.author}
          >
            {displayName}
          </Link>
          <span className={styles.meta}>
            <Clock size={12} />
            <time
              dateTime={comment.created_at}
              title={absoluteTime}
              className={styles.time}
            >
              {relativeTime}
            </time>
            {isEdited && (
              <span className={styles.edited}>(bearbeitet)</span>
            )}
          </span>
        </header>

        <div className={styles.message}>
          {comment.message.split('\n').map((line, index) => (
            <p key={index}>{line || '\u00A0'}</p>
          ))}
        </div>

        {comment.is_owner && (
          <div className={styles.actions}>
            {showConfirm ? (
              <div className={styles.confirmDelete}>
                <span>Wirklich loeschen?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={styles.confirmButton}
                >
                  {isDeleting ? 'Loescht...' : 'Ja'}
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className={styles.cancelButton}
                >
                  Nein
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                className={styles.deleteButton}
                title="Kommentar loeschen"
              >
                <Trash2 size={14} />
                <span>Loeschen</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
