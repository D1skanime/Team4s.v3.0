// Pure helpers + shared form/draft types for admin/fansubs/create.
//
// Moved verbatim out of page.tsx (174-14, D-25): these functions had zero
// prior test coverage on their own (only indirectly through 174-09's
// characterization suite). They are route-internal — used by page.tsx,
// useAdminFansubCreateActions.ts, and the AdminFansubCreate*Section
// components in this same directory — and must not be imported from
// outside `frontend/src/app/admin/fansubs/create/`.

import {
  ApiError,
  createFansubLink,
  deleteFansubLink,
  updateFansubLink,
} from "@/lib/api";
import {
  FansubGroup,
  FansubGroupCreateRequest,
  FansubGroupLink,
  FansubGroupLinkType,
  FansubGroupPatchRequest,
  FansubGroupType,
  FansubStatus,
} from "@/types/fansub";
import { EditableMediaValue } from "@/components/admin/MediaUpload";

const URL_PROTOCOLS = new Set(["http:", "https:", "irc:", "ircs:"]);

export type FormState = {
  name: string;
  slug: string;
  kuerzel: string;
  status: FansubStatus;
  groupType: FansubGroupType;
  country: string;
  foundedYear: string;
  dissolvedYear: string;
};

export type CommunityLinkDraft = {
  key: string;
  id: number | null;
  link_type: FansubGroupLinkType;
  name: string;
  url: string;
};

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

export function mapGroupToForm(group: FansubGroup): FormState {
  return {
    name: group.name || "",
    slug: group.slug || "",
    kuerzel: group.kuerzel || "",
    status: group.status,
    groupType: "group",
    country: group.country || "",
    foundedYear: group.founded_year ? String(group.founded_year) : "",
    dissolvedYear: group.dissolved_year ? String(group.dissolved_year) : "",
  };
}

export function mapGroupMedia(group: FansubGroup): {
  logo: EditableMediaValue | null;
  banner: EditableMediaValue | null;
} {
  const logo = group.logo_url
    ? { id: group.logo_id ?? null, publicURL: group.logo_url }
    : null;
  const banner = group.banner_url
    ? { id: group.banner_id ?? null, publicURL: group.banner_url }
    : null;
  return { logo, banner };
}

export function legacyLinksFromGroup(group: FansubGroup): FansubGroupLink[] {
  const links: FansubGroupLink[] = [];
  if (group.website_url) {
    links.push({
      id: -1,
      group_id: group.id,
      link_type: "website",
      name: null,
      url: group.website_url,
      created_at: group.updated_at,
    });
  }
  if (group.discord_url) {
    links.push({
      id: -2,
      group_id: group.id,
      link_type: "discord",
      name: null,
      url: group.discord_url,
      created_at: group.updated_at,
    });
  }
  if (group.irc_url) {
    links.push({
      id: -3,
      group_id: group.id,
      link_type: "irc",
      name: null,
      url: group.irc_url,
      created_at: group.updated_at,
    });
  }
  return links;
}

export function mapGroupLinks(group: FansubGroup): CommunityLinkDraft[] {
  const links =
    group.links && group.links.length > 0
      ? group.links
      : legacyLinksFromGroup(group);
  return links.length > 0
    ? links.map((link, index) => ({
        key: `${link.id}-${index}`,
        id: link.id,
        link_type: link.link_type,
        name: link.name || "",
        url: link.url || "",
      }))
    : [createEmptyLink("draft-link-initial")];
}

export function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    kuerzel: "",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
  };
}

export function createEmptyLink(key: string): CommunityLinkDraft {
  return { key, id: null, link_type: "website", name: "", url: "" };
}

export function errMessage(error: unknown): string {
  return error instanceof ApiError
    ? `(${error.status}) ${error.message}`
    : "Anfrage fehlgeschlagen.";
}

export function formToCreatePayload(form: FormState): FansubGroupCreateRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    kuerzel: toOptional(form.kuerzel),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
  };
}

export function formToPatchPayload(
  form: FormState,
  logo: EditableMediaValue | null,
  banner: EditableMediaValue | null,
): FansubGroupPatchRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    kuerzel: toOptional(form.kuerzel),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
    logo_id: logo?.id ?? null,
    banner_id: banner?.id ?? null,
    logo_url: logo?.publicURL?.trim() ? logo.publicURL.trim() : null,
    banner_url: banner?.publicURL?.trim() ? banner.publicURL.trim() : null,
  };
}

export function sortAliases(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "de"));
}

export async function syncFansubLinks(
  fansubID: number,
  initialLinks: CommunityLinkDraft[],
  currentLinks: CommunityLinkDraft[],
): Promise<void> {
  const initialById = new Map(
    initialLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );
  const currentById = new Map(
    currentLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );

  for (const [id] of initialById) {
    if (!currentById.has(id)) {
      await deleteFansubLink(fansubID, id);
    }
  }

  for (const link of currentLinks) {
    const url = link.url.trim();
    const name = link.name.trim();
    if (!url && !name) continue;
    if (link.id != null && link.id > 0) {
      const previous = initialById.get(link.id);
      if (
        !previous ||
        previous.link_type !== link.link_type ||
        previous.name.trim() !== name ||
        previous.url.trim() !== url
      ) {
        await updateFansubLink(fansubID, link.id, {
          link_type: link.link_type,
          name: name || null,
          url,
        });
      }
      continue;
    }

    await createFansubLink(fansubID, {
      link_type: link.link_type,
      name: name || null,
      url,
    });
  }
}
