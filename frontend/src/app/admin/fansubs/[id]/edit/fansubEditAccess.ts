import type { FansubGroupCapabilities } from "@/types/fansub";
import { MAIN_TABS } from "./mainTabRouting";
import type { MainTab } from "./fansubEditTypes";

export function canUseMainTab(
  tab: MainTab,
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  if (isPlatformAdmin) return true;
  if (!capabilities) return false;

  switch (tab) {
    case "basic":
      return Boolean(
        capabilities.can_edit_group ||
        capabilities.can_edit_group_general ||
        capabilities.can_edit_technical_links ||
        capabilities.can_update_group_links
      );
    case "media":
      return capabilities.can_view_group_media;
    case "links":
      return capabilities.can_manage_links || capabilities.can_update_group_links;
    case "collaboration":
      return (
        capabilities.can_view_members ||
        capabilities.can_manage_members ||
        capabilities.can_view_invitations ||
        capabilities.can_create_invitation ||
        capabilities.can_cancel_invitation
      );
    case "claims":
      return (
        capabilities.can_view_invitations ||
        capabilities.can_create_invitation ||
        capabilities.can_cancel_invitation
      );
    case "vorschlaege":
      return capabilities.can_manage_members;
    case "pruefungen":
      return Boolean(capabilities.can_review_group_media || capabilities.can_review_text);
    case "releases":
      return Boolean(capabilities.can_view_releases);
    case "notes":
      return Boolean(capabilities.can_edit_notes || capabilities.can_edit_founding_history);
    case "readiness":
      return capabilities.can_edit_group || capabilities.can_edit_notes;
    case "roles":
      // Group-wide role assignments belong to member management, not read-only member access.
      return capabilities.can_manage_members;
    case "changes":
      // D-06: Änderungshistorie ist an bearbeitungsnahe Fähigkeiten gekoppelt, analog zu
      // "basic" (Interfaces-Block, Plan 138-16) — mirrors this codebase's existing pattern of
      // gating history-like tabs behind edit-adjacent capabilities.
      return Boolean(
        capabilities.can_edit_group ||
        capabilities.can_edit_group_general ||
        capabilities.can_edit_technical_links ||
        capabilities.can_update_group_links
      );
    default:
      return false;
  }
}

export function visibleMainTabs(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): Array<{ key: MainTab; label: string }> {
  return MAIN_TABS.filter((tab) =>
    canUseMainTab(tab.key, isPlatformAdmin, capabilities),
  );
}

export function resolveMainTabForAccess(
  requested: MainTab,
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): MainTab {
  if (canUseMainTab(requested, isPlatformAdmin, capabilities)) return requested;
  return visibleMainTabs(isPlatformAdmin, capabilities)[0]?.key ?? "basic";
}

export function hasFansubWorkspaceAccess(
  capabilities: FansubGroupCapabilities | null,
): boolean {
  if (!capabilities) return false;
  return Boolean(
    capabilities.can_edit_group ||
    capabilities.can_edit_group_general ||
    capabilities.can_edit_technical_links ||
    capabilities.can_edit_founding_history ||
    capabilities.can_update_group_links ||
    capabilities.can_manage_links ||
    capabilities.can_view_members ||
    capabilities.can_manage_members ||
    capabilities.can_manage_historical_members ||
    capabilities.can_manage_historical_roles ||
    capabilities.can_link_historical_members ||
    capabilities.can_edit_notes ||
    capabilities.can_view_invitations ||
    capabilities.can_create_invitation ||
    capabilities.can_cancel_invitation ||
    capabilities.can_view_releases ||
    capabilities.can_view_release_media ||
    capabilities.can_upload_release_media ||
    capabilities.can_edit_release_notes ||
    capabilities.can_review_group_media ||
    capabilities.can_review_text ||
    capabilities.can_view_group_media
  );
}

export function canViewReleaseContributors(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_view_releases);
}

export function canManageReleaseContributors(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_manage_members);
}

export function canUploadReleaseMedia(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_upload_release_media);
}

export function canViewReleaseMedia(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_view_release_media);
}

export function canEditReleaseNotes(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_edit_release_notes);
}

export function canEditFansubBranding(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return isPlatformAdmin || Boolean(capabilities?.can_edit_group);
}

export function hasReleaseWorkspaceAssignment(
  canOpenWithoutProjectAssignment: boolean,
  ownProjectAssignmentKeys: readonly string[],
  animeID: number,
  releaseVersionID: number,
): boolean {
  return (
    canOpenWithoutProjectAssignment ||
    ownProjectAssignmentKeys.includes(`${animeID}:all`) ||
    ownProjectAssignmentKeys.includes(`${animeID}:${releaseVersionID}`)
  );
}

export function releaseVersionToolsTarget(
  releaseVersionID: number,
  options: { canViewMedia: boolean; canEditNotes: boolean },
  returnTo?: string,
): { href: string; label: string } | null {
  if (releaseVersionID <= 0) return null;
  if (!options.canEditNotes && !options.canViewMedia) return null;

  const tab = options.canEditNotes ? "notizen" : "media";
  const label =
    options.canViewMedia && options.canEditNotes
      ? "Notizen & Medien"
      : options.canViewMedia
        ? "Medien"
        : "Notizen";
  const href = `/admin/episode-versions/${releaseVersionID}/edit?tab=${tab}`;

  return {
    href: returnTo
      ? `${href}&return_to=${encodeURIComponent(returnTo)}`
      : href,
    label,
  };
}

export function readFansubIDFromParams(params?: { id?: string }): number {
  return Number.parseInt((params?.id || "").trim(), 10);
}
