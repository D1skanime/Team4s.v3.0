import { describe, expect, it } from "vitest";

import type { ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { resolveAniSearchProtectedFields } from "./aniSearchJellyfinPrecedence";

function buildFixtureDraft(overrides: Partial<ManualAnimeDraftValues> = {}): ManualAnimeDraftValues {
  return {
    title: ".hack//G.U. Trilogy",
    type: "tv",
    contentType: "anime",
    status: "ongoing",
    year: "2002",
    maxEpisodes: "1",
    titleDE: ".hack//G.U. Trilogie",
    titleEN: ".hack//G.U. Trilogy",
    genreTokens: ["Action", "Fantasy"],
    tagTokens: ["mmo", "virtual-world"],
    description: "Imported from Jellyfin",
    coverImage: "https://jellyfin.example/cover.jpg",
    source: "jellyfin:series-5",
    folderName: "/media/anime/.hack GU Trilogy",
    ...overrides,
  };
}

describe("resolveAniSearchProtectedFields", () => {
  it("returns [] when there is no Jellyfin-hydrated snapshot (no Jellyfin adopt happened)", () => {
    const currentDraft = buildFixtureDraft();

    expect(
      resolveAniSearchProtectedFields({
        currentDraft,
        jellyfinHydratedSnapshot: null,
      }),
    ).toEqual([]);
  });

  it("GAP-18 core case: fields only auto-filled by Jellyfin are NOT protected", () => {
    const jellyfinHydratedSnapshot = buildFixtureDraft();
    const currentDraft = buildFixtureDraft();

    expect(
      resolveAniSearchProtectedFields({
        currentDraft,
        jellyfinHydratedSnapshot,
      }),
    ).toEqual([]);
  });

  it("protects fields the admin changed by hand after the Jellyfin adopt", () => {
    const jellyfinHydratedSnapshot = buildFixtureDraft();

    const yearChanged = buildFixtureDraft({ year: "2010" });
    expect(
      resolveAniSearchProtectedFields({
        currentDraft: yearChanged,
        jellyfinHydratedSnapshot,
      }),
    ).toContain("year");

    const descriptionChanged = buildFixtureDraft({ description: "Manuell korrigierte Beschreibung" });
    expect(
      resolveAniSearchProtectedFields({
        currentDraft: descriptionChanged,
        jellyfinHydratedSnapshot,
      }),
    ).toContain("description");

    const genreChanged = buildFixtureDraft({ genreTokens: ["Drama"] });
    expect(
      resolveAniSearchProtectedFields({
        currentDraft: genreChanged,
        jellyfinHydratedSnapshot,
      }),
    ).toContain("genre");

    const tagsChanged = buildFixtureDraft({ tagTokens: ["custom-tag"] });
    expect(
      resolveAniSearchProtectedFields({
        currentDraft: tagsChanged,
        jellyfinHydratedSnapshot,
      }),
    ).toContain("tags");
  });

  it("never protects cover_image, regardless of how much it differs", () => {
    const jellyfinHydratedSnapshot = buildFixtureDraft({
      coverImage: "https://jellyfin.example/cover.jpg",
    });
    const currentDraft = buildFixtureDraft({
      coverImage: "https://completely-different.example/other-cover.jpg",
    });

    expect(
      resolveAniSearchProtectedFields({
        currentDraft,
        jellyfinHydratedSnapshot,
      }),
    ).not.toContain("cover_image");
  });
});
