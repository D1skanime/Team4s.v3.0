// @vitest-environment jsdom
//
// GAP-16: DiscoveryEntryCard muss stilistisch zu den benachbarten AniSearch-/
// Jellyfin-Provider-Karten passen — normale Kartenwirkung (variant="default",
// nicht "elevated"), Button in normaler Groesse im footer-Slot (kein
// CSS-Grid-Stretch-Bug), voll breit nur auf schmalen Bildschirmen (bestehende
// .cardFooter-Media-Query, keine neue CSS).

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button, Card } from "@/components/ui";

import { DiscoveryEntryCard } from "./DiscoveryEntryCard";

afterEach(() => {
  cleanup();
});

describe("DiscoveryEntryCard", () => {
  it("uses the same className as a reference Card variant=default (no longer elevated)", () => {
    render(
      <>
        <Card variant="default" data-testid="reference-card">
          Referenz
        </Card>
        <DiscoveryEntryCard />
      </>,
    );

    const referenceCard = screen.getByTestId("reference-card");
    const heading = screen.getByRole("heading", { name: "Aus meiner Bibliothek" });
    const discoveryCard = heading.closest("section");

    expect(discoveryCard).not.toBeNull();
    expect(discoveryCard?.className).toBe(referenceCard.className);
  });

  it("renders the Bibliothek-durchsuchen button with the same className as a reference Button variant=primary (no full-width class leaked in)", () => {
    render(
      <>
        <Button variant="primary" data-testid="reference-button">
          Referenz
        </Button>
        <DiscoveryEntryCard />
      </>,
    );

    const referenceButton = screen.getByTestId("reference-button");
    const discoveryButton = screen.getByRole("link", { name: "Bibliothek durchsuchen" });

    expect(discoveryButton.className).toBe(referenceButton.className);
  });

  it("renders the Bibliothek-durchsuchen button inside the Card's footer slot, not the grid-stretched children area", () => {
    render(
      <>
        <Card footer={<button data-testid="ref-footer-child">x</button>}>Referenz-Inhalt</Card>
        <DiscoveryEntryCard />
      </>,
    );

    const refFooterChild = screen.getByTestId("ref-footer-child");
    const discoveryButton = screen.getByRole("link", { name: "Bibliothek durchsuchen" });

    expect(refFooterChild.parentElement).not.toBeNull();
    expect(discoveryButton.parentElement?.className).toBe(refFooterChild.parentElement?.className);
  });
});
