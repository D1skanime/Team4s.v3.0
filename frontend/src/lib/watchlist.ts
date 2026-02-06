import type { WatchlistItem, WatchlistStatus } from '@/types';

const STORAGE_KEY = 'team4s_watchlist';

/**
 * Get watchlist from localStorage
 */
export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as WatchlistItem[];
  } catch {
    return [];
  }
}

/**
 * Save watchlist to localStorage
 */
function saveWatchlist(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Get watchlist status for a specific anime
 */
export function getWatchlistStatus(animeId: number): WatchlistStatus | null {
  const watchlist = getWatchlist();
  const item = watchlist.find((w) => w.animeId === animeId);
  return item?.status || null;
}

/**
 * Check if anime is in watchlist
 */
export function isInWatchlist(animeId: number): boolean {
  return getWatchlistStatus(animeId) !== null;
}

/**
 * Add anime to watchlist
 */
export function addToWatchlist(animeId: number, status: WatchlistStatus): void {
  const watchlist = getWatchlist();
  const existingIndex = watchlist.findIndex((w) => w.animeId === animeId);

  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    // Update existing entry
    watchlist[existingIndex] = {
      ...watchlist[existingIndex],
      status,
      updatedAt: now,
    };
  } else {
    // Add new entry
    watchlist.push({
      animeId,
      status,
      addedAt: now,
      updatedAt: now,
    });
  }

  saveWatchlist(watchlist);
}

/**
 * Remove anime from watchlist
 */
export function removeFromWatchlist(animeId: number): void {
  const watchlist = getWatchlist();
  const filteredList = watchlist.filter((w) => w.animeId !== animeId);
  saveWatchlist(filteredList);
}

/**
 * Update watchlist status for an anime
 */
export function updateWatchlistStatus(animeId: number, status: WatchlistStatus): void {
  addToWatchlist(animeId, status);
}

/**
 * Get watchlist items filtered by status
 */
export function getWatchlistByStatus(status: WatchlistStatus): WatchlistItem[] {
  const watchlist = getWatchlist();
  return watchlist.filter((w) => w.status === status);
}

/**
 * Get watchlist count
 */
export function getWatchlistCount(): number {
  return getWatchlist().length;
}

/**
 * Clear entire watchlist
 */
export function clearWatchlist(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
