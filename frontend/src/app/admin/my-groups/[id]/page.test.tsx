// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { ContributorGroupDetailResponse } from "@/types/contributor";

const getMyFansubGroupDetailMock = vi.fn();
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
  getMyFansubGroupDetail: (...args: unknown[]) =>
    getMyFansubGroupDetailMock(...args),
}));

import AdminMyGroupDetailPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(authSnapshot, {
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: "Test User",
  });
});

function makeDetailResponse(): ContributorGroupDetailResponse {
  return {
    data: {
      group: {
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
        app_member_roles: ["designer"],
        joined_year: 2019,
        left_year: null,
        active_from: null,
        active_until: null,
        has_historical_link: true,
        anime_count: 1,
        release_count: 1,
        release_version_count: 1,
        group_media_count: 1,
        capabilities: {
          can_open_contributor_group: true,
          can_edit_group: false,
          can_view_group_media: true,
          can_upload_group_media: false,
          can_view_releases: true,
          can_edit_release_descriptions: false,
          can_upload_release_media: true,
          can_manage_members: false,
        },
      },
      anime: [
        {
          id: 12,
          title: "Future Hearts",
          type: "TV",
          header_image: null,
          cover_image: null,
          release_count: 1,
          release_version_count: 1,
          releases: [
            {
              release_id: 41,
              release_version_id: 51,
              version: "v2",
              anime_id: 12,
              anime_title: "Future Hearts",
              episode_id: 7,
              episode_number: "07",
              episode_title: "Ankunft",
              release_date: null,
              duration_seconds: null,
              media_count: 2,
              has_theme_assets: true,
              is_coop: true,
            },
          ],
        },
      ],
      contributions: [
        {
          fansub_group_id: 88,
          fansub_group_name: "AnimeOwnage",
          role_name: "designer",
          role_label: "Designer",
          release_count: 8,
        },
      ],
    },
  };
}

describe("AdminMyGroupDetailPage", () => {
  it("shows release-native details and keeps historical credits read-only", async () => {
    getMyFansubGroupDetailMock.mockResolvedValue(makeDetailResponse());

    render(<AdminMyGroupDetailPage params={{ id: "88" }} />);

    expect(await screen.findByText("AnimeOwnage")).not.toBeNull();
    expect(screen.getByText("Historische Links sind Kontext")).not.toBeNull();
    expect(screen.getByText("Keine App-Rechte")).not.toBeNull();
    expect(screen.getByText("Episode 07: Ankunft")).not.toBeNull();
    expect(screen.getByText("Kooperation")).not.toBeNull();
    const workspaceLink = screen.getByRole("link", {
      name: "Medien & Notizen",
    });

    expect(workspaceLink.getAttribute("href")).toBe(
      "/me/releases/51/workspace",
    );
    expect(getMyFansubGroupDetailMock).toHaveBeenCalledWith(88);
  });

  it("loads group detail when only a refresh session is present", async () => {
    Object.assign(authSnapshot, {
      hasAccessToken: false,
      hasRefreshToken: true,
      displayName: "Test User",
    });
    getMyFansubGroupDetailMock.mockResolvedValue(makeDetailResponse());

    render(<AdminMyGroupDetailPage params={{ id: "88" }} />);

    expect(await screen.findByText("AnimeOwnage")).not.toBeNull();
    expect(screen.queryByText(/Anmeldung erforderlich/)).toBeNull();
    expect(getMyFansubGroupDetailMock).toHaveBeenCalledWith(88);
  });
});
