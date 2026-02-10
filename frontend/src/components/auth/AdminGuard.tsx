'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { checkAdminAccess } from '@/lib/auth';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (authLoading) return;

      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      try {
        const hasAccess = await checkAdminAccess();
        setIsAdmin(hasAccess);

        if (!hasAccess) {
          router.push('/');
        }
      } catch {
        setIsAdmin(false);
        router.push('/');
      } finally {
        setIsChecking(false);
      }
    }

    checkAdmin();
  }, [authLoading, isAuthenticated, router]);

  const isLoading = authLoading || isChecking;

  if (isLoading) {
    return fallback || (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 60px)',
        color: 'var(--text-secondary)'
      }}>
        Laden...
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
