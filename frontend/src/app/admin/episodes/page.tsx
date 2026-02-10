'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Filter,
  X,
} from 'lucide-react';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { EpisodeEditor } from '@/components/admin/EpisodeEditor';
import { api } from '@/lib/api';
import {
  getAdminEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
} from '@/lib/auth';
import type {
  EpisodeAdminListItem,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  EpisodeStatus,
  AnimeListItem,
  EPISODE_STATUS_LABELS,
  EPISODE_STATUS_COLORS,
} from '@/types';
import styles from './page.module.css';

type EditorMode = 'create' | 'edit' | null;

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  disabled: 'Deaktiviert',
  private: 'Privat',
  public: 'Oeffentlich',
};

const STATUS_COLORS: Record<EpisodeStatus, string> = {
  disabled: '#6b7280',
  private: '#eab308',
  public: '#22c55e',
};

function EpisodeManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const animeIdParam = searchParams.get('anime_id');

  const [episodes, setEpisodes] = useState<EpisodeAdminListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | ''>('');
  const [animeFilter, setAnimeFilter] = useState<number | null>(
    animeIdParam ? parseInt(animeIdParam, 10) : null
  );
  const [animeFilterTitle, setAnimeFilterTitle] = useState<string | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingEpisode, setEditingEpisode] =
    useState<EpisodeAdminListItem | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] =
    useState<EpisodeAdminListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Anime search for filter
  const [showAnimeSearch, setShowAnimeSearch] = useState(false);
  const [animeSearchQuery, setAnimeSearchQuery] = useState('');
  const [animeSearchResults, setAnimeSearchResults] = useState<AnimeListItem[]>(
    []
  );
  const [animeSearchLoading, setAnimeSearchLoading] = useState(false);

  const fetchEpisodes = useCallback(
    async (page: number, search?: string) => {
      setLoading(true);
      try {
        const result = await getAdminEpisodes({
          page,
          per_page: 20,
          anime_id: animeFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        });
        setEpisodes(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.total_pages);
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
      } finally {
        setLoading(false);
      }
    },
    [animeFilter, statusFilter]
  );

  useEffect(() => {
    fetchEpisodes(currentPage, searchQuery);
  }, [currentPage, fetchEpisodes]);

  // Load anime title if filter is set
  useEffect(() => {
    if (animeFilter && !animeFilterTitle) {
      api.getAnime(animeFilter).then((res) => {
        setAnimeFilterTitle(res.data.title);
      });
    }
  }, [animeFilter, animeFilterTitle]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEpisodes(1, searchQuery);
    router.push('/admin/episodes?page=1');
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    if (animeFilter) params.set('anime_id', animeFilter.toString());
    router.push(`/admin/episodes?${params.toString()}`);
  };

  const handleAnimeSearch = async (query: string) => {
    setAnimeSearchQuery(query);
    if (query.length < 2) {
      setAnimeSearchResults([]);
      return;
    }

    setAnimeSearchLoading(true);
    try {
      const result = await api.searchAnime({ q: query, limit: 10 });
      setAnimeSearchResults(result.data);
    } catch (err) {
      console.error('Failed to search anime:', err);
    } finally {
      setAnimeSearchLoading(false);
    }
  };

  const handleAnimeFilterSelect = (anime: AnimeListItem) => {
    setAnimeFilter(anime.id);
    setAnimeFilterTitle(anime.title);
    setShowAnimeSearch(false);
    setAnimeSearchQuery('');
    setAnimeSearchResults([]);
    router.push(`/admin/episodes?page=1&anime_id=${anime.id}`);
  };

  const handleClearAnimeFilter = () => {
    setAnimeFilter(null);
    setAnimeFilterTitle(null);
    router.push('/admin/episodes?page=1');
  };

  const handleCreate = () => {
    setEditingEpisode(undefined);
    setEditorMode('create');
  };

  const handleEdit = (episode: EpisodeAdminListItem) => {
    setEditingEpisode(episode);
    setEditorMode('edit');
  };

  const handleSave = async (
    data: CreateEpisodeRequest | UpdateEpisodeRequest
  ) => {
    setSaving(true);
    try {
      if (editorMode === 'create') {
        await createEpisode(data as CreateEpisodeRequest);
      } else if (editorMode === 'edit' && editingEpisode) {
        await updateEpisode(editingEpisode.id, data as UpdateEpisodeRequest);
      }
      setEditorMode(null);
      setEditingEpisode(undefined);
      fetchEpisodes(currentPage, searchQuery);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditorMode(null);
    setEditingEpisode(undefined);
  };

  const handleDeleteClick = (episode: EpisodeAdminListItem) => {
    setDeleteConfirm(episode);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteEpisode(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchEpisodes(currentPage, searchQuery);
    } catch (err) {
      console.error('Failed to delete episode:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const getProgressAverage = (episode: EpisodeAdminListItem): number => {
    const p = episode.progress;
    const total =
      p.raw +
      p.translate +
      p.time +
      p.typeset +
      p.logo +
      p.edit +
      p.karatime +
      p.karafx +
      p.qc +
      p.encode;
    return Math.round(total / 10);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin" className={styles.backLink}>
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <h1 className={styles.title}>Episoden verwalten</h1>
          <span className={styles.count}>{total} Eintraege</span>
        </div>
        <button onClick={handleCreate} className={styles.createButton}>
          <Plus size={18} />
          Neue Episode
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {/* Anime Filter */}
        <div className={styles.animeFilterContainer}>
          {animeFilter ? (
            <div className={styles.activeFilter}>
              <span>Anime: {animeFilterTitle}</span>
              <button onClick={handleClearAnimeFilter} className={styles.clearFilter}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className={styles.animeSearch}>
              <button
                onClick={() => setShowAnimeSearch(!showAnimeSearch)}
                className={styles.filterButton}
              >
                <Filter size={16} />
                Nach Anime filtern
              </button>
              {showAnimeSearch && (
                <div className={styles.animeSearchDropdown}>
                  <input
                    type="text"
                    value={animeSearchQuery}
                    onChange={(e) => handleAnimeSearch(e.target.value)}
                    placeholder="Anime suchen..."
                    className={styles.filterInput}
                    autoFocus
                  />
                  {animeSearchLoading && (
                    <div className={styles.searchLoading}>Suche...</div>
                  )}
                  {animeSearchResults.length > 0 && (
                    <div className={styles.searchResults}>
                      {animeSearchResults.map((anime) => (
                        <button
                          key={anime.id}
                          onClick={() => handleAnimeFilterSelect(anime)}
                          className={styles.searchResult}
                        >
                          {anime.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as EpisodeStatus | '');
            fetchEpisodes(1, searchQuery);
          }}
          className={styles.statusFilter}
        >
          <option value="">Alle Status</option>
          <option value="public">Oeffentlich</option>
          <option value="private">Privat</option>
          <option value="disabled">Deaktiviert</option>
        </select>

        {/* Search */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInput}>
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen..."
            />
          </div>
          <button type="submit" className={styles.searchButton}>
            Suchen
          </button>
        </form>
      </div>

      {/* Editor Modal */}
      {editorMode && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={handleCancelEdit} />
          <div className={styles.modalContent}>
            <EpisodeEditor
              episode={editingEpisode}
              defaultAnimeId={animeFilter || undefined}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              isLoading={saving}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={handleDeleteCancel} />
          <div className={styles.confirmDialog}>
            <h3>Episode loeschen?</h3>
            <p>
              Moechtest du Episode <strong>{deleteConfirm.episode_number}</strong>{' '}
              von <strong>{deleteConfirm.anime_title}</strong> wirklich loeschen?
              Diese Aktion kann nicht rueckgaengig gemacht werden.
            </p>
            <div className={styles.confirmActions}>
              <button
                onClick={handleDeleteCancel}
                className={styles.cancelButton}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.deleteButton}
                disabled={deleting}
              >
                {deleting ? 'Loesche...' : 'Loeschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episode List */}
      {loading ? (
        <div className={styles.loading}>Laden...</div>
      ) : episodes.length === 0 ? (
        <div className={styles.empty}>Keine Episoden gefunden</div>
      ) : (
        <>
          <div className={styles.list}>
            {episodes.map((episode) => (
              <div key={episode.id} className={styles.listItem}>
                <div className={styles.itemMain}>
                  <div className={styles.itemEpisode}>
                    <span className={styles.episodeNumber}>
                      Ep. {episode.episode_number}
                    </span>
                    <span
                      className={styles.status}
                      style={{
                        backgroundColor: `${STATUS_COLORS[episode.status]}20`,
                        color: STATUS_COLORS[episode.status],
                      }}
                    >
                      {STATUS_LABELS[episode.status]}
                    </span>
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>
                      {episode.title || 'Kein Titel'}
                    </div>
                    <div className={styles.itemAnime}>{episode.anime_title}</div>
                  </div>
                </div>
                <div className={styles.itemProgress}>
                  <div className={styles.progressLabel}>
                    {getProgressAverage(episode)}%
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${getProgressAverage(episode)}%` }}
                    />
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  <span>{episode.view_count} Views</span>
                  <span>{episode.download_count} DL</span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    onClick={() => handleEdit(episode)}
                    className={styles.editButton}
                    title="Bearbeiten"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(episode)}
                    className={styles.deleteIconButton}
                    title="Loeschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={styles.pageButton}
              >
                <ChevronLeft size={18} />
              </button>
              <span className={styles.pageInfo}>
                Seite {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={styles.pageButton}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminEpisodesPage() {
  return (
    <AdminGuard>
      <EpisodeManagement />
    </AdminGuard>
  );
}
