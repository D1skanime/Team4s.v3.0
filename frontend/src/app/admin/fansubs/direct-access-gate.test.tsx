// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() =>
  vi.fn(() => ({ hasAccessToken: true, isClientInitialized: true })),
);
const routerPushMock = vi.hoisted(() => vi.fn());
const apiMocks = vi.hoisted(() => ({
  addCollaborationMember: vi.fn(),
  createFansubAlias: vi.fn(),
  createFansubGroup: vi.fn(),
  createFansubLink: vi.fn(),
  deleteFansubAlias: vi.fn(),
  deleteFansubLink: vi.fn(),
  getCollaborationMembers: vi.fn(),
  getFansubAliases: vi.fn(),
  getFansubByID: vi.fn(),
  getFansubList: vi.fn(),
  mergeFansubs: vi.fn(),
  mergeFansubsPreview: vi.fn(),
  removeCollaborationMember: vi.fn(),
  updateFansubGroup: vi.fn(),
  updateFansubLink: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: { alt?: string }) =>
    createElement("img", { alt, ...props }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("@/lib/useAuthSession", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  getCurrentUser: () => getCurrentUserMock(),
  ...apiMocks,
}));

vi.mock("@/components/admin/MediaUpload", () => ({
  buildFansubLogoFallback: () => ({
    initials: "FG",
    background: "#111827",
    color: "#ffffff",
  }),
  buildMediaPreviewURL: () => "",
  MediaUpload: () => <div data-testid="media-upload" />,
}));

import AdminFansubCreatePage from "./create/page";
import MergeFansubsPage from "./merge/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mockNonPlatformUser() {
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: true,
    isClientInitialized: true,
  });
  getCurrentUserMock.mockResolvedValue({
    data: { id: 7, display_name: "Contributor", is_platform_admin: false },
  });
}

function mockPlatformAdmin() {
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: true,
    isClientInitialized: true,
  });
  getCurrentUserMock.mockResolvedValue({
    data: { id: 1, display_name: "Admin", is_platform_admin: true },
  });
}

describe("fansub admin direct access gates", () => {
  it("blocks non-platform direct visits to /admin/fansubs/create", async () => {
    mockNonPlatformUser();

    render(<AdminFansubCreatePage />);

    expect(
      await screen.findByText("Diese Ansicht ist dem Team4s-Admin vorbehalten."),
    ).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Fansub erstellen" })).toBeNull();
    expect(apiMocks.getFansubList).not.toHaveBeenCalled();
  });

  it("blocks non-platform direct visits to /admin/fansubs/merge", async () => {
    mockNonPlatformUser();

    render(<MergeFansubsPage />);

    expect(
      await screen.findByText("Diese Ansicht ist dem Team4s-Admin vorbehalten."),
    ).not.toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Fansub Merge Wizard" }),
    ).toBeNull();
    expect(apiMocks.getFansubList).not.toHaveBeenCalled();
  });
});

describe("MergeFansubsPage — Abrufgrenze-Hinweis (WR-05)", () => {
  it("zeigt den Abrufgrenze-Hinweis, wenn mehr Gruppen vorhanden sind als in einer Seite geladen wurden", async () => {
    mockPlatformAdmin();
    apiMocks.getFansubList.mockResolvedValue({
      data: [
        {
          id: 1,
          slug: "sakura-subs",
          name: "Sakura Subs",
          status: "active",
          anime_relations_count: 0,
          projects_count: 0,
          release_versions_count: 0,
          members_count: 0,
          aliases_count: 0,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, per_page: 500, total: 501, total_pages: 2 },
    });

    render(<MergeFansubsPage />);

    expect(await screen.findByText("Abrufgrenze erreicht")).not.toBeNull();
  });
});
