'use client';

import { useState, useEffect } from 'react';
import { Save, X, Search } from 'lucide-react';
import type {
  Episode,
  EpisodeAdminListItem,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  EpisodeStatus,
  AnimeListItem,
} from '@/types';
import { api } from '@/lib/api';
import styles from './EpisodeEditor.module.css';

interface EpisodeEditorProps {
  episode?: EpisodeAdminListItem;
  defaultAnimeId?: number;
  onSave: (data: CreateEpisodeRequest | UpdateEpisodeRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const EPISODE_STATUSES: { value: EpisodeStatus; label: string }[] = [
  { value: 'disabled', label: 'Deaktiviert' },
  { value: 'private', label: 'Privat' },
  { value: 'public', label: 'Oeffentlich' },
];

const PROGRESS_FIELDS = [
  { key: 'progress_raw', label: 'Raw' },
  { key: 'progress_translate', label: 'Uebersetzen' },
  { key: 'progress_time', label: 'Timing' },
  { key: 'progress_typeset', label: 'Typeset' },
  { key: 'progress_logo', label: 'Logo' },
  { key: 'progress_edit', label: 'Edit' },
  { key: 'progress_karatime', label: 'Kara-Time' },
  { key: 'progress_karafx', label: 'Kara-FX' },
  { key: 'progress_qc', label: 'QC' },
  { key: 'progress_encode', label: 'Encode' },
] as const;

export function EpisodeEditor({
  episode,
  defaultAnimeId,
  onSave,
  onCancel,
  isLoading,
}: EpisodeEditorProps) {
  const isEdit = !!episode;

  const [formData, setFormData] = useState({
    anime_id: episode?.anime_id?.toString() || defaultAnimeId?.toString() || '',
    episode_number: episode?.episode_number || '',
    title: episode?.title || '',
    filename: episode?.filename || '',
    stream_links: '',
    status: episode?.status || 'private',
    progress_raw: episode?.progress.raw?.toString() || '0',
    progress_translate: episode?.progress.translate?.toString() || '0',
    progress_time: episode?.progress.time?.toString() || '0',
    progress_typeset: episode?.progress.typeset?.toString() || '0',
    progress_logo: episode?.progress.logo?.toString() || '0',
    progress_edit: episode?.progress.edit?.toString() || '0',
    progress_karatime: episode?.progress.karatime?.toString() || '0',
    progress_karafx: episode?.progress.karafx?.toString() || '0',
    progress_qc: episode?.progress.qc?.toString() || '0',
    progress_encode: episode?.progress.encode?.toString() || '0',
  });

  const [error, setError] = useState<string | null>(null);
  const [animeSearch, setAnimeSearch] = useState('');
  const [animeResults, setAnimeResults] = useState<AnimeListItem[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeListItem | null>(null);
  const [showAnimeSearch, setShowAnimeSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // If editing, set the selected anime title
  useEffect(() => {
    if (episode?.anime_title) {
      setSelectedAnime({
        id: episode.anime_id,
        title: episode.anime_title,
        type: 'tv',
        status: 'done',
        max_episodes: 0,
      });
    }
  }, [episode]);

  const handleAnimeSearch = async (query: string) => {
    setAnimeSearch(query);
    if (query.length < 2) {
      setAnimeResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const result = await api.searchAnime({ q: query, limit: 10 });
      setAnimeResults(result.data);
    } catch (err) {
      console.error('Failed to search anime:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAnimeSelect = (anime: AnimeListItem) => {
    setSelectedAnime(anime);
    setFormData((prev) => ({ ...prev, anime_id: anime.id.toString() }));
    setShowAnimeSearch(false);
    setAnimeSearch('');
    setAnimeResults([]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProgressChange = (key: string, value: string) => {
    // Clamp value between 0 and 100
    let numValue = parseInt(value, 10) || 0;
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;
    setFormData((prev) => ({
      ...prev,
      [key]: numValue.toString(),
    }));
  };

  const setAllProgress = (value: number) => {
    const updates: Record<string, string> = {};
    PROGRESS_FIELDS.forEach((field) => {
      updates[field.key] = value.toString();
    });
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.anime_id) {
      setError('Bitte waehle einen Anime aus');
      return;
    }

    if (!formData.episode_number.trim()) {
      setError('Episodennummer ist erforderlich');
      return;
    }

    try {
      // Parse stream links (one per line)
      const streamLinks = formData.stream_links
        .split('\n')
        .map((link) => link.trim())
        .filter((link) => link.length > 0);

      if (isEdit) {
        // Update request
        const data: UpdateEpisodeRequest = {
          episode_number: formData.episode_number.trim(),
          title: formData.title.trim() || undefined,
          filename: formData.filename.trim() || undefined,
          stream_links: streamLinks.length > 0 ? streamLinks : undefined,
          status: formData.status as EpisodeStatus,
          progress_raw: parseInt(formData.progress_raw, 10),
          progress_translate: parseInt(formData.progress_translate, 10),
          progress_time: parseInt(formData.progress_time, 10),
          progress_typeset: parseInt(formData.progress_typeset, 10),
          progress_logo: parseInt(formData.progress_logo, 10),
          progress_edit: parseInt(formData.progress_edit, 10),
          progress_karatime: parseInt(formData.progress_karatime, 10),
          progress_karafx: parseInt(formData.progress_karafx, 10),
          progress_qc: parseInt(formData.progress_qc, 10),
          progress_encode: parseInt(formData.progress_encode, 10),
        };
        await onSave(data);
      } else {
        // Create request
        const data: CreateEpisodeRequest = {
          anime_id: parseInt(formData.anime_id, 10),
          episode_number: formData.episode_number.trim(),
          title: formData.title.trim() || undefined,
          filename: formData.filename.trim() || undefined,
          stream_links: streamLinks,
          status: formData.status as EpisodeStatus,
          progress_raw: parseInt(formData.progress_raw, 10),
          progress_translate: parseInt(formData.progress_translate, 10),
          progress_time: parseInt(formData.progress_time, 10),
          progress_typeset: parseInt(formData.progress_typeset, 10),
          progress_logo: parseInt(formData.progress_logo, 10),
          progress_edit: parseInt(formData.progress_edit, 10),
          progress_karatime: parseInt(formData.progress_karatime, 10),
          progress_karafx: parseInt(formData.progress_karafx, 10),
          progress_qc: parseInt(formData.progress_qc, 10),
          progress_encode: parseInt(formData.progress_encode, 10),
        };
        await onSave(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEdit ? 'Episode bearbeiten' : 'Neue Episode erstellen'}
        </h2>
        <button type="button" onClick={onCancel} className={styles.closeButton}>
          <X size={20} />
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {/* Anime Selection */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Anime</h3>
          <div className={styles.animeSelector}>
            {selectedAnime ? (
              <div className={styles.selectedAnime}>
                <span>{selectedAnime.title}</span>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnime(null);
                      setFormData((prev) => ({ ...prev, anime_id: '' }));
                    }}
                    className={styles.clearAnime}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.animeSearchContainer}>
                <div className={styles.searchInput}>
                  <Search size={16} />
                  <input
                    type="text"
                    value={animeSearch}
                    onChange={(e) => handleAnimeSearch(e.target.value)}
                    onFocus={() => setShowAnimeSearch(true)}
                    placeholder="Anime suchen..."
                  />
                </div>
                {showAnimeSearch && animeResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {animeResults.map((anime) => (
                      <button
                        key={anime.id}
                        type="button"
                        onClick={() => handleAnimeSelect(anime)}
                        className={styles.searchResult}
                      >
                        <span>{anime.title}</span>
                        <span className={styles.animeType}>
                          {anime.type.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchLoading && (
                  <div className={styles.searchLoading}>Suche...</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Episode Details */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Episode Details</h3>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>
                Episodennummer <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="episode_number"
                value={formData.episode_number}
                onChange={handleChange}
                className={styles.input}
                placeholder="z.B. 1, 2, OVA, Special"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={styles.select}
              >
                {EPISODE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Titel</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={styles.input}
                placeholder="Episodentitel (optional)"
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Dateiname</label>
              <input
                type="text"
                name="filename"
                value={formData.filename}
                onChange={handleChange}
                className={styles.input}
                placeholder="z.B. [Team4s] Anime - 01.mkv"
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Stream Links (einer pro Zeile)</label>
              <textarea
                name="stream_links"
                value={formData.stream_links}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="https://..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Fansub Progress */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Fansub Fortschritt</h3>
            <div className={styles.progressActions}>
              <button
                type="button"
                onClick={() => setAllProgress(0)}
                className={styles.progressButton}
              >
                Alle 0%
              </button>
              <button
                type="button"
                onClick={() => setAllProgress(100)}
                className={styles.progressButton}
              >
                Alle 100%
              </button>
            </div>
          </div>
          <div className={styles.progressGrid}>
            {PROGRESS_FIELDS.map((field) => (
              <div key={field.key} className={styles.progressField}>
                <label className={styles.progressLabel}>{field.label}</label>
                <div className={styles.progressInput}>
                  <input
                    type="number"
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) => handleProgressChange(field.key, e.target.value)}
                    min="0"
                    max="100"
                    className={styles.input}
                  />
                  <span className={styles.progressPercent}>%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${formData[field.key as keyof typeof formData]}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isLoading}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={isLoading}
        >
          <Save size={18} />
          {isLoading ? 'Speichere...' : isEdit ? 'Speichern' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
}
