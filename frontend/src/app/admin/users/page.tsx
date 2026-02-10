'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Mail,
  MailX,
  Clock,
  User as UserIcon,
  X,
  Filter,
} from 'lucide-react';
import { AdminGuard } from '@/components/auth/AdminGuard';
import {
  getAdminUsers,
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
  banUser,
  unbanUser,
} from '@/lib/auth';
import type {
  UserAdminListItem,
  UserAdminDetail,
  UserAdminFilter,
  UpdateUserAdminRequest,
} from '@/types';
import styles from './page.module.css';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return 'Nie';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UserManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [users, setUsers] = useState<UserAdminListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'admin' | 'user' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'banned' | ''>('');
  const [verifiedFilter, setVerifiedFilter] = useState<'true' | 'false' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserAdminDetail | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserAdminRequest>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<UserAdminListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);

  const fetchUsers = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params: UserAdminFilter = {
        page,
        per_page: 20,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        verified: verifiedFilter || undefined,
        sort_by: 'created_at',
        sort_dir: 'desc',
      };

      const result = await getAdminUsers(params);
      setUsers(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.total_pages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, verifiedFilter]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
    router.push('/admin/users?page=1');
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/users?page=${newPage}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
    setVerifiedFilter('');
    fetchUsers(1);
    router.push('/admin/users?page=1');
  };

  const handleEdit = async (user: UserAdminListItem) => {
    try {
      const details = await getAdminUser(user.id);
      setEditingUser(details);
      setEditForm({
        display_name: details.display_name || '',
        email: details.email,
        is_active: details.is_active,
        email_verified: details.email_verified,
        is_admin: details.is_admin,
      });
      setEditError(null);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    setEditError(null);
    try {
      await updateAdminUser(editingUser.id, editForm);
      setEditingUser(null);
      fetchUsers(currentPage);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setEditError(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
    setEditError(null);
  };

  const handleBanToggle = async (user: UserAdminListItem) => {
    try {
      if (user.is_active) {
        await banUser(user.id);
      } else {
        await unbanUser(user.id);
      }
      fetchUsers(currentPage);
    } catch (err) {
      console.error('Failed to toggle ban:', err);
    }
  };

  const handleDeleteClick = (user: UserAdminListItem) => {
    setDeleteConfirm(user);
    setHardDelete(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteAdminUser(deleteConfirm.id, hardDelete);
      setDeleteConfirm(null);
      fetchUsers(currentPage);
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
    setHardDelete(false);
  };

  const hasActiveFilters = roleFilter || statusFilter || verifiedFilter || searchQuery;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin" className={styles.backLink}>
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <h1 className={styles.title}>Benutzer verwalten</h1>
          <span className={styles.count}>{total} Benutzer</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInput}>
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Benutzername oder E-Mail suchen..."
            />
          </div>
          <button type="submit" className={styles.searchButton}>
            Suchen
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${showFilters ? styles.filterButtonActive : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filter
          </button>
        </form>

        {showFilters && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Rolle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'admin' | 'user' | '')}
              >
                <option value="">Alle</option>
                <option value="admin">Admin</option>
                <option value="user">Benutzer</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'active' | 'banned' | '')}
              >
                <option value="">Alle</option>
                <option value="active">Aktiv</option>
                <option value="banned">Gesperrt</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>E-Mail</label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value as 'true' | 'false' | '')}
              >
                <option value="">Alle</option>
                <option value="true">Verifiziert</option>
                <option value="false">Nicht verifiziert</option>
              </select>
            </div>

            <button
              type="button"
              className={styles.applyFilters}
              onClick={() => {
                fetchUsers(1);
                router.push('/admin/users?page=1');
              }}
            >
              Anwenden
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={handleClearFilters}
              >
                Zuruecksetzen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={handleCancelEdit} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Benutzer bearbeiten</h2>
              <button onClick={handleCancelEdit} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {editError && (
                <div className={styles.errorMessage}>{editError}</div>
              )}

              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {editingUser.avatar_url ? (
                    <img src={editingUser.avatar_url} alt={editingUser.username} />
                  ) : (
                    <UserIcon size={32} />
                  )}
                </div>
                <div>
                  <div className={styles.userName}>{editingUser.username}</div>
                  <div className={styles.userMeta}>
                    Registriert: {formatDate(editingUser.created_at)}
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Anzeigename</label>
                  <input
                    type="text"
                    value={editForm.display_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>E-Mail</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.toggleGroup}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editForm.is_active ?? false}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  <span className={styles.toggleLabel}>
                    <CheckCircle size={16} />
                    Aktiv (nicht gesperrt)
                  </span>
                </label>

                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editForm.email_verified ?? false}
                    onChange={(e) => setEditForm({ ...editForm, email_verified: e.target.checked })}
                  />
                  <span className={styles.toggleLabel}>
                    <Mail size={16} />
                    E-Mail verifiziert
                  </span>
                </label>

                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editForm.is_admin ?? false}
                    onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  />
                  <span className={styles.toggleLabel}>
                    <Shield size={16} />
                    Administrator
                  </span>
                </label>
              </div>

              <div className={styles.userStats}>
                <h4>Statistiken</h4>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{editingUser.stats.anime_watched}</span>
                    <span className={styles.statLabel}>Anime gesehen</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{editingUser.stats.anime_watching}</span>
                    <span className={styles.statLabel}>Schaue ich</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{editingUser.stats.ratings_count}</span>
                    <span className={styles.statLabel}>Bewertungen</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{editingUser.stats.comments_count}</span>
                    <span className={styles.statLabel}>Kommentare</span>
                  </div>
                </div>
              </div>

              <div className={styles.userMeta}>
                <p>
                  <Clock size={14} />
                  Letzter Login: {formatDateTime(editingUser.last_login_at)}
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={handleCancelEdit} className={styles.cancelButton}>
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={handleDeleteCancel} />
          <div className={styles.confirmDialog}>
            <h3>Benutzer loeschen?</h3>
            <p>
              Moechtest du <strong>{deleteConfirm.username}</strong> wirklich loeschen?
            </p>

            <label className={styles.hardDeleteToggle}>
              <input
                type="checkbox"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
              />
              <span>
                Endgueltig loeschen (alle Daten entfernen)
              </span>
            </label>

            {hardDelete && (
              <div className={styles.warningMessage}>
                Achtung: Alle Bewertungen, Kommentare und Watchlist-Eintraege werden
                unwiderruflich geloescht!
              </div>
            )}

            <div className={styles.confirmActions}>
              <button onClick={handleDeleteCancel} className={styles.cancelButton}>
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.deleteButton}
                disabled={deleting}
              >
                {deleting ? 'Loesche...' : hardDelete ? 'Endgueltig loeschen' : 'Deaktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className={styles.loading}>Laden...</div>
      ) : users.length === 0 ? (
        <div className={styles.empty}>Keine Benutzer gefunden</div>
      ) : (
        <>
          <div className={styles.list}>
            {users.map((user) => (
              <div key={user.id} className={styles.listItem}>
                <div className={styles.itemAvatar}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} />
                  ) : (
                    <UserIcon size={24} />
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>
                    {user.display_name || user.username}
                    {user.is_admin && (
                      <span className={styles.adminBadge}>
                        <Shield size={12} />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className={styles.itemMeta}>
                    <span>@{user.username}</span>
                    <span>{user.email}</span>
                    <span>
                      Registriert: {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
                <div className={styles.itemBadges}>
                  {user.is_active ? (
                    <span className={styles.badgeActive}>
                      <CheckCircle size={12} />
                      Aktiv
                    </span>
                  ) : (
                    <span className={styles.badgeBanned}>
                      <Ban size={12} />
                      Gesperrt
                    </span>
                  )}
                  {user.email_verified ? (
                    <span className={styles.badgeVerified}>
                      <Mail size={12} />
                      Verifiziert
                    </span>
                  ) : (
                    <span className={styles.badgeUnverified}>
                      <MailX size={12} />
                      Nicht verifiziert
                    </span>
                  )}
                </div>
                <div className={styles.itemActions}>
                  <button
                    onClick={() => handleBanToggle(user)}
                    className={user.is_active ? styles.banButton : styles.unbanButton}
                    title={user.is_active ? 'Sperren' : 'Entsperren'}
                  >
                    {user.is_active ? <Ban size={16} /> : <ShieldOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className={styles.editButton}
                    title="Bearbeiten"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
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

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <UserManagement />
    </AdminGuard>
  );
}
