// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteFansubGroup } from "./fansubs-groups";

// Live-UAT-Nachbesserung Phase 189 (Admin-UI Lösch-Sperre, D-12): deleteFansubGroup
// warf ApiError ohne `code` (ueber parseApiError statt parseApiErrorPayload), sodass
// formatDeleteFansubError nie den speziellen fansub_group_has_dependents-Zweig traf
// und immer auf die generische "(409) ..."-Meldung zurueckfiel. Deckt den echten
// fetch-Pfad ab, nicht nur eine von Hand konstruierte ApiError-Instanz.
describe("deleteFansubGroup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("wirft einen ApiError mit gesetztem code bei 409 fansub_group_has_dependents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Diese Gruppe kann nicht entfernt werden: 1 Gruppennotiz hängt noch daran.",
            code: "fansub_group_has_dependents",
          },
        }),
      }),
    );

    await expect(deleteFansubGroup(154)).rejects.toMatchObject({
      status: 409,
      code: "fansub_group_has_dependents",
      message: "Diese Gruppe kann nicht entfernt werden: 1 Gruppennotiz hängt noch daran.",
    });
  });

  it("loest bei 204 No Content erfolgreich auf", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );

    await expect(deleteFansubGroup(154)).resolves.toBeUndefined();
  });

  it("faellt auf eine nutzbare ApiError mit code=null zurueck, wenn die Fehlerantwort nicht parsebar ist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error("not json")),
      }),
    );

    await expect(deleteFansubGroup(154)).rejects.toMatchObject({
      status: 500,
      code: null,
    });
  });
});
