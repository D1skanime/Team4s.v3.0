import {
  createFansubLink,
  deleteFansubLink,
  updateFansubLink,
} from "@/lib/api";
import type { EditableMediaValue } from "@/components/admin/MediaUpload";
import type {
  FansubGroup,
  FansubGroupLink,
  FansubGroupPatchRequest,
} from "@/types/fansub";
import { parseYear, toOptional } from "./fansubEditFormatters";
import type { CommunityLinkDraft, FormState } from "./fansubEditTypes";

export function mapGroupToForm(group: FansubGroup): FormState {
  return {
    name: group.name || "",
    slug: group.slug || "",
    status: group.status,
    groupType: "group",
    country: group.country || "",
    foundedYear: group.founded_year ? String(group.founded_year) : "",
    dissolvedYear:
      group.status === "active" || !group.dissolved_year
        ? ""
        : String(group.dissolved_year),
  };
}

export function mapGroupMedia(group: FansubGroup): {
  logo: EditableMediaValue | null;
  banner: EditableMediaValue | null;
} {
  const logo = group.logo_url
    ? {
        id: group.logo_id ?? null,
        publicURL: group.logo_url,
        sourceOriginalURL: group.logo_source_original_url ?? null,
      }
    : null;
  const banner = group.banner_url
    ? {
        id: group.banner_id ?? null,
        publicURL: group.banner_url,
        sourceOriginalURL: group.banner_source_original_url ?? null,
      }
    : null;
  return { logo, banner };
}

export function mapGroupLinks(group: FansubGroup): CommunityLinkDraft[] {
  const links =
    group.links && group.links.length > 0
      ? group.links
      : legacyLinksFromGroup(group);
  return links.map((link, index) => ({
    key: `${link.id}-${index}`,
    id: link.id,
    link_type: link.link_type,
    name: link.name || "",
    url: link.url || "",
  }));
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

export function formToPayload(
  form: FormState,
  logo: EditableMediaValue | null,
  banner: EditableMediaValue | null,
  options: { includeSlug: boolean },
): FansubGroupPatchRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  const payload: FansubGroupPatchRequest = {
    name: form.name.trim(),
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
  if (options.includeSlug) {
    payload.slug = form.slug.trim();
  }
  return payload;
}

export function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
  };
}

export function createEmptyLink(): CommunityLinkDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    link_type: "website",
    name: "",
    url: "",
  };
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
