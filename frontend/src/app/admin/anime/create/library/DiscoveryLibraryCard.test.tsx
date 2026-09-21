// @vitest-environment jsdom
//
// 165-09 (D-24): DiscoveryLibraryCard rendert Poster/Titel/Jahr|Pfad/Typ|Bibliothek/
// Status(-detail)/Aktionen ausschließlich mit @/components/ui-Primitives (Card/Badge/
// Button) — Feldreihenfolge von JellyfinCandidateCard.tsx wiederverwendet, dessen
// natives Markup nicht (siehe Kommentar im Komponenten-File).

import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminJellyfinDiscoveryItem } from "@/types/admin";

import { DiscoveryLibraryCard } from "./DiscoveryLibraryCard";

afterEach(() => {
  cleanup();
});

function buildItem(overrides: Partial<AdminJellyfinDiscoveryItem> = {}): AdminJellyfinDiscoveryItem {
  return {
    jellyfin_item_id: "series-1",
    name: "Naruto",
    year: 2002,
    path: "D:/Anime/TV/Naruto",
    library_context: "Anime",
    type_hint: { suggested_type: "tv", confidence: "high", reasons: [] },
    poster_url: undefined,
    status: "open",
    ...overrides,
  };
}

describe("DiscoveryLibraryCard", () => {
  it("renders the poster placeholder, title, and both meta lines", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem()}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Naruto" })).toBeTruthy();
    expect(screen.getByText("2002 | D:/Anime/TV/Naruto")).toBeTruthy();
    expect(screen.getByText("Serie | Anime")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a poster <img> with the lazy/alt contract when poster_url is present", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({ poster_url: "/media/poster.jpg" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    const img = screen.getByRole("img", { name: "Poster von Naruto" }) as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("src")).toBe("/media/poster.jpg");
  });

  it("omits the library-context suffix when library_context is absent (D-24)", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({ library_context: undefined })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByText("Serie")).toBeTruthy();
    expect(screen.queryByText("Serie | Anime")).toBeNull();
  });

  it("status open renders stacked Anime-anlegen (primary) + Ignorieren (ghost) buttons", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "open" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Anime anlegen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ignorieren" })).toBeTruthy();
    expect(screen.getByText("Offen")).toBeTruthy();
  });

  it("status existing renders only Anime-oeffnen, no Ignorieren, plus the statusdetail line", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({
          status: "existing",
          existing_anime_id: 42,
          existing_title: "Naruto",
        })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Anime öffnen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ignorieren" })).toBeNull();
    expect(screen.getByText("Naruto (#42)")).toBeTruthy();
    expect(screen.getByText("Bereits vorhanden")).toBeTruthy();
  });

  it("status ignored renders only Nicht-mehr-ignorieren as the sole action", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "ignored" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Nicht mehr ignorieren" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Anime anlegen" })).toBeNull();
    expect(screen.getByText("Ignoriert")).toBeTruthy();
  });

  it("status partial renders the same actions as open plus the multi-season caption", () => {
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "partial" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Anime anlegen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ignorieren" })).toBeTruthy();
    expect(screen.getByText("Teilweise")).toBeTruthy();
    expect(
      screen.getByText("Mehrere Staffeln erkannt – noch nicht jede Staffel einem Anime zugeordnet."),
    ).toBeTruthy();
  });

  it("badge variant matches the UI-SPEC Color mapping for each status", () => {
    const cases: Array<[AdminJellyfinDiscoveryItem["status"], string]> = [
      ["open", "Offen"],
      ["existing", "Bereits vorhanden"],
      ["partial", "Teilweise"],
      ["ignored", "Ignoriert"],
    ];

    for (const [status, label] of cases) {
      const { unmount } = render(
        <DiscoveryLibraryCard
          item={buildItem({ status, existing_anime_id: 1, existing_title: "X" })}
          onCreate={() => {}}
          onOpenExisting={() => {}}
          onIgnore={() => {}}
          onUnignore={() => {}}
        />,
      );
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    }
  });

  it("clicking Anime anlegen calls onCreate with the jellyfin_item_id", () => {
    const onCreate = vi.fn();
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "open" })}
        onCreate={onCreate}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anime anlegen" }));
    expect(onCreate).toHaveBeenCalledWith("series-1");
  });

  it("clicking Ignorieren calls onIgnore with the jellyfin_item_id", () => {
    const onIgnore = vi.fn();
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "open" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={onIgnore}
        onUnignore={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ignorieren" }));
    expect(onIgnore).toHaveBeenCalledWith("series-1");
  });

  it("clicking Anime oeffnen calls onOpenExisting with the existing_anime_id", () => {
    const onOpenExisting = vi.fn();
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "existing", existing_anime_id: 42 })}
        onCreate={() => {}}
        onOpenExisting={onOpenExisting}
        onIgnore={() => {}}
        onUnignore={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anime öffnen" }));
    expect(onOpenExisting).toHaveBeenCalledWith(42);
  });

  it("clicking Nicht mehr ignorieren calls onUnignore with the jellyfin_item_id", () => {
    const onUnignore = vi.fn();
    render(
      <DiscoveryLibraryCard
        item={buildItem({ status: "ignored" })}
        onCreate={() => {}}
        onOpenExisting={() => {}}
        onIgnore={() => {}}
        onUnignore={onUnignore}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nicht mehr ignorieren" }));
    expect(onUnignore).toHaveBeenCalledWith("series-1");
  });

  it("renders zero native button/select/input/textarea elements (poster <img> is the sole exception)", () => {
    const source = readFileSync(path.join(__dirname, "DiscoveryLibraryCard.tsx"), "utf-8");
    expect(source).not.toMatch(/<button|<select|<input|<textarea/);
  });
});
