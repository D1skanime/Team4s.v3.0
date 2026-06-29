"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { getCurrentUser, getFansubGroupCapabilities } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import type { FansubGroupCapabilities } from "@/types/fansub";
import { hasFansubWorkspaceAccess } from "./fansubEditAccess";
import type { FansubEditAccessContext } from "./fansubEditTypes";

const PLATFORM_ADMIN_CAPABILITIES: FansubGroupCapabilities = {
  can_edit_group: true,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_edit_notes: true,
  can_view_invitations: true,
  can_create_invitation: true,
  can_cancel_invitation: true,
  can_view_releases: true,
  can_view_release_media: true,
  can_upload_release_media: true,
  can_edit_release_notes: true,
  can_view_group_media: true,
  can_upload_group_media: true,
  can_update_group_media: true,
  can_delete_own_group_media: true,
  can_delete_group_media: true,
  can_reorder_group_media: true,
};

export function FansubEditAccessGate({
  children,
  fansubID,
}: {
  children: (context: FansubEditAccessContext) => ReactNode;
  fansubID: number;
}) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [capabilities, setCapabilities] =
    useState<FansubGroupCapabilities | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isClientInitialized) return;

    let cancelled = false;
    async function resolveAccess() {
      if (!hasAuthSession) {
        if (!cancelled) {
          setIsAllowed(false);
          setIsPlatformAdmin(false);
          setCapabilities(null);
          setIsLoading(false);
          setErrorMessage("Anmeldung erforderlich.");
        }
        return;
      }

      if (!Number.isFinite(fansubID) || fansubID <= 0) {
        if (!cancelled) {
          setIsAllowed(false);
          setIsPlatformAdmin(false);
          setCapabilities(null);
          setIsLoading(false);
          setErrorMessage("Ungültige Fansub-ID.");
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const currentUserResponse = await getCurrentUser();
        if (currentUserResponse.data.is_platform_admin) {
          if (!cancelled) {
            setIsAllowed(true);
            setIsPlatformAdmin(true);
            setCapabilities(PLATFORM_ADMIN_CAPABILITIES);
          }
          return;
        }

        const capabilitiesResponse =
          await getFansubGroupCapabilities(fansubID);
        if (!cancelled) {
          setIsPlatformAdmin(false);
          setCapabilities(capabilitiesResponse.data);
          setIsAllowed(hasFansubWorkspaceAccess(capabilitiesResponse.data));
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setIsAllowed(false);
          setIsPlatformAdmin(false);
          setCapabilities(null);
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

    void resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [fansubID, hasAuthSession, isClientInitialized]);

  if (isLoading || !isClientInitialized) {
    return (
      <main style={{ padding: 32 }}>
        <p>Berechtigungen werden geladen...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main style={{ padding: 32, display: "grid", gap: 16 }}>
        <p>
          Du hast für diese Fansub-Gruppe keinen Zugriff auf den
          Arbeitsbereich.
        </p>
        {errorMessage ? <p>{errorMessage}</p> : null}
        <p>
          <Link href="/manage/groups">Zu Meine Gruppen</Link>
          <span> | </span>
          <Link href="/login">Zur Anmeldung</Link>
        </p>
      </main>
    );
  }

  return <>{children({ isPlatformAdmin, capabilities })}</>;
}
