import { beforeEach, describe, expect, it, vi } from "vitest";

// Eigene Datei getrennt von page.test.tsx (Render-/Source-Inspection-Tests) - dieses
// Modul mockt @/lib/api vollstaendig und prueft ausschliesslich das Fetch-/Fallback-
// Verhalten des Loaders (Plan 155-04).
const mocks = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message = "api error") {
      super(message);
      this.status = status;
    }
  },
  getGroupDetail: vi.fn(),
  getAnimeByID: vi.fn(),
  getGroupAssets: vi.fn(),
  getGroupContributors: vi.fn(),
  getGroupProjectNote: vi.fn(),
  getGroupReleaseListCursor: vi.fn(),
  getGroupReleaseDetail: vi.fn(),
  getAnimeFansubs: vi.fn(),
  getGroupReleaseCount: vi.fn(),
  getPublicFansubProfileBySlug: vi.fn(),
  // Die drei entfernten Fetches bleiben als Spione im Mock vorhanden, damit ein Test
  // beweisen kann, dass das Loader-Modul sie nie aufruft (P155-10).
  getGroupThemes: vi.fn(),
  getGroupReleaseMedia: vi.fn(),
  getGroupReleases: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: mocks.ApiError,
  getGroupDetail: mocks.getGroupDetail,
  getAnimeByID: mocks.getAnimeByID,
  getGroupAssets: mocks.getGroupAssets,
  getGroupContributors: mocks.getGroupContributors,
  getGroupProjectNote: mocks.getGroupProjectNote,
  getGroupReleaseListCursor: mocks.getGroupReleaseListCursor,
  getGroupReleaseDetail: mocks.getGroupReleaseDetail,
  getAnimeFansubs: mocks.getAnimeFansubs,
  getGroupReleaseCount: mocks.getGroupReleaseCount,
  getPublicFansubProfileBySlug: mocks.getPublicFansubProfileBySlug,
  getGroupThemes: mocks.getGroupThemes,
  getGroupReleaseMedia: mocks.getGroupReleaseMedia,
  getGroupReleases: mocks.getGroupReleases,
}));

import { loadPublicFansubProjectPageData } from "./projectPageData";

const ANIME_ID = 13;
const GROUP_ID = 1;

function baseFixtures() {
  mocks.getGroupDetail.mockResolvedValue({
    data: {
      id: GROUP_ID,
      anime_id: ANIME_ID,
      fansub_id: 4,
      fansub: { id: 4, slug: "c-subs", name: "C-Subs", logo_url: null },
      story: null,
      stats: { member_count: 5, project_contributor_count: 3, episode_count: 2 },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  });
  mocks.getAnimeByID.mockResolvedValue({
    data: { id: ANIME_ID, title: "Viper's Creed", type: "TV", content_type: "anime", status: "airing" },
  });
  mocks.getGroupAssets.mockResolvedValue(null);
  mocks.getGroupContributors.mockResolvedValue({ team_members: [], external_contributors: [] });
  mocks.getGroupProjectNote.mockResolvedValue({ data: null });
  mocks.getGroupReleaseListCursor.mockResolvedValue({ items: [], next_cursor: null, has_more: false });
  mocks.getGroupReleaseDetail.mockResolvedValue(null);
  mocks.getAnimeFansubs.mockResolvedValue({ data: [] });
  mocks.getGroupReleaseCount.mockResolvedValue({ data: { count: 0 } });
  mocks.getPublicFansubProfileBySlug.mockResolvedValue({
    data: {
      group: { id: GROUP_ID, slug: "c-subs", name: "C-Subs" },
      projects: [{ id: ANIME_ID, anime_slug: "vipers-creed", title: "Viper's Creed", type: "TV", status: "airing" }],
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  baseFixtures();
});

describe("loadPublicFansubProjectPageData - precomputed navigation seam (Plan 155-04)", () => {
  it("Test 1: uses precomputed canonicalProjectPath/fansubProjectNavigation directly and never calls getPublicFansubProfileBySlug", async () => {
    const precomputed = {
      canonicalProjectPath: "/fansubs/c-subs/fansubprojekt/vipers-creed",
      fansubProjectNavigation: { previous: null, next: null },
    };

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID, precomputed });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.canonicalProjectPath).toBe(precomputed.canonicalProjectPath);
    expect(result.data.fansubProjectNavigation).toEqual(precomputed.fansubProjectNavigation);
    expect(mocks.getPublicFansubProfileBySlug).not.toHaveBeenCalled();
  });

  it("Test 2: falls back to its own profile-based resolution when precomputed is omitted (numeric legacy route)", async () => {
    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });

    expect(result.status).toBe("ok");
    expect(mocks.getPublicFansubProfileBySlug).toHaveBeenCalledWith("c-subs");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.canonicalProjectPath).toBe("/fansubs/c-subs/fansubprojekt/vipers-creed");
  });
});

describe("loadPublicFansubProjectPageData - removed dead fetches (Plan 155-04, P155-10)", () => {
  it("Test 3: never calls getGroupThemes, getGroupReleaseMedia, or getGroupReleases", async () => {
    await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });

    expect(mocks.getGroupThemes).not.toHaveBeenCalled();
    expect(mocks.getGroupReleaseMedia).not.toHaveBeenCalled();
    expect(mocks.getGroupReleases).not.toHaveBeenCalled();
  });

  it("Test 3b: the returned data object carries no themesData/releaseMediaData/hasThemes/hasMedia/releaseEpisodes keys", async () => {
    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data).not.toHaveProperty("themesData");
    expect(result.data).not.toHaveProperty("releaseMediaData");
    expect(result.data).not.toHaveProperty("hasThemes");
    expect(result.data).not.toHaveProperty("hasMedia");
    expect(result.data).not.toHaveProperty("releaseEpisodes");
  });
});

describe("loadPublicFansubProjectPageData - releaseVersionCount wiring (Plan 155-04)", () => {
  it("Test 4: releaseVersionCount reflects getGroupReleaseCount's response and drives hasReleases even with no release previews", async () => {
    mocks.getGroupReleaseCount.mockResolvedValue({ data: { count: 7 } });
    mocks.getGroupReleaseListCursor.mockResolvedValue({ items: [], next_cursor: null, has_more: false });

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.releaseVersionCount).toBe(7);
    expect(result.data.publicReleasePreviews).toEqual([]);
    expect(result.data.hasReleases).toBe(true);
  });

  it("Test 4b: releaseVersionCount falls back to 0 when getGroupReleaseCount rejects, without affecting sibling branches", async () => {
    mocks.getGroupReleaseCount.mockRejectedValue(new Error("boom"));
    mocks.getGroupContributors.mockResolvedValue({
      team_members: [{ member_id: 1, member_display_name: "Mia", member_slug: "mia", member_avatar_url: null, role_labels: ["Übersetzung"] }],
      external_contributors: [],
    });

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.data.releaseVersionCount).toBe(0);
    expect(result.data.hasReleases).toBe(false);
    // Sibling-Branch (Contributors) bleibt trotz fehlgeschlagenem Release-Count-Fetch unbeeinflusst.
    expect(result.data.hasTeamContent).toBe(true);
  });
});

function callCountsSnapshot() {
  return {
    getGroupDetail: mocks.getGroupDetail.mock.calls.length,
    getAnimeByID: mocks.getAnimeByID.mock.calls.length,
    getGroupAssets: mocks.getGroupAssets.mock.calls.length,
    getGroupContributors: mocks.getGroupContributors.mock.calls.length,
    getGroupProjectNote: mocks.getGroupProjectNote.mock.calls.length,
    getGroupReleaseListCursor: mocks.getGroupReleaseListCursor.mock.calls.length,
    getGroupReleaseDetail: mocks.getGroupReleaseDetail.mock.calls.length,
    getAnimeFansubs: mocks.getAnimeFansubs.mock.calls.length,
    getGroupReleaseCount: mocks.getGroupReleaseCount.mock.calls.length,
  };
}

describe("loadPublicFansubProjectPageData - bounded request count (Plan 155-04)", () => {
  it("Test 5: each mocked @/lib/api function is called exactly once per load, regardless of response payload size", async () => {
    // Lauf 1: grosse Antwortmengen (25 Cursor-Items, 40 Contributor-Zeilen), aber immer
    // genau ein "latest release" -> getGroupReleaseDetail wird genau einmal seriell nachgeladen.
    mocks.getGroupReleaseListCursor.mockResolvedValue({
      items: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        episode_number: index + 1,
        episode_number_label: String(index + 1),
        has_op: false,
        has_ed: false,
        karaoke_count: 0,
        insert_count: 0,
        screenshot_count: 0,
      })),
      next_cursor: null,
      has_more: false,
    });
    mocks.getGroupReleaseDetail.mockResolvedValue(null);
    mocks.getGroupContributors.mockResolvedValue({
      team_members: Array.from({ length: 40 }, (_, index) => ({
        member_id: index + 1,
        member_display_name: `Member ${index + 1}`,
        member_slug: `member-${index + 1}`,
        member_avatar_url: null,
        role_labels: ["Übersetzung"],
      })),
      external_contributors: [],
    });

    await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });
    const callCountsWithManyItems = callCountsSnapshot();

    vi.clearAllMocks();
    baseFixtures();
    // Lauf 2: kleine Antwortmengen, aber ebenfalls genau ein Item, damit
    // getGroupReleaseDetail in beiden Laeufen exakt einmal aufgerufen wird.
    mocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [
        {
          id: 1,
          episode_number: 1,
          episode_number_label: "1",
          has_op: false,
          has_ed: false,
          karaoke_count: 0,
          insert_count: 0,
          screenshot_count: 0,
        },
      ],
      next_cursor: null,
      has_more: false,
    });
    mocks.getGroupReleaseDetail.mockResolvedValue(null);

    await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });
    const callCountsWithFewItems = callCountsSnapshot();

    expect(callCountsWithManyItems).toEqual(callCountsWithFewItems);
    for (const count of Object.values(callCountsWithFewItems)) {
      expect(count).toBe(1);
    }
  });
});

it("keeps an individual image title in the existing project preview without additional requests", async () => {
  mocks.getGroupReleaseListCursor.mockResolvedValue({ items: [{ id: 41, episode_number: 1 }], next_cursor: null, has_more: false });
  mocks.getGroupReleaseDetail.mockResolvedValue({ images: [{ id: 9, category: "screenshot", title: "Eigenständiger Bildtitel", caption: "Andere Beschreibung", thumbnail_url: "/thumb.jpg" }] });
  const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID });
  if (result.status !== "ok") throw new Error("expected ok");
  expect(result.data.publicReleasePreviews[0].imagePreviews?.[0]).toMatchObject({ label: "Eigenständiger Bildtitel", alt: "Eigenständiger Bildtitel" });
  expect(mocks.getGroupReleaseDetail).toHaveBeenCalledTimes(1);
});
