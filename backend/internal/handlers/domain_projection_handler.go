package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type DomainProjectionHandler struct {
	repo *repository.DomainProjectionRepository
}

func NewDomainProjectionHandler(repo *repository.DomainProjectionRepository) *DomainProjectionHandler {
	return &DomainProjectionHandler{repo: repo}
}

func (h *DomainProjectionHandler) GetFansubGroupDomainProjection(c *gin.Context) {
	groupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub-id")
		return
	}

	response, err := h.repo.GetFansubGroupDomainProjection(c.Request.Context(), groupID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}
