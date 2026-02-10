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
} from 'lucide-react';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { AnimeEditor } from '@/components/admin/AnimeEditor';
import { api } from '@/lib/api';
import { createAnime, updateAnime, deleteAnime } from '@/lib/auth';
import type { Anime, AnimeListItem, CreateAnimeRequest, UpdateAnimeRequest } from '@/types';
import styles from './page.module.css';

type EditorMode = 'create' | 'edit' | null;

function AnimeManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [animeList, setAnimeList] = useState<AnimeListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingAnime, setEditingAnime] = useState<Anime | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<AnimeListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnime = useCallback(async (page: number, search?: string) => {
    setLoading(true);
    try {
      if (search && search.length >= 2) {
        const result = await api.searchAnime({ q: search, limit: 50 });
        setAnimeList(result.data);
        setTotal(result.meta.total);
        setTotalPages(1);
      } else {
        const result = await api.getAnimeList({ page, per_page: 20 });
        setAnimeList(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.total_pages);
      }
    } catch (err) {
      console.error('Failed to fetch anime:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnime(currentPage, searchQuery);
  }, [currentPage, fetchAnime]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnime(1, searchQuery);
    router.push('/admin/anime?page=1');
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/anime?page=${newPage}`);
  };

  const handleCreate = () => {
    setEditingAnime(undefined);
    setEditorMode('create');
  };

  const handleEdit = async (item: AnimeListItem) => {
    try {
      const response = await api.getAnime(item.id);
      setEditingAnime(response.data);
      setEditorMode('edit');
    } catch (err) {
      console.error('Failed to load anime:', err);
    }
  };

  const handleSave = async (data: CreateAnimeRequest | UpdateAnimeRequest) => {
    setSaving(true);
    try {
      if (editorMode === 'create') {
        await createAnime(data as CreateAnimeRequest);
      } else if (editorMode === 'edit' && editingAnime) {
        await updateAnime(editingAnime.id, data as UpdateAnimeRequest);
      }
      setEditorMode(null);
      setEditingAnime(undefined);
      fetchAnime(currentPage, searchQuery);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditorMode(null);
    setEditingAnime(undefined);
  };

  const handleDeleteClick = (item: AnimeListItem) => {
    setDeleteConfirm(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteAnime(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchAnime(currentPage, searchQuery);
    } catch (err) {
      console.error('Failed to delete anime:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin" className={styles.backLink}>
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <h1 className={styles.title}>Anime verwalten</h1>
          <span className={styles.count}>{total} Eintraege</span>
        </div>
        <button onClick={handleCreate} className={styles.createButton}>
          <Plus size={18} />
          Neuer Anime
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInput}>
          <Search size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Anime suchen..."
          />
        </div>
        <button type="submit" className={styles.searchButton}>
          Suchen
        </button>
      </form>

      {/* Editor Modal */}
      {editorMode && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={handleCancelEdit} />
          <div className={styles.modalContent}>
            <AnimeEditor
              anime={editingAnime}
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
            <h3>Anime loeschen?</h3>
            <p>
              Moechtest du <strong>{deleteConfirm.title}</strong> wirklich loeschen?
              Diese Aktion kann nicht rueckgaengig gemacht werden.
            </p>
            <div className={styles.confirmActions}>
              <button onClick={handleDeleteCancel} className={styles.cancelButton}>
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

      {/* Anime List */}
      {loading ? (
        <div className={styles.loading}>Laden...</div>
      ) : animeList.length === 0 ? (
        <div className={styles.empty}>Keine Anime gefunden</div>
      ) : (
        <>
          <div className={styles.list}>
            {animeList.map((anime) => (
              <div key={anime.id} className={styles.listItem}>
                <div className={styles.itemCover}>
                  {anime.cover_image ? (
                    <img src={anime.cover_image} alt={anime.title} />
                  ) : (
                    <div className={styles.noCover}>Kein Cover</div>
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{anime.title}</div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemType}>{anime.type.toUpperCase()}</span>
                    <span className={styles.itemStatus}>{anime.status}</span>
                    {anime.year && <span>{anime.year}</span>}
                    <span>{anime.max_episodes} Ep.</span>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button
                    onClick={() => handleEdit(anime)}
                    className={styles.editButton}
                    title="Bearbeiten"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(anime)}
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
          {totalPages > 1 && !searchQuery && (
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

export default function AdminAnimePage() {
  return (
    <AdminGuard>
      <AnimeManagement />
    </AdminGuard>
  );
}
