// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui";
import { applyAdminAnimeMetadataFromJellyfin } from "@/lib/api";
import { AniSearchDuplicateDecision } from "./AniSearchDuplicateDecision";
import type { CreateAniSearchConflictState } from "./createAniSearchControllerHelpers";

vi.mock("@/lib/api", () => ({
  applyAdminAnimeMetadataFromJellyfin: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const navigationMocks = vi.hoisted(() => ({
  search: "",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}));

let currentLocationHref = "http://localhost/admin/anime/create";

beforeEach(() => {
  navigationMocks.search = "";
  currentLocationHref = "http://localhost/admin/anime/create";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return currentLocationHref;
      },
      set href(value: string) {
        currentLocationHref = value;
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockReset();
});

const conflict: CreateAniSearchConflictState = {
  anisearchID: "2788",
  existingAnimeID: 4,
  existingTitle: "Naruto #4",
  redirectPath: "/admin/anime/4/edit",
};

describe("AniSearchDuplicateDecision", () => {
  it("renders exactly two actions when no active Jellyfin candidate is present", () => {
    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID={null}
        onCreateAsNew={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Als neuen Anime anlegen" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Zum vorhandenen Anime wechseln" }),
    ).not.toBeNull();
  });

  it("renders all three actions in order with an active Jellyfin candidate, and the create-as-new button uses variant=secondary", () => {
    render(
      <>
        <Button variant="secondary" size="sm">
          Referenz
        </Button>
        <AniSearchDuplicateDecision
          conflict={conflict}
          activeJellyfinSeriesID="series-42"
          onCreateAsNew={vi.fn()}
        />
      </>,
    );

    const actions = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ];

    const connectButton = screen.getByRole("button", {
      name: "Mit bestehendem Anime verbinden",
    });
    const createAsNewButton = screen.getByRole("button", {
      name: "Als neuen Anime anlegen",
    });
    const switchLink = screen.getByRole("link", {
      name: "Zum vorhandenen Anime wechseln",
    });

    const connectIndex = actions.indexOf(connectButton);
    const createAsNewIndex = actions.indexOf(createAsNewButton);
    const switchIndex = actions.indexOf(switchLink);
    expect(connectIndex).toBeGreaterThanOrEqual(0);
    expect(connectIndex).toBeLessThan(createAsNewIndex);
    expect(createAsNewIndex).toBeLessThan(switchIndex);

    const referenceButton = screen.getByRole("button", { name: "Referenz" });
    expect(createAsNewButton.className).toBe(referenceButton.className);

    expect(
      screen.getByText("Es entsteht ein zusätzlicher, unabhängiger Anime-Eintrag."),
    ).not.toBeNull();
  });

  it("connects the active Jellyfin candidate to the existing anime, sends connect:true, and shows a status success message", async () => {
    vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockResolvedValueOnce({
      data: { applied_fields: [], applied_assets: [] },
    } as never);

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID="series-42"
        onCreateAsNew={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    );

    await waitFor(() => {
      expect(applyAdminAnimeMetadataFromJellyfin).toHaveBeenCalledWith(4, {
        jellyfin_series_id: "series-42",
        connect: true,
      });
    });

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("Naruto #4");
    expect(
      screen.queryByRole("button", { name: "Als neuen Anime anlegen" }),
    ).toBeNull();
  });

  it("navigates to conflict.redirectPath with no return suffix after a successful connect when no return param is present (GAP-12)", async () => {
    vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockResolvedValueOnce({
      data: { applied_fields: [], applied_assets: [] },
    } as never);
    navigationMocks.search = "";

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID="series-42"
        onCreateAsNew={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    );

    await waitFor(() => {
      expect(currentLocationHref).toBe(conflict.redirectPath);
    });
  });

  it("navigates to conflict.redirectPath with an encoded return suffix when a valid return param is present (GAP-12)", async () => {
    vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockResolvedValueOnce({
      data: { applied_fields: [], applied_assets: [] },
    } as never);
    const returnURL = "/admin/anime/create/library?filter=alle";
    navigationMocks.search = `return=${encodeURIComponent(returnURL)}`;

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID="series-42"
        onCreateAsNew={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    );

    await waitFor(() => {
      expect(currentLocationHref).toBe(
        `${conflict.redirectPath}?return=${encodeURIComponent(returnURL)}`,
      );
    });
  });

  it("navigates to conflict.redirectPath with no return suffix when an invalid/unsafe return param is present (GAP-12)", async () => {
    vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockResolvedValueOnce({
      data: { applied_fields: [], applied_assets: [] },
    } as never);
    navigationMocks.search = `return=${encodeURIComponent("https://evil.example")}`;

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID="series-42"
        onCreateAsNew={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    );

    await waitFor(() => {
      expect(currentLocationHref).toBe(conflict.redirectPath);
    });
  });

  it("shows the save-time context line only when viaSaveTimeRecheck is true", () => {
    const { rerender } = render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID={null}
        onCreateAsNew={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(
        "Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID gefunden.",
      ),
    ).toBeNull();

    rerender(
      <AniSearchDuplicateDecision
        conflict={{ ...conflict, viaSaveTimeRecheck: true }}
        activeJellyfinSeriesID={null}
        onCreateAsNew={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID gefunden.",
      ),
    ).not.toBeNull();
  });

  it("calls onCreateAsNew exactly once when 'Als neuen Anime anlegen' is clicked, showing an in-flight state meanwhile", async () => {
    let resolveCreate!: () => void;
    const onCreateAsNew = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID={null}
        onCreateAsNew={onCreateAsNew}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als neuen Anime anlegen" }));

    expect(onCreateAsNew).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Lädt..." }).hasAttribute("disabled"),
      ).toBe(true);
    });

    resolveCreate();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Als neuen Anime anlegen" }),
      ).not.toBeNull(),
    );
    expect(onCreateAsNew).toHaveBeenCalledTimes(1);
  });
});
