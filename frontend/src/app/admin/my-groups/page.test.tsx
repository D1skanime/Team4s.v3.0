// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { ContributorGroupsResponse } from "@/types/contributor";

const getMyFansubGroupsMock = vi.fn();
const authSnapshot = vi.hoisted(() => ({
  hasAccessToken: true,
  hasRefreshToken: true,
  displayName: "Test User",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  API_AUTH_SESSION_TOKEN: "runtime-auth",
  AUTH_SESSION_CHANGED_EVENT: "team4s:auth-session-changed",
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  getAuthSessionSnapshot: () => authSnapshot,
  getMyFansubGroups: (...args: unknown[]) => getMyFansubGroupsMock(...args),
}));

import AdminMyGroupsPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(authSnapshot, {
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: "Test User",
  });
});

function makeGroupsResponse(): ContributorGroupsResponse {
  return {
    data: [
      {
        id: 88,
        slug: "anime-ownage",
        name: "AnimeOwnage",
        status: "active",
        group_type: "fansub",
        logo_url: null,
        banner_url: null,
        fansub_name: "AnimeOwnage",
        membership_status: "app_member",
        app_member_status: "active",
        app_member_roles: ["project_lead"],
        joined_year: 2019,
        left_year: null,
        active_from: null,
        active_until: null,
        has_historical_link: true,
        anime_count: 2,
        release_count: 4,
        release_version_count: 5,
        group_media_count: 1,
        capabilities: {
          can_open_contributor_group: true,
          can_edit_group: true,
          can_view_group_media: true,
          can_upload_group_media: false,
          can_view_releases: true,
          can_edit_release_descriptions: true,
          can_upload_release_media: false,
          can_manage_members: false,
        },
      },
      {
        id: 94,
        slug: "historical-only",
        name: "Historical Only",
        status: "inactive",
        group_type: "fansub",
        logo_url: null,
        banner_url: null,
        fansub_name: "Historical Only",
        membership_status: "historical",
        app_member_status: null,
        app_member_roles: [],
        joined_year: 2011,
        left_year: 2014,
        active_from: null,
        active_until: null,
        has_historical_link: true,
        anime_count: 1,
        release_count: 2,
        release_version_count: 2,
        group_media_count: 0,
        capabilities: {
          can_open_contributor_group: false,
          can_edit_group: false,
          can_view_group_media: false,
          can_upload_group_media: false,
          can_view_releases: false,
          can_edit_release_descriptions: false,
          can_upload_release_media: false,
          can_manage_members: false,
        },
      },
    ],
  };
}

describe("AdminMyGroupsPage", () => {
  it("renders own groups and opens only capability-backed group details", async () => {
    getMyFansubGroupsMock.mockResolvedValue(makeGroupsResponse());

    render(<AdminMyGroupsPage />);

    expect(await screen.findByText("AnimeOwnage")).not.toBeNull();
    expect(screen.getByText("Historical Only")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /Editieren/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: /Öffnen/ }).getAttribute("href"),
    ).toBe("/admin/my-groups/88");
    expect(screen.getByRole("button", { name: /Öffnen/ })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("keeps historical-only groups as read-only context without management actions", async () => {
    getMyFansubGroupsMock.mockResolvedValue(makeGroupsResponse());

    render(<AdminMyGroupsPage />);

    expect(await screen.findByText("Historical Only")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /Mitglieder/ })).toBeNull();
    expect(getMyFansubGroupsMock).toHaveBeenCalledWith();
  });

  it("loads groups when only a refresh session is present", async () => {
    Object.assign(authSnapshot, {
      hasAccessToken: false,
      hasRefreshToken: true,
      displayName: "Test User",
    });
    getMyFansubGroupsMock.mockResolvedValue(makeGroupsResponse());

    render(<AdminMyGroupsPage />);

    expect(await screen.findByText("AnimeOwnage")).not.toBeNull();
    expect(screen.queryByText(/Anmeldung erforderlich/)).toBeNull();
    expect(getMyFansubGroupsMock).toHaveBeenCalledWith();
  });
});
