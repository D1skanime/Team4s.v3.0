import { describe, expect, it } from "vitest";

import type { EpisodeVersion, GroupedEpisode } from "@/types/episodeVersion";

import {
  computeNeighborNavigation,
  findMatchingVersionForEpisode,
  resolveCurrentEpisodeIndex,
} from "./episodeNeighborNavigation";

function makeVersion(overrides: Partial<EpisodeVersion>): EpisodeVersion {
  return {
    id: 1,
    anime_id: 1,
    episode_number: 1,
    release_version: "v1",
    fansub_groups: [{ id: 10, slug: "subgroup", name: "SubGroup" }],
    media_provider: "manual",
    media_item_id: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEpisode(
  episodeNumber: number,
  versions: EpisodeVersion[],
): GroupedEpisode {
  return {
    episode_number: episodeNumber,
    version_count: versions.length,
    versions,
  };
}

describe("episodeNeighborNavigation", () => {
  const groupA = [{ id: 10, slug: "subgroup", name: "SubGroup" }];
  const groupB = [{ id: 20, slug: "othergroup", name: "OtherGroup" }];

  const ep1v101 = makeVersion({
    id: 101,
    episode_number: 1,
    release_version: "v1",
    fansub_groups: groupA,
  });
  const ep2v102 = makeVersion({
    id: 102,
    episode_number: 2,
    release_version: "v1",
    fansub_groups: groupA,
  });
  const ep3v103 = makeVersion({
    id: 103,
    episode_number: 3,
    release_version: "v1",
    fansub_groups: groupA,
  });

  const episodes: GroupedEpisode[] = [
    makeEpisode(1, [ep1v101]),
    makeEpisode(2, [ep2v102]),
    makeEpisode(3, [ep3v103]),
  ];

  describe("resolveCurrentEpisodeIndex", () => {
    it("findet den Index der Episode, die die aktuelle Version enthaelt", () => {
      expect(resolveCurrentEpisodeIndex(episodes, 102)).toBe(1);
    });

    it("gibt -1 zurueck, wenn keine Episode passt", () => {
      expect(resolveCurrentEpisodeIndex(episodes, 999)).toBe(-1);
    });
  });

  describe("findMatchingVersionForEpisode", () => {
    it("matched ueber Gruppe und Version", () => {
      const episode = makeEpisode(2, [ep2v102]);
      expect(findMatchingVersionForEpisode(episode, 10, "v1")).toBe(ep2v102);
    });

    it("matched nur ueber Version, wenn groupId null ist", () => {
      const episode = makeEpisode(2, [ep2v102]);
      expect(findMatchingVersionForEpisode(episode, null, "v1")).toBe(
        ep2v102,
      );
    });

    it("gibt null zurueck, wenn keine Version mit passender Gruppe existiert", () => {
      const otherGroupVersion = makeVersion({
        id: 202,
        episode_number: 2,
        release_version: "v1",
        fansub_groups: groupB,
      });
      const episode = makeEpisode(2, [otherGroupVersion]);
      expect(findMatchingVersionForEpisode(episode, 10, "v1")).toBeNull();
    });

    it("normalisiert leere/whitespace releaseVersion auf 'v1'", () => {
      const episode = makeEpisode(2, [ep2v102]);
      expect(findMatchingVersionForEpisode(episode, 10, "   ")).toBe(
        ep2v102,
      );
    });
  });

  describe("computeNeighborNavigation", () => {
    it("liefert korrekte prev/next fuer eine mittlere Folge", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 102,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.currentIndex).toBe(1);
      expect(result.totalCount).toBe(3);
      expect(result.prevVersionId).toBe(101);
      expect(result.prevEpisodeNumber).toBe(1);
      expect(result.nextVersionId).toBe(103);
      expect(result.nextEpisodeNumber).toBe(3);
    });

    it("liefert prevVersionId=null fuer die erste Folge", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 101,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.prevVersionId).toBeNull();
      expect(result.nextVersionId).toBe(102);
    });

    it("liefert nextVersionId=null fuer die letzte Folge", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 103,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.nextVersionId).toBeNull();
      expect(result.prevVersionId).toBe(102);
    });

    it("liefert null fuer eine Richtung, wenn die Nachbar-Folge keine passende Version hat, ohne die andere Richtung zu beeinflussen", () => {
      const otherGroupVersion = makeVersion({
        id: 203,
        episode_number: 3,
        release_version: "v1",
        fansub_groups: groupB,
      });
      const mixedEpisodes: GroupedEpisode[] = [
        makeEpisode(1, [ep1v101]),
        makeEpisode(2, [ep2v102]),
        makeEpisode(3, [otherGroupVersion]),
      ];
      const result = computeNeighborNavigation({
        episodes: mixedEpisodes,
        currentVersionId: 102,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.prevVersionId).toBe(101);
      expect(result.nextVersionId).toBeNull();
    });

    it("groupId=null matched nur ueber releaseVersion", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 102,
        groupId: null,
        releaseVersion: "v1",
      });
      expect(result.prevVersionId).toBe(101);
      expect(result.nextVersionId).toBe(103);
    });

    it("currentVersionId nicht gefunden -> currentIndex=-1, beide Targets null", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 999,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.currentIndex).toBe(-1);
      expect(result.prevVersionId).toBeNull();
      expect(result.nextVersionId).toBeNull();
    });

    it("normalisiert leere releaseVersion auf 'v1' und matched entsprechend", () => {
      const result = computeNeighborNavigation({
        episodes,
        currentVersionId: 102,
        groupId: 10,
        releaseVersion: "   ",
      });
      expect(result.prevVersionId).toBe(101);
      expect(result.nextVersionId).toBe(103);
    });

    it("sortiert Episoden defensiv nach episode_number aufsteigend", () => {
      const unsortedEpisodes: GroupedEpisode[] = [
        makeEpisode(3, [ep3v103]),
        makeEpisode(1, [ep1v101]),
        makeEpisode(2, [ep2v102]),
      ];
      const result = computeNeighborNavigation({
        episodes: unsortedEpisodes,
        currentVersionId: 102,
        groupId: 10,
        releaseVersion: "v1",
      });
      expect(result.currentIndex).toBe(1);
      expect(result.prevVersionId).toBe(101);
      expect(result.nextVersionId).toBe(103);
    });
  });
});
