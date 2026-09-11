package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fansubProjectResolverRepo is the narrow interface ResolveFansubProject
// depends on, satisfied by *repository.FansubProjectResolverRepository.
// Defined here (production code) rather than only in the test file so a
// hand-rolled httptest fake can exercise the real handler method, per
// CLAUDE.md's Teststil requirement that behavioral assertions execute the
// checked code rather than reimplementing or source-matching it.
type fansubProjectResolverRepo interface {
	ResolveProject(ctx context.Context, groupSlug string, animeSlug string) (*repository.ResolvedFansubProject, error)
	ListProjectNavigationProjects(ctx context.Context, groupID int64) ([]repository.ProjectNavigationItem, error)
}

// WithProjectResolverRepo registriert das Project-Resolver-Repository beim
// FansubHandler (Plan 155-01), analog zu WithMedia/WithReleaseMetadataCreditService.
func (h *FansubHandler) WithProjectResolverRepo(repo *repository.FansubProjectResolverRepository) *FansubHandler {
	h.projectResolverRepo = repo
	return h
}

// ResolveFansubProject handles
// GET /api/v1/fansub-slugs/:slug/projects/:animeSlug/resolve (P155-01, P155-13,
// P155-15). It resolves groupSlug+animeSlug to the project's narrow numeric
// identity plus a bounded sibling-project navigation list, WITHOUT loading
// the full public fansub profile. An unknown groupSlug and a known groupSlug
// with an unknown animeSlug both return the exact same neutral 404
// body/status (T-155-01) -- no information leak about which lookup failed.
func (h *FansubHandler) ResolveFansubProject(c *gin.Context) {
	groupSlug := strings.TrimSpace(c.Param("slug"))
	animeSlug := strings.TrimSpace(c.Param("animeSlug"))
	if groupSlug == "" || len([]rune(groupSlug)) > 120 || animeSlug == "" || len([]rune(animeSlug)) > 120 {
		badRequest(c, "ungültiger slug")
		return
	}

	resolved, err := h.projectResolverRepo.ResolveProject(c.Request.Context(), groupSlug, animeSlug)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "fansubprojekt nicht gefunden")
		return
	}
	if err != nil {
		log.Printf("resolve fansub project: repo error (group=%q, anime=%q): %v", groupSlug, animeSlug, err)
		internalError(c, "interner serverfehler")
		return
	}

	projects, err := h.projectResolverRepo.ListProjectNavigationProjects(c.Request.Context(), resolved.GroupID)
	if err != nil {
		// Non-fatal: the resolver's core identity/path resolution must not fail
		// just because the navigation-siblings query hiccups.
		log.Printf("resolve fansub project: navigation projects error (group_id=%d): %v", resolved.GroupID, err)
		projects = []repository.ProjectNavigationItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"group_id":   resolved.GroupID,
			"anime_id":   resolved.AnimeID,
			"anime_slug": resolved.AnimeSlug,
			"projects":   projects,
		},
	})
}
