// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DiscoveryReturnLink } from "./DiscoveryReturnLink";

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
});
