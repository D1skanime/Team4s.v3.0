'use client';

import type { Comment } from '@/types';
import { CommentItem } from './CommentItem';
import { ChevronDown, Loader2 } from 'lucide-react';
import styles from './CommentList.module.css';

interface CommentListProps {
  comments: Comment[];
  onDelete: (commentId: number) => Promise<void>;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function CommentList({
  comments,
  onDelete,
  onLoadMore,
  hasMore,
  isLoading,
}: CommentListProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {comments.map((comment) => (
          <li key={comment.id}>
            <CommentItem
              comment={comment}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className={styles.loadMoreButton}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              Lade mehr...
            </>
          ) : (
            <>
              <ChevronDown size={18} />
              Mehr Kommentare laden
            </>
          )}
        </button>
      )}
    </div>
  );
}
