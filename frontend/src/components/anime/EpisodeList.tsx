'use client';

import Link from 'next/link';
import { Play, Download, Eye, ExternalLink, Lock, EyeOff, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import type { Episode } from '@/types';
import styles from './EpisodeList.module.css';

interface EpisodeListProps {
  episodes: Episode[];
  total: number;
}

function getOverallProgress(progress: Episode['progress']): number {
  const values = [
    progress.raw,
    progress.translate,
    progress.time,
    progress.typeset,
    progress.logo,
    progress.edit,
    progress.karatime,
    progress.karafx,
    progress.qc,
    progress.encode,
  ];
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function getStatusIcon(status: Episode['status']) {
  switch (status) {
    case 'public':
      return <CheckCircle size={16} className={styles.statusPublic} />;
    case 'private':
      return <Lock size={16} className={styles.statusPrivate} />;
    case 'disabled':
      return <EyeOff size={16} className={styles.statusDisabled} />;
    default:
      return <Clock size={16} />;
  }
}

function getStatusLabel(status: Episode['status']): string {
  switch (status) {
    case 'public':
      return 'Verfuegbar';
    case 'private':
      return 'Privat';
    case 'disabled':
      return 'Deaktiviert';
    default:
      return status;
  }
}

export function EpisodeList({ episodes, total }: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Keine Episoden verfuegbar.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.count}>{total} Episoden</span>
      </div>

      <div className={styles.list}>
        {episodes.map((episode) => {
          const overallProgress = getOverallProgress(episode.progress);
          const isComplete = overallProgress === 100;
          const hasStreams = episode.stream_links && episode.stream_links.length > 0;
          const isPublic = episode.status === 'public';

          return (
            <div
              key={episode.id}
              className={`${styles.episode} ${!isPublic ? styles.unavailable : ''}`}
            >
              <div className={styles.episodeMain}>
                <div className={styles.episodeNumber}>
                  <span className={styles.epLabel}>EP</span>
                  <span className={styles.epNum}>{episode.episode_number}</span>
                </div>

                <div className={styles.episodeInfo}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.title}>
                      {episode.title || `Episode ${episode.episode_number}`}
                    </h3>
                    <div className={styles.statusBadge} title={getStatusLabel(episode.status)}>
                      {getStatusIcon(episode.status)}
                    </div>
                  </div>

                  {episode.filename && (
                    <p className={styles.filename}>{episode.filename}</p>
                  )}

                  <div className={styles.stats}>
                    <span className={styles.stat}>
                      <Eye size={14} />
                      {episode.view_count.toLocaleString('de-DE')}
                    </span>
                    <span className={styles.stat}>
                      <Download size={14} />
                      {episode.download_count.toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  {!isComplete && (
                    <div className={styles.progressWrapper}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${overallProgress}%` }}
                        />
                      </div>
                      <span className={styles.progressText}>{overallProgress}%</span>
                    </div>
                  )}

                  {isPublic && hasStreams && (
                    <div className={styles.streamLinks}>
                      {episode.stream_links.slice(0, 2).map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.streamLink}
                          title={`Stream ${index + 1}`}
                        >
                          <Play size={16} />
                        </a>
                      ))}
                      {episode.stream_links.length > 2 && (
                        <span className={styles.moreLinks}>
                          +{episode.stream_links.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {isPublic && !hasStreams && isComplete && (
                    <span className={styles.noStreams}>Keine Streams</span>
                  )}

                  <Link href={`/episode/${episode.id}`} className={styles.detailLink} title="Details anzeigen">
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>

              {!isComplete && (
                <div className={styles.progressDetails}>
                  <ProgressItem label="Raw" value={episode.progress.raw} />
                  <ProgressItem label="TL" value={episode.progress.translate} />
                  <ProgressItem label="Time" value={episode.progress.time} />
                  <ProgressItem label="TS" value={episode.progress.typeset} />
                  <ProgressItem label="Logo" value={episode.progress.logo} />
                  <ProgressItem label="Edit" value={episode.progress.edit} />
                  <ProgressItem label="KT" value={episode.progress.karatime} />
                  <ProgressItem label="KFX" value={episode.progress.karafx} />
                  <ProgressItem label="QC" value={episode.progress.qc} />
                  <ProgressItem label="Enc" value={episode.progress.encode} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressItem({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v === 100) return 'var(--color-success)';
    if (v > 0) return 'var(--color-warning)';
    return 'var(--color-text-muted)';
  };

  return (
    <div className={styles.progressItem} title={`${label}: ${value}%`}>
      <span className={styles.progressLabel}>{label}</span>
      <span
        className={styles.progressValue}
        style={{ color: getColor(value) }}
      >
        {value}%
      </span>
    </div>
  );
}
