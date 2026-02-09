'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye,
  CheckCircle,
  PauseCircle,
  Calendar,
  XCircle,
  Trash2,
  ArrowUpDown,
  ListFilter,
  RefreshCw,
  Cloud,
  HardDrive,
} from 'lucide-react';
import type { WatchlistStatus, WatchlistItem, BackendWatchlistItem } from '@/types';
import { WATCHLIST_STATUS_LABELS, WATCHLIST_STATUS_COLORS } from '@/types';
import {
  getLocalWatchlist,
  removeFromLocalWatchlist,
  syncLocalWatchlistToBackend,
} from '@/lib/watchlist';
import { authClient } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getCoverUrl } from '@/lib/utils';
import styles from './WatchlistGrid.module.css';

type SortOption = 'added' | 'updated' | 'title';

const STATUS_ICONS: Record<WatchlistStatus, typeof Eye> = {
  watching: Eye,
  done: CheckCircle,
  break: PauseCircle,
  planned: Calendar,
  dropped: XCircle,
};

const STATUS_ORDER: WatchlistStatus[] = ['watching', 'done', 'break', 'planned', 'dropped'];

// Unified item type for display
interface DisplayItem {
  id: number;
  animeId: number;
  title: string;
  type: string;
  status: string;
  year: number | null;
  coverImage: string | null;
  maxEpisodes: number;
  watchlistStatus: WatchlistStatus;
  addedAt: string;
  updatedAt: string;
}

export function WatchlistGrid() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);
  const [activeStatus, setActiveStatus] = useState<WatchlistStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('added');
  const [dataSource, setDataSource] = useState<'local' | 'backend'>('local');

  // Load watchlist based on auth status
  const loadWatchlist = useCallback(async () => {
    setLoading(true);

    if (isAuthenticated) {
      // Fetch from backend
      try {
        const response = await authClient.getWatchlist();
        const displayItems: DisplayItem[] = response.data.map((item) => ({
          id: item.id,
          animeId: item.anime_id,
          title: item.anime?.title || 'Unknown',
          type: item.anime?.type || 'tv',
          status: item.anime?.status || 'done',
          year: item.anime?.year || null,
          coverImage: item.anime?.cover_image || null,
          maxEpisodes: item.anime?.max_episodes || 0,
          watchlistStatus: item.status,
          addedAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        setItems(displayItems);
        setDataSource('backend');
      } catch (error) {
        console.error('Failed to load watchlist from backend:', error);
        // Fallback to localStorage
        await loadLocalWatchlist();
      }
    } else {
      await loadLocalWatchlist();
    }

    setLoading(false);
  }, [isAuthenticated]);

  // Load from localStorage
  const loadLocalWatchlist = async () => {
    const watchlist = getLocalWatchlist();
    setDataSource('local');

    if (watchlist.length === 0) {
      setItems([]);
      return;
    }

    // Fetch anime details for each watchlist item
    const animePromises = watchlist.map(async (item) => {
      try {
        const response = await api.getAnime(item.animeId);
        return {
          id: item.animeId,
          animeId: item.animeId,
          title: response.data.title,
          type: response.data.type,
          status: response.data.status,
          year: response.data.year || null,
          coverImage: response.data.cover_image || null,
          maxEpisodes: response.data.max_episodes,
          watchlistStatus: item.status,
          addedAt: item.addedAt,
          updatedAt: item.updatedAt,
        } as DisplayItem;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(animePromises);
    const validItems = results.filter((item): item is DisplayItem => item !== null);
    setItems(validItems);
  };

  // Initial load and auth change
  useEffect(() => {
    if (!authLoading) {
      loadWatchlist();
    }
  }, [authLoading, loadWatchlist]);

  // Sync localStorage to backend on login
  useEffect(() => {
    async function syncOnLogin() {
      if (isAuthenticated && !authLoading) {
        setSyncing(true);
        const result = await syncLocalWatchlistToBackend();
        if (result && (result.synced > 0 || result.skipped > 0)) {
          setSyncResult(result);
          // Reload watchlist after sync
          await loadWatchlist();
        }
        setSyncing(false);
      }
    }

    syncOnLogin();
  }, [isAuthenticated, authLoading, loadWatchlist]);

  // Filter and sort items
  const displayedItems = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (activeStatus !== 'all') {
      filtered = items.filter((item) => item.watchlistStatus === activeStatus);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'de');
        default:
          return 0;
      }
    });
  }, [items, activeStatus, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<WatchlistStatus | 'all', number> = {
      all: items.length,
      watching: 0,
      done: 0,
      break: 0,
      planned: 0,
      dropped: 0,
    };

    items.forEach((item) => {
      counts[item.watchlistStatus]++;
    });

    return counts;
  }, [items]);

  const handleRemove = async (animeId: number) => {
    // Optimistic update
    setItems((prev) => prev.filter((item) => item.animeId !== animeId));

    try {
      if (isAuthenticated) {
        await authClient.removeFromWatchlist(animeId);
      } else {
        removeFromLocalWatchlist(animeId);
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
      // Reload on error
      await loadWatchlist();
    }
  };

  const handleRefresh = async () => {
    await loadWatchlist();
  };

  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Watchlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <Eye size={48} className={styles.emptyIcon} />
        <h2>Deine Watchlist ist leer</h2>
        <p>Fuege Anime zu deiner Watchlist hinzu, um sie hier zu sehen.</p>
        <Link href="/anime" className={styles.browseLink}>
          Anime durchsuchen
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sync notification */}
      {syncResult && (syncResult.synced > 0 || syncResult.skipped > 0) && (
        <div className={styles.syncNotice}>
          <Cloud size={16} />
          <span>
            {syncResult.synced > 0 && `${syncResult.synced} Eintraege synchronisiert. `}
            {syncResult.skipped > 0 && `${syncResult.skipped} waren bereits aktuell.`}
          </span>
          <button
            onClick={() => setSyncResult(null)}
            className={styles.dismissButton}
          >
            Schliessen
          </button>
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        {/* Status Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeStatus === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveStatus('all')}
          >
            <ListFilter size={16} />
            <span>Alle</span>
            <span className={styles.count}>{statusCounts.all}</span>
          </button>
          {STATUS_ORDER.map((status) => {
            const Icon = STATUS_ICONS[status];
            const count = statusCounts[status];
            if (count === 0) return null;
            return (
              <button
                key={status}
                className={`${styles.tab} ${activeStatus === status ? styles.tabActive : ''}`}
                onClick={() => setActiveStatus(status)}
                style={{
                  '--tab-color': WATCHLIST_STATUS_COLORS[status],
                } as React.CSSProperties}
              >
                <Icon size={16} />
                <span>{WATCHLIST_STATUS_LABELS[status]}</span>
                <span className={styles.count}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Data source indicator */}
          <div className={styles.dataSource} title={dataSource === 'backend' ? 'Cloud-Daten' : 'Lokale Daten'}>
            {dataSource === 'backend' ? <Cloud size={14} /> : <HardDrive size={14} />}
            <span>{dataSource === 'backend' ? 'Cloud' : 'Lokal'}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className={styles.refreshButton}
            disabled={syncing}
            title="Aktualisieren"
          >
            <RefreshCw size={16} className={syncing ? styles.spinning : ''} />
          </button>

          {/* Sort */}
          <div className={styles.sortWrapper}>
            <ArrowUpDown size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={styles.sortSelect}
            >
              <option value="added">Zuletzt hinzugefuegt</option>
              <option value="updated">Zuletzt aktualisiert</option>
              <option value="title">Alphabetisch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {displayedItems.length === 0 ? (
        <div className={styles.emptyFilter}>
          <p>Keine Anime mit diesem Status.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {displayedItems.map((anime) => {
            const StatusIcon = STATUS_ICONS[anime.watchlistStatus];
            return (
              <div key={anime.animeId} className={styles.card}>
                <Link href={`/anime/${anime.animeId}`} className={styles.cardLink}>
                  <div className={styles.coverWrapper}>
                    <Image
                      src={getCoverUrl(anime.coverImage)}
                      alt={anime.title}
                      width={200}
                      height={280}
                      className={styles.cover}
                      unoptimized
                    />
                    <span
                      className={styles.statusBadge}
                      style={{ backgroundColor: WATCHLIST_STATUS_COLORS[anime.watchlistStatus] }}
                    >
                      <StatusIcon size={12} />
                      {WATCHLIST_STATUS_LABELS[anime.watchlistStatus]}
                    </span>
                  </div>
                  <div className={styles.content}>
                    <h3 className={styles.title}>{anime.title}</h3>
                    <div className={styles.meta}>
                      <span>{anime.maxEpisodes} Ep.</span>
                      {anime.year && <span>{anime.year}</span>}
                    </div>
                  </div>
                </Link>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemove(anime.animeId)}
                  title="Aus Watchlist entfernen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
