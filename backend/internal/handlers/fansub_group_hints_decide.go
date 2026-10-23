package handlers

import (
	"context"
	"fmt"
)

// hintDecideRepository ist das schmale Interface, das decideFansubGroupHint fuer die
// eigentliche Statusaenderung eines Hinweises benoetigt. Es enthaelt bewusst NUR
// Confirm/Reject — keine Mitgliedschafts-, Rollen- oder Punkte-/Badge-vergebende Methode
// ist Teil dieser Schnittstelle. Das macht D-03 ("reine Information, keine automatische
// Mitgliedschaft") und D-05 ("keine Punkte/Badges durch den Hinweis selbst") strukturell
// statt nur behauptet erzwungen: weder dieser Helfer noch einer der beiden Handler, die ihn
// aufrufen, besitzen ueberhaupt eine Methode, mit der sie etwas anderes als den Status des
// Hinweises aendern koennten.
type hintDecideRepository interface {
	Confirm(ctx context.Context, hintID, actorAppUserID int64) error
	Reject(ctx context.Context, hintID, actorAppUserID int64, decisionNote *string) error
}

// decideFansubGroupHint fuehrt die Entscheidung ueber einen Hinweis aus (Bestaetigen oder
// Ablehnen) und wird von genau zwei Handlern mit unterschiedlichen Autorisierungswegen
// aufgerufen: dem Leader-der-Zielgruppe-Pfad (fansub_group_hints_review_handler.go, Gate
// CanForFansubGroup/ActionFansubGroupMembersManage) und dem Plattform-Admin-Pfad fuer
// Mitgliedschaftsanfragen mit gewuenschter Rolle fansub_lead
// (admin_fansub_group_hints_handler.go, Gate requirePlatformAdminIdentity). Beide
// Oberflaechen entscheiden fachlich dasselbe ("dieser Hinweis ist jetzt bearbeitet"), nur
// WER entscheiden darf unterscheidet sich je nach betroffener Rolle (D-01/D-07) — deshalb
// lebt die Entscheidungslogik genau einmal hier statt zweimal kopiert zu werden, und beide
// Handler sind dadurch beweisbar identisch im Verhalten (kein Mitgliedschafts- oder
// Punkte-/Badge-Seiteneffekt, siehe hintDecideRepository-Kommentar).
func decideFansubGroupHint(ctx context.Context, repo hintDecideRepository, hintID, actorAppUserID int64, decision string, decisionNote *string) error {
	switch decision {
	case "confirm":
		return repo.Confirm(ctx, hintID, actorAppUserID)
	case "reject":
		return repo.Reject(ctx, hintID, actorAppUserID, decisionNote)
	default:
		return fmt.Errorf("decideFansubGroupHint: unbekannte decision %q (erwartet \"confirm\" oder \"reject\")", decision)
	}
}
