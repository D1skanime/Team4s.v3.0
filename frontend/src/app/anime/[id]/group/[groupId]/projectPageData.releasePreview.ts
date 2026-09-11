import { getGroupReleaseDetail } from "@/lib/api";
import { buildFansubReleaseHref } from "@/lib/fansubProjectRoutes";
import type { PublicReleasePreview, PublicReleaseTimelineSegment } from "@/components/fansubs/PublicReleaseBlock";
import type { EpisodeReleaseSummary } from "@/types/group";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";
import { CATEGORY_LABELS, type ReleaseVersionMediaCategory } from "@/types/releaseVersionMedia";

// Ausgelagert aus projectPageData.ts (Plan 155-04), weil die Datei nach Entfernen der
// Themes-/Release-Media-/per_page:100-Fetches noch 451 Zeilen umfasste (Limit: 450). Diese
// reinen Transformationsfunktionen haben keine Abhaengigkeit zur Loader-Orchestrierung und
// bilden den groessten zusammenhaengenden Block ohne Seiteneffekte.

const NOTE_EXCERPT_LENGTH = 150;

function stripHtmlExcerpt(bodyHtml: string): string {
  const plain = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > NOTE_EXCERPT_LENGTH ? `${plain.slice(0, NOTE_EXCERPT_LENGTH)}...` : plain;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatEpisodeLabel(release: EpisodeReleaseSummary): string {
  const label = release.episode_number_label?.trim();
  if (!label) return `Folge ${release.episode_number}`;
  return /^\d+$/.test(label) ? `Folge ${label}` : label;
}

function parseTimelineTime(value?: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
}

function buildTimelineSegment(
  segment: NonNullable<EpisodeReleaseSummary["timeline_segments"]>[number],
  durationSeconds: number | null | undefined,
  href: string,
): PublicReleaseTimelineSegment {
  const start = parseTimelineTime(segment.start_time) ?? 0;
  const end = parseTimelineTime(segment.end_time);
  const duration = Math.max(durationSeconds ?? 0, end ?? 0, start + 1);
  const rawWidth = end != null ? (Math.max(end - start, 1) / duration) * 100 : 14;
  const widthPercent = Math.min(Math.max(rawWidth, 4), 34);
  const leftPercent = Math.min(Math.max((start / duration) * 100, 0), 100 - widthPercent);
  const rawType = segment.type.toUpperCase();
  const type: PublicReleaseTimelineSegment["type"] =
    rawType === "OP" || rawType === "ED" || rawType === "KARA"
      ? rawType
      : rawType === "INSERT"
        ? "IN"
        : "OTHER";

  return {
    id: segment.id,
    type,
    label: segment.title || segment.type,
    leftPercent,
    widthPercent,
    href: `${href}?kara=${segment.id}&autoplay=1#op-ed-middle`,
    versionLabel: segment.version?.trim() || undefined,
  };
}

export function buildPublicReleasePreview({
  animeID,
  groupID,
  release,
  detail,
  canonicalProjectPath,
}: {
  animeID: number;
  groupID: number;
  release: EpisodeReleaseSummary;
  detail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null;
  canonicalProjectPath: string | null;
}): PublicReleasePreview {
  const href = buildFansubReleaseHref({ animeID, groupID, releaseVersionID: release.id, canonicalProjectPath });
  const detailImages = detail?.images ?? [];
  const imagePreviews = detailImages
    .slice(0, 4)
    .map((image) => {
      const src = image.thumbnail_url ?? image.original_url;
      if (!src) return null;
      const categoryLabel = CATEGORY_LABELS[image.category as ReleaseVersionMediaCategory] ?? "Bild";
      return {
        id: image.id,
        src: resolvePublicApiUrl(src),
        label: image.caption?.trim() || categoryLabel,
        alt: image.caption?.trim() || categoryLabel,
      };
    })
    .filter((image): image is NonNullable<typeof image> => Boolean(image));

  return {
    id: release.id,
    href,
    episodeLabel: formatEpisodeLabel(release),
    title: detail?.title ?? release.title ?? "",
    versionLabel: release.version_label ?? undefined,
    releasedAtLabel: release.released_at ?? undefined,
    durationLabel: formatDuration(release.duration_seconds),
    imageCount: detail?.images_count ?? release.images_count ?? 0,
    noteCount: detail?.notes_count ?? release.notes_count ?? 0,
    contributorCount: detail?.contributors_count ?? release.contributors_count ?? 0,
    heroImage: imagePreviews[0],
    imagePreviews,
    notePreviews: (detail?.notes ?? []).slice(0, 2).map((note) => ({
      id: note.id,
      author: note.member_name,
      excerpt: stripHtmlExcerpt(note.body_html),
    })),
    contributors: (detail?.contributors ?? []).slice(0, 6).map((contributor) => ({
      id: contributor.member_id,
      name: contributor.name,
      roleLabel: contributor.role_label,
    })),
    timelineSegments: (release.timeline_segments ?? []).map((segment) =>
      buildTimelineSegment(segment, release.duration_seconds, href),
    ),
  };
}
