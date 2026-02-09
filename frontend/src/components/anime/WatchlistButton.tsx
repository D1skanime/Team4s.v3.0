'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  CheckCircle,
  PauseCircle,
  Calendar,
  XCircle,
  Trash2,
  ChevronDown,
  Plus,
  Loader2,
} from 'lucide-react';
import type { WatchlistStatus } from '@/types';
import { WATCHLIST_STATUS_LABELS, WATCHLIST_STATUS_COLORS } from '@/types';
import {
  getWatchlistStatus,
  addToWatchlist,
  removeFromWatchlist,
  getLocalWatchlistStatus,
} from '@/lib/watchlist';
import { useAuth } from '@/contexts/AuthContext';
import styles from './WatchlistButton.module.css';

interface WatchlistButtonProps {
  animeId: number;
  className?: string;
}

const STATUS_ICONS: Record<WatchlistStatus, typeof Eye> = {
  watching: Eye,
  done: CheckCircle,
  break: PauseCircle,
  planned: Calendar,
  dropped: XCircle,
};

const STATUS_ORDER: WatchlistStatus[] = ['watching', 'done', 'break', 'planned', 'dropped'];

export function WatchlistButton({ animeId, className }: WatchlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load status on mount and when auth changes
  useEffect(() => {
    async function loadStatus() {
      // For initial render, use localStorage for instant feedback
      if (!isInitialized) {
        const localStatus = getLocalWatchlistStatus(animeId);
        setCurrentStatus(localStatus);
        setIsInitialized(true);
      }

      // If authenticated, fetch from backend
      if (isAuthenticated) {
        try {
          const status = await getWatchlistStatus(animeId);
          setCurrentStatus(status);
        } catch {
          // Keep localStorage value on error
        }
      }
    }

    loadStatus();
  }, [animeId, isAuthenticated, isInitialized]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleStatusSelect = useCallback(async (status: WatchlistStatus) => {
    setIsLoading(true);
    setIsOpen(false);

    // Optimistic update
    setCurrentStatus(status);

    try {
      await addToWatchlist(animeId, status);
    } catch (error) {
      // Revert on error
      console.error('Failed to update watchlist:', error);
      // Reload actual status
      const actualStatus = await getWatchlistStatus(animeId);
      setCurrentStatus(actualStatus);
    } finally {
      setIsLoading(false);
    }
  }, [animeId]);

  const handleRemove = useCallback(async () => {
    setIsLoading(true);
    setIsOpen(false);

    // Optimistic update
    const previousStatus = currentStatus;
    setCurrentStatus(null);

    try {
      await removeFromWatchlist(animeId);
    } catch (error) {
      // Revert on error
      console.error('Failed to remove from watchlist:', error);
      setCurrentStatus(previousStatus);
    } finally {
      setIsLoading(false);
    }
  }, [animeId, currentStatus]);

  // Show placeholder during SSR/hydration
  if (!isInitialized) {
    return (
      <div className={`${styles.wrapper} ${className || ''}`}>
        <button className={styles.button} disabled>
          <Plus size={18} />
          <span>Zur Watchlist</span>
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  const CurrentIcon = currentStatus ? STATUS_ICONS[currentStatus] : Plus;
  const buttonLabel = currentStatus
    ? WATCHLIST_STATUS_LABELS[currentStatus]
    : 'Zur Watchlist';
  const buttonColor = currentStatus ? WATCHLIST_STATUS_COLORS[currentStatus] : undefined;

  return (
    <div className={`${styles.wrapper} ${className || ''}`} ref={dropdownRef}>
      <button
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        style={buttonColor ? { borderColor: buttonColor } : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={18} className={styles.spinner} />
        ) : (
          <CurrentIcon
            size={18}
            style={buttonColor ? { color: buttonColor } : undefined}
          />
        )}
        <span style={buttonColor ? { color: buttonColor } : undefined}>
          {buttonLabel}
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {STATUS_ORDER.map((status) => {
            const Icon = STATUS_ICONS[status];
            const isSelected = currentStatus === status;
            return (
              <button
                key={status}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => handleStatusSelect(status)}
                role="option"
                aria-selected={isSelected}
              >
                <Icon
                  size={18}
                  style={{ color: WATCHLIST_STATUS_COLORS[status] }}
                />
                <span>{WATCHLIST_STATUS_LABELS[status]}</span>
                {isSelected && (
                  <CheckCircle size={16} className={styles.checkmark} />
                )}
              </button>
            );
          })}

          {currentStatus && (
            <>
              <div className={styles.divider} />
              <button
                className={`${styles.option} ${styles.optionRemove}`}
                onClick={handleRemove}
              >
                <Trash2 size={18} />
                <span>Entfernen</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
