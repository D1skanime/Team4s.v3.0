// @vitest-environment jsdom
//
// Plan 165-12: verifies DiscoveryReturnLink wiring (?return= -> "Zurück zur
// Bibliothek") on the episodes overview page, plus a basic smoke render of
// the page's pre-existing core content to prove the page still mounts.

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/PlatformAdminGate", () => ({
  PlatformAdminGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/useAuthSession", () => ({
  useAuthSession: () => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    isClientInitialized: true,
  }),
}));

const navigationMocks = vi.hoisted(() => ({
  search: "",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "42" }),
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}));

const apiMocks = vi.hoisted(() => ({
  getAnimeByID: vi.fn(),
  getAdminEpisodeClassifications: vi.fn(),
  getFansubs: vi.fn(),
  getGroupedEpisodes: vi.fn(),
  createAdminEpisode: vi.fn(),
  updateEpisodeVersion: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/lib/api", () => apiMocks);

import AdminAnimeEpisodesPage from "./page";

const baseAnime = {
  id: 42,
  title: "Beispiel-Anime",
  type: "tv",
  content_type: "anime",
  status: "ongoing",
  view_count: 0,
  episodes: [],
};

describe("AdminAnimeEpisodesPage", () => {
  beforeEach(() => {
    navigationMocks.search = "";
    apiMocks.getAnimeByID.mockResolvedValue({ data: baseAnime });
    apiMocks.getAdminEpisodeClassifications.mockResolvedValue({ data: [] });
    apiMocks.getFansubs.mockResolvedValue({ data: [] });
    apiMocks.getGroupedEpisodes.mockResolvedValue({ data: { episodes: [] } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders DiscoveryReturnLink with the decoded ?return= value near the page header', async () => {
    navigationMocks.search = "?return=%2Fadmin%2Fanime%2Fcreate%2Flibrary";

    render(<AdminAnimeEpisodesPage />);

    const link = await screen.findByRole("link", {
      name: "Zurück zur Bibliothek",
    });
    expect(link.getAttribute("href")).toBe("/admin/anime/create/library");
  });

  it("renders no return link when ?return= is absent", async () => {
    render(<AdminAnimeEpisodesPage />);

    await screen.findByText("Episoden-Übersicht");
    expect(
      screen.queryByRole("link", { name: "Zurück zur Bibliothek" }),
    ).toBeNull();
  });

  it("still mounts and renders the page's pre-existing core content", async () => {
    render(<AdminAnimeEpisodesPage />);

    expect(await screen.findByText("Beispiel-Anime")).not.toBeNull();
    expect(screen.getByText("Episoden-Übersicht")).not.toBeNull();
    expect(screen.getByText("Keine Episoden vorhanden.")).not.toBeNull();
    expect(
      screen.getByRole("banner").contains(screen.getByText("Beispiel-Anime")),
    ).toBe(true);
  });
});
