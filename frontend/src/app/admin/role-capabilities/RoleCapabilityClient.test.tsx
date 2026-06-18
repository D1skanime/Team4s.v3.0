// @vitest-environment jsdom
/**
 * Wave-0 RED-Test für RoleCapabilityClient (Plan 87-01).
 *
 * Diese Tests schlagen mit einem Modul-nicht-gefunden-Fehler fehl,
 * da RoleCapabilityClient.tsx noch nicht existiert — das ist das erwartete RED-Signal.
 * Plan 87-03 erstellt die Komponente und macht diese Tests grün.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RoleCapabilityClient from "./RoleCapabilityClient";
import type { RoleCapabilityMatrix } from "@/types/admin-capability";

const emptyMatrix: RoleCapabilityMatrix = {
  roles: [],
  all_actions: [],
};

const sampleMatrix: RoleCapabilityMatrix = {
  roles: [
    {
      role_code: "fansub_lead",
      label_de: "Fansub-Leiter",
      actions: [
        {
          code: "fansub_group.members.view",
          label_de: "Mitglieder anzeigen",
          category: "Mitglieder",
          granted: true,
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
  ],
};

describe("RoleCapabilityClient", () => {
  it("zeigt Ladezustand wenn Matrix leer ist", () => {
    render(<RoleCapabilityClient matrix={emptyMatrix} isLoading={true} />);
    expect(screen.getByText(/lade/i)).toBeTruthy();
  });

  it("zeigt Tabelle mit Rollen nach Datenladen", () => {
    render(<RoleCapabilityClient matrix={sampleMatrix} isLoading={false} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Fansub-Leiter")).toBeTruthy();
  });
});
