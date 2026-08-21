import { describe, expect, it } from "vitest";

import type { FansubGroupCapabilities } from "@/types/fansub";
import {
  canUseMainTab,
  hasFansubWorkspaceAccess,
  resolveMainTabForAccess,
  visibleMainTabs,
} from "./fansubEditAccess";

function capabilities(
  overrides: Partial<FansubGroupCapabilities> = {},
): FansubGroupCapabilities {
  return {
    can_edit_group: false,
    can_edit_group_general: false,
    can_edit_technical_links: false,
    can_edit_founding_history: false,
    can_update_group_links: false,
    can_manage_links: false,
    can_view_members: false,
    can_manage_members: false,
    can_manage_historical_members: false,
    can_manage_historical_roles: false,
    can_link_historical_members: false,
    can_edit_notes: false,
    can_view_invitations: false,
    can_create_invitation: false,
    can_cancel_invitation: false,
    can_view_releases: false,
    can_view_release_media: false,
    can_upload_release_media: false,
    can_edit_release_notes: false,
    can_view_group_media: false,
    can_upload_group_media: false,
    can_update_group_media: false,
    can_delete_own_group_media: false,
    can_delete_group_media: false,
    can_reorder_group_media: false,
    ...overrides,
  };
}

describe("fansub edit access", () => {
  it("admits general-edit-only actors to Basic and selects it by default", () => {
    const access = capabilities({ can_edit_group_general: true });
    expect(hasFansubWorkspaceAccess(access)).toBe(true);
    expect(canUseMainTab("basic", false, access)).toBe(true);
    expect(resolveMainTabForAccess("media", false, access)).toBe("basic");
    expect(access.can_edit_group).toBe(false);
  });

  it("keeps broad edit independently sufficient for Basic", () => {
    const access = capabilities({ can_edit_group: true });
    expect(canUseMainTab("basic", false, access)).toBe(true);
    expect(access.can_edit_group_general).toBe(false);
  });

  it("keeps Basic first for general edit combined with another narrow right", () => {
    const access = capabilities({
      can_edit_group_general: true,
      can_edit_founding_history: true,
    });
    expect(visibleMainTabs(false, access).map(({ key }) => key)).toEqual([
      "basic",
      "notes",
    ]);
    expect(resolveMainTabForAccess("media", false, access)).toBe("basic");
  });

  it("denies an all-false capability response", () => {
    const access = capabilities();
    expect(hasFansubWorkspaceAccess(access)).toBe(false);
    expect(visibleMainTabs(false, access)).toEqual([]);
  });

  it("admits founding-history-only actors to History but not members", () => {
    const access = capabilities({ can_edit_founding_history: true });
    expect(hasFansubWorkspaceAccess(access)).toBe(true);
    expect(canUseMainTab("notes", false, access)).toBe(true);
    expect(canUseMainTab("collaboration", false, access)).toBe(false);
    expect(resolveMainTabForAccess("collaboration", false, access)).toBe("notes");
  });

  it("admits narrow group-link updates only to the existing links surface", () => {
    const access = capabilities({ can_update_group_links: true });
    expect(hasFansubWorkspaceAccess(access)).toBe(true);
    expect(canUseMainTab("links", false, access)).toBe(true);
    expect(canUseMainTab("basic", false, access)).toBe(true);
    expect(resolveMainTabForAccess("media", false, access)).toBe("basic");
    expect(access.can_manage_links).toBe(false);
  });

  it.each([
    "can_upload_group_media",
    "can_update_group_media",
    "can_reorder_group_media",
  ] as const)("does not expose Media for %s without list access", (capability) => {
    const access = capabilities({ [capability]: true });
    expect(hasFansubWorkspaceAccess(access)).toBe(false);
    expect(canUseMainTab("media", false, access)).toBe(false);
  });

  it("exposes Media for a co_leader-shaped capability set after fansub_group_media.view is granted", () => {
    const access = capabilities({
      can_view_group_media: true,
      can_upload_group_media: true,
      can_update_group_media: true,
      can_reorder_group_media: true,
      can_edit_group_general: true,
      can_update_group_links: true,
    });
    expect(hasFansubWorkspaceAccess(access)).toBe(true);
    expect(canUseMainTab("media", false, access)).toBe(true);
  });
});
