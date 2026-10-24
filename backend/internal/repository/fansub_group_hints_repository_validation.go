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

// ensureHintReleaseContext ist die D-31-Vorprüfung für
// FansubGroupHintsRepository.CreateHint: bevor ein Hinweis mit einem konkreten
// related_release_version_id eingefügt wird, muss das referenzierte Release tatsächlich
// zum übergebenen animeID gehören (über release_versions -> fansub_releases ->
// episodes.anime_id) UND fansubGroupID muss laut release_version_groups an diesem Release
// beteiligt sein -- ein Klient darf serverseitig keine erfundene (Release, Projekt,
// Gruppe)-Kombination behaupten, exakt dasselbe ASVS-L1-Prinzip wie
// ensureHintAnimeFansubContext (D-23), nur eine Ebene tiefer. Mirrort bewusst nicht den
// Helper selbst (unterschiedliche Join-Kette: release_versions hat keine eigene
// anime_id-Spalte), sondern nur dessen Stil (gleiche EXISTS-Form, gleiches
// Fehler-Wrapping). releaseVersionID == nil überspringt die Prüfung bewusst (kein
// Release-Bezug angegeben -- der Hinweis gilt dem ganzen Projekt, D-29). animeID == nil
// kann an dieser Stelle praktisch nicht auftreten (related_anime_id ist seit Migration
// 0188 NOT NULL und wird vom Handler bereits als Pflichtfeld erzwungen), wird aber
// defensiv wie "kein Release ohne zugehöriges Projekt" behandelt und liefert in diesem
// Fall ebenfalls ErrInvalidReleaseVersionContext statt eines SQL-NULL-Vergleichsfehlers.
func ensureHintReleaseContext(ctx context.Context, db DBTX, releaseVersionID *int64, animeID *int64, fansubGroupID int64) error {
	if releaseVersionID == nil {
		return nil
	}
	if animeID == nil {
		return fmt.Errorf("hinweis erstellen: %w", ErrInvalidReleaseVersionContext)
	}

	var exists bool
	err := db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM release_versions rv
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes ep ON ep.id = fr.episode_id
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			WHERE rv.id = $1 AND ep.anime_id = $2 AND rvg.fansub_group_id = $3
		)
	`, *releaseVersionID, *animeID, fansubGroupID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("hinweis erstellen: release-kontext pruefen: %w", err)
	}
	if !exists {
		return fmt.Errorf("hinweis erstellen: %w", ErrInvalidReleaseVersionContext)
	}
	return nil
}
