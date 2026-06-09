// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { FansubGroupSummary } from "@/types/fansub";

// Import der Zielkomponente — Datei existiert noch nicht → Test schlägt RED fehl (Plan 01).
import ReleaseVersionFansubChips from "./ReleaseVersionFansubChips";

describe("ReleaseVersionFansubChips", () => {
  it("rendert mehrere Chips für fansub_groups[]", () => {
    const groups: FansubGroupSummary[] = [
      { id: 1, slug: "flamehazesubs", name: "FlameHazeSubs" },
      { id: 2, slug: "subsrus", name: "SubsRus" },
    ];

    render(<ReleaseVersionFansubChips groups={groups} />);

    expect(screen.getByText("FlameHazeSubs")).toBeDefined();
    expect(screen.getByText("SubsRus")).toBeDefined();
  });

  it("rendert keinen Chip wenn fansub_groups leer ist", () => {
    render(<ReleaseVersionFansubChips groups={[]} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("Chips sind alphabetisch sortiert (D-04)", () => {
    const groups: FansubGroupSummary[] = [
      { id: 2, slug: "zebrasubs", name: "Zebra" },
      { id: 1, slug: "alphasubs", name: "Alpha" },
    ];

    render(<ReleaseVersionFansubChips groups={groups} />);

    const chips = screen.getAllByRole("status");
    if (chips.length < 2) {
      throw new Error(`Erwartet mindestens 2 Chips, erhalten: ${chips.length}`);
    }
    const texts = chips.map((c) => c.textContent ?? "");
    const alphaIdx = texts.findIndex((t) => t.includes("Alpha"));
    const zebraIdx = texts.findIndex((t) => t.includes("Zebra"));
    if (alphaIdx === -1 || zebraIdx === -1) {
      throw new Error(`Alpha oder Zebra nicht in Chip-Texten gefunden: ${JSON.stringify(texts)}`);
    }
    if (alphaIdx >= zebraIdx) {
      throw new Error(`Erwartet Alpha (${alphaIdx}) vor Zebra (${zebraIdx}) in alphabetischer Reihenfolge`);
    }
  });
});
