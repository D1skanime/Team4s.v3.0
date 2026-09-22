import { describe, expect, it } from "vitest";

import {
  buildDiscoveryCardMetaLine,
  buildDiscoveryCreateURL,
  mapDiscoveryStatusToBadgeVariant,
  mapDiscoveryStatusToLabel,
  mapDiscoveryTypeHintToLabel,
} from "./discoveryPageHelpers";

describe("mapDiscoveryStatusToBadgeVariant", () => {
  // Deviation note (165-09, see SUMMARY.md): AdminJellyfinDiscoveryItem.status (165-06)
  // is the English DiscoveryStatus* vocabulary ("open"/"existing"/"partial"/"ignored"),
  // not the German filter-query-param vocabulary the original plan text illustrated
  // this mapping with — these assertions use the actual backend response vocabulary.
  it("maps open to muted", () => {
    expect(mapDiscoveryStatusToBadgeVariant("open")).toBe("muted");
  });

  it("maps existing to success", () => {
    expect(mapDiscoveryStatusToBadgeVariant("existing")).toBe("success");
  });

  it("maps partial to warning", () => {
    expect(mapDiscoveryStatusToBadgeVariant("partial")).toBe("warning");
  });

  it("maps ignored to info", () => {
    expect(mapDiscoveryStatusToBadgeVariant("ignored")).toBe("info");
  });

  it("falls back to muted for an unknown status", () => {
    expect(mapDiscoveryStatusToBadgeVariant("unbekannt")).toBe("muted");
  });
});

describe("mapDiscoveryStatusToLabel", () => {
  it("returns the exact German status word for each backend status", () => {
    expect(mapDiscoveryStatusToLabel("open")).toBe("Offen");
    expect(mapDiscoveryStatusToLabel("existing")).toBe("Bereits vorhanden");
    expect(mapDiscoveryStatusToLabel("partial")).toBe("Teilweise");
    expect(mapDiscoveryStatusToLabel("ignored")).toBe("Ignoriert");
  });
});

describe("mapDiscoveryTypeHintToLabel", () => {
  it("maps film to Film", () => {
    expect(mapDiscoveryTypeHintToLabel("film")).toBe("Film");
  });

  it("maps tv to Serie", () => {
    expect(mapDiscoveryTypeHintToLabel("tv")).toBe("Serie");
  });

  it("maps ova to OVA", () => {
    expect(mapDiscoveryTypeHintToLabel("ova")).toBe("OVA");
  });

  it("maps ona to ONA", () => {
    expect(mapDiscoveryTypeHintToLabel("ona")).toBe("ONA");
  });

  it("maps special and bonus to Special", () => {
    expect(mapDiscoveryTypeHintToLabel("special")).toBe("Special");
    expect(mapDiscoveryTypeHintToLabel("bonus")).toBe("Special");
  });

  it("maps missing/unknown type hints to Unbekannt", () => {
    expect(mapDiscoveryTypeHintToLabel(undefined)).toBe("Unbekannt");
    expect(mapDiscoveryTypeHintToLabel(null)).toBe("Unbekannt");
    expect(mapDiscoveryTypeHintToLabel("web")).toBe("Unbekannt");
  });
});

describe("buildDiscoveryCardMetaLine", () => {
  it("appends the library context when present", () => {
    expect(buildDiscoveryCardMetaLine("Serie", "Anime")).toBe("Serie | Anime");
  });

  it("omits the trailing separator when library context is null/undefined/empty (D-24)", () => {
    expect(buildDiscoveryCardMetaLine("Serie", null)).toBe("Serie");
    expect(buildDiscoveryCardMetaLine("Serie", undefined)).toBe("Serie");
    expect(buildDiscoveryCardMetaLine("Serie", "")).toBe("Serie");
  });

  // GAP-03: parent_context ("Unterordner") joins BETWEEN typeLabel and libraryContext,
  // analog JellyfinCandidateCard.tsx's "{Typ} | {parent_context} | {library_context}".
  it("joins type, parent context, and library context when all three are present", () => {
    expect(buildDiscoveryCardMetaLine("Serie", "Anime.TV.Sub", "media")).toBe(
      "Serie | Anime.TV.Sub | media",
    );
  });

  it("omits the parent-context segment when it is absent but keeps library context", () => {
    expect(buildDiscoveryCardMetaLine("Serie", undefined, "media")).toBe("Serie | media");
  });

  it("returns only the type label when neither parent nor library context is present", () => {
    expect(buildDiscoveryCardMetaLine("Serie", undefined, undefined)).toBe("Serie");
  });
});

describe("buildDiscoveryCreateURL", () => {
  it("builds the Discovery-assisted create URL with an encoded return param", () => {
    expect(
      buildDiscoveryCreateURL({
        jellyfinItemID: "series-1",
        currentDiscoveryURL: "/admin/anime/create/library?filter=alle",
      }),
    ).toBe(
      "/admin/anime/create?jellyfin_id=series-1&from=discovery&return=%2Fadmin%2Fanime%2Fcreate%2Flibrary%3Ffilter%3Dalle",
    );
  });

  it("omits the return param when no current Discovery URL is given", () => {
    expect(buildDiscoveryCreateURL({ jellyfinItemID: "series-1" })).toBe(
      "/admin/anime/create?jellyfin_id=series-1&from=discovery",
    );
  });
});
