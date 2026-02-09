import type { WatchlistItem, WatchlistStatus, SyncWatchlistItem } from '@/types';
import { authClient, isAuthenticated } from './auth';

const STORAGE_KEY = 'team4s_watchlist';
const SYNC_COMPLETED_KEY = 'team4s_watchlist_synced';

// ============================================
// LocalStorage Functions (Fallback for guests)
// ============================================

/**
 * Get watchlist from localStorage
 */
export function getLocalWatchlist(): WatchlistItem[] {
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
function saveLocalWatchlist(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Get watchlist status from localStorage for a specific anime
 */
export function getLocalWatchlistStatus(animeId: number): WatchlistStatus | null {
  const watchlist = getLocalWatchlist();
  const item = watchlist.find((w) => w.animeId === animeId);
  return item?.status || null;
}

/**
 * Add anime to localStorage watchlist
 */
export function addToLocalWatchlist(animeId: number, status: WatchlistStatus): void {
  const watchlist = getLocalWatchlist();
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

  saveLocalWatchlist(watchlist);
}

/**
 * Remove anime from localStorage watchlist
 */
export function removeFromLocalWatchlist(animeId: number): void {
  const watchlist = getLocalWatchlist();
  const filteredList = watchlist.filter((w) => w.animeId !== animeId);
  saveLocalWatchlist(filteredList);
}

/**
 * Clear localStorage watchlist
 */
export function clearLocalWatchlist(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if sync was already completed for this session
 */
export function wasSyncCompleted(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(SYNC_COMPLETED_KEY) === 'true';
}

/**
 * Mark sync as completed
 */
export function markSyncCompleted(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(SYNC_COMPLETED_KEY, 'true');
}

/**
 * Clear sync completed flag (on logout)
 */
export function clearSyncFlag(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(SYNC_COMPLETED_KEY);
}

// ============================================
// Hybrid Functions (Auto-select based on auth)
// ============================================

/**
 * Get watchlist status for a specific anime (hybrid)
 * Uses backend when authenticated, localStorage otherwise
 */
export async function getWatchlistStatus(animeId: number): Promise<WatchlistStatus | null> {
  if (isAuthenticated()) {
    try {
      const entry = await authClient.getWatchlistStatus(animeId);
      return entry?.status || null;
    } catch {
      // Fallback to localStorage on error
      return getLocalWatchlistStatus(animeId);
    }
  }
  return getLocalWatchlistStatus(animeId);
}

/**
 * Check if anime is in watchlist (hybrid)
 */
export async function isInWatchlist(animeId: number): Promise<boolean> {
  const status = await getWatchlistStatus(animeId);
  return status !== null;
}

/**
 * Add anime to watchlist (hybrid)
 * Uses backend when authenticated, localStorage otherwise
 */
export async function addToWatchlist(animeId: number, status: WatchlistStatus): Promise<void> {
  if (isAuthenticated()) {
    try {
      await authClient.addToWatchlist(animeId, status);
      return;
    } catch {
      // Fallback to localStorage on error
      addToLocalWatchlist(animeId, status);
      return;
    }
  }
  addToLocalWatchlist(animeId, status);
}

/**
 * Remove anime from watchlist (hybrid)
 */
export async function removeFromWatchlist(animeId: number): Promise<void> {
  if (isAuthenticated()) {
    try {
      await authClient.removeFromWatchlist(animeId);
      return;
    } catch {
      // Fallback to localStorage on error
      removeFromLocalWatchlist(animeId);
      return;
    }
  }
  removeFromLocalWatchlist(animeId);
}

/**
 * Update watchlist status (hybrid)
 */
export async function updateWatchlistStatus(animeId: number, status: WatchlistStatus): Promise<void> {
  await addToWatchlist(animeId, status);
}

// ============================================
// Sync Functions
// ============================================

/**
 * Sync localStorage watchlist to backend on login
 * Uses merge strategy: newer timestamps win
 */
export async function syncLocalWatchlistToBackend(): Promise<{ synced: number; skipped: number; invalid: number } | null> {
  if (!isAuthenticated()) {
    return null;
  }

  // Check if sync was already done
  if (wasSyncCompleted()) {
    return null;
  }

  const localWatchlist = getLocalWatchlist();

  if (localWatchlist.length === 0) {
    markSyncCompleted();
    return { synced: 0, skipped: 0, invalid: 0 };
  }

  // Convert to backend format
  const items: SyncWatchlistItem[] = localWatchlist.map((item) => ({
    anime_id: item.animeId,
    status: item.status,
    added_at: item.addedAt,
    updated_at: item.updatedAt,
  }));

  try {
    const result = await authClient.syncWatchlist(items);
    markSyncCompleted();

    // Clear localStorage after successful sync
    clearLocalWatchlist();

    return result;
  } catch (error) {
    console.error('Failed to sync watchlist:', error);
    return null;
  }
}

// ============================================
// Legacy exports (for backwards compatibility)
// ============================================

// These synchronous functions are kept for compatibility but should be migrated
// to the async versions where possible

/**
 * @deprecated Use async getWatchlistStatus instead
 */
export function getWatchlist(): WatchlistItem[] {
  return getLocalWatchlist();
}

/**
 * @deprecated Use async getWatchlistStatus instead
 */
export function getWatchlistStatusSync(animeId: number): WatchlistStatus | null {
  return getLocalWatchlistStatus(animeId);
}

/**
 * Get watchlist count from localStorage
 */
export function getWatchlistCount(): number {
  return getLocalWatchlist().length;
}

/**
 * Get watchlist items filtered by status from localStorage
 */
export function getWatchlistByStatus(status: WatchlistStatus): WatchlistItem[] {
  const watchlist = getLocalWatchlist();
  return watchlist.filter((w) => w.status === status);
}

/**
 * Clear entire watchlist (both localStorage and backend if authenticated)
 */
export async function clearWatchlist(): Promise<void> {
  clearLocalWatchlist();
  // Note: Backend doesn't have a clear-all endpoint
  // Individual items would need to be removed if needed
}
