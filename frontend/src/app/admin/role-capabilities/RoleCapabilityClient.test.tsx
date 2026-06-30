// @vitest-environment jsdom
/**
 * Tests für RoleCapabilityClient (Plan 87-03 GREEN).
 *
 * Test 1: Ladezustand wenn isLoading=true
 * Test 2: Tabelle mit Rollendaten nach resolvedData
 * Test 3: Lockout-Inline-Fehler nach HTTP-409 auf revoke
 */
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoleCapabilityClient from "./RoleCapabilityClient";
import type { RoleCapabilityMatrix } from "@/types/admin-capability";

const sampleMatrix: RoleCapabilityMatrix = {
  roles: [
    {
      role_code: "fansub_lead",
      label_de: "Fansub-Lead",
      assignable: true,
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

  it("zeigt Tabelle mit Rollen nach Datenladen", () => {
    render(
      <RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Fansub-Lead")).toBeTruthy();
  });

  it("zeigt Inline-Lockout-Fehlertext im Modal nach HTTP-409 auf revoke", async () => {
    // Mock revokeRoleCapability: gibt 409-ApiError zurück
    const apiModule = await import("@/lib/api");
    vi.spyOn(apiModule, "revokeRoleCapability").mockRejectedValueOnce(
      new apiModule.ApiError(409, "Lockout-Schutz aktiv", null, "lockout_guard")
    );

    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);

    // "Entziehen"-Button für die granted Action klicken
    const entziehenButton = screen.getByRole("button", { name: "Entziehen" });
    fireEvent.click(entziehenButton);

    // Modal-Titel "Capability entziehen" sollte sichtbar sein
    expect(screen.getAllByText("Capability entziehen").length).toBeGreaterThan(0);

    // Confirm-Button im Modal-Footer klicken (name "Capability entziehen")
    const confirmButtons = screen.getAllByRole("button", { name: "Capability entziehen" });
    await act(async () => {
      fireEvent.click(confirmButtons[0]);
    });

    // Inline-Lockout-Text sollte sichtbar sein (role="alert")
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/lockout/i)).toBeTruthy();
  });
});
