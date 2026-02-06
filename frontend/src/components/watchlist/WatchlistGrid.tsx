'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import type { WatchlistStatus, WatchlistItem, AnimeListItem } from '@/types';
import { WATCHLIST_STATUS_LABELS, WATCHLIST_STATUS_COLORS } from '@/types';
import { getWatchlist, removeFromWatchlist } from '@/lib/watchlist';
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

interface AnimeWithWatchlist extends AnimeListItem {
  watchlistItem: WatchlistItem;
}

export function WatchlistGrid() {
  const [items, setItems] = useState<AnimeWithWatchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<WatchlistStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('added');

  // Load watchlist and fetch anime details
  useEffect(() => {
    async function loadWatchlist() {
      setLoading(true);
      const watchlist = getWatchlist();

      if (watchlist.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch anime details for each watchlist item
      const animePromises = watchlist.map(async (item) => {
        try {
          const response = await api.getAnime(item.animeId);
          return {
            ...response.data,
            watchlistItem: item,
          } as AnimeWithWatchlist;
        } catch {
          // If anime not found, return null
          return null;
        }
      });

      const results = await Promise.all(animePromises);
      const validItems = results.filter((item): item is AnimeWithWatchlist => item !== null);
      setItems(validItems);
      setLoading(false);
    }

    loadWatchlist();
  }, []);

  // Filter and sort items
  const displayedItems = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (activeStatus !== 'all') {
      filtered = items.filter((item) => item.watchlistItem.status === activeStatus);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'added':
          return new Date(b.watchlistItem.addedAt).getTime() - new Date(a.watchlistItem.addedAt).getTime();
        case 'updated':
          return new Date(b.watchlistItem.updatedAt).getTime() - new Date(a.watchlistItem.updatedAt).getTime();
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
      counts[item.watchlistItem.status]++;
    });

    return counts;
  }, [items]);

  const handleRemove = (animeId: number) => {
    removeFromWatchlist(animeId);
    setItems((prev) => prev.filter((item) => item.id !== animeId));
  };

  if (loading) {
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

      {/* Grid */}
      {displayedItems.length === 0 ? (
        <div className={styles.emptyFilter}>
          <p>Keine Anime mit diesem Status.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {displayedItems.map((anime) => {
            const StatusIcon = STATUS_ICONS[anime.watchlistItem.status];
            return (
              <div key={anime.id} className={styles.card}>
                <Link href={`/anime/${anime.id}`} className={styles.cardLink}>
                  <div className={styles.coverWrapper}>
                    <Image
                      src={getCoverUrl(anime.cover_image)}
                      alt={anime.title}
                      width={200}
                      height={280}
                      className={styles.cover}
                      unoptimized
                    />
                    <span
                      className={styles.statusBadge}
                      style={{ backgroundColor: WATCHLIST_STATUS_COLORS[anime.watchlistItem.status] }}
                    >
                      <StatusIcon size={12} />
                      {WATCHLIST_STATUS_LABELS[anime.watchlistItem.status]}
                    </span>
                  </div>
                  <div className={styles.content}>
                    <h3 className={styles.title}>{anime.title}</h3>
                    <div className={styles.meta}>
                      <span>{anime.max_episodes} Ep.</span>
                      {anime.year && <span>{anime.year}</span>}
                    </div>
                  </div>
                </Link>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemove(anime.id)}
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
