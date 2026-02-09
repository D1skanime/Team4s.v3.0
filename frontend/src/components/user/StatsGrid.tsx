'use client';

import { CheckCircle, Eye, Star, MessageSquare } from 'lucide-react';
import type { UserStats } from '@/types';
import styles from './StatsGrid.module.css';

interface StatsGridProps {
  stats: UserStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper} style={{ color }}>
        {icon}
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{value.toLocaleString('de-DE')}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className={styles.grid}>
      <StatCard
        icon={<CheckCircle size={24} />}
        label="Gesehen"
        value={stats.anime_watched}
        color="var(--status-done)"
      />
      <StatCard
        icon={<Eye size={24} />}
        label="Schaue ich"
        value={stats.anime_watching}
        color="var(--status-ongoing)"
      />
      <StatCard
        icon={<Star size={24} />}
        label="Bewertungen"
        value={stats.ratings_count}
        color="var(--rating-color)"
      />
      <StatCard
        icon={<MessageSquare size={24} />}
        label="Kommentare"
        value={stats.comments_count}
        color="var(--accent-primary)"
      />
    </div>
  );
}
