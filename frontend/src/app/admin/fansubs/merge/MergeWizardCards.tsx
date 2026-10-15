"use client";

import Image from "next/image";

import { FansubGroup } from "@/types/fansub";

import sharedStyles from "../../admin.module.css";
import mergeStyles from "./MergeWizard.module.css";

const styles = { ...sharedStyles, ...mergeStyles };

export interface CountSummary {
  animeRelations: number;
  episodeVersions: number;
  members: number;
  aliases: number;
}

export function GroupRowCard({
  group,
  selectedAs,
}: {
  group: FansubGroup;
  selectedAs: "target" | "source" | null;
}) {
  const typeLabel = "Gruppe";
  const statusLabel =
    group.status === "active"
      ? "aktiv"
      : group.status === "inactive"
        ? "inaktiv"
        : "aufgelöst";

  return (
    <div className={styles.mergeGroupCardContent}>
      {group.logo_url && (
        <Image
          src={group.logo_url}
          alt={`${group.name} Logo`}
          className={styles.mergeGroupLogo}
          width={44}
          height={44}
          unoptimized
        />
      )}
      <div className={styles.mergeGroupMain}>
        <p className={styles.mergeGroupName}>{group.name}</p>
        <p className={styles.mergeGroupSlug}>{group.slug}</p>
        <div className={styles.mergeGroupBadges}>
          <span className={styles.mergeMetaBadge}>{typeLabel}</span>
          <span className={styles.mergeMetaBadge}>{statusLabel}</span>
          {selectedAs && (
            <span className={styles.mergeMetaBadgeSelected}>
              {selectedAs === "target" ? "Ziel" : "Quelle"}
            </span>
          )}
        </div>
        <div className={styles.mergeStatGrid}>
          <span>Anime: {group.anime_relations_count}</span>
          <span>Versionen: {group.release_versions_count}</span>
          <span>Members: {group.members_count}</span>
          <span>Tags: {group.aliases_count}</span>
        </div>
      </div>
    </div>
  );
}

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.mergeKpiCard}>
      <p className={styles.mergeKpiLabel}>{label}</p>
      <p className={styles.mergeKpiValue}>{value}</p>
    </div>
  );
}

export function ConflictRow({
  title,
  summary,
  details = [],
}: {
  title: string;
  summary: string;
  details?: string[];
}) {
  return (
    <div className={styles.mergeConflictRow}>
      <p className={styles.mergeConflictTitle}>{title}</p>
      <p className={styles.mergeConflictSummary}>{summary}</p>
      {details.length > 0 && (
        <ul className={styles.mergeCompactList}>
          {details.slice(0, 10).map((item) => (
            <li key={`${title}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function sumGroupCounts(groups: FansubGroup[]): CountSummary {
  return groups.reduce(
    (acc, group) => ({
      animeRelations: acc.animeRelations + group.anime_relations_count,
      episodeVersions: acc.episodeVersions + group.release_versions_count,
      members: acc.members + group.members_count,
      aliases: acc.aliases + group.aliases_count,
    }),
    emptyCountSummary(),
  );
}

export function emptyCountSummary(): CountSummary {
  return {
    animeRelations: 0,
    episodeVersions: 0,
    members: 0,
    aliases: 0,
  };
}
