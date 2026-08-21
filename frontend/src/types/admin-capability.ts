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

/** Runtime-validierte öffentliche Katalogzeile mit vollständiger Präsentationsmetadaten. */
export interface PublicRoleDefinitionOption extends RoleDefinitionOption {
  contexts: string[];
  assignable: boolean;
  color_key: string;
  icon_key: string;
  operative_capability_count: number;
  has_operative_capabilities: boolean;
}

export type RoleDefinitionContext = 'fansub_group' | 'anime_contribution' | 'group_history';

/**
 * Herkunfts-/Entscheidungsquellen-Vokabular für ein EffectiveRightState.
 * platform_admin, specialized_grant und no_grant wurden additiv in Phase 137
 * ergänzt (D04); die ursprünglichen vier Phase-136-Werte bleiben unverändert
 * gültig und werden nicht entfernt.
 */
export type EffectiveRightProvenance =
  | 'idp_global_role'
  | 'group_role'
  | 'user_allow'
  | 'user_deny'
  | 'platform_admin'
  | 'specialized_grant'
  | 'no_grant';
export type CapabilityOverrideEffect = 'allow' | 'deny';
/**
 * Phase 137 erfolgreiche Override-Mutationen melden ausschließlich 'active'.
 * 'persisted', 'pending' und 'failed' bleiben schema-kompatibel für spätere
 * Phasen, werden von Phase 137 jedoch nicht erzeugt.
 */
export type CapabilityActivationStatus = 'persisted' | 'active' | 'pending' | 'failed';
export type CapabilityMutationStatus = 'changed' | 'no_op';

/**
 * Additiv erweitertes Phase-136-DTO (Phase 137, D04): ein einziges
 * provenienzfähiges Effective-Right-Objekt statt eines konkurrierenden,
 * reicheren Inspector-Typs. Dient sowohl Mutationsergebnissen als auch der
 * künftigen Effective-Rights-Inspection.
 */
export interface EffectiveRightState {
  action_code: string;
  allowed: boolean;
  provenance: EffectiveRightProvenance;
  decisive: boolean;
  non_deniable: boolean;
  /** Alle Rollen, die diese Capability gewähren würden. */
  granting_roles: string[];
  /** Ob ein individueller Allow-Override für diese Capability existiert. */
  user_allow: boolean;
  /** Ob ein individueller Deny-Override für diese Capability existiert. */
  user_deny: boolean;
  /** Namen spezialisierter Grant-Quellen (z. B. review_delegation). */
  specialized_grants: string[];
  /** Die gemäß Präzedenz tatsächlich entscheidende Quelle für "allowed". */
  decisive_source: EffectiveRightProvenance;
  /** Maschinenlesbarer Grund-Code; keine deutschsprachigen Erklärtexte in Phase 137. */
  reason_code: string;
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
