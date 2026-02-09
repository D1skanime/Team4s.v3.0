'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationBanner } from '@/components/auth';
import styles from './GlobalBanner.module.css';

// Paths where the banner should not be shown
const EXCLUDED_PATHS = [
  '/verify-email',
  '/login',
  '/register',
];

export function GlobalBanner() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Check if we should show the email verification banner
  const shouldShowVerificationBanner =
    isAuthenticated &&
    user &&
    !user.email_verified &&
    !dismissed &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path));

  if (!shouldShowVerificationBanner) {
    return null;
  }

  return (
    <div className={styles.bannerContainer}>
      <div className="container">
        <EmailVerificationBanner
          onDismiss={() => setDismissed(true)}
          dismissible={true}
        />
      </div>
    </div>
  );
}
