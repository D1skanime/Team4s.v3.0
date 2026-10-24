package repository

// FansubGroupHintsRepository persistiert Hinweise, die ein Mitglied an eine EIGENE ODER
// FREMDE Fansub-Gruppe schickt (Migration 0187, nach dem D-09-Schema-Schnitt der Migration
// 0188 ausschließlich noch Korrektur-Hinweise zu einem Projekt-Eintrag -- die frühere
// zweite Hinweisart "Anfrage auf Mitgliedschaft" entfiel ersatzlos, weil "Hinweis senden"
// ohnehin nur Mitgliedern mit Mitgliedsprofil UND Projekt-Zuordnung offensteht und der
// bereits bestehende Mitglieds-Claim-Weg (member_claims, Phase 81/135) diesen Fall längst
// abdeckt). Anders als beim regulären Beitrags-Vorschlag
// (anime_contributions_proposal_repository.go) gibt es hier bewusst KEINEN
// Ownership-Check wie MemberBelongsToFansub: ein Hinweis darf an jede Gruppe gehen, nicht
// nur an die eigene — das ist der fachliche Kernunterschied. Die Dopplungssperre
// (höchstens ein offener Hinweis pro Person+Zielgruppe+Projekt[+Release], D-32) wird nicht
// hier im Go-Code geprüft, sondern ausschließlich über den Partial-Unique-Index
// `uq_fansub_group_hints_open_topic` der Migration — vermeidet eine
// SELECT-dann-INSERT-Race (TOCTOU) bei gleichzeitigen Anfragen.

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FansubGroupHintRow ist die angereicherte Lesesicht auf eine fansub_group_hints-Zeile,
// inklusive Anzeige-Kontext (Absendername, Zielgruppenname, Projekttitel, optional
// Release-Bezug D-34), der von den Review-Oberflächen (Leader- und
// Plattform-Admin-Liste) benötigt wird.
type FansubGroupHintRow struct {
	ID                    int64      `json:"id"`
	SenderAppUserID       int64      `json:"sender_app_user_id"`
	SenderDisplayName     string     `json:"sender_display_name"`
	TargetFansubGroupID   int64      `json:"target_fansub_group_id"`
	TargetFansubGroupName string     `json:"target_fansub_group_name"`
	RelatedAnimeID        *int64     `json:"related_anime_id"`
	RelatedAnimeTitle     *string    `json:"related_anime_title"`
	// RelatedReleaseVersionID/RelatedReleaseLabel (D-34) tragen den optionalen,
	// serverseitig gegen release_versions/release_version_groups geprüften (D-31)
	// Release-Bezug eines Hinweises -- beide bleiben nil, wenn sich der Hinweis auf das
	// ganze Projekt bezieht statt auf ein konkretes Release.
	RelatedReleaseVersionID *int64     `json:"related_release_version_id"`
	RelatedReleaseLabel     *string    `json:"related_release_label"`
	Note                    *string    `json:"note"`
	Status                  string     `json:"status"`
	DecidedBy               *int64     `json:"decided_by"`
	DecidedAt               *time.Time `json:"decided_at"`
	DecisionNote            *string    `json:"decision_note"`
	CreatedAt               time.Time  `json:"created_at"`
	// SenderOwnGroupName ist der UI-Kontext "Mitglied bei: {Gruppe}" — best-effort über
	// eine verifizierte member_claims-Mitgliedschaft des Absenders ermittelt. Bleibt NULL,
	// wenn der Absender keine verifizierte Mitgliedschaft hat oder mehrdeutig mehreren
	// Gruppen zugeordnet ist; dieses Feld darf niemals einen Fehler auslösen, da es reiner
	// Zusatzkontext und keine Entscheidungsgrundlage ist.
	SenderOwnGroupName *string `json:"sender_own_group_name"`
}

// HintInput enthält die Eingabefelder für einen neuen Hinweis. SenderAppUserID stammt
// immer aus der verifizierten Identität des Aufrufers (niemals aus dem Request-Body) —
// das wird vom aufrufenden Handler sichergestellt, nicht hier. RelatedAnimeID ist nach
// D-09 immer Pflicht (jeder verbleibende Hinweis ist ein Korrektur-Hinweis mit
// Projektbezug, von der Migration über NOT NULL erzwungen). RelatedReleaseVersionID ist
// seit D-31 optional nutzbar: ist es gesetzt, prüft CreateHint vor dem Insert über
// ensureHintReleaseContext, dass das Release tatsächlich zu RelatedAnimeID gehört und
// TargetFansubGroupID an ihm beteiligt ist -- ein Klient darf serverseitig keine
// erfundene Release-Projekt-Gruppe-Kombination behaupten.
type HintInput struct {
	SenderAppUserID         int64
	TargetFansubGroupID     int64
	RelatedAnimeID          *int64
	RelatedReleaseVersionID *int64
	Note                    *string
}

// FansubGroupHintsRepository bündelt alle Datenbankzugriffe auf fansub_group_hints.
type FansubGroupHintsRepository struct {
	db *pgxpool.Pool
}

// NewFansubGroupHintsRepository erzeugt ein neues FansubGroupHintsRepository.
func NewFansubGroupHintsRepository(db *pgxpool.Pool) *FansubGroupHintsRepository {
	return &FansubGroupHintsRepository{db: db}
}

// fansubGroupHintSelectCols ist seit D-34 kein reines SQL-String-Literal mehr (var statt
// const), weil related_release_label über denselben publicReleaseTitleSQL-Baustein
// gebildet wird, den die öffentlichen Release-Listen bereits nutzen (group_repository.go)
// -- so bleibt die Label-Fallback-Logik ("Episode N (Gruppe) Version M") an genau einer
// Stelle im Code gepflegt.
var fansubGroupHintSelectCols = `
	h.id,
	h.sender_app_user_id,
	COALESCE(NULLIF(au.display_name, ''), au.email, ''),
	h.target_fansub_group_id,
	COALESCE(fg.name, ''),
	h.related_anime_id,
	a.title,
	h.related_release_version_id,
	CASE WHEN h.related_release_version_id IS NULL THEN NULL ELSE ` + publicReleaseTitleSQL("rv", "rel_ep", "fg") + ` END AS related_release_label,
	h.note,
	h.status,
	h.decided_by,
	h.decided_at,
	h.decision_note,
	h.created_at,
	(
		SELECT fg2.name
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN (
			SELECT member_id, fansub_group_id FROM hist_fansub_group_members
			UNION
			SELECT member_id, fansub_group_id FROM fansub_group_members WHERE member_id IS NOT NULL
		) grp ON grp.member_id = m.id
		JOIN fansub_groups fg2 ON fg2.id = grp.fansub_group_id
		WHERE mc.app_user_id = h.sender_app_user_id AND mc.claim_status = 'verified'
		ORDER BY grp.fansub_group_id
		LIMIT 1
	) AS sender_own_group_name
`

const fansubGroupHintFromJoins = `
	FROM fansub_group_hints h
	JOIN app_users au ON au.id = h.sender_app_user_id
	JOIN fansub_groups fg ON fg.id = h.target_fansub_group_id
	LEFT JOIN anime a ON a.id = h.related_anime_id
	LEFT JOIN release_versions rv ON rv.id = h.related_release_version_id
	LEFT JOIN fansub_releases rel_fr ON rel_fr.id = rv.release_id
	LEFT JOIN episodes rel_ep ON rel_ep.id = rel_fr.episode_id
`

func scanFansubGroupHintRow(row pgx.Row) (*FansubGroupHintRow, error) {
	var r FansubGroupHintRow
	if err := row.Scan(
		&r.ID,
		&r.SenderAppUserID,
		&r.SenderDisplayName,
		&r.TargetFansubGroupID,
		&r.TargetFansubGroupName,
		&r.RelatedAnimeID,
		&r.RelatedAnimeTitle,
		&r.RelatedReleaseVersionID,
		&r.RelatedReleaseLabel,
		&r.Note,
		&r.Status,
		&r.DecidedBy,
		&r.DecidedAt,
		&r.DecisionNote,
		&r.CreatedAt,
		&r.SenderOwnGroupName,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateHint legt einen neuen Hinweis an (status='open'). Vor dem Insert prüft
// ensureHintAnimeFansubContext (fansub_group_hints_repository_validation.go, D-23), dass
// (target_fansub_group_id, related_anime_id) real in anime_fansub_groups existiert — kein
// Klient darf serverseitig eine erfundene Paarung behaupten (live reproduzierter
// Datenfehler: Hinweis-ID 4 verknüpfte eine Gruppe mit einem Anime ohne passende
// anime_fansub_groups-Zeile). Zusätzlich prüft ensureHintReleaseContext (D-31), falls
// related_release_version_id gesetzt ist, dass dieses Release tatsächlich zu
// related_anime_id gehört UND target_fansub_group_id an ihm beteiligt ist. Gibt außerdem
// ErrConflict zurück, wenn bereits ein offener Hinweis zum selben Thema existiert
// (erzwungen über den Partial-Unique-Index der Migration, seit D-32 release-genau), und
// ErrNotFound bei einer Zielgruppen-/Anime-FK-Referenz, die nicht bereits durch eine der
// beiden Prüfungen abgefangen wurde.
//
// Bewusst KEIN Ownership-Check wie AnimeContributionsRepository.MemberBelongsToFansub:
// ein Hinweis ist eine reine Information an eine Gruppe, keine Behauptung tatsächlicher
// Mitwirkung — ein Mitglied darf deshalb an JEDE Fansub-Gruppe einen Hinweis schicken,
// nicht nur an die eigene(n). Der Ownership-Check bleibt unverändert beim regulären
// Beitrags-Vorschlag (anime_contributions_proposal_repository.go), der eine tatsächliche
// Mitwirkung in der Zielgruppe behauptet und deshalb weiterhin Mitgliedschaft voraussetzt.
func (r *FansubGroupHintsRepository) CreateHint(ctx context.Context, input HintInput) (*FansubGroupHintRow, error) {
	if err := ensureHintAnimeFansubContext(ctx, r.db, input.RelatedAnimeID, input.TargetFansubGroupID); err != nil {
		return nil, err
	}
	if err := ensureHintReleaseContext(ctx, r.db, input.RelatedReleaseVersionID, input.RelatedAnimeID, input.TargetFansubGroupID); err != nil {
		return nil, err
	}

	var newID int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_hints (
			sender_app_user_id,
			target_fansub_group_id,
			related_anime_id,
			related_release_version_id,
			note
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`,
		input.SenderAppUserID,
		input.TargetFansubGroupID,
		input.RelatedAnimeID,
		input.RelatedReleaseVersionID,
		input.Note,
	).Scan(&newID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("hinweis erstellen: bereits ein offener Hinweis zu diesem Thema vorhanden: %w", ErrConflict)
		}
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("hinweis erstellen: Referenz nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("hinweis erstellen: insert: %w", err)
	}

	return r.GetByID(ctx, newID)
}

// GetByID gibt einen einzelnen Hinweis inklusive Anzeige-Kontext zurück.
func (r *FansubGroupHintsRepository) GetByID(ctx context.Context, id int64) (*FansubGroupHintRow, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+fansubGroupHintSelectCols+`
		`+fansubGroupHintFromJoins+`
		WHERE h.id = $1
	`, id)
	result, err := scanFansubGroupHintRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("hinweis laden: %w", err)
	}
	return result, nil
}

// ListByTargetGroup gibt alle Hinweise an eine Zielgruppe zurück, über ALLE Status hinweg
// (offen + bestätigt + abgelehnt), sortiert nach Erstelldatum. Die Liste filtert
// absichtlich nicht serverseitig auf status='open' — das Frontend entscheidet per
// Toggle "Nur offene anzeigen" (analog zu ContributionsReviewSection.tsx), welche
// Teilmenge angezeigt wird.
func (r *FansubGroupHintsRepository) ListByTargetGroup(ctx context.Context, targetGroupID int64) ([]FansubGroupHintRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+fansubGroupHintSelectCols+`
		`+fansubGroupHintFromJoins+`
		WHERE h.target_fansub_group_id = $1
		ORDER BY h.created_at ASC
	`, targetGroupID)
	if err != nil {
		return nil, fmt.Errorf("hinweise nach zielgruppe: %w", err)
	}
	defer rows.Close()

	result := make([]FansubGroupHintRow, 0)
	for rows.Next() {
		row, err := scanFansubGroupHintRow(rows)
		if err != nil {
			return nil, fmt.Errorf("hinweise nach zielgruppe: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("hinweise nach zielgruppe: iterate: %w", err)
	}
	return result, nil
}

// ListBySender gibt alle Hinweise zurück, die der übergebene Absender jemals verschickt
// hat -- an die eigene(n) UND an fremde Gruppen, über ALLE Status hinweg (D-18: der
// Absender-seitige Spiegel von ListByTargetGroup, dieselben Spalten/Joins, nur die
// WHERE-Spalte wechselt von h.target_fansub_group_id auf h.sender_app_user_id). Keine
// Status-Einschränkung, aus demselben Grund wie ListByTargetGroup: das Frontend
// entscheidet per Anzeige/Filter, welche Teilmenge sichtbar ist, nicht das Repository.
// senderAppUserID MUSS vom Aufrufer immer aus einer verifizierten Auth-Identität stammen
// (niemals aus einem Request-Parameter) -- das Repository selbst prüft/erzwingt das
// nicht, das ist Aufgabe des aufrufenden Handlers (siehe
// FansubGroupHintsMeHandler.ListSentHints, die hier EINZIGE Aufrufstelle).
func (r *FansubGroupHintsRepository) ListBySender(ctx context.Context, senderAppUserID int64) ([]FansubGroupHintRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+fansubGroupHintSelectCols+`
		`+fansubGroupHintFromJoins+`
		WHERE h.sender_app_user_id = $1
		ORDER BY h.created_at ASC
	`, senderAppUserID)
	if err != nil {
		return nil, fmt.Errorf("hinweise nach absender: %w", err)
	}
	defer rows.Close()

	result := make([]FansubGroupHintRow, 0)
	for rows.Next() {
		row, err := scanFansubGroupHintRow(rows)
		if err != nil {
			return nil, fmt.Errorf("hinweise nach absender: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("hinweise nach absender: iterate: %w", err)
	}
	return result, nil
}

// Confirm bestätigt einen offenen Hinweis: status='acknowledged', decided_by/decided_at
// gesetzt. Setzt bewusst KEINE Mitgliedschaft und keine Rollen-/Projektzuweisung als
// Seiteneffekt (D-03: der Hinweis ist reine Information — der Leader bzw. Plattform-Admin
// entscheidet separat über die bestehenden Zuweisungswege, ob und wie er reagiert). Gibt
// ErrNotFound zurück, wenn kein offener Hinweis mit der ID existiert (kein stiller No-Op
// bei bereits entschiedenen Hinweisen).
func (r *FansubGroupHintsRepository) Confirm(ctx context.Context, hintID int64, actorAppUserID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_hints
		SET status = 'acknowledged', decided_by = $2, decided_at = NOW()
		WHERE id = $1 AND status = 'open'
	`, hintID, actorAppUserID)
	if err != nil {
		return fmt.Errorf("hinweis bestätigen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hinweis bestätigen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}

// Reject lehnt einen offenen Hinweis ab: status='rejected', optionale decision_note,
// decided_by/decided_at gesetzt. Gibt ErrNotFound zurück, wenn kein offener Hinweis mit
// der ID existiert.
func (r *FansubGroupHintsRepository) Reject(ctx context.Context, hintID int64, actorAppUserID int64, decisionNote *string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_hints
		SET status = 'rejected', decision_note = $3, decided_by = $2, decided_at = NOW()
		WHERE id = $1 AND status = 'open'
	`, hintID, actorAppUserID, decisionNote)
	if err != nil {
		return fmt.Errorf("hinweis ablehnen: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hinweis ablehnen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}
