// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DiscoveryReturnLink, isValidDiscoveryReturnURL } from "./DiscoveryReturnLink";

afterEach(() => {
  cleanup();
});

describe("DiscoveryReturnLink", () => {
  it("renders nothing when returnURL is undefined", () => {
    const { container } = render(<DiscoveryReturnLink />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when returnURL is an empty string", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a ghost link with the exact copy and an ArrowLeft icon when returnURL is set", () => {
    render(<DiscoveryReturnLink returnURL="/admin/anime/create/library" />);

    const link = screen.getByRole("link", { name: "Zurück zur Bibliothek" });
    expect(link.getAttribute("href")).toBe("/admin/anime/create/library");
    expect(link.querySelector("svg")).not.toBeNull();
  });

  it("renders a ghost link for a valid path with a query string", () => {
    render(<DiscoveryReturnLink returnURL="/admin/anime/create/library?filter=offen" />);

    const link = screen.getByRole("link", { name: "Zurück zur Bibliothek" });
    expect(link.getAttribute("href")).toBe("/admin/anime/create/library?filter=offen");
  });

  it("renders nothing for a javascript: URL (XSS attempt)", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="javascript:alert(1)" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a protocol-relative URL", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="//evil.example/phish" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an absolute https: URL", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="https://evil.example" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an absolute http: URL", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="http://evil.example" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a path not starting with /admin/", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="/other-path" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a path-traversal attempt escaping /admin/", () => {
    const { container } = render(<DiscoveryReturnLink returnURL="/admin/../evil" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("isValidDiscoveryReturnURL", () => {
  it("accepts a valid /admin/ path without a query", () => {
    expect(isValidDiscoveryReturnURL("/admin/anime/create/library")).toBe(true);
  });

  it("accepts a valid /admin/ path with a query", () => {
    expect(isValidDiscoveryReturnURL("/admin/anime/create/library?filter=offen")).toBe(true);
  });

  it("rejects undefined and empty string", () => {
    expect(isValidDiscoveryReturnURL(undefined)).toBe(false);
    expect(isValidDiscoveryReturnURL(null)).toBe(false);
    expect(isValidDiscoveryReturnURL("")).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(isValidDiscoveryReturnURL("javascript:alert(1)")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isValidDiscoveryReturnURL("//evil.example/phish")).toBe(false);
  });

  it("rejects absolute https:/http: URLs", () => {
    expect(isValidDiscoveryReturnURL("https://evil.example")).toBe(false);
    expect(isValidDiscoveryReturnURL("http://evil.example")).toBe(false);
  });

  it("rejects paths not starting with /admin/", () => {
    expect(isValidDiscoveryReturnURL("/other-path")).toBe(false);
  });

  it("rejects path-traversal attempts", () => {
    expect(isValidDiscoveryReturnURL("/admin/../evil")).toBe(false);
  });
});
