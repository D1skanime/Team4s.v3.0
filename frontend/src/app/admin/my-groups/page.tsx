"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
} from "@/components/ui";
import { ApiError, getMyFansubGroups } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import type { ContributorGroupOverview } from "@/types/contributor";

import styles from "./page.module.css";

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function membershipLabel(group: ContributorGroupOverview): string {
  if (group.membership_status === "platform_admin") return "Platform Admin";
  if (group.app_member_status === "active") return "Aktiv";
  if (group.app_member_status === "disabled") return "Deaktiviert";
  if (group.has_historical_link) return "Historisch";
  return "Kein aktiver Zugriff";
}

function activeTimeLabel(group: ContributorGroupOverview): string {
  if (group.joined_year && group.left_year)
    return `${group.joined_year} bis ${group.left_year}`;
  if (group.joined_year) return `seit ${group.joined_year}`;
  if (group.active_from)
    return `seit ${new Date(group.active_from).toLocaleDateString("de-DE")}`;
  return "Nicht datiert";
}

export default function AdminMyGroupsPage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession();
  const [groups, setGroups] = useState<ContributorGroupOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAuthSession = hasAccessToken || hasRefreshToken;

  const loadGroups = useCallback(async () => {
    if (!isClientInitialized) {
      return;
    }

    if (!hasAuthSession) {
      setError(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await getMyFansubGroups();
      setGroups(response.data);
    } catch (loadError) {
      setError(
        readErrorMessage(
          loadError,
          "Meine Gruppen konnten nicht geladen werden.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasAuthSession, isClientInitialized]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PageHeader
          title="Meine Gruppen"
          description="Deine aktiven Fansub-Gruppen und früheren Beteiligungen."
        />

        {isLoading ? (
          <LoadingState
            title="Meine Gruppen werden geladen"
            description="Einen Moment bitte."
          />
        ) : null}

        {!isLoading && error ? (
          <ErrorState
            title="Meine Gruppen konnten nicht geladen werden"
            description={error}
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => void loadGroups()}
              >
                Erneut versuchen
              </Button>
            }
          />
        ) : null}

        {!isLoading && !error ? (
          <Card variant="section">
            <SectionHeader title="Eigene Fansub-Gruppen" />
            {groups.length === 0 ? (
              <EmptyState
                title="Noch keine Gruppen"
                description="Noch keine Gruppen verknüpft."
              />
            ) : (
              <ul className={styles.groupList}>
                {groups.map((group) => (
                  <li key={group.id}>
                    <Card variant="nested" className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <div
                          className={styles.groupBanner}
                          style={
                            group.banner_url
                              ? {
                                  backgroundImage: `linear-gradient(180deg, rgba(38, 48, 67, 0.12), rgba(38, 48, 67, 0.16)), url(${group.banner_url})`,
                                }
                              : undefined
                          }
                        >
                          {group.banner_url
                            ? null
                            : group.name.slice(0, 12).toUpperCase()}
                        </div>
                        <div className={styles.groupMeta}>
                          <strong>{group.name}</strong>
                          <span className={styles.groupCount}>
                            {group.anime_count} Anime · {activeTimeLabel(group)}
                          </span>
                          <div className={styles.badgeRow}>
                            <Badge
                              variant={
                                group.capabilities.can_open_contributor_group
                                  ? "success"
                                  : "muted"
                              }
                            >
                              {membershipLabel(group)}
                            </Badge>
                            {group.app_member_roles.map((role) => (
                              <Badge key={role} variant="info">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <div className={styles.rowActions}>
                            {group.capabilities.can_open_contributor_group ? (
                              <Button
                                href={`/admin/my-groups/${group.id}`}
                                size="sm"
                                rightIcon={<ArrowRight size={14} />}
                              >
                                Öffnen
                              </Button>
                            ) : (
                              <Button
                                variant="subtle"
                                size="sm"
                                disabled
                                rightIcon={<ArrowRight size={14} />}
                              >
                                Öffnen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </main>
  );
}
