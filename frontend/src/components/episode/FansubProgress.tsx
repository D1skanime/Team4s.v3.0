'use client';

import type { FansubProgress as FansubProgressType } from '@/types';
import styles from './FansubProgress.module.css';

interface Props {
  progress: FansubProgressType;
}

const STEPS = [
  { key: 'raw' as const, label: 'Raw' },
  { key: 'translate' as const, label: 'Ubersetzung' },
  { key: 'time' as const, label: 'Timing' },
  { key: 'typeset' as const, label: 'Typeset' },
  { key: 'logo' as const, label: 'Logo' },
  { key: 'edit' as const, label: 'Edit' },
  { key: 'karatime' as const, label: 'Kara-Timing' },
  { key: 'karafx' as const, label: 'Kara-FX' },
  { key: 'qc' as const, label: 'QC' },
  { key: 'encode' as const, label: 'Encode' },
];

function getProgressColor(value: number): string {
  if (value === 0) return 'var(--status-aborted)';
  if (value < 50) return 'var(--status-licensed)';
  if (value < 100) return 'var(--status-ongoing)';
  return 'var(--status-done)';
}

export function FansubProgress({ progress }: Props) {
  // Check if all values are 0 (no progress data)
  const hasProgress = STEPS.some(step => progress[step.key] > 0);

  if (!hasProgress) {
    return null;
  }

  // Calculate overall progress
  const totalProgress = STEPS.reduce((sum, step) => sum + progress[step.key], 0);
  const averageProgress = Math.round(totalProgress / STEPS.length);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Fansub Fortschritt</h3>
        <span className={styles.overall}>{averageProgress}%</span>
      </div>
      <div className={styles.progressList}>
        {STEPS.map(step => {
          const value = progress[step.key];
          return (
            <div key={step.key} className={styles.progressItem}>
              <div className={styles.progressLabel}>
                <span>{step.label}</span>
                <span className={styles.progressValue}>{value}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${value}%`,
                    backgroundColor: getProgressColor(value),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
