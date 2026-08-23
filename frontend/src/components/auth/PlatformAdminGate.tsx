"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import type { CurrentUserData } from "@/types/auth";

interface PlatformAdminGateProps {
  children: ReactNode;
}

export function PlatformAdminGate({ children }: PlatformAdminGateProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession();
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resolvedUserRef = useRef<CurrentUserData | null>(null);

  useEffect(() => {
    if (!isClientInitialized) return;

    let cancelled = false;
    async function resolveAdminUser() {
      if (!hasAccessToken && !hasRefreshToken) {
        if (!cancelled) {
          resolvedUserRef.current = null;
          setIsLoading(false);
          setCurrentUser(null);
          setErrorMessage("Anmeldung erforderlich.");
        }
        return;
      }

      if (resolvedUserRef.current === null) {
        setIsLoading(true);
      }
      setErrorMessage(null);
      try {
        const response = await getCurrentUser();
        if (!cancelled) {
          resolvedUserRef.current = response.data;
          setCurrentUser(response.data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Berechtigung konnte nicht geprüft werden.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void resolveAdminUser();

    return () => {
      cancelled = true;
    };
  }, [hasAccessToken, hasRefreshToken, isClientInitialized]);

  if (isLoading || !isClientInitialized) {
    return (
      <main style={{ padding: 32 }}>
        <p>Berechtigungen werden geladen...</p>
      </main>
    );
  }

  if (errorMessage || !currentUser?.is_platform_admin) {
    return (
      <main style={{ padding: 32, display: "grid", gap: 16 }}>
        <p>Diese Ansicht ist dem Team4s-Admin vorbehalten.</p>
        <p>
          <Link href="/me/profile">Zum Profil</Link>
          <span> | </span>
          <Link href="/login">Zur Anmeldung</Link>
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
