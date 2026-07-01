/**
 * TypeScript-Typen für die Capability-Matrix-API (Phase 87, D-08).
 * Spiegelbildlich zum OpenAPI-Schema in shared/contracts/admin-capabilities.yaml.
 */

/** Status einer einzelnen Action für eine Rolle in der Capability-Matrix. */
export interface RoleActionState {
  code: string;
  label_de: string;
  category: string;
  granted: boolean;
  standalone: boolean;
}

/** Eine Rolle mit allen ihren Action-States in der Capability-Matrix. */
export interface RoleEntry {
  role_code: string;
  label_de: string;
  actions: RoleActionState[];
  /** Ob die Rolle im Gruppen-Add-Picker zuweisbar ist (die App-Gruppenrollen). */
  assignable?: boolean;
  /**
   * Ob die Capabilities dieser Rolle editierbar sind — true für alle aktiven Rollen mit
   * Kontext fansub_group ODER anime_contribution (auch Contribution-/Projekt-Rollen wie
   * encoder). Nur rein historische Rollen haben capability_editable=false (Gap G4).
   */
  capability_editable?: boolean;
  /** role_definitions.contexts (für Kontext-Badges). */
  contexts?: string[];
}

/** Eine Rollendefinition aus dem role-definitions-Endpunkt. */
export interface RoleDefinitionOption {
  code: string;
  label_de: string;
  sort_order: number;
}

/** Metadaten zu einer einzelnen Action (für Spaltenüberschriften in der Matrix-Tabelle). */
export interface ActionEntry {
  code: string;
  label_de: string;
  category: string;
  sort_order: number;
}

/** Vollständige Capability-Matrix: Rollen × Actions. */
export interface RoleCapabilityMatrix {
  roles: RoleEntry[];
  all_actions: ActionEntry[];
}
