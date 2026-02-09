'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Settings, AlertCircle } from 'lucide-react';
import { ProfileCard } from '@/components/user/ProfileCard';
import { StatsGrid } from '@/components/user/StatsGrid';
import { useAuth } from '@/contexts/AuthContext';
import { authClient, AuthError } from '@/lib/auth';
import type { UserProfile } from '@/types';
import styles from './page.module.css';

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = isAuthenticated && currentUser?.username.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    async function fetchProfile() {
      if (!username) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await authClient.getUserProfile(username);
        setProfile(data);
      } catch (err) {
        if (err instanceof AuthError) {
          if (err.status === 404) {
            setError('Benutzer nicht gefunden');
          } else {
            setError(err.message);
          }
        } else {
          setError('Fehler beim Laden des Profils');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loading}>
          Profil wird geladen...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container">
        <div className={styles.error}>
          <AlertCircle size={48} />
          <h1>{error || 'Benutzer nicht gefunden'}</h1>
          <p>Das angeforderte Profil konnte nicht geladen werden.</p>
          <Link href="/" className={styles.backLink}>
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.page}>
        <div className={styles.header}>
          <ProfileCard
            username={profile.username}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            createdAt={profile.created_at}
          />
          {isOwnProfile && (
            <Link href="/settings" className={styles.settingsButton}>
              <Settings size={18} />
              <span>Einstellungen</span>
            </Link>
          )}
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Statistiken</h2>
          <StatsGrid stats={profile.stats} />
        </section>
      </div>
    </div>
  );
}
