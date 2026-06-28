import type { AnimeCoverage } from "@/lib/api";
import type {
  AdminAnimeTheme,
  AdminAnimeThemeSegment,
  AdminReleaseThemeAsset,
} from "@/types/admin";
import type { AnimeContribution } from "@/types/fansub";
import type { CoverageRoleMember } from "./CoverageMatrix";
import type { ReleaseSegmentCard } from "./fansubEditTypes";

export function animeFansubReleaseContextKey(
  fansubID: number,
  animeID: number,
): string {
  return `${fansubID}:${animeID}`;
}

export function buildAnimeCoverageMap(
  items: AnimeCoverage[],
): Map<number, AnimeCoverage> {
  const map = new Map<number, AnimeCoverage>();
  for (const item of items) {
    map.set(item.anime_id, item);
  }
  return map;
}

export function groupContributionMembersByRole(
  contributions: AnimeContribution[],
): Record<string, CoverageRoleMember[]> {
  const membersByRole: Record<string, CoverageRoleMember[]> = {};
  const seenByRole: Record<string, Set<number>> = {};

  for (const contribution of contributions) {
    for (const roleCode of contribution.role_codes ?? []) {
      seenByRole[roleCode] ??= new Set<number>();
      if (seenByRole[roleCode].has(contribution.member_id)) continue;

      seenByRole[roleCode].add(contribution.member_id);
      membersByRole[roleCode] ??= [];
      membersByRole[roleCode].push({
        memberId: contribution.member_id,
        displayName:
          contribution.member_display_name?.trim() ||
          `Mitglied #${contribution.member_id}`,
        avatarUrl: contribution.member_avatar_url ?? null,
      });
    }
  }

  return membersByRole;
}

export function uniqueContributionPeople(contributionRows: AnimeContribution[]) {
  const seen = new Set<number>();
  return contributionRows.filter((row) => {
    if (seen.has(row.member_id)) return false;
    seen.add(row.member_id);
    return true;
  });
}

export function uniqueProjectContributionPeople(contributionRows: AnimeContribution[]) {
  return uniqueContributionPeople(
    contributionRows.filter((row) => row.release_version_id == null),
  );
}

export function isJellyfinLocked(card: ReleaseSegmentCard): boolean {
  return card.segments.some(
    (item) =>
      item.source_type === "jellyfin_theme" ||
      item.playback_source_kind === "jellyfin",
  );
}

export function releaseAssetRequiredBySegment(
  segment: AdminAnimeThemeSegment,
): boolean {
  return segment.source_type === "release_asset";
}

export function releaseAssetRequirementLabel(
  segments: AdminAnimeThemeSegment[],
): string {
  const hasSegmentFallback = segments.some((segment) => {
    const sourceRef = segment.source_ref?.trim();
    return (
      Boolean(sourceRef) || segment.playback_source_kind === "uploaded_asset"
    );
  });

  return hasSegmentFallback
    ? "Segment-Fallback vorhanden - Upload für diese Fansubgruppe fehlt"
    : "Upload fehlt - Upload durch Fansubgruppe erforderlich";
}

export function releaseThemeSelectionKey(
  releaseID: number,
  themeID: number,
): string {
  return `${releaseID}:${themeID}`;
}

export function mapReleaseSegmentCards(
  themes: AdminAnimeTheme[],
  themeAssets: AdminReleaseThemeAsset[],
  segmentsByThemeID: Map<number, AdminAnimeThemeSegment[]>,
): ReleaseSegmentCard[] {
  const assetByThemeID = new Map(
    themeAssets.map((asset) => [asset.theme_id, asset]),
  );

  return themes.map((theme) => {
    const asset = assetByThemeID.get(theme.id);
    const segments = segmentsByThemeID.get(theme.id) ?? [];
    if (asset) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "release",
        segments,
        media_id: asset.media_id,
        public_url: asset.public_url,
        source_label: "Upload vorhanden",
      };
    }

    if (segments.some(releaseAssetRequiredBySegment)) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "missing",
        segments,
        source_label: releaseAssetRequirementLabel(segments),
      };
    }

    if (segments.length > 0) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "global",
        segments,
        source_label: `${segments.length} Segment${segments.length === 1 ? "" : "e"} global gesetzt`,
      };
    }

    return {
      theme_id: theme.id,
      theme_type_name: theme.theme_type_name,
      theme_title: theme.title,
      status: "missing",
      segments,
      source_label: "Noch kein Segment für diese Theme-Definition",
    };
  });
}

export function mergeReleaseThemeAssetCard(
  cards: ReleaseSegmentCard[],
  asset: AdminReleaseThemeAsset,
): ReleaseSegmentCard[] {
  const nextCard = (previous?: ReleaseSegmentCard): ReleaseSegmentCard => ({
    theme_id: asset.theme_id,
    theme_type_name: asset.theme_type_name,
    theme_title: asset.theme_title,
    status: "release",
    segments: previous?.segments ?? [],
    media_id: asset.media_id,
    public_url: asset.public_url,
    source_label: "Upload vorhanden",
  });

  let replaced = false;
  const nextCards = cards.map((card) => {
    if (card.theme_id !== asset.theme_id) return card;
    replaced = true;
    return nextCard(card);
  });

  return replaced ? nextCards : [...nextCards, nextCard()];
}
