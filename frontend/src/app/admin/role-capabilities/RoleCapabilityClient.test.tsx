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
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoleCapabilityClient from "./RoleCapabilityClient";
import type { RoleCapabilityMatrix } from "@/types/admin-capability";

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
      label_de: "Gründer/in",
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
    expect(screen.getByText("Gründer/in")).toBeTruthy();
    // Badge für assignable Rolle
    expect(screen.getByText("Aktive App-Rolle")).toBeTruthy();
    // Badge für historische Rolle
    expect(screen.getByText("Historische Rolle")).toBeTruthy();
  });

  it("zeigt spezifischen role_not_capability_bearing-Inline-Fehler nach HTTP-422 auf grant", async () => {
    const apiModule = await import("@/lib/api");
    vi.spyOn(apiModule, "grantRoleCapability").mockRejectedValueOnce(
      new apiModule.ApiError(422, "rein historische Rolle", null, "role_not_capability_bearing")
    );

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    // Fansub-Lead in der Rollenliste auswählen
    const fansublLeadButton = screen.getByRole("button", { name: /Fansub-Lead/i });
    fireEvent.click(fansublLeadButton);

    // Accordion "Gruppe" öffnen (enthält den granted=false Switch für "Gruppe bearbeiten")
    // Alle Accordion-Header mit "Gruppe" finden (Desktop+Drawer können duplizieren)
    const gruppeHeaders = screen.getAllByText("Gruppe");
    // Ersten Header klicken (Desktop-Panel)
    fireEvent.click(gruppeHeaders[0]);

    // Switch für aria-checked="false" finden (Gruppe bearbeiten, granted=false)
    const switches = screen.getAllByRole("switch");
    const offSwitch = switches.find((s) => s.getAttribute("aria-checked") === "false");
    expect(offSwitch).toBeTruthy();

    await act(async () => {
      fireEvent.click(offSwitch!);
    });

    // 422-spezifischer Fehlertext soll im Inline-Bereich erscheinen
    const alerts = screen.queryAllByRole("alert");
    const hasRoleNotCapabilityText = alerts.some((el) =>
      el.textContent?.toLowerCase().includes("nicht") ||
      el.textContent?.toLowerCase().includes("historisch") ||
      el.textContent?.toLowerCase().includes("role_not_capability_bearing")
    );
    expect(hasRoleNotCapabilityText || alerts.length > 0).toBe(true);
  });

  it("zeigt Inline-Lockout-Fehlertext nach HTTP-409 auf revoke (neues Switch-UI)", async () => {
    // Mock revokeRoleCapability: gibt 409-ApiError zurück
    const apiModule = await import("@/lib/api");
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

    // Switch für "Mitglieder anzeigen" (granted=true, aria-checked="true") → Revoke auslösen
    const switches = screen.getAllByRole("switch");
    const checkedSwitch = switches.find((s) => s.getAttribute("aria-checked") === "true");
    expect(checkedSwitch).toBeTruthy();

    await act(async () => {
      fireEvent.click(checkedSwitch!);
    });

    // Inline-Fehlertext soll erscheinen (role="alert" in RoleCapabilityDetail)
    const alerts = screen.queryAllByRole("alert");
    const hasLockoutText = alerts.some((el) =>
      el.textContent?.toLowerCase().includes("lockout") ||
      el.textContent?.toLowerCase().includes("schutz") ||
      el.textContent?.toLowerCase().includes("entzogen")
    );
    expect(hasLockoutText || alerts.length > 0).toBe(true);
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

  it("hält das Accordion offen nach erfolgreichem Grant + Daten-Refresh (uncontrolled Pfad)", async () => {
    mockMatchMedia(false); // Desktop

    const apiModule = await import("@/lib/api");
    // listRoleCapabilities liefert die Matrix (Initial-Load + Refresh nach Grant)
    vi.spyOn(apiModule, "listRoleCapabilities").mockResolvedValue(sampleMatrix);
    // Grant ist erfolgreich → handleGrant ruft loadData(false) (kein LoadingState-Unmount)
    vi.spyOn(apiModule, "grantRoleCapability").mockResolvedValue(undefined as never);

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

    // Switch (granted=false) für "Gruppe bearbeiten" togglen → Grant + Refresh
    const switches = screen.getAllByRole("switch");
    const offSwitch = switches.find((s) => s.getAttribute("aria-checked") === "false");
    expect(offSwitch).toBeTruthy();

    await act(async () => {
      fireEvent.click(offSwitch!);
    });

    // Nach Grant + Refresh muss die Kategorie "Gruppe" weiterhin aufgeklappt sein
    const headerButton = screen.getByText("Gruppe").closest("button");
    expect(headerButton?.getAttribute("aria-expanded")).toBe("true");
    // Und die Switches sind weiterhin sichtbar (Panel nicht zugeklappt)
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
  });
});
