package handlers

import (
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MemberPointRankingHandler verwaltet den oeffentlichen Lese-Endpunkt fuer die
// persistierte Punkte-Rangliste (Phase 109). Diese Route erfordert keine
// Authentifizierung, analog zu /archiv und /members/:slug/contributions.
type MemberPointRankingHandler struct {
	repo *repository.MemberPointTotalsRepository
}

// NewMemberPointRankingHandler erstellt einen neuen MemberPointRankingHandler.
func NewMemberPointRankingHandler(repo *repository.MemberPointTotalsRepository) *MemberPointRankingHandler {
	return &MemberPointRankingHandler{repo: repo}
}

// GetMemberPointRanking handles GET /api/v1/member-point-ranking
// Gibt Member -> persistierte Netto-Gesamtpunkte, absteigend sortiert, seitenweise
// zurueck. Reine Lese-Projektion aus member_point_totals (D-05: keine
// Laufzeit-Aggregation im Handler). page < 1 faellt auf 1 zurueck, page > 1000
// wird auf 1000 geklemmt (kein 400 bei ungueltigem Wert).
func (h *MemberPointRankingHandler) GetMemberPointRanking(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	if page > 1000 {
		page = 1000
	}

	rows, total, err := h.repo.ListRanking(c.Request.Context(), page)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows, "total": total, "page": page})
}
