import { describe, expect, it } from "vitest";

import {
  communityLinkURLError,
  isAllowedCommunityLinkURL,
} from "./fansubEditFormatters";

describe("fansubEditFormatters community links", () => {
  it("erlaubt IRC-Links mit irc:// und ircs://", () => {
    expect(
      isAllowedCommunityLinkURL("irc", "irc://irc.example.net/#c-subs"),
    ).toBe(true);
    expect(
      isAllowedCommunityLinkURL("irc", "ircs://irc.example.net:6697/#c-subs"),
    ).toBe(true);
  });

  it("beschränkt Nicht-IRC-Links auf http:// und https://", () => {
    expect(
      isAllowedCommunityLinkURL("website", "https://example.net"),
    ).toBe(true);
    expect(isAllowedCommunityLinkURL("website", "irc://irc.example.net")).toBe(
      false,
    );
  });

  it("zeigt für IRC einen schemabezogenen Fehlertext", () => {
    expect(communityLinkURLError("irc")).toContain("irc://");
    expect(communityLinkURLError("irc")).toContain("ircs://");
  });
});
