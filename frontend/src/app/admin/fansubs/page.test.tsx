// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() =>
  vi.fn(() => ({ hasAccessToken: true, isClientInitialized: true })),
);
const apiMocks = vi.hoisted(() => ({
  deleteFansubGroup: vi.fn(),
  getFansubAliases: vi.fn(),
  getFansubList: vi.fn(),
  getFansubMembers: vi.fn(),
  updateFansubGroup: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

import AdminFansubsPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mockPlatformAdmin() {
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: true,
    isClientInitialized: true,
  });
  getCurrentUserMock.mockResolvedValue({
    data: { id: 1, display_name: "Admin", is_platform_admin: true },
  });
}

describe("AdminFansubsPage", () => {
  it("renders the existing empty page-level state", async () => {
    mockPlatformAdmin();
    apiMocks.getFansubList.mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 500, total: 0, total_pages: 1 },
    });

    render(<AdminFansubsPage />);

    expect(
      await screen.findByText("Keine Fansubgruppen gefunden."),
    ).toBeTruthy();
  });

  it("renders the fansub list as a table with existing actions", async () => {
    mockPlatformAdmin();
    apiMocks.getFansubList.mockResolvedValue({
      data: [
        {
          id: 88,
          slug: "sakura-subs",
          name: "Sakura Subs",
          status: "active",
          group_type: "group",
          founded_year: 2004,
          dissolved_year: null,
          anime_relations_count: 0,
          release_versions_count: 0,
          members_count: 0,
          aliases_count: 0,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, per_page: 500, total: 1, total_pages: 1 },
    });
    apiMocks.getFansubMembers.mockResolvedValue({ data: [{ id: 1 }] });
    apiMocks.getFansubAliases.mockResolvedValue({
      data: [{ id: 1, fansub_group_id: 88, alias: "SAK", created_at: "", updated_at: "" }],
    });

    render(<AdminFansubsPage />);

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("columnheader", { name: /Gruppenname/i })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Slug" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: /Aktionen/i })).toBeTruthy();

    await waitFor(() => {
      expect(within(table).getByText("Sakura Subs")).toBeTruthy();
      expect(within(table).getByText("sakura-subs")).toBeTruthy();
      expect(within(table).getByText("Tag: SAK")).toBeTruthy();
    });
    expect(
      within(table).getByLabelText("Edit Sakura Subs").getAttribute("href"),
    ).toBe("/admin/fansubs/88/edit");
  });
});
