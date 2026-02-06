'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Play, Eye, Download, Clock, ExternalLink } from 'lucide-react';
import type { EpisodeDetail as EpisodeDetailType } from '@/types';
import { getCoverUrl, getStatusLabel, getStatusColor } from '@/lib/utils';
import { FansubProgress } from './FansubProgress';
import styles from './EpisodeDetail.module.css';

interface Props {
  episode: EpisodeDetailType;
}

export function EpisodeDetail({ episode }: Props) {
  const hasStreamLinks = episode.stream_links && episode.stream_links.length > 0;
  const hasLegacyLinks = episode.stream_links_legacy && episode.stream_links_legacy.trim() !== '';

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link href="/anime" className={styles.breadcrumbLink}>
          Anime
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href={`/anime/${episode.anime.id}`} className={styles.breadcrumbLink}>
          {episode.anime.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>Episode {episode.episode_number}</span>
      </nav>

      {/* Back Link */}
      <Link href={`/anime/${episode.anime.id}`} className={styles.backLink}>
        <ArrowLeft size={18} />
        <span>Zuruck zum Anime</span>
      </Link>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Anime Info Card */}
        <Link href={`/anime/${episode.anime.id}`} className={styles.animeCard}>
          <div className={styles.animeCover}>
            <Image
              src={getCoverUrl(episode.anime.cover_image)}
              alt={episode.anime.title}
              width={80}
              height={120}
              className={styles.coverImage}
            />
          </div>
          <div className={styles.animeInfo}>
            <h2 className={styles.animeTitle}>{episode.anime.title}</h2>
            <p className={styles.episodeTitle}>
              Episode {episode.episode_number}
              {episode.title && `: ${episode.title}`}
            </p>
          </div>
        </Link>

        {/* Episode Info */}
        <div className={styles.episodeInfo}>
          <h1 className={styles.title}>
            Episode {episode.episode_number}
            {episode.title && <span className={styles.subtitle}>: {episode.title}</span>}
          </h1>

          {/* Status and Stats */}
          <div className={styles.meta}>
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(episode.status) }}
            >
              {getStatusLabel(episode.status)}
            </span>
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <Eye size={16} />
                {episode.view_count.toLocaleString('de-DE')} Views
              </span>
              <span className={styles.statItem}>
                <Download size={16} />
                {episode.download_count.toLocaleString('de-DE')} Downloads
              </span>
            </div>
          </div>

          {/* Filename */}
          {episode.filename && (
            <div className={styles.filename}>
              <span className={styles.filenameLabel}>Dateiname:</span>
              <code className={styles.filenameValue}>{episode.filename}</code>
            </div>
          )}
        </div>

        {/* Stream Links Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Play size={20} />
            Stream Links
          </h3>
          {hasStreamLinks ? (
            <div className={styles.streamLinks}>
              {episode.stream_links.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.streamLink}
                >
                  <ExternalLink size={16} />
                  <span>Stream {index + 1}</span>
                </a>
              ))}
            </div>
          ) : hasLegacyLinks ? (
            <div className={styles.legacyNotice}>
              <Clock size={18} />
              <span>Legacy-Links vorhanden (werden noch migriert)</span>
            </div>
          ) : (
            <p className={styles.noLinks}>Keine Stream-Links verfugbar</p>
          )}
        </div>

        {/* Fansub Progress */}
        <FansubProgress progress={episode.fansub_progress} />

        {/* Timestamps */}
        <div className={styles.timestamps}>
          <span>Erstellt: {new Date(episode.created_at).toLocaleDateString('de-DE')}</span>
          <span>Aktualisiert: {new Date(episode.updated_at).toLocaleDateString('de-DE')}</span>
        </div>
      </div>
    </div>
  );
}
