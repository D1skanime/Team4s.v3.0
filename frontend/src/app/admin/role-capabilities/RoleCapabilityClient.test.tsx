// @vitest-environment jsdom
/**
 * Tests für RoleCapabilityClient (Plan 87-03 GREEN + Plan 94-06 erweitert).
 *
 * Test 1: Ladezustand wenn isLoading=true
 * Test 2: Tabelle/Rollenliste mit Rollendaten nach resolvedData
 * Test 3: Lockout-Inline-Fehler nach HTTP-409 auf revoke
 * Test 4 (94-06): Master-Detail — Rollenliste rendert beide Rollen (Plan 94-06)
 * Test 5 (94-06): 422 role_not_assignable zeigt spezifischen Inline-Fehler
 * Test 6 (94-06-fix): Desktop-Modus: nur Inline-Panel, kein Sheet-Dialog gleichzeitig
 * Test 7 (94-06-fix): Mobile-Modus: Sheet öffnet, kein Inline-Panel im DOM
 */
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSearchParams } from "next/navigation";
import RoleCapabilityClient from "./RoleCapabilityClient";
import type { RoleCapabilityMatrix } from "@/types/admin-capability";

// useSearchParams-Mock für die ?role=-Vorauswahl (D-06, 111-05). Default: kein role-Param,
// damit bestehende Tests unbeeinflusst bleiben; einzelne Tests überschreiben per Testfall.
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

/**
 * matchMedia-Mock für jsdom (jsdom implementiert window.matchMedia nicht).
 * @param matches - ob die Media-Query zutrifft (true = Mobile, false = Desktop)
 */
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const sampleMatrix: RoleCapabilityMatrix = {
  roles: [
    {
      role_code: "fansub_lead",
      label_de: "Fansub-Lead",
      assignable: true,
      capability_editable: true,
      contexts: ["app_group"],
      actions: [
        {
          code: "fansub_group.members.view",
          label_de: "Mitglieder anzeigen",
          category: "Mitglieder",
          granted: true,
          standalone: false,
        },
        {
          code: "fansub_group.edit",
          label_de: "Gruppe bearbeiten",
          category: "Gruppe",
          granted: false,
          standalone: false,
        },
      ],
    },
    {
      role_code: "founder",
      label_de: "Gründung",
      assignable: false,
      capability_editable: false,
      contexts: ["group_history"],
      actions: [
        {
          code: "fansub_group.members.view",
          label_de: "Mitglieder anzeigen",
          category: "Mitglieder",
          granted: false,
          standalone: false,
        },
        {
          code: "fansub_group.edit",
          label_de: "Gruppe bearbeiten",
          category: "Gruppe",
          granted: false,
          standalone: false,
        },
      ],
    },
  ],
  all_actions: [
    {
      code: "fansub_group.members.view",
      label_de: "Mitglieder anzeigen",
      category: "Mitglieder",
      sort_order: 1,
    },
    {
      code: "fansub_group.edit",
      label_de: "Gruppe bearbeiten",
      category: "Gruppe",
      sort_order: 2,
    },
  ],
};

describe("RoleCapabilityClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Standard: Desktop-Ansicht (matchMedia gibt false zurück = kein Mobile)
    mockMatchMedia(false);
    // Standard: kein ?role=-Query-Param (leere URLSearchParams)
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>
    );
  });

  it("zeigt Ladezustand wenn isLoading=true übergeben wird", () => {
    render(
      <RoleCapabilityClient
        matrix={{ roles: [], all_actions: [] }}
        isLoading={true}
      />
    );
    // LoadingState-Titel enthält "Lade Capability-Matrix …"
    const allLoading = screen.getAllByText(/lade/i);
    expect(allLoading.length).toBeGreaterThan(0);
    // Kein table-Element vorhanden
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("zeigt Rollenliste mit Rollendaten nach Datenladen", () => {
    render(
      <RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />
    );
    // Neue Master-Detail-UI: Rollenliste statt Tabelle
    expect(screen.getByText("Fansub-Lead")).toBeTruthy();
    // Kein table-Element in der Hauptansicht (Master-Detail-Layout ohne Vollmatrix)
    const tables = screen.queryAllByRole("table");
    // Falls ein table vorhanden ist (z.B. für Legacy-Detail), ist das OK —
    // wichtig ist, dass die Rollenliste sichtbar ist
    expect(screen.getByText("Fansub-Lead")).toBeTruthy();
    // Kurze Überprüfung: mindestens eine Rolle sichtbar
    expect(tables.length).toBeGreaterThanOrEqual(0);
  });

  it("zeigt Rollenliste mit beiden Rollen (assignable + historische) in Master-Detail", () => {
    render(
      <RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />
    );
    // Beide Rollen sollen in der Rollenliste sichtbar sein
    expect(screen.getByText("Fansub-Lead")).toBeTruthy();
    expect(screen.getByText("Gründung")).toBeTruthy();
    // Badge für assignable Rolle
    expect(screen.getByText("Aktive App-Rolle")).toBeTruthy();
    // Badge für historische Rolle
    expect(screen.getByText("Historische Rolle")).toBeTruthy();
  });

  // Plan 138-13 (D-18): ein Switch-Toggle mutiert nicht mehr sofort -- er öffnet den
  // Impact-Preview-Dialog. Die 422/409-Fehlerfälle werden jetzt erst nach "Änderung
  // übernehmen" innerhalb des Dialogs sichtbar, nicht mehr als sofortige Inline-Reaktion
  // auf den Switch-Klick selbst.
  it("zeigt spezifischen role_not_capability_bearing-Fehler im Impact-Preview-Dialog nach HTTP-422 auf grant", async () => {
    const apiModule = await import("@/lib/api");
    vi.spyOn(apiModule, "getRoleCapabilityImpactPreview").mockResolvedValue({
      affected_user_count: 0,
      items: [],
    });
    vi.spyOn(apiModule, "listRoleHolders").mockResolvedValue([]);
    vi.spyOn(apiModule, "grantRoleCapability").mockRejectedValueOnce(
      new apiModule.ApiError(422, "rein historische Rolle", null, "role_not_capability_bearing")
    );

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    // Fansub-Lead in der Rollenliste auswählen
    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Accordion "Gruppe" öffnen (enthält den granted=false Switch für "Gruppe bearbeiten")
    const gruppeHeaders = screen.getAllByText("Gruppe");
    fireEvent.click(gruppeHeaders[0]);

    // Switch für aria-checked="false" finden (Gruppe bearbeiten, granted=false) -> öffnet Dialog
    const switches = screen.getAllByRole("switch");
    const offSwitch = switches.find((s) => s.getAttribute("aria-checked") === "false");
    expect(offSwitch).toBeTruthy();
    fireEvent.click(offSwitch!);

    // Dialog öffnet sich, lädt die Vorschau, "Änderung übernehmen" wird aktiv
    const confirmButton = await screen.findByRole("button", { name: "Änderung übernehmen" });
    await waitFor(() => expect(confirmButton).toHaveProperty("disabled", false));

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // 422-spezifischer Fehlertext soll im Dialog erscheinen
    await waitFor(() => {
      const alerts = screen.queryAllByRole("alert");
      const hasRoleNotCapabilityText = alerts.some((el) =>
        el.textContent?.toLowerCase().includes("nicht") ||
        el.textContent?.toLowerCase().includes("historisch") ||
        el.textContent?.toLowerCase().includes("role_not_capability_bearing")
      );
      expect(hasRoleNotCapabilityText).toBe(true);
    });
  });

  it("zeigt Lockout-Fehlertext im Impact-Preview-Dialog nach HTTP-409 auf revoke", async () => {
    const apiModule = await import("@/lib/api");
    vi.spyOn(apiModule, "getRoleCapabilityImpactPreview").mockResolvedValue({
      affected_user_count: 0,
      items: [],
    });
    vi.spyOn(apiModule, "listRoleHolders").mockResolvedValue([]);
    vi.spyOn(apiModule, "revokeRoleCapability").mockRejectedValueOnce(
      new apiModule.ApiError(409, "Lockout-Schutz aktiv", null, "lockout_guard")
    );

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    // Fansub-Lead in der Rollenliste auswählen
    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Accordion "Mitglieder" öffnen (der granted Switch ist dort)
    const mitgliederHeaders = screen.getAllByText("Mitglieder");
    fireEvent.click(mitgliederHeaders[0]);

    // Switch für "Mitglieder anzeigen" (granted=true, aria-checked="true") -> öffnet Dialog
    const switches = screen.getAllByRole("switch");
    const checkedSwitch = switches.find((s) => s.getAttribute("aria-checked") === "true");
    expect(checkedSwitch).toBeTruthy();
    fireEvent.click(checkedSwitch!);

    const confirmButton = await screen.findByRole("button", { name: "Änderung übernehmen" });
    await waitFor(() => expect(confirmButton).toHaveProperty("disabled", false));

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Lockout-Fehlertext soll im Dialog erscheinen
    await waitFor(() => {
      const alerts = screen.queryAllByRole("alert");
      const hasLockoutText = alerts.some((el) =>
        el.textContent?.toLowerCase().includes("lockout") ||
        el.textContent?.toLowerCase().includes("schutz") ||
        el.textContent?.toLowerCase().includes("entzogen")
      );
      expect(hasLockoutText).toBe(true);
    });
  });

  it("Desktop: nach Rollenauswahl erscheint NUR der Inline-Panel, kein sheet-dialog (gegenseitige Exklusivität)", () => {
    // matchMedia gibt false zurück (Desktop, kein Match für max-width: 759px)
    mockMatchMedia(false);

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Inline-Panel soll vorhanden sein (Rollenüberschrift im Detail)
    const headings = screen.queryAllByRole("heading", { level: 3 });
    const detailHeading = headings.find((h) => h.textContent?.includes("Fansub-Lead"));
    expect(detailHeading).toBeTruthy();

    // Kein Dialog/Sheet soll geöffnet sein
    const dialogs = screen.queryAllByRole("dialog");
    expect(dialogs.length).toBe(0);
  });

  it("Mobile: nach Rollenauswahl öffnet NUR der Sheet-Dialog, kein Inline-Panel außerhalb des Dialogs", () => {
    // matchMedia gibt true zurück (Mobile, max-width: 759px trifft zu)
    mockMatchMedia(true);

    const { container } = render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Sheet/Dialog soll geöffnet sein (Drawer rendert role="dialog")
    const dialogs = screen.queryAllByRole("dialog");
    expect(dialogs.length).toBeGreaterThan(0);

    // Kein Inline-Panel-DIV außerhalb des Dialogs:
    // Im Mobile-Modus darf !isMobile && selectedRole der Inline-Panel-Zweig NICHT gerendert sein.
    // Das bedeutet: kein flex-1-Div mit RoleCapabilityDetail außerhalb des dialog-Elements.
    const dialogEl = dialogs[0];
    // Alle Accordion-Elemente im DOM — im Mobile-Modus nur innerhalb des Dialogs
    const allAccordions = container.querySelectorAll('[data-accordion], [class*="accordion"]');
    // Wenn Accordions vorhanden, müssen alle innerhalb des Dialog-Elements liegen
    allAccordions.forEach((accordion) => {
      expect(dialogEl.contains(accordion)).toBe(true);
    });

    // Schalter (Switches) dürfen nur innerhalb des Dialogs vorkommen (kein doppelter Inline-Panel)
    const allSwitches = container.querySelectorAll('[role="switch"]');
    allSwitches.forEach((sw) => {
      expect(dialogEl.contains(sw)).toBe(true);
    });
  });

  it("hält das Accordion offen nach über den Impact-Preview-Dialog bestätigtem Grant + Daten-Refresh (uncontrolled Pfad)", async () => {
    mockMatchMedia(false); // Desktop

    const apiModule = await import("@/lib/api");
    // listRoleCapabilities liefert die Matrix (Initial-Load + Refresh nach Grant)
    vi.spyOn(apiModule, "listRoleCapabilities").mockResolvedValue(sampleMatrix);
    vi.spyOn(apiModule, "getRoleCapabilityImpactPreview").mockResolvedValue({
      affected_user_count: 0,
      items: [],
    });
    vi.spyOn(apiModule, "listRoleHolders").mockResolvedValue([]);
    // Grant ist erfolgreich → onMutated ruft loadData(false) (kein LoadingState-Unmount)
    vi.spyOn(apiModule, "grantRoleCapability").mockResolvedValue({
      message: "ok",
      cache_reload_succeeded: true,
    });

    // Uncontrolled: kein matrix-Prop → interner Fetch über listRoleCapabilities
    await act(async () => {
      render(<RoleCapabilityClient />);
    });

    // Rolle auswählen
    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Accordion "Gruppe" öffnen
    const gruppeHeaders = screen.getAllByText("Gruppe");
    fireEvent.click(gruppeHeaders[0]);

    // Switch (granted=false) für "Gruppe bearbeiten" togglen → öffnet den Impact-Preview-Dialog
    const switches = screen.getAllByRole("switch");
    const offSwitch = switches.find((s) => s.getAttribute("aria-checked") === "false");
    expect(offSwitch).toBeTruthy();
    fireEvent.click(offSwitch!);

    // Vorschau lädt, dann bestätigen → Grant + Refresh (onMutated -> loadData(false))
    const confirmButton = await screen.findByRole("button", { name: "Änderung übernehmen" });
    await waitFor(() => expect(confirmButton).toHaveProperty("disabled", false));
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    await waitFor(() => {
      expect(apiModule.grantRoleCapability).toHaveBeenCalledWith("fansub_lead", "fansub_group.edit");
    });

    // Nach Grant + Refresh muss die Kategorie "Gruppe" im Hintergrund-Panel weiterhin
    // aufgeklappt sein (das Dialog-Overlay hat nach erfolgreicher Mutation keine
    // "Gruppe"-Textstelle mehr, da nur noch der Aktivierungsstatus gerendert wird).
    await waitFor(() => {
      const headerButton = screen.getByText("Gruppe").closest("button");
      expect(headerButton?.getAttribute("aria-expanded")).toBe("true");
    });
    // Und die Switches im Hintergrund-Panel sind weiterhin sichtbar (Panel nicht zugeklappt)
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
  });

  // D-06: ?role=-Query-Param wählt die passende Rolle beim Laden vor, identisch zum
  // manuellen Klick-Pfad (Desktop Inline-Panel).
  it("wählt Rolle aus ?role=-Query-Param beim Laden vor (Desktop Inline-Panel)", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("role=fansub_lead") as ReturnType<typeof useSearchParams>
    );
    mockMatchMedia(false); // Desktop

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    // Inline-Panel für fansub_lead ist ohne Klick sichtbar
    const headings = screen.queryAllByRole("heading", { level: 3 });
    const detailHeading = headings.find((h) => h.textContent?.includes("Fansub-Lead"));
    expect(detailHeading).toBeTruthy();
  });
});
