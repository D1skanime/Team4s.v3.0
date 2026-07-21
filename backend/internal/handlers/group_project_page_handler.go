package handlers

import (
	"errors"
	"log"
	"net/http"
	"sync"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ProjectPageHandler aggregiert die LEICHTE Shell der oeffentlichen
// Fansub-Projektseite in einem Request. Die beiden Gate-Sektionen (group, anime)
// laufen seriell zuerst (fail-fast 404/500); die 5 optionalen Sektionen laufen
// danach NEBENLAEUFIG und fehlerisoliert.
type ProjectPageHandler struct {
	groupSource        groupDetailSource
	animeSource        animeSource
	contributorsSource contributorsSource
	themesSource       themesSource
	releaseMediaSource releaseMediaSource
	projectNoteSource  projectNoteSource
	animeFansubsSource animeFansubsSource
}

// NewProjectPageHandler verdrahtet den Aggregator mit den bestehenden
// Repository-Instanzen (die die schmalen Source-Interfaces erfuellen).
func NewProjectPageHandler(
	groupSrc groupDetailSource,
	animeSrc animeSource,
	contributorsSrc contributorsSource,
	themesSrc themesSource,
	releaseMediaSrc releaseMediaSource,
	projectNoteSrc projectNoteSource,
	animeFansubsSrc animeFansubsSource,
) *ProjectPageHandler {
	return &ProjectPageHandler{
		groupSource:        groupSrc,
		animeSource:        animeSrc,
		contributorsSource: contributorsSrc,
		themesSource:       themesSrc,
		releaseMediaSource: releaseMediaSrc,
		projectNoteSource:  projectNoteSrc,
		animeFansubsSource: animeFansubsSrc,
	}
}

// GetProjectPage handles GET /api/v1/anime/:id/group/:groupId/project-page.
//
// Ablauf:
//  1. IDs parsen (400 bei ungueltig).
//  2. GATES seriell: group + anime. repository.ErrNotFound -> 404,
//     anderer harter Fehler -> 500 (spiegelt Phase A). Fail-fast spart die
//     optionale Arbeit bei 404.
//  3. 5 OPTIONALE SEKTIONEN nebenlaeufig (goroutines + sync.WaitGroup), jede
//     fehlerisoliert: bei Fehler bleibt die Sektion nil (-> JSON null) und wird
//     nur geloggt; der Request faellt NICHT und die anderen Sektionen bleiben
//     unbeeinflusst. BEWUSST NICHT errgroup (Cancel-on-first-error wuerde die
//     Isolation brechen). Jede Sektion schreibt in ihr eigenes Ergebnisfeld
//     (distinkte Felder -> kein Datenrennen), gelesen erst nach wg.Wait().
func (h *ProjectPageHandler) GetProjectPage(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	ctx := c.Request.Context()

	// --- Gates seriell zuerst (fail-fast) ---
	group, err := h.groupSource.GetGroupDetail(ctx, animeID, groupID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "gruppe nicht gefunden")
		return
	}
	if err != nil {
		log.Printf("project page: load group detail failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
		internalError(c, "interner serverfehler")
		return
	}

	anime, err := h.animeSource.GetByID(ctx, animeID, false)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "anime nicht gefunden")
		return
	}
	if err != nil {
		log.Printf("project page: load anime failed (anime_id=%d): %v", animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	bundle := ProjectPageBundle{
		Group: group,
		Anime: anime,
	}

	// --- 5 optionale Sektionen nebenlaeufig + fehlerisoliert ---
	var wg sync.WaitGroup
	wg.Add(5)

	go func() {
		defer wg.Done()
		res, err := h.contributorsSource.GetProjectContributors(ctx, animeID, groupID)
		if err != nil {
			log.Printf("project page: contributors failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
			return
		}
		bundle.Contributors = res
	}()

	go func() {
		defer wg.Done()
		res, err := h.themesSource.GetPublicGroupThemes(ctx, animeID, groupID)
		if err != nil {
			log.Printf("project page: themes failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
			return
		}
		bundle.Themes = res
	}()

	go func() {
		defer wg.Done()
		res, err := h.releaseMediaSource.GetPublicReleaseMedia(ctx, animeID, groupID)
		if err != nil {
			log.Printf("project page: release media failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
			return
		}
		bundle.ReleaseMedia = res
	}()

	go func() {
		defer wg.Done()
		note, err := h.projectNoteSource.GetPublicAnimeFansubProjectNote(ctx, animeID, groupID)
		if errors.Is(err, repository.ErrInvalidAnimeFansubContext) || errors.Is(err, repository.ErrNotFound) {
			// Keine Notiz vorhanden bzw. ungueltiger Kontext -> Sektion bleibt null, KEIN Fehler.
			return
		}
		if err != nil {
			log.Printf("project page: project note failed (anime_id=%d, group_id=%d): %v", animeID, groupID, err)
			return
		}
		bundle.ProjectNote = note
	}()

	go func() {
		defer wg.Done()
		items, err := h.animeFansubsSource.ListAnimeFansubs(ctx, animeID)
		if err != nil {
			log.Printf("project page: anime fansubs failed (anime_id=%d): %v", animeID, err)
			return
		}
		bundle.AnimeFansubs = &items
	}()

	wg.Wait()

	c.JSON(http.StatusOK, gin.H{"data": bundle})
}
