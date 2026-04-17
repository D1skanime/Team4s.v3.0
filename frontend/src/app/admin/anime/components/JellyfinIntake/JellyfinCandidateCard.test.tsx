import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JellyfinCandidateCard } from "./JellyfinCandidateCard";

describe("JellyfinCandidateCard", () => {
  it("renders poster, path context, and the direct adopt CTA", () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: "series-1",
          name: "Naruto OVA",
          path: "D:/Anime/Bonus/Naruto OVA",
          parent_context: "Bonus",
          library_context: "Anime",
          confidence: "high",
          poster_url: "/api/v1/media/image?item_id=series-1&kind=primary&provider=jellyfin",
          type_hint: {
            confidence: "high",
            suggested_type: "ova",
            reasons: ['Token "OVA" im Ordnernamen erkannt.'],
          },
          already_imported: false,
        }}
        onSelect={() => {}}
        onAdopt={() => {}}
      />,
    );

    expect(markup).toContain("Naruto OVA");
    expect(markup).toContain("series-1");
    expect(markup).toContain("D:/Anime/Bonus/Naruto OVA");
    expect(markup).toContain("OVA | Bonus | Anime");
    expect(markup).toContain("Passend");
    expect(markup).toContain("Ansehen");
    expect(markup).toContain("Jellyfin uebernehmen");
  });

  it("shows selected and adopted state without a second preview CTA", () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: "series-2",
          name: "Naruto",
          path: "D:/Anime/TV/Naruto",
          parent_context: "TV",
          library_context: "Anime",
          confidence: "high",
          type_hint: {
            confidence: "medium",
            suggested_type: "tv",
            reasons: ["Standard-Vorschlag fuer Serienordner."],
          },
          already_imported: false,
        }}
        isSelected
        isAdopted
        onSelect={() => {}}
        onAdopt={() => {}}
      />,
    );

    expect(markup).toContain("Im Fokus");
    expect(markup).toContain("Ausgewaehlt");
    expect(markup).not.toContain("Preview laden");
  });

  it("blocks adoption for already imported jellyfin matches", () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: "series-3",
          name: "Macross",
          path: "/media/Anime/OVA/Anime.OVA.Sub/Macross Flash Back 2012",
          parent_context: "Anime.OVA.Sub",
          library_context: "media",
          confidence: "medium",
          type_hint: {
            confidence: "high",
            suggested_type: "ova",
            reasons: ['Token "OVA" im Pfad oder Namen erkannt.'],
          },
          already_imported: true,
          existing_anime_id: 77,
          existing_title: "Macross Flash Back 2012",
        }}
        isSelected
        onSelect={() => {}}
        onAdopt={() => {}}
      />,
    );

    expect(markup).toContain("Bereits importiert");
    expect(markup).toContain("Macross Flash Back 2012");
    expect(markup).toContain("Bestehenden Anime oeffnen");
    expect(markup).not.toContain("Jellyfin uebernehmen");
  });
});
