'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Comment, CommentsResponse } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getComments, createComment, deleteComment } from '@/lib/auth';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { MessageSquare } from 'lucide-react';
import styles from './CommentsSection.module.css';

interface CommentsSectionProps {
  animeId: number;
  initialComments?: CommentsResponse | null;
}

export function CommentsSection({ animeId, initialComments }: CommentsSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments?.data || []);
  const [meta, setMeta] = useState(initialComments?.meta || {
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRefreshedRef = useRef(false);

  // Refresh comments when user logs in to get correct is_owner flags
  useEffect(() => {
    if (isAuthenticated && user && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      // Refresh to get is_owner flags
      getComments(animeId, 1, meta.per_page)
        .then((response) => {
          setComments(response.data);
          setMeta(response.meta);
        })
        .catch((err) => {
          console.error('Failed to refresh comments on auth:', err);
        });
    }
  }, [isAuthenticated, user, animeId, meta.per_page]);

  // Load more comments
  const loadMore = useCallback(async () => {
    if (isLoading || meta.page >= meta.total_pages) return;

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = meta.page + 1;
      const response = await getComments(animeId, nextPage, meta.per_page);
      setComments(prev => [...prev, ...response.data]);
      setMeta(response.meta);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Kommentare konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, [animeId, isLoading, meta.page, meta.total_pages, meta.per_page]);

  // Refresh comments (e.g., after posting)
  const refreshComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getComments(animeId, 1, meta.per_page);
      setComments(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error('Failed to refresh comments:', err);
      setError('Kommentare konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, [animeId, meta.per_page]);

  // Submit new comment
  const handleSubmit = useCallback(async (message: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await createComment(animeId, message);
      // Add new comment at the beginning
      setComments(prev => [newComment, ...prev]);
      setMeta(prev => ({ ...prev, total: prev.total + 1 }));
    } catch (err) {
      console.error('Failed to create comment:', err);
      setError('Kommentar konnte nicht gepostet werden');
      throw err; // Re-throw so form can handle it
    } finally {
      setIsSubmitting(false);
    }
  }, [animeId]);

  // Delete comment
  const handleDelete = useCallback(async (commentId: number) => {
    try {
      await deleteComment(animeId, commentId);
      // Remove comment from list
      setComments(prev => prev.filter(c => c.id !== commentId));
      setMeta(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Kommentar konnte nicht geloescht werden');
    }
  }, [animeId]);

  const hasMore = meta.page < meta.total_pages;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <MessageSquare size={24} />
        <h2 className={styles.title}>
          Kommentare
          {meta.total > 0 && (
            <span className={styles.count}>({meta.total})</span>
          )}
        </h2>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={refreshComments} className={styles.retryButton}>
            Erneut versuchen
          </button>
        </div>
      )}

      <CommentForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isAuthenticated={isAuthenticated}
      />

      <CommentList
        comments={comments}
        onDelete={handleDelete}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
      />

      {comments.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <MessageSquare size={48} className={styles.emptyIcon} />
          <p>Noch keine Kommentare vorhanden.</p>
          {isAuthenticated ? (
            <p>Sei der Erste und schreibe einen Kommentar!</p>
          ) : (
            <p>Melde dich an, um einen Kommentar zu schreiben.</p>
          )}
        </div>
      )}
    </section>
  );
}
