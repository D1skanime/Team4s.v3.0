// @vitest-environment jsdom
//
// Plan 167-08 Task 1: FansubAliasSection ist die vollständige Alias-CRUD-UI (anlegen,
// umhängen, löschen) für eine Fansubgruppe (D-09). Diese Tests prüfen die in
// 167-08-PLAN.md <behavior> dokumentierten sechs Fälle: initialer Ladezustand, Leerzustand
// (Formular bleibt sichtbar), Fehlerzustand, Anlegen (Erfolg + Konflikt), Löschen (bestätigt/
// abgebrochen) und Umhängen (bestätigt, inkl. disabled-Zustand solange kein abweichendes Ziel
// gewählt ist).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const getFansubAliases = vi.fn();
const getFansubList = vi.fn();
const createFansubAlias = vi.fn();
const deleteFansubAlias = vi.fn();
const reassignFansubAlias = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  getFansubAliases: (...args: unknown[]) => getFansubAliases(...args),
  getFansubList: (...args: unknown[]) => getFansubList(...args),
  createFansubAlias: (...args: unknown[]) => createFansubAlias(...args),
  deleteFansubAlias: (...args: unknown[]) => deleteFansubAlias(...args),
  reassignFansubAlias: (...args: unknown[]) => reassignFansubAlias(...args),
}));

import { FansubAliasSection } from "./FansubAliasSection";

const ALIAS_ROW = {
  id: 501,
  fansub_group_id: 10,
  alias: "BDnP",
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-20T10:00:00Z",
};

const GROUPS = {
  data: [
    { id: 10, slug: "bloody-shadow", name: "Bloody-Shadow", status: "active", anime_relations_count: 0, projects_count: 0, release_versions_count: 0, members_count: 0, aliases_count: 1, created_at: "2020-01-01T00:00:00Z", updated_at: "2020-01-01T00:00:00Z" },
    { id: 11, slug: "new-subs", name: "New-Subs", status: "active", anime_relations_count: 0, projects_count: 0, release_versions_count: 0, members_count: 0, aliases_count: 0, created_at: "2020-01-01T00:00:00Z", updated_at: "2020-01-01T00:00:00Z" },
  ],
  meta: { page: 1, per_page: 100, total: 2, total_pages: 1 },
};

function renderSection() {
  return render(
    <FansubAliasSection fansubID={10} isPlatformAdmin hasAuthSession onToast={() => {}} />,
  );
}

function renderSectionInsideOuterForm(outerSubmit: (event: { preventDefault: () => void }) => void) {
  return render(
    <form onSubmit={outerSubmit}>
      <FansubAliasSection fansubID={10} isPlatformAdmin hasAuthSession onToast={() => {}} />
    </form>,
  );
}

beforeEach(() => {
  getFansubList.mockResolvedValue(GROUPS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FansubAliasSection — Laden", () => {
  it("zeigt LoadingState und danach die Alias-Tabelle nach erfolgreichem Laden", async () => {
    getFansubAliases.mockResolvedValue({ data: [ALIAS_ROW] });

    renderSection();

    expect(screen.getByText("Aliase werden geladen")).not.toBeNull();

    expect(await screen.findByText("BDnP")).not.toBeNull();
    expect(screen.queryByText("Aliase werden geladen")).toBeNull();
  });

  it("zeigt EmptyState für die Tabelle, während das Neuer-Alias-Formular sichtbar bleibt", async () => {
    getFansubAliases.mockResolvedValue({ data: [] });

    renderSection();

    expect(await screen.findByText("Noch keine Aliase hinterlegt")).not.toBeNull();
    expect(screen.getByPlaceholderText("z. B. BDnP")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Alias hinzufügen" })).not.toBeNull();
  });

  it("zeigt ErrorState mit der exakten Copy, wenn getFansubAliases fehlschlägt", async () => {
    const { ApiError: MockApiError } = await import("@/lib/api");
    getFansubAliases.mockRejectedValue(new MockApiError(500, "Datenbank nicht erreichbar."));

    renderSection();

    expect(await screen.findByText("Aliase konnten nicht geladen werden")).not.toBeNull();
    expect(screen.getByText("Datenbank nicht erreichbar.")).not.toBeNull();
  });
});

describe("FansubAliasSection — Anlegen", () => {
  it("ruft createFansubAlias mit dem eingegebenen Text auf und lädt die Liste danach neu", async () => {
    getFansubAliases
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [ALIAS_ROW] });
    createFansubAlias.mockResolvedValue({ data: ALIAS_ROW });

    renderSection();

    const input = await screen.findByPlaceholderText("z. B. BDnP");
    fireEvent.change(input, { target: { value: "BDnP" } });
    fireEvent.click(screen.getByRole("button", { name: "Alias hinzufügen" }));

    await waitFor(() => {
      expect(createFansubAlias).toHaveBeenCalledWith(10, { alias: "BDnP" });
    });
    await waitFor(() => {
      expect(getFansubAliases).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("BDnP")).not.toBeNull();
  });

  it("zeigt bei einem Konflikt die Inline-Fehlermeldung am FormField statt Toast/Dialog", async () => {
    getFansubAliases.mockResolvedValue({ data: [] });
    const { ApiError: MockApiError } = await import("@/lib/api");
    createFansubAlias.mockRejectedValue(new MockApiError(409, "conflict"));

    renderSection();

    const input = await screen.findByPlaceholderText("z. B. BDnP");
    fireEvent.change(input, { target: { value: "BDnP" } });
    fireEvent.click(screen.getByRole("button", { name: "Alias hinzufügen" }));

    expect(
      await screen.findByText("Dieses Kürzel gehört bereits zu einer anderen Gruppe."),
    ).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(getFansubAliases).toHaveBeenCalledTimes(1);
  });
});

describe("FansubAliasSection — Löschen", () => {
  it("öffnet den Bestätigungsdialog 'Alias löschen?'; Bestätigen löscht und lädt neu", async () => {
    getFansubAliases
      .mockResolvedValueOnce({ data: [ALIAS_ROW] })
      .mockResolvedValueOnce({ data: [] });
    deleteFansubAlias.mockResolvedValue(undefined);

    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Alias BDnP löschen" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Alias löschen?")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Alias löschen" }));

    await waitFor(() => {
      expect(deleteFansubAlias).toHaveBeenCalledWith(10, 501);
    });
    await waitFor(() => {
      expect(getFansubAliases).toHaveBeenCalledTimes(2);
    });
  });

  it("ruft bei Abbrechen weder deleteFansubAlias noch einen erneuten Ladevorgang auf", async () => {
    getFansubAliases.mockResolvedValue({ data: [ALIAS_ROW] });

    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Alias BDnP löschen" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(deleteFansubAlias).not.toHaveBeenCalled();
    expect(getFansubAliases).toHaveBeenCalledTimes(1);
  });
});

describe("FansubAliasSection — Umhängen", () => {
  it("ist deaktiviert solange kein abweichendes Ziel gewählt ist; nach Auswahl öffnet Bestätigung und hängt um", async () => {
    getFansubAliases
      .mockResolvedValueOnce({ data: [ALIAS_ROW] })
      .mockResolvedValueOnce({ data: [{ ...ALIAS_ROW, fansub_group_id: 11 }] });
    reassignFansubAlias.mockResolvedValue({ data: { ...ALIAS_ROW, fansub_group_id: 11 } });

    renderSection();

    await screen.findByText("BDnP");
    const reassignButton = screen.getByRole("button", { name: "Umhängen" }) as HTMLButtonElement;
    expect(reassignButton.disabled).toBe(true);

    const select = screen.getByLabelText("Neue Gruppe für Alias BDnP");
    fireEvent.change(select, { target: { value: "11" } });

    expect((screen.getByRole("button", { name: "Umhängen" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Umhängen" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Alias umhängen?")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Trotzdem umhängen" }));

    await waitFor(() => {
      expect(reassignFansubAlias).toHaveBeenCalledWith(10, 501, { target_fansub_group_id: 11 });
    });
    await waitFor(() => {
      expect(getFansubAliases).toHaveBeenCalledTimes(2);
    });
  });

  it("initialisiert das Ziel-Dropdown auf den Platzhalter statt auf die eigene (ausgeschlossene) Gruppe (CR-01)", async () => {
    getFansubAliases.mockResolvedValue({ data: [ALIAS_ROW] });

    renderSection();

    const select = (await screen.findByLabelText(
      "Neue Gruppe für Alias BDnP",
    )) as HTMLSelectElement;

    // DOM-Wert entspricht dem React-State: nichts ist ausgewählt.
    expect(select.value).toBe("");
    const optionValues = Array.from(select.options).map((option) => option.value);
    // Nur der Platzhalter (leer, disabled) und die Gruppen aus availableTargetGroups
    // (schließt die eigene Gruppe fansubID=10 aus) sind wählbar.
    expect(optionValues).toEqual(["", "11"]);
    expect(select.options[0].disabled).toBe(true);
    expect(optionValues).not.toContain("10");
  });
});

describe("FansubAliasSection — GAP-04: kein verschachteltes Formular", () => {
  it("rendert kein eigenes <form>-Element, unabhängig vom Ladezustand", async () => {
    getFansubAliases.mockResolvedValue({ data: [ALIAS_ROW] });

    const { container } = renderSection();

    expect(container.querySelector("form")).toBeNull();
    await screen.findByText("BDnP");
    expect(container.querySelector("form")).toBeNull();
  });

  it("Enter im Alias-Eingabefeld legt einen Alias an, ohne das äußere Formular abzusenden", async () => {
    getFansubAliases
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [ALIAS_ROW] });
    createFansubAlias.mockResolvedValue({ data: ALIAS_ROW });
    const outerSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());

    renderSectionInsideOuterForm(outerSubmit);

    const input = await screen.findByPlaceholderText("z. B. BDnP");
    fireEvent.change(input, { target: { value: "BDnP" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(createFansubAlias).toHaveBeenCalledWith(10, { alias: "BDnP" });
    });
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it("Klick auf 'Alias hinzufügen' legt einen Alias an, ohne das äußere Formular abzusenden", async () => {
    getFansubAliases
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [ALIAS_ROW] });
    createFansubAlias.mockResolvedValue({ data: ALIAS_ROW });
    const outerSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());

    renderSectionInsideOuterForm(outerSubmit);

    const input = await screen.findByPlaceholderText("z. B. BDnP");
    fireEvent.change(input, { target: { value: "BDnP" } });
    fireEvent.click(screen.getByRole("button", { name: "Alias hinzufügen" }));

    await waitFor(() => {
      expect(createFansubAlias).toHaveBeenCalledWith(10, { alias: "BDnP" });
    });
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
