// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getGroupedEpisodesMock = vi.fn();

vi.mock("@/lib/api", () => ({
  getGroupedEpisodes: (...args: unknown[]) => getGroupedEpisodesMock(...args),
}));

import { useEpisodeNeighborNavigation } from "./useEpisodeNeighborNavigation";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

const groupedResponse = {
  data: {
    anime_id: 1,
    episodes: [
      {
        episode_number: 1,
        version_count: 1,
        versions: [
          {
            id: 101,
            anime_id: 1,
            episode_number: 1,
            release_version: "v1",
            fansub_groups: [{ id: 10, slug: "subgroup", name: "SubGroup" }],
            media_provider: "manual",
            media_item_id: "",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
      {
        episode_number: 2,
        version_count: 1,
        versions: [
          {
            id: 102,
            anime_id: 1,
            episode_number: 2,
            release_version: "v1",
            fansub_groups: [{ id: 10, slug: "subgroup", name: "SubGroup" }],
            media_provider: "manual",
            media_item_id: "",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    ],
  },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useEpisodeNeighborNavigation", () => {
  it("ruft getGroupedEpisodes nicht auf, wenn animeId fehlt", () => {
    const { result } = renderHook(() =>
      useEpisodeNeighborNavigation({
        animeId: null,
        currentVersionId: 101,
        groupId: 10,
        releaseVersion: "v1",
      }),
    );

    expect(getGroupedEpisodesMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isLoading: false,
      error: null,
      currentIndex: -1,
      totalCount: 0,
      prevVersionId: null,
      prevEpisodeNumber: null,
      nextVersionId: null,
      nextEpisodeNumber: null,
    });
  });

  it("ruft getGroupedEpisodes nicht auf, wenn currentVersionId fehlt", () => {
    const { result } = renderHook(() =>
      useEpisodeNeighborNavigation({
        animeId: 1,
        currentVersionId: null,
        groupId: 10,
        releaseVersion: "v1",
      }),
    );

    expect(getGroupedEpisodesMock).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nextVersionId).toBeNull();
  });

  it("isLoading ist true waehrend des Ladens, Targets bleiben null", async () => {
    const pending = deferred<typeof groupedResponse>();
    getGroupedEpisodesMock.mockReturnValue(pending.promise);

    const { result } = renderHook(() =>
      useEpisodeNeighborNavigation({
        animeId: 1,
        currentVersionId: 101,
        groupId: 10,
        releaseVersion: "v1",
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.nextVersionId).toBeNull();
    expect(result.current.prevVersionId).toBeNull();

    await act(async () => {
      pending.resolve(groupedResponse);
      await pending.promise;
    });
  });

  it("liefert das computeNeighborNavigation-Ergebnis bei erfolgreicher Response", async () => {
    getGroupedEpisodesMock.mockResolvedValue(groupedResponse);

    const { result } = renderHook(() =>
      useEpisodeNeighborNavigation({
        animeId: 1,
        currentVersionId: 101,
        groupId: 10,
        releaseVersion: "v1",
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.prevVersionId).toBeNull();
    expect(result.current.nextVersionId).toBe(102);
  });

  it("setzt error, wenn getGroupedEpisodes wirft", async () => {
    getGroupedEpisodesMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useEpisodeNeighborNavigation({
        animeId: 1,
        currentVersionId: 101,
        groupId: 10,
        releaseVersion: "v1",
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.nextVersionId).toBeNull();
    expect(result.current.prevVersionId).toBeNull();
  });

  it("refetcht bei Aenderung von currentVersionId", async () => {
    getGroupedEpisodesMock.mockResolvedValue(groupedResponse);

    const { result, rerender } = renderHook(
      (props: { currentVersionId: number }) =>
        useEpisodeNeighborNavigation({
          animeId: 1,
          currentVersionId: props.currentVersionId,
          groupId: 10,
          releaseVersion: "v1",
        }),
      { initialProps: { currentVersionId: 101 } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(getGroupedEpisodesMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentIndex).toBe(0);

    rerender({ currentVersionId: 102 });

    await waitFor(() => {
      expect(getGroupedEpisodesMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(result.current.currentIndex).toBe(1);
    });
  });
});
