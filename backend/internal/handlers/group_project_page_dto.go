package handlers

import (
	"context"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// ProjectPageBundle ist die aggregierte Leicht-Shell der oeffentlichen
// Fansub-Projektseite. Sie komponiert ausschliesslich bestehende Response-Typen
// (keine Duplikate) und wird in EINEM HTTP-Round-Trip ausgeliefert.
//
// KRITISCH (Review Pkt 4): Die 5 optionalen Sektionen sind Pointer OHNE
// omitempty. Eine fehlgeschlagene Sektion serialisiert dadurch als `null`
// (partielle Degradation) statt aus der JSON-Antwort zu verschwinden.
//
// Bewusst NICHT im Bundle: public_profile (auf dem kanonischen Pfad bereits
// vorab geladen) und assets (Jellyfin + bis zu 500 Releases, schwer). Beide
// bleiben separate, parallel laufende Fetches.
type ProjectPageBundle struct {
	// Gate-Sektionen: im Erfolgsfall stets gesetzt (sonst 404/500 vor der Antwort).
	Group *models.GroupDetail `json:"group"`
	Anime *models.AnimeDetail `json:"anime"`

	// Optionale Sektionen: Pointer OHNE omitempty -> nil serialisiert als null.
	Contributors *repository.GroupContributorsResponse    `json:"contributors"`
	Themes       *repository.GroupThemesResponse          `json:"themes"`
	ReleaseMedia *repository.GroupReleaseMediaResponse    `json:"release_media"`
	ProjectNote  *repository.PublicAnimeFansubProjectNote `json:"project_note"`
	AnimeFansubs *[]models.AnimeFansubRelation            `json:"anime_fansubs"`
}

// Schmale Source-Interfaces (eine Methode je Quelle) mit exakt den bestehenden
// Repository-Signaturen. Die konkreten Repos erfuellen sie ohne Adapter; im Test
// koennen sie per Stub injiziert werden.

// groupDetailSource liefert das Gruppen-Detail (Gate; repository.ErrNotFound -> 404).
type groupDetailSource interface {
	GetGroupDetail(ctx context.Context, animeID, groupID int64) (*models.GroupDetail, error)
}

// animeSource liefert das Anime-Detail (Gate; repository.ErrNotFound -> 404).
type animeSource interface {
	GetByID(ctx context.Context, id int64, includeDisabled bool) (*models.AnimeDetail, error)
}

// contributorsSource liefert projektspezifische Mitwirkende (optionale Sektion).
type contributorsSource interface {
	GetProjectContributors(ctx context.Context, animeID, groupID int64) (*repository.GroupContributorsResponse, error)
}

// themesSource liefert oeffentliche Themes (optionale Sektion).
type themesSource interface {
	GetPublicGroupThemes(ctx context.Context, animeID, groupID int64) (*repository.GroupThemesResponse, error)
}

// releaseMediaSource liefert oeffentliche Release-Medien (optionale Sektion).
type releaseMediaSource interface {
	GetPublicReleaseMedia(ctx context.Context, animeID, groupID int64) (*repository.GroupReleaseMediaResponse, error)
}

// projectNoteSource liefert die oeffentliche Projektnotiz (optionale Sektion;
// ErrInvalidAnimeFansubContext/ErrNotFound -> keine Notiz, kein Fehler).
type projectNoteSource interface {
	GetPublicAnimeFansubProjectNote(ctx context.Context, animeID, groupID int64) (*repository.PublicAnimeFansubProjectNote, error)
}

// animeFansubsSource liefert die Fansub-Relationen des Anime (optionale Sektion).
type animeFansubsSource interface {
	ListAnimeFansubs(ctx context.Context, animeID int64) ([]models.AnimeFansubRelation, error)
}
