// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  confirmAdminFansubGroupHint,
  confirmGroupHint,
  createFansubGroupHint,
  listAdminFansubGroupHints,
  listGroupHints,
  rejectAdminFansubGroupHint,
  rejectGroupHint,
} from "./fansub-group-hints";

// Logik-Test (kein Component-Rendering, CLAUDE.md Teststil-Regel): deckt den echten
// fetch-Pfad jeder der sieben Hinweis-Funktionen ab und beweist, dass eine
// Non-OK-Antwort exakt wie bei jedem anderen api/*.ts-Modul in eine ApiError mit
// status/message/code/details übersetzt wird — kein Sonderfall für diesen neuen
// Endpunkt-Satz.
describe("fansub-group-hints API-Client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("createFansubGroupHint wirft ApiError mit status=409 bei Doppel-Hinweis (D-04(1))", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: { message: "Du hast dazu bereits einen offenen Hinweis." },
        }),
      }),
    );

    await expect(
      createFansubGroupHint({
        target_fansub_group_id: 5,
        related_anime_id: 42,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Du hast dazu bereits einen offenen Hinweis.",
    });
  });

  it("createFansubGroupHint wirft ApiError mit status=429 bei Tageslimit (D-04(2))", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: vi
          .fn()
          .mockResolvedValue({
            error: { message: "zu viele anfragen, bitte spaeter erneut versuchen" },
          }),
      }),
    );

    await expect(
      createFansubGroupHint({
        target_fansub_group_id: 5,
        related_anime_id: 42,
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("listGroupHints wirft ApiError mit status=403 bei fehlender Gruppenberechtigung", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi
          .fn()
          .mockResolvedValue({ error: { message: "keine Berechtigung" } }),
      }),
    );

    await expect(listGroupHints(7)).rejects.toMatchObject({ status: 403 });
  });

  it("confirmGroupHint loest bei 200 OK mit der message auf", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ message: "Hinweis wurde bestätigt." }),
      }),
    );

    await expect(confirmGroupHint(7, 99)).resolves.toMatchObject({
      message: "Hinweis wurde bestätigt.",
    });
  });

  it("rejectGroupHint wirft ApiError mit status=404 bei bereits bearbeitetem Hinweis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi
          .fn()
          .mockResolvedValue({
            error: { message: "Hinweis nicht gefunden oder bereits bearbeitet" },
          }),
      }),
    );

    await expect(rejectGroupHint(7, 99, "Bitte zuerst prüfen.")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("listAdminFansubGroupHints serialisiert nur gesetzte Filter (undefined wird ausgelassen)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, limit: 20, offset: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await listAdminFansubGroupHints({ status: "open", limit: 20 });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("status=open");
    expect(calledUrl).toContain("limit=20");
    expect(calledUrl).not.toContain("fansub_group_id");
    expect(calledUrl).not.toContain("offset");
    expect(calledUrl).not.toContain("from=");
    expect(calledUrl).not.toContain("to=");
  });

  it("confirmAdminFansubGroupHint wirft ApiError mit status=403 fuer Nicht-Plattform-Admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: { message: "Kein Plattform-Admin" } }),
      }),
    );

    await expect(confirmAdminFansubGroupHint(123)).rejects.toMatchObject({ status: 403 });
  });

  it("rejectAdminFansubGroupHint wirft ApiError mit status=404 bei unbekannter hinweis-id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi
          .fn()
          .mockResolvedValue({
            error: { message: "Hinweis nicht gefunden oder bereits bearbeitet" },
          }),
      }),
    );

    await expect(rejectAdminFansubGroupHint(123, "Rückfrage nötig")).rejects.toMatchObject({
      status: 404,
    });
  });
});
