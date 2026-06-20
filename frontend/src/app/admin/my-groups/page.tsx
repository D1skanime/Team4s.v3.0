"use client";

import { ArrowRight, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
  Toolbar,
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

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "warning";
    case "dissolved":
      return "danger";
    default:
      return "muted";
  }
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

  const activeGroups = useMemo(
    () =>
      groups.filter((group) => group.capabilities.can_open_contributor_group),
    [groups],
  );
  const historicalGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          !group.capabilities.can_open_contributor_group &&
          group.has_historical_link,
      ),
    [groups],
  );
  const releaseVersionCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.release_version_count, 0),
    [groups],
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p>Meine Gruppen</p>

        <PageHeader
          eyebrow="Meine Gruppen"
          title="Meine Gruppen"
          description="Deine aktiven Fansub-Gruppen und historischen Beteiligungen."
          actions={
            <>
              <Button href="/me/profile" variant="secondary" size="sm">
                Mein Profil
              </Button>
              <Button href="/auth" variant="ghost" size="sm">
                Account & Logout
              </Button>
            </>
          }
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
          <div className={styles.overviewGrid}>
            <Card variant="section">
              <SectionHeader
                eyebrow="Überblick"
                title="Gruppenkontext"
                description=""
              />
              <div className={styles.metricGrid}>
                <div className={styles.metricItem}>
                  <span>Aktive Gruppen</span>
                  <strong>{activeGroups.length}</strong>
                </div>
                <div className={styles.metricItem}>
                  <span>Historische Links</span>
                  <strong>{historicalGroups.length}</strong>
                </div>
                <div className={styles.metricItem}>
                  <span>Release-Versionen</span>
                  <strong>{releaseVersionCount}</strong>
                </div>
              </div>
            </Card>

            <Card variant="section">
              <SectionHeader
                eyebrow="Navigation"
                title="Schnellzugriff"
                description=""
              />
              <Toolbar
                leading={
                  <>
                    <Badge variant="info">
                      {groups.length} Gruppen sichtbar
                    </Badge>
                    <Badge variant="muted">Historische Links geben keine Rechte</Badge>
                  </>
                }
                trailing={
                  <Button
                    href="/me/profile"
                    variant="secondary"
                    leftIcon={<Users size={16} />}
                  >
                    Profil öffnen
                  </Button>
                }
              />
            </Card>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <Card variant="section">
            <SectionHeader
              eyebrow="Gruppen"
              title="Eigene Fansub-Gruppen"
              description="Gruppen mit aktiver Mitgliedschaft können geöffnet werden."
            />
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
                            {group.anime_count} Anime ·{" "}
                            {group.release_version_count} Versionen ·{" "}
                            {activeTimeLabel(group)}
                          </span>
                          <div className={styles.badgeRow}>
                            <Badge variant={statusVariant(group.status)}>
                              {group.status}
                            </Badge>
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
