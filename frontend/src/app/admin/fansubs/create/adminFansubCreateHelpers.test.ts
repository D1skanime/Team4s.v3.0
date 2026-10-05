// Direct unit tests for the 16 pure helpers moved out of page.tsx (174-14,
// D-25). No React rendering, no fake timers — these assertions lock the
// CURRENT behavior of each helper exactly as it already runs in production.
// 174-09's page.test.tsx (7 characterization tests, unchanged) remains the
// regression gate for the interaction/rendering surface.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FansubGroup, FansubGroupLink } from "@/types/fansub";

import type { CommunityLinkDraft } from "./adminFansubCreateHelpers";

const createFansubLinkMock = vi.fn();
const updateFansubLinkMock = vi.fn();
const deleteFansubLinkMock = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  createFansubLink: (...args: unknown[]) => createFansubLinkMock(...args),
  updateFansubLink: (...args: unknown[]) => updateFansubLinkMock(...args),
  deleteFansubLink: (...args: unknown[]) => deleteFansubLinkMock(...args),
}));

import { ApiError } from "@/lib/api";
import {
  createEmptyLink,
  emptyForm,
  errMessage,
  formToCreatePayload,
  formToPatchPayload,
  isAbsoluteURL,
  isValidSlug,
  legacyLinksFromGroup,
  mapGroupLinks,
  mapGroupMedia,
  mapGroupToForm,
  parseYear,
  slugify,
  sortAliases,
  syncFansubLinks,
  toOptional,
  type FormState,
} from "./adminFansubCreateHelpers";

function fansubGroupFixture(overrides: Partial<FansubGroup> = {}): FansubGroup {
  return {
    id: 1,
    slug: "neue-gruppe",
    name: "Neue Gruppe",
    logo_id: null,
    banner_id: null,
    logo_url: null,
    banner_url: null,
    founded_year: null,
    dissolved_year: null,
    status: "active",
    website_url: null,
    discord_url: null,
    irc_url: null,
    country: null,
    anime_relations_count: 0,
    projects_count: 0,
    release_versions_count: 0,
    members_count: 0,
    aliases_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("slugify", () => {
  it("lowercases, replaces umlauts/special chars with dashes", () => {
    expect(slugify("Café Übersetzer")).toBe("caf-bersetzer");
  });

  it("collapses spaces into a single dash", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("  --Gruppe--  ")).toBe("gruppe");
  });

  it("keeps already-valid kebab-case unchanged", () => {
    expect(slugify("some-group-42")).toBe("some-group-42");
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase kebab-case", () => {
    expect(isValidSlug("some-group-42")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("rejects uppercase, spaces, and special characters", () => {
    expect(isValidSlug("Ungültiger Slug!!")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
    expect(isValidSlug("-leading-dash")).toBe(false);
    expect(isValidSlug("trailing-dash-")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("isAbsoluteURL", () => {
  it("rejects empty and non-absolute values", () => {
    expect(isAbsoluteURL("")).toBe(false);
    expect(isAbsoluteURL("nicht-absolut")).toBe(false);
    expect(isAbsoluteURL("/relative/path")).toBe(false);
  });

  it("accepts http/https/irc/ircs protocols", () => {
    expect(isAbsoluteURL("https://example.com")).toBe(true);
    expect(isAbsoluteURL("http://example.com")).toBe(true);
    expect(isAbsoluteURL("irc://example.com/channel")).toBe(true);
    expect(isAbsoluteURL("ircs://example.com/channel")).toBe(true);
  });

  it("rejects other protocols", () => {
    expect(isAbsoluteURL("ftp://example.com")).toBe(false);
  });
});

describe("parseYear", () => {
  it("returns null for empty/whitespace-only input", () => {
    expect(parseYear("")).toBeNull();
    expect(parseYear("   ")).toBeNull();
  });

  it("parses a valid integer", () => {
    expect(parseYear("2015")).toBe(2015);
  });

  it("returns NaN for non-numeric input", () => {
    expect(Number.isNaN(parseYear("abc"))).toBe(true);
  });
});

describe("toOptional", () => {
  it("returns null for empty/whitespace-only input", () => {
    expect(toOptional("")).toBeNull();
    expect(toOptional("   ")).toBeNull();
  });

  it("returns the trimmed value otherwise", () => {
    expect(toOptional("  DE  ")).toBe("DE");
  });
});

describe("errMessage", () => {
  it("formats an ApiError with status and message, preserving umlauts", () => {
    const error = new ApiError(409, "Für diesen Slug existiert bereits ein Eintrag.");
    expect(errMessage(error)).toBe(
      "(409) Für diesen Slug existiert bereits ein Eintrag.",
    );
  });

  it("falls back to a generic message for a plain Error", () => {
    expect(errMessage(new Error("boom"))).toBe("Anfrage fehlgeschlagen.");
  });

  it("falls back to a generic message for an unknown thrown value", () => {
    expect(errMessage("not-an-error")).toBe("Anfrage fehlgeschlagen.");
  });
});

describe("sortAliases", () => {
  it("sorts using de-locale ordering, including umlauts and case", () => {
    expect(sortAliases(["Zebra", "Übersetzer", "apfel", "Banane"])).toEqual(
      ["apfel", "Banane", "Übersetzer", "Zebra"],
    );
  });

  it("does not mutate the input array", () => {
    const input = ["b", "a"];
    const result = sortAliases(input);
    expect(input).toEqual(["b", "a"]);
    expect(result).toEqual(["a", "b"]);
  });
});

function baseForm(overrides: Partial<FormState> = {}): FormState {
  return {
    name: "Neue Gruppe",
    slug: "neue-gruppe",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
    ...overrides,
  };
}

describe("formToCreatePayload", () => {
  it("maps empty optional fields to null", () => {
    expect(formToCreatePayload(baseForm())).toEqual({
      name: "Neue Gruppe",
      slug: "neue-gruppe",
      status: "active",
      group_type: "group",
      country: null,
      founded_year: null,
      dissolved_year: null,
    });
  });

  it("maps populated years and country through", () => {
    expect(
      formToCreatePayload(
        baseForm({ country: "DE", foundedYear: "2015", dissolvedYear: "2020" }),
      ),
    ).toEqual({
      name: "Neue Gruppe",
      slug: "neue-gruppe",
      status: "active",
      group_type: "group",
      country: "DE",
      founded_year: 2015,
      dissolved_year: 2020,
    });
  });
});

describe("formToPatchPayload", () => {
  it("maps empty optional fields and absent media to null", () => {
    expect(formToPatchPayload(baseForm(), null, null)).toEqual({
      name: "Neue Gruppe",
      slug: "neue-gruppe",
      status: "active",
      group_type: "group",
      country: null,
      founded_year: null,
      dissolved_year: null,
      logo_id: null,
      banner_id: null,
      logo_url: null,
      banner_url: null,
    });
  });

  it("maps populated logo/banner media ids and URLs", () => {
    expect(
      formToPatchPayload(
        baseForm({ country: "DE", foundedYear: "2010", dissolvedYear: "2020" }),
        { id: 7, publicURL: "https://logo.example/" },
        { id: 9, publicURL: "  " },
      ),
    ).toEqual({
      name: "Neue Gruppe",
      slug: "neue-gruppe",
      status: "active",
      group_type: "group",
      country: "DE",
      founded_year: 2010,
      dissolved_year: 2020,
      logo_id: 7,
      banner_id: 9,
      logo_url: "https://logo.example/",
      banner_url: null,
    });
  });
});

describe("mapGroupToForm", () => {
  it("maps a group's fields, defaulting absent values", () => {
    const group = fansubGroupFixture({
      name: "Legacy Gruppe",
      slug: "legacy-gruppe",
      country: "DE",
      founded_year: 2010,
      dissolved_year: 2020,
    });
    expect(mapGroupToForm(group)).toEqual({
      name: "Legacy Gruppe",
      slug: "legacy-gruppe",
      status: "active",
      groupType: "group",
      country: "DE",
      foundedYear: "2010",
      dissolvedYear: "2020",
    });
  });

  it("defaults country/years to empty strings when absent", () => {
    const group = fansubGroupFixture({ country: null, founded_year: null, dissolved_year: null });
    const result = mapGroupToForm(group);
    expect(result.country).toBe("");
    expect(result.foundedYear).toBe("");
    expect(result.dissolvedYear).toBe("");
  });
});

describe("mapGroupMedia", () => {
  it("returns null logo/banner when URLs are absent", () => {
    expect(mapGroupMedia(fansubGroupFixture())).toEqual({ logo: null, banner: null });
  });

  it("maps logo/banner ids and URLs when present", () => {
    const group = fansubGroupFixture({
      logo_id: 1,
      logo_url: "https://logo.example/",
      banner_id: 2,
      banner_url: "https://banner.example/",
    });
    expect(mapGroupMedia(group)).toEqual({
      logo: { id: 1, publicURL: "https://logo.example/" },
      banner: { id: 2, publicURL: "https://banner.example/" },
    });
  });
});

describe("legacyLinksFromGroup", () => {
  it("returns an empty list when no legacy URLs are set", () => {
    expect(legacyLinksFromGroup(fansubGroupFixture())).toEqual([]);
  });

  it("derives website/discord/irc fallback links with fixed negative ids", () => {
    const group = fansubGroupFixture({
      website_url: "https://legacy.example/",
      discord_url: "https://discord.example/",
      irc_url: "irc://irc.example/",
    });
    const links = legacyLinksFromGroup(group);
    expect(links).toEqual([
      {
        id: -1,
        group_id: group.id,
        link_type: "website",
        name: null,
        url: "https://legacy.example/",
        created_at: group.updated_at,
      },
      {
        id: -2,
        group_id: group.id,
        link_type: "discord",
        name: null,
        url: "https://discord.example/",
        created_at: group.updated_at,
      },
      {
        id: -3,
        group_id: group.id,
        link_type: "irc",
        name: null,
        url: "irc://irc.example/",
        created_at: group.updated_at,
      },
    ]);
  });
});

describe("mapGroupLinks", () => {
  it("falls back to a single empty draft link when no links exist", () => {
    const result = mapGroupLinks(fansubGroupFixture());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: null, link_type: "website", name: "", url: "" });
  });

  it("maps real links verbatim, preferring group.links over the legacy fallback", () => {
    const realLink: FansubGroupLink = {
      id: 42,
      group_id: 1,
      link_type: "discord",
      name: "Hauptserver",
      url: "https://discord.example/",
      created_at: "2026-01-01T00:00:00Z",
    };
    const group = fansubGroupFixture({
      links: [realLink],
      website_url: "https://legacy-should-be-ignored.example/",
    });
    expect(mapGroupLinks(group)).toEqual([
      {
        key: "42-0",
        id: 42,
        link_type: "discord",
        name: "Hauptserver",
        url: "https://discord.example/",
      },
    ]);
  });

  it("uses the legacy fallback when group.links is empty", () => {
    const group = fansubGroupFixture({ website_url: "https://legacy.example/" });
    const result = mapGroupLinks(group);
    expect(result).toEqual([
      {
        key: "-1-0",
        id: -1,
        link_type: "website",
        name: "",
        url: "https://legacy.example/",
      },
    ]);
  });
});

describe("emptyForm / createEmptyLink", () => {
  it("emptyForm returns the default active/group form shape", () => {
    expect(emptyForm()).toEqual({
      name: "",
      slug: "",
      status: "active",
      groupType: "group",
      country: "",
      foundedYear: "",
      dissolvedYear: "",
    });
  });

  it("createEmptyLink returns a draft with the given key and website default type", () => {
    expect(createEmptyLink("draft-link-1")).toEqual({
      key: "draft-link-1",
      id: null,
      link_type: "website",
      name: "",
      url: "",
    });
  });
});

describe("syncFansubLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function draft(overrides: Partial<CommunityLinkDraft>): CommunityLinkDraft {
    return { key: "k", id: null, link_type: "website", name: "", url: "", ...overrides };
  }

  it("deletes links present initially but removed from the current list", () => {
    createFansubLinkMock.mockResolvedValue({ data: {} });
    return syncFansubLinks(
      1,
      [draft({ id: 5, url: "https://gone.example/" })],
      [],
    ).then(() => {
      expect(deleteFansubLinkMock).toHaveBeenCalledWith(1, 5);
      expect(updateFansubLinkMock).not.toHaveBeenCalled();
      expect(createFansubLinkMock).not.toHaveBeenCalled();
    });
  });

  it("creates new links (id null) that have a url or name", () => {
    createFansubLinkMock.mockResolvedValue({ data: {} });
    return syncFansubLinks(
      1,
      [],
      [draft({ id: null, link_type: "discord", name: "Server", url: "https://discord.example/" })],
    ).then(() => {
      expect(createFansubLinkMock).toHaveBeenCalledWith(1, {
        link_type: "discord",
        name: "Server",
        url: "https://discord.example/",
      });
    });
  });

  it("skips a new link with no url and no name", () => {
    return syncFansubLinks(1, [], [draft({ id: null, name: "", url: "" })]).then(() => {
      expect(createFansubLinkMock).not.toHaveBeenCalled();
    });
  });

  it("updates an existing link only when a field actually changed", () => {
    updateFansubLinkMock.mockResolvedValue({ data: {} });
    const initial = [
      draft({ id: 7, link_type: "website", name: "Alt", url: "https://old.example/" }),
    ];
    const unchanged = [
      draft({ id: 7, link_type: "website", name: "Alt", url: "https://old.example/" }),
    ];
    return syncFansubLinks(1, initial, unchanged).then(() => {
      expect(updateFansubLinkMock).not.toHaveBeenCalled();

      const changed = [
        draft({ id: 7, link_type: "website", name: "Neu", url: "https://old.example/" }),
      ];
      return syncFansubLinks(1, initial, changed).then(() => {
        expect(updateFansubLinkMock).toHaveBeenCalledWith(1, 7, {
          link_type: "website",
          name: "Neu",
          url: "https://old.example/",
        });
      });
    });
  });
});
