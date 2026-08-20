/**
 * TypeScript-Typen für die Capability-Matrix-API (Phase 87, D-08).
 * Spiegelbildlich zum OpenAPI-Schema in shared/contracts/admin-capabilities.yaml.
 */

/** Status einer einzelnen Action für eine Rolle in der Capability-Matrix. */
export interface RoleActionState {
  code: string;
  label_de: string;
  category: string;
  sort_order?: number;
  description_de?: string | null;
  help_text_de?: string | null;
  user_overridable?: boolean;
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
  sort_order?: number;
  color_key?: string;
  icon_key?: string;
  operative_capability_count?: number;
  has_operative_capabilities?: boolean;
  /**
   * Anzahl aktiver Zuweisungen aus app_user_global_roles — nur für die drei synthetischen
   * globalen App-Rollen-Zeilen (platform_admin/content_admin/user) gesetzt; für alle
   * role_definitions-Zeilen null/fehlend (111-RESEARCH.md Pitfall 1). Gegenstücke:
   * backend/internal/repository/authz_capability_mutations.go CapabilityMatrixRoleEntry,
   * shared/contracts/admin-capabilities.yaml RoleEntry.
   */
  global_assignment_count?: number | null;
  /**
   * "global_app_role" für die drei synthetischen globalen App-Rollen-Zeilen, sonst
   * leer/fehlend für role_definitions-Zeilen (111-RESEARCH.md Pitfall 1/2).
   */
  role_kind?: 'global_app_role' | string;
}

/** Eine Rollendefinition aus dem role-definitions-Endpunkt. */
export interface RoleDefinitionOption {
  code: string;
  label_de: string;
  contexts?: string[];
  sort_order: number;
  assignable?: boolean;
  color_key?: string;
  icon_key?: string;
  operative_capability_count?: number;
  has_operative_capabilities?: boolean;
}

export type RoleDefinitionContext = 'fansub_group' | 'anime_contribution' | 'group_history';

export type EffectiveRightProvenance = 'idp_global_role' | 'group_role' | 'user_allow' | 'user_deny';
export type CapabilityOverrideEffect = 'allow' | 'deny';
export type CapabilityActivationStatus = 'persisted' | 'active' | 'pending' | 'failed';
export type CapabilityMutationStatus = 'changed' | 'no_op';

export interface EffectiveRightState {
  action_code: string;
  allowed: boolean;
  provenance: EffectiveRightProvenance;
  decisive: boolean;
  non_deniable: boolean;
}

export type CapabilityOverrideReason =
  | { category: 'task_delegation' | 'security_measure' | 'role_gap'; text?: string | null }
  | { category: 'other'; text: string };

export interface CapabilityOverrideState {
  group_id: number;
  target_user_id: number;
  action_code: string;
  effect: CapabilityOverrideEffect;
  reason: CapabilityOverrideReason;
  created_by_user_id: number;
  created_at: string;
}

export interface CapabilityOverrideImpactItem {
  target_user_id: number;
  before: EffectiveRightState;
  after: EffectiveRightState;
}

export interface CapabilityOverrideImpactPreview {
  affected_user_count: number;
  items: CapabilityOverrideImpactItem[];
}

export interface CapabilityOverrideAuditItem {
  id: number;
  group_id: number;
  target_user_id: number;
  action_code: string;
  actor_user_id: number;
  occurred_at: string;
  before: CapabilityOverrideState | null;
  after: CapabilityOverrideState | null;
  reason: CapabilityOverrideReason | null;
}

export interface CapabilityOverrideMutationResult {
  status: CapabilityMutationStatus;
  changed: boolean;
  before: CapabilityOverrideState | null;
  after: CapabilityOverrideState | null;
  effective_right: EffectiveRightState;
  activation_status: CapabilityActivationStatus;
}

export interface CapabilityOverrideMutationRequest {
  group_id: number;
  target_user_id: number;
  action_code: string;
  effect: CapabilityOverrideEffect | null;
  /**
   * Für normale Administratoren serverseitig erforderlich. Plattform-Admin-
   * Provenienz stammt ausschließlich aus der authentifizierten Identität.
   */
  reason?: CapabilityOverrideReason | null;
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
