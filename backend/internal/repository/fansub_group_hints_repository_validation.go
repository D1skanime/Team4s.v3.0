package repository

import (
	"context"
	"fmt"
)

// ensureHintAnimeFansubContext ist die D-23-Vorprüfung für
// FansubGroupHintsRepository.CreateHint: bevor ein Hinweis eingefügt wird, muss
// (fansubGroupID, *animeID) tatsächlich eine reale Projekt-Gruppe-Zuordnung in
// anime_fansub_groups sein — ein Klient darf serverseitig keine beliebige Paarung
// behaupten, die es laut anime_fansub_groups gar nicht gibt (live reproduzierter
// Datenfehler: Hinweis-ID 4 verknüpfte eine Gruppe mit einem Anime, für das keine
// anime_fansub_groups-Zeile existierte). Ausgelagert in eine eigene Datei, damit
// fansub_group_hints_repository.go unter dem 450-Zeilen-Limit bleibt (CLAUDE.md).
// animeID == nil überspringt die Prüfung bewusst (defensiv — der Handler weist related_anime_id
// bereits vor dem Repository-Aufruf als Pflichtfeld zurück, und die DB-NOT-NULL-Constraint der
// Migration 0188 fängt einen durchgerutschten nil-Wert ohnehin ab).
func ensureHintAnimeFansubContext(ctx context.Context, db DBTX, animeID *int64, fansubGroupID int64) error {
	if animeID == nil {
		return nil
	}
	if err := ensureAnimeFansubProjectContextExistsInDB(ctx, db, *animeID, fansubGroupID); err != nil {
		return fmt.Errorf("hinweis erstellen: %w", err)
	}
	return nil
}
