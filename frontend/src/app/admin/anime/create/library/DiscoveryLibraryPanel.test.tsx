// @vitest-environment jsdom
//
// 165-09 (D-24/D-25): DiscoveryLibraryPanel rendert eine vertikale
// DiscoveryLibraryCard-Liste statt einer Tabelle, filtert/sucht/paginiert ueber die
// URL (D-11) und haelt den Status nach Ignorieren/Entignorieren sofort konsistent
// (D-19), ohne einen "Bibliothek neu laden"-Klick zu benoetigen.

import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminJellyfinDiscoveryItem } from "@/types/admin";

// searchParamsState ist bewusst "live": router.replace(...) schreibt die geparste
// Query-Zeichenkette zurueck, damit ein anschliessender Re-Render (ausgeloest durch
// den echten useDiscoveryLibraryFilters-State, z. B. setCursorHistory) useSearchParams()
// bereits mit dem aktualisierten Stand liest — ohne das waere Weiter/Zurueck in diesem
// gemockten next/navigation nicht beobachtbar (der echte Next.js-Router ist reaktiv,
// ein reines vi.fn()-Mock ist es nicht).
const searchParamsState = vi.hoisted(() => ({ current: new URLSearchParams() }));
const mockPush = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() =>
  vi.fn((url: string) => {
    const queryIndex = url.indexOf("?");
    searchParamsState.current = new URLSearchParams(queryIndex >= 0 ? url.slice(queryIndex + 1) : "");
  }),
);
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => searchParamsState.current));
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/admin/anime/create/library"));
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })));

vi.mock("next/navigation", () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

const listMock = vi.hoisted(() => vi.fn());
const ignoreMock = vi.hoisted(() => vi.fn());
const unignoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  listAdminJellyfinDiscovery: (...args: unknown[]) => listMock(...args),
  ignoreAdminJellyfinDiscoveryItem: (...args: unknown[]) => ignoreMock(...args),
  unignoreAdminJellyfinDiscoveryItem: (...args: unknown[]) => unignoreMock(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { DiscoveryLibraryPanel } from "./DiscoveryLibraryPanel";

function buildItem(overrides: Partial<AdminJellyfinDiscoveryItem> = {}): AdminJellyfinDiscoveryItem {
  return {
    jellyfin_item_id: "series-1",
    name: "Naruto",
    year: 2002,
    path: "D:/Anime/TV/Naruto",
    library_context: "Anime",
    type_hint: { suggested_type: "tv", confidence: "high", reasons: [] },
    status: "open",
    ...overrides,
  };
}

function buildPage(items: AdminJellyfinDiscoveryItem[], overrides: Record<string, unknown> = {}) {
  return {
    data: {
      items,
      has_more: false,
      next_cursor: undefined,
      total_snapshot_count: items.length,
      ...overrides,
    },
  };
}

afterEach(() => {
  cleanup();
  listMock.mockReset();
  ignoreMock.mockReset();
  unignoreMock.mockReset();
  mockPush.mockClear();
  mockReplace.mockClear();
  searchParamsState.current = new URLSearchParams();
});

describe("DiscoveryLibraryPanel", () => {
  it("shows LoadingState first, then a vertical DiscoveryLibraryCard stack with no Table markup", async () => {
    listMock.mockResolvedValueOnce(buildPage([buildItem(), buildItem({ jellyfin_item_id: "series-2", name: "Bleach" })]));

    render(<DiscoveryLibraryPanel />);

    expect(screen.getByText("Bibliothek wird geladen")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Naruto")).toBeTruthy();
    });
    expect(screen.getByText("Bleach")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("wires onIgnore per item and never triggers an ignore call from the existing item's only button", async () => {
    listMock.mockResolvedValueOnce(
      buildPage([
        buildItem({ status: "open" }),
        buildItem({
          jellyfin_item_id: "series-2",
          name: "Bleach",
          status: "existing",
          existing_anime_id: 7,
          existing_title: "Bleach",
        }),
      ]),
    );

    render(<DiscoveryLibraryPanel />);
    await waitFor(() => expect(screen.getByText("Bleach")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Anime öffnen" }));

    expect(ignoreMock).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/admin/anime/7/edit");
    expect(screen.getByRole("button", { name: "Ignorieren" })).toBeTruthy();
  });

  it("clicking Ignorieren removes the card from the Offen filter without a manual reload click", async () => {
    listMock
      .mockResolvedValueOnce(buildPage([buildItem({ status: "open" })]))
      .mockResolvedValueOnce(buildPage([]));
    ignoreMock.mockResolvedValueOnce({ message: "ok" });

    render(<DiscoveryLibraryPanel />);
    await waitFor(() => expect(screen.getByText("Naruto")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Ignorieren" }));

    await waitFor(() => {
      expect(ignoreMock).toHaveBeenCalledWith("series-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Naruto")).toBeNull();
    });
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("Weiter fetches the next page via the returned cursor and increments the page counter; Zurück pops client history", async () => {
    listMock
      .mockResolvedValueOnce(buildPage([buildItem()], { has_more: true, next_cursor: "cursor-2" }))
      .mockResolvedValueOnce(
        buildPage([buildItem({ jellyfin_item_id: "series-2", name: "Bleach" })], { has_more: false }),
      )
      .mockResolvedValueOnce(buildPage([buildItem()], { has_more: true, next_cursor: "cursor-2" }));

    render(<DiscoveryLibraryPanel />);
    await waitFor(() => expect(screen.getByText("Naruto")).toBeTruthy());
    expect(screen.getByText("Seite 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await waitFor(() => expect(screen.getByText("Bleach")).toBeTruthy());
    expect(screen.getByText("Seite 2")).toBeTruthy();
    expect(listMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: "cursor-2" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    await waitFor(() => expect(screen.getByText("Seite 1")).toBeTruthy());
    expect(listMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ cursor: undefined }),
    );
  });

  it("shows the default empty state with an Alle-Eintraege-anzeigen action when Offen has no results", async () => {
    listMock.mockResolvedValueOnce(buildPage([]));

    render(<DiscoveryLibraryPanel />);

    await waitFor(() => expect(screen.getByText("Keine offenen Einträge")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Alle Einträge anzeigen" })).toBeTruthy();
  });

  it("shows the dynamic no-results heading when a search query yields zero items", async () => {
    searchParamsState.current = new URLSearchParams("q=zzz");
    listMock.mockResolvedValueOnce(buildPage([]));

    render(<DiscoveryLibraryPanel />);

    await waitFor(() => {
      expect(screen.getByText('Keine Treffer für „zzz"')).toBeTruthy();
    });
  });

  it("renders DiscoveryReturnLink only when a return query param is present", async () => {
    listMock.mockResolvedValueOnce(buildPage([]));
    searchParamsState.current = new URLSearchParams();

    render(<DiscoveryLibraryPanel />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Zurück zur Bibliothek" })).toBeNull();
    cleanup();
    vi.clearAllMocks();

    listMock.mockResolvedValueOnce(buildPage([]));
    searchParamsState.current = new URLSearchParams("return=%2Fadmin%2Fanime%2Fcreate");

    render(<DiscoveryLibraryPanel />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const link = screen.getByRole("link", { name: "Zurück zur Bibliothek" });
    expect(link.getAttribute("href")).toBe("/admin/anime/create");
  });

  it("contains no Table/TableRow/TableHeaderCell/native form elements", () => {
    // Structural absence check (CLAUDE.md Teststil exception 1): confirms the
    // D-24 card-grid rewrite fully replaced the earlier Table-based layout.
    const source = readFileSync(path.join(__dirname, "DiscoveryLibraryPanel.tsx"), "utf-8");
    expect(source).not.toMatch(/<Table|<TableRow|<TableHeaderCell|<button|<select|<textarea/);
  });
});
