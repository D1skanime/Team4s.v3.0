'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { Anime, CreateAnimeRequest, UpdateAnimeRequest, AnimeType, AnimeStatus, ContentType } from '@/types';
import styles from './AnimeEditor.module.css';

interface AnimeEditorProps {
  anime?: Anime;
  onSave: (data: CreateAnimeRequest | UpdateAnimeRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ANIME_TYPES: { value: AnimeType; label: string }[] = [
  { value: 'tv', label: 'TV-Serie' },
  { value: 'film', label: 'Film' },
  { value: 'ova', label: 'OVA' },
  { value: 'ona', label: 'ONA' },
  { value: 'special', label: 'Special' },
  { value: 'bonus', label: 'Bonus' },
];

const ANIME_STATUSES: { value: AnimeStatus; label: string }[] = [
  { value: 'ongoing', label: 'Laufend' },
  { value: 'done', label: 'Abgeschlossen' },
  { value: 'aborted', label: 'Abgebrochen' },
  { value: 'licensed', label: 'Lizenziert' },
  { value: 'disabled', label: 'Deaktiviert' },
];

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'hentai', label: 'Hentai' },
];

export function AnimeEditor({ anime, onSave, onCancel, isLoading }: AnimeEditorProps) {
  const isEdit = !!anime;

  const [formData, setFormData] = useState({
    title: anime?.title || '',
    title_de: anime?.title_de || '',
    title_en: anime?.title_en || '',
    type: anime?.type || 'tv',
    content_type: anime?.content_type || 'anime',
    status: anime?.status || 'ongoing',
    year: anime?.year?.toString() || '',
    max_episodes: anime?.max_episodes?.toString() || '0',
    genre: anime?.genre || '',
    source: anime?.source || '',
    description: anime?.description || '',
    cover_image: anime?.cover_image || '',
    folder_name: anime?.folder_name || '',
    sub_comment: anime?.sub_comment || '',
    stream_comment: anime?.stream_comment || '',
    is_self_subbed: anime?.is_self_subbed || false,
    anisearch_id: anime?.anisearch_id || '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    try {
      const data: CreateAnimeRequest | UpdateAnimeRequest = {
        title: formData.title.trim(),
        title_de: formData.title_de.trim() || undefined,
        title_en: formData.title_en.trim() || undefined,
        type: formData.type as AnimeType,
        content_type: formData.content_type as ContentType,
        status: formData.status as AnimeStatus,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
        max_episodes: parseInt(formData.max_episodes, 10) || 0,
        genre: formData.genre.trim() || undefined,
        source: formData.source.trim() || undefined,
        description: formData.description.trim() || undefined,
        cover_image: formData.cover_image.trim() || undefined,
        folder_name: formData.folder_name.trim() || undefined,
        sub_comment: formData.sub_comment.trim() || undefined,
        stream_comment: formData.stream_comment.trim() || undefined,
        is_self_subbed: formData.is_self_subbed,
        anisearch_id: formData.anisearch_id.trim() || undefined,
      };

      await onSave(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEdit ? 'Anime bearbeiten' : 'Neuen Anime erstellen'}
        </h2>
        <button type="button" onClick={onCancel} className={styles.closeButton}>
          <X size={20} />
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {/* Title */}
        <div className={styles.field}>
          <label className={styles.label}>
            Titel <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            placeholder="Originaltitel"
            required
          />
        </div>

        {/* Title DE */}
        <div className={styles.field}>
          <label className={styles.label}>Deutscher Titel</label>
          <input
            type="text"
            name="title_de"
            value={formData.title_de}
            onChange={handleChange}
            className={styles.input}
            placeholder="Deutscher Titel (optional)"
          />
        </div>

        {/* Title EN */}
        <div className={styles.field}>
          <label className={styles.label}>Englischer Titel</label>
          <input
            type="text"
            name="title_en"
            value={formData.title_en}
            onChange={handleChange}
            className={styles.input}
            placeholder="Englischer Titel (optional)"
          />
        </div>

        {/* Type */}
        <div className={styles.field}>
          <label className={styles.label}>Typ</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={styles.select}
          >
            {ANIME_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Content Type */}
        <div className={styles.field}>
          <label className={styles.label}>Kategorie</label>
          <select
            name="content_type"
            value={formData.content_type}
            onChange={handleChange}
            className={styles.select}
          >
            {CONTENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={styles.select}
          >
            {ANIME_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className={styles.field}>
          <label className={styles.label}>Jahr</label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className={styles.input}
            placeholder="z.B. 2024"
            min="1900"
            max="2100"
          />
        </div>

        {/* Max Episodes */}
        <div className={styles.field}>
          <label className={styles.label}>Episoden</label>
          <input
            type="number"
            name="max_episodes"
            value={formData.max_episodes}
            onChange={handleChange}
            className={styles.input}
            placeholder="Anzahl Episoden"
            min="0"
          />
        </div>

        {/* Genre */}
        <div className={styles.field}>
          <label className={styles.label}>Genre</label>
          <input
            type="text"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className={styles.input}
            placeholder="z.B. Action, Comedy"
          />
        </div>

        {/* Source */}
        <div className={styles.field}>
          <label className={styles.label}>Quelle</label>
          <input
            type="text"
            name="source"
            value={formData.source}
            onChange={handleChange}
            className={styles.input}
            placeholder="z.B. Manga, Light Novel"
          />
        </div>

        {/* Cover Image */}
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Cover-Bild URL</label>
          <input
            type="text"
            name="cover_image"
            value={formData.cover_image}
            onChange={handleChange}
            className={styles.input}
            placeholder="https://..."
          />
        </div>

        {/* Description */}
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Beschreibung</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Beschreibung des Anime..."
            rows={4}
          />
        </div>

        {/* Folder Name */}
        <div className={styles.field}>
          <label className={styles.label}>Ordnername</label>
          <input
            type="text"
            name="folder_name"
            value={formData.folder_name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Ordnername auf Server"
          />
        </div>

        {/* Anisearch ID */}
        <div className={styles.field}>
          <label className={styles.label}>Anisearch ID</label>
          <input
            type="text"
            name="anisearch_id"
            value={formData.anisearch_id}
            onChange={handleChange}
            className={styles.input}
            placeholder="Anisearch ID"
          />
        </div>

        {/* Sub Comment */}
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Sub-Kommentar</label>
          <textarea
            name="sub_comment"
            value={formData.sub_comment}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Kommentar zu Untertiteln..."
            rows={2}
          />
        </div>

        {/* Stream Comment */}
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Stream-Kommentar</label>
          <textarea
            name="stream_comment"
            value={formData.stream_comment}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Kommentar zu Streams..."
            rows={2}
          />
        </div>

        {/* Self Subbed Checkbox */}
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="is_self_subbed"
              checked={formData.is_self_subbed}
              onChange={handleChange}
            />
            <span>Eigene Untertitel (Team4s)</span>
          </label>
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
