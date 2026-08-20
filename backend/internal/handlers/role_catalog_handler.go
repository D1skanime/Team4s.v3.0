package handlers

import (
	"context"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type publicRoleCatalogRepository interface {
	ListPublicRoleDefinitions(ctx context.Context, contextName string) ([]repository.PublicRoleDefinition, error)
}

type RoleCatalogHandler struct {
	repo publicRoleCatalogRepository
}

func NewRoleCatalogHandler(repo publicRoleCatalogRepository) *RoleCatalogHandler {
	return &RoleCatalogHandler{repo: repo}
}

var publicRoleCatalogContexts = map[string]struct{}{
	"fansub_group":       {},
	"anime_contribution": {},
	"group_history":      {},
}

// RegisterPublicRoleCatalogRoute is the single public router seam for the
// canonical presentation catalog. Callers must pass the unprotected v1 group.
func RegisterPublicRoleCatalogRoute(v1 *gin.RouterGroup, handler *RoleCatalogHandler) {
	v1.GET("/role-definitions", handler.ListPublicRoleDefinitions)
}

func (h *RoleCatalogHandler) ListPublicRoleDefinitions(c *gin.Context) {
	contextName := c.Query("context")
	if _, allowed := publicRoleCatalogContexts[contextName]; !allowed {
		badRequest(c, "Ungültiger Rollenkontext.")
		return
	}

	definitions, err := h.repo.ListPublicRoleDefinitions(c.Request.Context(), contextName)
	if err != nil {
		log.Printf("public role catalog: repo error (context=%q): %v", contextName, err)
		internalError(c, "Rollenkatalog konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, definitions)
}
