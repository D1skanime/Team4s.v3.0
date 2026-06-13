import { ApiError, resolveApiUrl } from "@/lib/api";
import type { AdminAnimeThemeSegment, AdminFansubAnimeEntry } from "@/types/admin";
import type { AdminFansubRelease, FansubStatus } from "@/types/fansub";
import type { ReleaseSegmentCard, ReleaseSegmentStatus } from "./fansubEditTypes";

const STATUS_LABELS: Record<FansubStatus, string> = {
  active: "aktiv",
  inactive: "inaktiv",
  dissolved: "aufgelöst",
};

const URL_PROTOCOLS = new Set(["http:", "https:", "irc:", "ircs:"]);

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function parseYear(value: string): number | null | typeof Number.NaN {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function toOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isAbsoluteURL(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return URL_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

export function resolveCoverUrl(rawCoverImage?: string | null): string {
  const value = (rawCoverImage || "").trim();
  if (!value) return "/covers/placeholder.jpg";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/api/")) return resolveApiUrl(value);
  if (value.startsWith("/")) return value;
  return `/covers/${value}`;
}

export function formatAnimeTypeLabel(
  type?: AdminFansubAnimeEntry["type"] | null,
): string | null {
  switch (type) {
    case "film":
      return "Film";
    case "ova":
      return "OVA";
    case "ona":
      return "ONA";
    case "special":
      return "Special";
    case "bonus":
      return "Bonus";
    case "web":
      return "Web";
    case "tv":
      return "TV-Serie";
    default:
      return null;
  }
}

export function parseClockSeconds(raw?: string | null): number | null {
  const value = (raw || "").trim();
  if (!value) return null;
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (
    parts.length === 0 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  )
    return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function knownPositiveSeconds(value?: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function releaseTimelineMaxSeconds(
  release: AdminFansubRelease,
  cards: ReleaseSegmentCard[],
): number {
  const knownDurations = [
    knownPositiveSeconds(release.duration_seconds),
    ...cards.flatMap((card) =>
      card.segments.flatMap((segment) => [
        knownPositiveSeconds(segment.playback_duration_seconds),
        parseClockSeconds(segment.end_time),
      ]),
    ),
  ].filter((value): value is number => value != null && value > 0);

  return Math.max(1, ...knownDurations);
}

export function compactThemeKind(name: string): "op" | "ed" | "insert" | "other" {
  const normalized = name.toLowerCase();
  if (normalized.includes("op") || normalized.includes("opening")) return "op";
  if (normalized.includes("ed") || normalized.includes("ending")) return "ed";
  if (
    normalized.includes("insert") ||
    normalized === "in" ||
    normalized.includes("pv")
  )
    return "insert";
  return "other";
}

export function timelineLabelFor(name: string): string {
  const kind = compactThemeKind(name);
  if (kind === "op") return "OP";
  if (kind === "ed") return "ED";
  if (kind === "insert") return "IN";
  return name.slice(0, 3).toUpperCase();
}

export function timelineStatusLabelFor(status: ReleaseSegmentStatus): string {
  if (status === "global") return "Global";
  if (status === "release") return "Uploadet";
  return "Fehlt";
}

export function episodeReleaseTitle(release: AdminFansubRelease): string {
  const episode = `Episode ${release.episode_number || "?"}`;
  const title = (release.episode_title || "").trim();
  return title ? `${episode}: ${title}` : episode;
}

export function releaseDrawerTitle(release: AdminFansubRelease): string {
  const episode = release.episode_number || "?";
  const title = (release.episode_title || "").trim();
  return `${release.anime_title} E${episode}${title ? ` - ${title}` : ""}`;
}

export function themeSegmentEpisodeRange(
  segment?: AdminAnimeThemeSegment | null,
): string {
  if (!segment) return "Keine Episode gesetzt";
  const start =
    segment.start_episode_number ||
    (segment.start_episode != null ? String(segment.start_episode) : null);
  const end =
    segment.end_episode_number ||
    (segment.end_episode != null ? String(segment.end_episode) : null);
  if (start && end && start !== end) return `${start} - ${end}`;
  if (start || end) return start || end || "Keine Episode gesetzt";
  return "Keine Episode gesetzt";
}

export function themeSegmentTimeRange(
  segment?: AdminAnimeThemeSegment | null,
): string {
  if (!segment) return "Keine Zeit gesetzt";
  const start = segment.start_time?.trim();
  const end = segment.end_time?.trim();
  if (start && end) return `${start} - ${end}`;
  if (start || end) return `${start || "?"} - ${end || "?"}`;
  return "Keine Zeit gesetzt";
}

export function labelForFansubStatus(status: FansubStatus): string {
  return STATUS_LABELS[status] || status;
}

export function errMessage(error: unknown): string {
  return error instanceof ApiError
    ? `(${error.status}) ${error.message}`
    : "Anfrage fehlgeschlagen.";
}
