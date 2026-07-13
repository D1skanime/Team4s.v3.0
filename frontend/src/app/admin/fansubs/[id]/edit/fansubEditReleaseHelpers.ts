import type { AnimeCoverage } from "@/lib/api";
import type {
  AdminAnimeTheme,
  AdminAnimeThemeSegment,
  AdminReleaseThemeAsset,
} from "@/types/admin";
import type { AdminFansubRelease, AnimeContribution } from "@/types/fansub";
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

export const FIRST_PROJECT_REQUIRED_ROLE_CODES = [
  "translator",
  "timer",
  "encoder",
] as const;

export function hasQualifiedFirstProject(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): boolean {
  if (!animeCoverageMap) return false;

  return Array.from(animeCoverageMap.values()).some((coverage) => {
    if (!coverage.has_project_note) return false;
    const coveredRoles = new Set(coverage.covered_role_codes);
    return FIRST_PROJECT_REQUIRED_ROLE_CODES.every((roleCode) =>
      coveredRoles.has(roleCode),
    );
  });
}

export function hasQualifiedFirstRelease(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): boolean {
  return countQualifiedReleases(animeCoverageMap) >= 1;
}

export function countQualifiedReleases(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): number {
  if (!animeCoverageMap) return 0;

  return Array.from(animeCoverageMap.values()).reduce(
    (total, coverage) => total + coverage.qualified_release_count,
    0,
  );
}

export function hasQualifiedCompletedProject(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): boolean {
  return countQualifiedCompletedProjects(animeCoverageMap) >= 1;
}

export function countQualifiedCompletedProjects(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): number {
  if (!animeCoverageMap) return 0;

  return Array.from(animeCoverageMap.values()).filter(
    (coverage) => coverage.has_completed_project,
  ).length;
}

export function hasQualifiedCollaboration(
  animeCoverageMap: Map<number, AnimeCoverage> | null,
): boolean {
  if (!animeCoverageMap) return false;

  return Array.from(animeCoverageMap.values()).some(
    (coverage) => coverage.has_collaboration,
  );
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

function releaseEpisodeAnchor(release: AdminFansubRelease): number | null {
  const episodeNumber = release.episode_number?.trim() ?? "";
  if (!/^\d+$/.test(episodeNumber)) return null;

  return Number.parseInt(episodeNumber, 10);
}

function segmentCoversEpisode(
  segment: AdminAnimeThemeSegment,
  episodeAnchor: number,
): boolean {
  return (
    (segment.start_episode == null || segment.start_episode <= episodeAnchor) &&
    (segment.end_episode == null || segment.end_episode >= episodeAnchor)
  );
}

export function releaseAssetUploadLockedBySegment(
  release: AdminFansubRelease,
  segments: AdminAnimeThemeSegment[],
): boolean {
  const episodeAnchor = releaseEpisodeAnchor(release);
  if (episodeAnchor == null) return false;

  return segments.some(
    (segment) =>
      releaseAssetRequiredBySegment(segment) &&
      segmentCoversEpisode(segment, episodeAnchor) &&
      segment.start_episode !== episodeAnchor,
  );
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
  release: AdminFansubRelease,
  themes: AdminAnimeTheme[],
  themeAssets: AdminReleaseThemeAsset[],
  segmentsByThemeID: Map<number, AdminAnimeThemeSegment[]>,
): ReleaseSegmentCard[] {
  const assetByThemeID = new Map(
    themeAssets.map((asset) => [asset.theme_id, asset]),
  );
  const episodeAnchor = releaseEpisodeAnchor(release);

  const cards = themes.map((theme): ReleaseSegmentCard | null => {
    const asset = assetByThemeID.get(theme.id);
    const allSegments = segmentsByThemeID.get(theme.id) ?? [];
    // Nur Segmente zeigen, deren Episodenbereich diese Release-Folge abdeckt.
    // Bei nicht-numerischer Episodennummer (episodeAnchor null) laesst sich die
    // Folge nicht bestimmen -> alle Segmente behalten, statt sie faelschlich zu verbergen.
    const segments =
      episodeAnchor == null
        ? allSegments
        : allSegments.filter((segment) =>
            segmentCoversEpisode(segment, episodeAnchor),
          );
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
      const releaseAssetUploadLocked = releaseAssetUploadLockedBySegment(
        release,
        segments,
      );

      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "missing",
        segments,
        source_label: releaseAssetUploadLocked
          ? "Zentraler Theme-Upload am Segmentstart erforderlich"
          : releaseAssetRequirementLabel(segments),
        release_asset_upload_locked: releaseAssetUploadLocked,
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

    // Theme ohne abdeckendes Segment und ohne Release-Upload ist fuer diese
    // Folge nicht relevant -> Karte ganz ausblenden. Beispiel: ein Mitte-Kara,
    // das nur bei Folge 5 ein Segment hat, darf bei anderen Folgen nicht als
    // "kein Segment" erscheinen.
    return null;
  });

  return cards.filter(
    (card): card is ReleaseSegmentCard => card !== null,
  );
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
