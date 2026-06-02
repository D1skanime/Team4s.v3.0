"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from "@/components/ui";
import { ApiError, getMyFansubGroupDetail } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import type {
  ContributorGroupDetail,
  ContributorReleaseVersionSummary,
} from "@/types/contributor";

import styles from "../page.module.css";

interface PageProps {
  params?: {
    id?: string;
  };
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatReleaseTitle(release: ContributorReleaseVersionSummary): string {
  const title = release.episode_title?.trim();
  return title
    ? `Episode ${release.episode_number}: ${title}`
    : `Episode ${release.episode_number}`;
}

function readGroupId(params?: PageProps["params"]): number {
  const paramID = typeof params?.id === "string" ? params.id : "";
  if (paramID.trim()) {
    return Number.parseInt(paramID, 10);
  }

  if (typeof window === "undefined") {
    return Number.NaN;
  }

  const match = window.location.pathname.match(
    /\/(?:admin\/my-groups|manage\/groups)\/(\d+)(?:\/)?$/,
  );
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

export default function AdminMyGroupDetailPage({ params }: PageProps) {
  const { hasAccessToken, isClientInitialized } = useAuthSession();
  const groupId = readGroupId(params);
  const [detail, setDetail] = useState<ContributorGroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!isClientInitialized) {
      return;
    }

    if (!hasAccessToken) {
      setError(
        "Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.",
      );
      setIsLoading(false);
      return;
    }
    if (!Number.isFinite(groupId) || groupId <= 0) {
      setError("Ungültige Gruppen-ID.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await getMyFansubGroupDetail(groupId);
      setDetail(response.data);
    } catch (loadError) {
      setError(
        readErrorMessage(
          loadError,
          "Gruppendetail konnte nicht geladen werden.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId, hasAccessToken, isClientInitialized]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p>
          <Link href="/manage/groups">Meine Gruppen</Link>
          <span> / Detail</span>
        </p>

        {isLoading ? (
          <LoadingState
            title="Gruppendetail wird geladen"
            description="Team4s prüft den konkreten Gruppen- und Release-Scope."
          />
        ) : null}

        {!isLoading && error ? (
          <ErrorState
            title="Gruppendetail konnte nicht geladen werden"
            description={error}
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => void loadDetail()}
              >
                Erneut versuchen
              </Button>
            }
          />
        ) : null}

        {!isLoading && !error && detail ? (
          <>
            <PageHeader
              eyebrow="Gruppenverwaltung"
              title={detail.group.name}
              description="Release-, Media- und Notiz-Zugriffe bleiben capability-gesteuert und verwenden die bestehende Team4s-Editorfläche sicher weiter."
              actions={
                <>
                  <Button
                    href="/manage/groups"
                    variant="secondary"
                    size="sm"
                    leftIcon={<ArrowLeft size={14} />}
                  >
                    Zurück
                  </Button>
                </>
              }
            />

            <Card variant="section">
              <SectionHeader
                eyebrow="Scope"
                title="Berechtigungen und Kontext"
                description="Capabilities kommen aus der zentralen Permission Engine. Historische Beiträge stehen daneben, erzeugen aber keine Rechte."
              />
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span>Status</span>
                  <strong>{detail.group.status}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Rollen</span>
                  <strong>
                    {detail.group.app_member_roles.length > 0
                      ? detail.group.app_member_roles.join(", ")
                      : "Keine aktiven Rollen"}
                  </strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Anime</span>
                  <strong>{detail.group.anime_count}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Release-Versionen</span>
                  <strong>{detail.group.release_version_count}</strong>
                </div>
              </div>
              <Toolbar
                leading={
                  <>
                    <Badge
                      variant={
                        detail.group.capabilities.can_view_releases
                          ? "success"
                          : "muted"
                      }
                    >
                      Releases ansehen
                    </Badge>
                    <Badge
                      variant={
                        detail.group.capabilities.can_upload_release_media
                          ? "success"
                          : "muted"
                      }
                    >
                      Release-Media hochladen
                    </Badge>
                    <Badge
                      variant={
                        detail.group.capabilities.can_manage_members
                          ? "success"
                          : "muted"
                      }
                    >
                      Mitglieder verwalten
                    </Badge>
                  </>
                }
                trailing={<Badge variant="muted">Credits sind read-only</Badge>}
              />
            </Card>

            <Card variant="section">
              <SectionHeader
                eyebrow="Meine Beteiligungen"
                title="Historische Credits"
                description="Diese Daten prüfen Phase 47 zurück: Kontext ja, Berechtigung nein."
              />
              {detail.contributions.length === 0 ? (
                <EmptyState
                  title="Keine historischen Credits für diese Gruppe"
                  description="Der Contributor-Zugriff basiert weiterhin ausschließlich auf App-Mitgliedschaften und Capabilities."
                />
              ) : (
                <div className={styles.tableSurface}>
                  <Table
                    variant="withActions"
                    containerClassName={styles.tableWrapHeaderLineWine}
                  >
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Rolle</TableHeaderCell>
                        <TableHeaderCell>Releases</TableHeaderCell>
                        <TableHeaderCell>Hinweis</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.contributions.map((item) => (
                        <TableRow
                          key={`${item.fansub_group_id}:${item.role_name}`}
                        >
                          <TableCell>{item.role_label}</TableCell>
                          <TableCell>{item.release_count}</TableCell>
                          <TableCell>
                            <Badge variant="muted">Keine App-Rechte</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            <Card variant="section">
              <SectionHeader
                eyebrow="Anime & Releases"
                title="Release-native Arbeitsfläche"
                description="Die Liste ist über `release_version_groups.fansub_group_id` gruppen- und coop-sicher gescoped."
              />
              {detail.anime.length === 0 ? (
                <EmptyState
                  title="Noch keine Release-Kontexte"
                  description="Für diese Gruppe sind keine Anime- oder Release-Versionen sichtbar."
                />
              ) : (
                <div className={styles.stack}>
                  {detail.anime.map((anime) => (
                    <Card
                      key={anime.id}
                      variant="nested"
                      className={styles.animeAccordionCard}
                    >
                      <div className={styles.animeHeader}>
                        <div
                          className={styles.groupBanner}
                          style={
                            anime.header_image
                              ? {
                                  backgroundImage: `linear-gradient(180deg, rgba(38, 48, 67, 0.12), rgba(38, 48, 67, 0.16)), url(${anime.header_image})`,
                                }
                              : undefined
                          }
                        >
                          {anime.header_image
                            ? null
                            : anime.title.slice(0, 12).toUpperCase()}
                        </div>
                        <div className={styles.groupMeta}>
                          <strong>{anime.title}</strong>
                          <span className={styles.groupType}>{anime.type}</span>
                          <span className={styles.groupCount}>
                            {anime.release_count} Releases ·{" "}
                            {anime.release_version_count} Versionen
                          </span>
                        </div>
                      </div>

                      <div
                        className={`${styles.animeReleaseTable} ${styles.tableSurface}`}
                      >
                        <Table
                          variant="withActions"
                          containerClassName={styles.tableWrapHeaderLineWine}
                        >
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell>Episode</TableHeaderCell>
                              <TableHeaderCell>Version</TableHeaderCell>
                              <TableHeaderCell>Media</TableHeaderCell>
                              <TableHeaderCell>Aktionen</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {anime.releases.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  Keine Release-Versionen sichtbar.
                                </TableCell>
                              </TableRow>
                            ) : (
                              anime.releases.map((release) => (
                                <Fragment key={release.release_version_id}>
                                  <TableRow>
                                    <TableCell>
                                      <div className={styles.releaseTitle}>
                                        <strong>
                                          {formatReleaseTitle(release)}
                                        </strong>
                                        {release.is_coop ? (
                                          <span>Coop-Release</span>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                    <TableCell>{release.version}</TableCell>
                                    <TableCell>
                                      <div className={styles.badgeRow}>
                                        <Badge
                                          variant={
                                            release.media_count > 0
                                              ? "success"
                                              : "muted"
                                          }
                                        >
                                          {release.media_count} Medien
                                        </Badge>
                                        <Badge
                                          variant={
                                            release.has_theme_assets
                                              ? "success"
                                              : "warning"
                                          }
                                        >
                                          {release.has_theme_assets
                                            ? "Themes vorhanden"
                                            : "Themes offen"}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className={styles.rowActions}>
                                        {detail.group.capabilities
                                          .can_upload_release_media ||
                                        detail.group.capabilities
                                          .can_edit_release_descriptions ? (
                                          <Button
                                            href={`/admin/episode-versions/${release.release_version_id}/edit?tab=media`}
                                            variant="secondary"
                                            size="sm"
                                            rightIcon={
                                              <ExternalLink size={14} />
                                            }
                                          >
                                            Arbeitsfläche
                                          </Button>
                                        ) : null}
                                        {detail.group.capabilities
                                          .can_upload_release_media ? (
                                          <Button
                                            href={`/admin/episode-versions/${release.release_version_id}/edit?tab=media`}
                                            size="sm"
                                          >
                                            Media
                                          </Button>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </Fragment>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <GroupHistorySection fansubGroupId={groupId} />
          </>
        ) : null}
      </div>
    </main>
  );
}
