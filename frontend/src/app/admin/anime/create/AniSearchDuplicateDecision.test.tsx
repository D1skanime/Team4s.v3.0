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
  it("renders exactly one action (the switch link) when no active Jellyfin candidate is present -- 'Als neuen Anime anlegen' never renders (D-30)", () => {
    render(
      <AniSearchDuplicateDecision conflict={conflict} activeJellyfinSeriesID={null} />,
    );

    expect(
      screen.queryByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Als neuen Anime anlegen" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Zum vorhandenen Anime wechseln" }),
    ).not.toBeNull();
  });

  it("renders exactly two actions in order with an active Jellyfin candidate -- 'Als neuen Anime anlegen' never renders (D-30)", () => {
    render(
      <>
        <Button variant="secondary" size="sm">
          Referenz
        </Button>
        <AniSearchDuplicateDecision
          conflict={conflict}
          activeJellyfinSeriesID="series-42"
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
    const switchLink = screen.getByRole("link", {
      name: "Zum vorhandenen Anime wechseln",
    });

    const connectIndex = actions.indexOf(connectButton);
    const switchIndex = actions.indexOf(switchLink);
    expect(connectIndex).toBeGreaterThanOrEqual(0);
    expect(connectIndex).toBeLessThan(switchIndex);

    expect(
      screen.queryByRole("button", { name: "Als neuen Anime anlegen" }),
    ).toBeNull();
    expect(
      screen.queryByText("Es entsteht ein zusätzlicher, unabhängiger Anime-Eintrag."),
    ).toBeNull();
  });

  it("connects the active Jellyfin candidate to the existing anime, sends connect:true, and shows a status success message", async () => {
    vi.mocked(applyAdminAnimeMetadataFromJellyfin).mockResolvedValueOnce({
      data: { applied_fields: [], applied_assets: [] },
    } as never);

    render(
      <AniSearchDuplicateDecision
        conflict={conflict}
        activeJellyfinSeriesID="series-42"
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
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    );

    await waitFor(() => {
      expect(currentLocationHref).toBe(conflict.redirectPath);
    });
  });

  it("shows the save-time context line only when viaSaveTimeRecheck is true, and still renders only the two-action block (no third 'confirm and retry' option, per D-30)", () => {
    const { rerender } = render(
      <AniSearchDuplicateDecision conflict={conflict} activeJellyfinSeriesID={null} />,
    );

    expect(
      screen.queryByText(
        "Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID gefunden.",
      ),
    ).toBeNull();

    rerender(
      <AniSearchDuplicateDecision
        conflict={{ ...conflict, viaSaveTimeRecheck: true }}
        activeJellyfinSeriesID="series-42"
      />,
    );

    expect(
      screen.getByText(
        "Beim Speichern wurde erneut ein bestehender Anime mit dieser AniSearch-ID gefunden.",
      ),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Als neuen Anime anlegen" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Mit bestehendem Anime verbinden" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Zum vorhandenen Anime wechseln" }),
    ).not.toBeNull();
  });
});
