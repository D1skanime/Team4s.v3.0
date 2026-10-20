import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import { formatDeleteFansubError, formatError } from "./useAdminFansubsList";

// Live-UAT-Nachbesserung Phase 189 (Lösch-Sperre, D-12 Admin-UI): die
// Sperr-Meldung soll den technischen Statuscode-Präfix nicht zeigen und die
// echte Gruppe namentlich nennen statt des generischen "Diese Gruppe" aus
// der Backend-Meldung. Alle anderen Fehler fallen weiterhin auf formatError
// (mit Statuscode-Präfix) zurück.
describe("formatDeleteFansubError", () => {
  it('ersetzt "Diese Gruppe" durch den echten Gruppennamen ohne Statuscode-Praefix', () => {
    const error = new ApiError(
      409,
      "Diese Gruppe kann nicht entfernt werden: 1 Gruppennotiz hängt noch daran.",
      null,
      "fansub_group_has_dependents",
    );

    expect(formatDeleteFansubError(error, "Strawhat Subs")).toBe(
      '"Strawhat Subs" kann nicht gelöscht werden: 1 Gruppennotiz hängt noch daran.',
    );
  });

  it("behaelt den vollen Grund-Satz, auch mit mehreren Kategorien", () => {
    const error = new ApiError(
      409,
      "Diese Gruppe kann nicht entfernt werden: 1 Gruppennotiz, 1 Release hängen noch daran.",
      null,
      "fansub_group_has_dependents",
    );

    expect(formatDeleteFansubError(error, "11eyes-Subs")).toBe(
      '"11eyes-Subs" kann nicht gelöscht werden: 1 Gruppennotiz, 1 Release hängen noch daran.',
    );
  });

  it("faellt fuer andere ApiError-Codes auf formatError (mit Statuscode-Praefix) zurueck", () => {
    const error = new ApiError(404, "fansubgruppe nicht gefunden", null, null);

    expect(formatDeleteFansubError(error, "Strawhat Subs")).toBe(formatError(error));
    expect(formatDeleteFansubError(error, "Strawhat Subs")).toBe("(404) fansubgruppe nicht gefunden");
  });

  it("faellt fuer Nicht-ApiError-Fehler auf formatError zurueck", () => {
    expect(formatDeleteFansubError(new Error("boom"), "Strawhat Subs")).toBe(
      "Anfrage fehlgeschlagen.",
    );
  });
});
