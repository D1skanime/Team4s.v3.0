// Getypter Spiegel von shared/contracts/fansub-group-hints.yaml (Plan 191-05).
//
// Warum diese Datei existiert: Der "Hinweis senden"-Workflow (Phase 191) hat DREI
// unabhängige UI-Konsumenten für dieselben sieben Backend-Endpunkte — das Mitglied-
// Formular zum Absenden eines Hinweises (Plan 191-07), die gruppen-gescopte
// Leader-Review-Liste (Plan 191-08) und die plattform-weite Admin-Liste für
// fansub_lead-Mitgliedschaftsanfragen (Plan 191-09). Ohne eine einzige geteilte
// Typdatei würde jede dieser drei Komponenten ihre eigene, leicht abweichende
// Vorstellung der Response-Form erfinden (z. B. unterschiedliche Feldnamen für
// "wer hat entschieden" oder ob ein Feld null sein darf) — genau das Problem, das
// dieser Datei-Zweck verhindert. Jedes Feld hier entspricht 1:1 dem json-Tag, den
// das Backend tatsächlich ausliefert (siehe 191-05-SUMMARY.md), nicht einer
// Annahme aus der ursprünglichen Planung.
export type FansubGroupHintType = "correction" | "membership_request";

export type FansubGroupHintStatus = "open" | "acknowledged" | "rejected";

export interface FansubGroupHint {
  id: number;
  sender_app_user_id: number;
  sender_display_name: string;
  sender_own_group_name: string | null;
  target_fansub_group_id: number;
  target_fansub_group_name: string;
  hint_type: FansubGroupHintType;
  related_anime_id: number | null;
  related_anime_title: string | null;
  requested_role_code: string | null;
  requested_role_label: string | null;
  note: string | null;
  status: FansubGroupHintStatus;
  decided_by: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface CreateFansubGroupHintRequest {
  hint_type: FansubGroupHintType;
  target_fansub_group_id: number;
  related_anime_id?: number | null;
  requested_role_code?: string | null;
  note?: string | null;
}

/** Response-Envelope für die gruppen-gescopte Leader-Liste (Plan 191-08). */
export interface FansubGroupHintListResponse {
  data: FansubGroupHint[];
}

/** Response-Envelope für die plattform-weite Admin-Liste (Plan 191-09, D-01/D-07). */
export interface AdminFansubGroupHintListResponse {
  data: FansubGroupHint[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** Filter- und Paginierungsparameter für GET /admin/fansub-group-hints. */
export interface AdminFansubGroupHintListParams {
  status?: string;
  fansub_group_id?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
