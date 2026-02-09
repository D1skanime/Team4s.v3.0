'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { PasswordForm } from '@/components/settings/PasswordForm';
import { DeleteAccountForm } from '@/components/settings/DeleteAccountForm';
import styles from './page.module.css';

type Tab = 'profile' | 'password' | 'delete';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login?redirect=/settings');
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Laden...</div>
      </div>
    );
  }

  const handleProfileUpdate = (updatedData: { display_name?: string; avatar_url?: string }) => {
    // Refresh user data in context
    refreshUser();
  };


  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profil', icon: <User size={18} /> },
    { id: 'password', label: 'Passwort', icon: <Lock size={18} /> },
    { id: 'delete', label: 'Account loeschen', icon: <Trash2 size={18} /> },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Einstellungen</h1>
        <p className={styles.subtitle}>Verwalte dein Konto und deine Praeferenzen</p>
      </div>

      <div className={styles.content}>
        <nav className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.panel}>
          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Profil bearbeiten</h2>
              <p className={styles.sectionDescription}>
                Aktualisiere deinen Anzeigenamen und Avatar
              </p>
              <ProfileForm
                displayName={user.display_name}
                avatarUrl={user.avatar_url}
                onSuccess={handleProfileUpdate}
              />
            </div>
          )}

          {activeTab === 'password' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Passwort aendern</h2>
              <p className={styles.sectionDescription}>
                Aendere dein Passwort fuer mehr Sicherheit
              </p>
              <PasswordForm />
            </div>
          )}

          {activeTab === 'delete' && (
            <div className={styles.section}>
              <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
                Account loeschen
              </h2>
              <p className={styles.sectionDescription}>
                Diese Aktion kann nicht rueckgaengig gemacht werden. Alle deine Daten werden permanent geloescht.
              </p>
              <DeleteAccountForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
