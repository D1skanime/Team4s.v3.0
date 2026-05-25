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
