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
    case "media":
      return capabilities.can_edit_group;
    case "links":
      return capabilities.can_manage_links;
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
    case "releases":
      return Boolean(capabilities.can_view_releases);
    case "notes":
      return capabilities.can_edit_notes;
    case "readiness":
      return capabilities.can_edit_group || capabilities.can_edit_notes;
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
  return Object.values(capabilities).some(Boolean);
}

export function canViewReleaseContributors(
  isPlatformAdmin: boolean,
  capabilities: FansubGroupCapabilities | null,
): boolean {
  return canUseMainTab("collaboration", isPlatformAdmin, capabilities);
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

export function releaseVersionToolsTarget(
  releaseVersionID: number,
  options: { canViewMedia: boolean; canEditNotes: boolean },
): { href: string; label: string } | null {
  if (releaseVersionID <= 0) return null;
  if (!options.canEditNotes) return null;

  const tab = "notizen";
  const label =
    options.canViewMedia && options.canEditNotes
      ? "Notizen & Medien"
      : "Notizen";

  return {
    href: `/admin/episode-versions/${releaseVersionID}/edit?tab=${tab}`,
    label,
  };
}

export function readFansubIDFromParams(params?: { id?: string }): number {
  return Number.parseInt((params?.id || "").trim(), 10);
}
