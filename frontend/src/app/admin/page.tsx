'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Film,
  PlayCircle,
  MessageSquare,
  Star,
  TrendingUp,
  Activity,
  Clock,
  Settings,
} from 'lucide-react';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { getDashboardStats, getRecentActivity } from '@/lib/auth';
import type { DashboardStats, RecentActivity } from '@/types';
import styles from './page.module.css';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `vor ${minutes} Min.`;
  }
  if (hours < 24) {
    return `vor ${hours} Std.`;
  }
  if (days < 7) {
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  }
  return date.toLocaleDateString('de-DE');
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'comment':
      return <MessageSquare size={16} />;
    case 'rating':
      return <Star size={16} />;
    case 'user':
      return <Users size={16} />;
    default:
      return <Activity size={16} />;
  }
}

function ActivityLabel({ type }: { type: string }) {
  switch (type) {
    case 'comment':
      return 'Kommentar';
    case 'rating':
      return 'Bewertung';
    case 'user':
      return 'Neuer User';
    default:
      return type;
  }
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, activityData] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(15),
        ]);
        setStats(statsData);
        setActivities(activityData.activities);
      } catch (err) {
        setError('Fehler beim Laden der Dashboard-Daten');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Dashboard wird geladen...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Unbekannter Fehler'}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Statistiken und Aktivitaeten</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/anime" className={styles.manageButton}>
            <Film size={18} />
            Anime
          </Link>
          <Link href="/admin/episodes" className={styles.manageButton}>
            <PlayCircle size={18} />
            Episoden
          </Link>
          <Link href="/admin/users" className={styles.manageButton}>
            <Users size={18} />
            Benutzer
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.total_users)}</span>
            <span className={styles.statLabel}>Benutzer</span>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={14} />
            <span>+{stats.new_users} diese Woche</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Film size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.total_anime)}</span>
            <span className={styles.statLabel}>Anime</span>
          </div>
          <div className={styles.statMeta}>
            <span>{stats.anime_by_status.airing} laufend</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <PlayCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.total_episodes)}</span>
            <span className={styles.statLabel}>Episoden</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <MessageSquare size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.total_comments)}</span>
            <span className={styles.statLabel}>Kommentare</span>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={14} />
            <span>+{stats.new_comments} diese Woche</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Star size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.total_ratings)}</span>
            <span className={styles.statLabel}>Bewertungen</span>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={14} />
            <span>+{stats.new_ratings} diese Woche</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Activity size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatNumber(stats.active_users)}</span>
            <span className={styles.statLabel}>Aktive User</span>
          </div>
          <div className={styles.statMeta}>
            <span>letzte 30 Tage</span>
          </div>
        </div>
      </div>

      {/* Content Breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Anime nach Status</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusValue}>{stats.anime_by_status.airing}</span>
            <span className={styles.statusLabel}>Laufend</span>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusValue}>{stats.anime_by_status.completed}</span>
            <span className={styles.statusLabel}>Abgeschlossen</span>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusValue}>{stats.anime_by_status.upcoming}</span>
            <span className={styles.statusLabel}>Angekuendigt</span>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusValue}>{stats.anime_by_status.unknown}</span>
            <span className={styles.statusLabel}>Unbekannt</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Letzte Aktivitaeten</h2>
        <div className={styles.activityList}>
          {activities.length === 0 ? (
            <div className={styles.noActivity}>Keine Aktivitaeten vorhanden</div>
          ) : (
            activities.map((activity, index) => (
              <div key={`${activity.type}-${activity.user_id}-${index}`} className={styles.activityItem}>
                <div className={`${styles.activityIcon} ${styles[`activity${activity.type}`]}`}>
                  <ActivityIcon type={activity.type} />
                </div>
                <div className={styles.activityContent}>
                  <span className={styles.activityUser}>{activity.username}</span>
                  <span className={styles.activityType}>
                    <ActivityLabel type={activity.type} />
                  </span>
                  {activity.anime_title && (
                    <span className={styles.activityAnime}>{activity.anime_title}</span>
                  )}
                </div>
                <div className={styles.activityTime}>
                  <Clock size={12} />
                  <span>{formatDate(activity.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
