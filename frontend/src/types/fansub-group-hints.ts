// Getypter Spiegel von shared/contracts/fansub-group-hints.yaml (Plan 191-05,
// Felder nach D-09 auf den Plan-191-12-Backend-Contract nachgezogen).
//
// Warum diese Datei existiert: Der "Hinweis senden"-Workflow (Phase 191) hat DREI
// unabhängige UI-Konsumenten für dieselben sieben Backend-Endpunkte — das Mitglied-
// Formular zum Absenden eines Hinweises (Plan 191-07), die gruppen-gescopte
// Leader-Review-Liste (Plan 191-08) und die plattform-weite Admin-Liste für
// Zielgruppen ohne aktive Leitung (Plan 191-09, D-11). Ohne eine einzige geteilte
// Typdatei würde jede dieser drei Komponenten ihre eigene, leicht abweichende
// Vorstellung der Response-Form erfinden (z. B. unterschiedliche Feldnamen für
// "wer hat entschieden" oder ob ein Feld null sein darf) — genau das Problem, das
// dieser Datei-Zweck verhindert. Jedes Feld hier entspricht 1:1 dem json-Tag, den
// das Backend tatsächlich ausliefert. Nach D-09 ist jeder Hinweis ausnahmslos ein
// Korrektur-Hinweis mit Projektbezug — es gibt keine zweite Hinweisart und kein
// Rollenfeld mehr. related_anime_id/related_anime_title bleiben in dieser
// Lese-Form bewusst `| null`: FansubGroupHintRow (backend/internal/repository/
// fansub_group_hints_repository.go) scannt beide Felder weiterhin über
// `*int64`/`*string` aus einem LEFT JOIN auf `anime` -- die Datenbank-NOT-NULL-
// Pflicht gilt nur für die Spalte `h.related_anime_id` selbst (serverseitig beim
// Anlegen erzwungen, siehe CreateFansubGroupHintRequest unten), nicht für das
// Ergebnis des JOINs, das bei einem fehlenden Anime-Datensatz technisch leer
// bleiben könnte.
//
// related_release_version_id/related_release_label (Plan 191-32, D-29/D-31/D-34):
// Ein Hinweis kann optional ein einzelnes Release statt des ganzen Projekts
// betreffen. Im Request ist das Feld optional (ein Hinweis darf weiterhin das
// gesamte Projekt meinen, "Ganzes Projekt" = kein Release gewählt). In der
// Response sind beide Felder IMMER vorhanden (nie `undefined`), aber `null`,
// wenn kein Release referenziert wurde — sie spiegeln
// `FansubGroupHintRow.RelatedReleaseVersionID`/`RelatedReleaseLabel`
// (backend/internal/repository/fansub_group_hints_repository.go, Plan 191-32)
// 1:1. `related_release_label` wird serverseitig bereits lesbar aufbereitet
// (kein nacktes ID-Feld im Frontend zusammenzubauen).
export type FansubGroupHintStatus = "open" | "acknowledged" | "rejected";

export interface FansubGroupHint {
  id: number;
  sender_app_user_id: number;
  sender_display_name: string;
  sender_own_group_name: string | null;
  target_fansub_group_id: number;
  target_fansub_group_name: string;
  related_anime_id: number | null;
  related_anime_title: string | null;
  related_release_version_id: number | null;
  related_release_label: string | null;
  note: string | null;
  status: FansubGroupHintStatus;
  decided_by: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface CreateFansubGroupHintRequest {
  target_fansub_group_id: number;
  related_anime_id: number;
  /** Optional: ein Hinweis darf weiterhin das ganze Projekt meinen ("Ganzes Projekt"). */
  related_release_version_id?: number | null;
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
