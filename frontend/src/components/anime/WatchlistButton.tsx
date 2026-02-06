'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Eye,
  CheckCircle,
  PauseCircle,
  Calendar,
  XCircle,
  Trash2,
  ChevronDown,
  Plus,
} from 'lucide-react';
import type { WatchlistStatus } from '@/types';
import { WATCHLIST_STATUS_LABELS, WATCHLIST_STATUS_COLORS } from '@/types';
import {
  getWatchlistStatus,
  addToWatchlist,
  removeFromWatchlist,
} from '@/lib/watchlist';
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
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load status from localStorage on mount
  useEffect(() => {
    setCurrentStatus(getWatchlistStatus(animeId));
    setIsLoaded(true);
  }, [animeId]);

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

  const handleStatusSelect = (status: WatchlistStatus) => {
    addToWatchlist(animeId, status);
    setCurrentStatus(status);
    setIsOpen(false);
  };

  const handleRemove = () => {
    removeFromWatchlist(animeId);
    setCurrentStatus(null);
    setIsOpen(false);
  };

  // Show placeholder during SSR/hydration
  if (!isLoaded) {
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
      >
        <CurrentIcon
          size={18}
          style={buttonColor ? { color: buttonColor } : undefined}
        />
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
