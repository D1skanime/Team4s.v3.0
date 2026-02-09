'use client';

import { User } from 'lucide-react';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileCard({ username, displayName, avatarUrl, createdAt }: ProfileCardProps) {
  const name = displayName || username;
  const initials = getInitials(name);

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className={styles.avatarImage} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {initials || <User size={48} />}
          </div>
        )}
      </div>
      <div className={styles.info}>
        <h1 className={styles.displayName}>{name}</h1>
        {displayName && displayName !== username && (
          <p className={styles.username}>@{username}</p>
        )}
        <p className={styles.memberSince}>
          Mitglied seit {formatMemberSince(createdAt)}
        </p>
      </div>
    </div>
  );
}
