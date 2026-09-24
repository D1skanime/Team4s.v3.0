// @vitest-environment jsdom
/**
 * Tests für EpisodeImportApplyErrorAlert.tsx (GAP-12, 167-UAT.md).
 *
 * Test 1: message=null rendert nichts.
 * Test 2: message="Boom" rendert role="alert" mit dem Text, scrollIntoView + focus werden beim
 *         ersten Rendern mit gesetzter Message aufgerufen.
 * Test 3: ein Wechsel von null zu einer neuen Message innerhalb desselben gemounteten Elements
 *         löst scrollIntoView/focus erneut aus.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { EpisodeImportApplyErrorAlert } from "./EpisodeImportApplyErrorAlert";

// jsdom implementiert Element.prototype.scrollIntoView nicht (gleiches Muster wie
// RolesClient.test.tsx).
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = vi.fn();
}

describe("EpisodeImportApplyErrorAlert", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(() => {});
  });

  it("rendert nichts fuer message=null", () => {
    const { container } = render(<EpisodeImportApplyErrorAlert message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("rendert role=alert mit dem Text und scrollt/fokussiert beim ersten Rendern", () => {
    render(<EpisodeImportApplyErrorAlert message="Boom" />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Boom")).toBeTruthy();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(HTMLElement.prototype.focus).toHaveBeenCalledTimes(1);
  });

  it("scrollt/fokussiert erneut bei einem Wechsel von null zu einer neuen Message", () => {
    const { rerender } = render(<EpisodeImportApplyErrorAlert message={null} />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    rerender(<EpisodeImportApplyErrorAlert message="Erster Fehler" />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(HTMLElement.prototype.focus).toHaveBeenCalledTimes(1);

    rerender(<EpisodeImportApplyErrorAlert message="Zweiter Fehler" />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(HTMLElement.prototype.focus).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert").textContent).toContain("Zweiter Fehler");
  });
});
