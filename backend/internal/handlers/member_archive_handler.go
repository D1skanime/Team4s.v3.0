package handlers

import (
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MemberArchiveHandler verwaltet den oeffentlichen Archiv-Such-Endpunkt.
type MemberArchiveHandler struct {
	archiveRepo *repository.MemberArchiveRepository
}

// NewMemberArchiveHandler erstellt einen neuen MemberArchiveHandler.
func NewMemberArchiveHandler(repo *repository.MemberArchiveRepository) *MemberArchiveHandler {
	return &MemberArchiveHandler{archiveRepo: repo}
}

// SearchArchive handles GET /api/v1/archiv
// Gibt oeffentliche Member-Profile paginiert zurueck. Kein Auth-Gate — oeffentlich.
// Sicherheitsgrenze: Nur Member mit profile_visibility='public' und
// oeffentlichen Contributions erscheinen. Alle Filter sind parameterized (T-68-03-03).
func (h *MemberArchiveHandler) SearchArchive(c *gin.Context) {
	roleCode := c.Query("rolle")
	gruppe := c.Query("gruppe")
	vonStr := c.Query("von")
	bisStr := c.Query("bis")
	pageStr := c.DefaultQuery("page", "1")

	// Seitenvalidierung: page < 1 → 1; page > 1000 → 1000 (T-68-03-02)
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	if page > 1000 {
		page = 1000
	}

	// Gruppen-ID parsen (T-68-03-03: strconv.ParseInt verhindert Injection)
	var fansubGroupID int64
	if gruppe != "" {
		fansubGroupID, _ = strconv.ParseInt(gruppe, 10, 64)
		// Ungueltige Werte ergeben 0 = kein Filter (kein Fehler)
	}

	// Jahresfilter parsen
	var yearFrom, yearUntil int
	if vonStr != "" {
		yearFrom, _ = strconv.Atoi(vonStr)
	}
	if bisStr != "" {
		yearUntil, _ = strconv.Atoi(bisStr)
	}

	filters := repository.ArchiveSearchFilters{
		RoleCode:      roleCode,
		FansubGroupID: fansubGroupID,
		YearFrom:      yearFrom,
		YearUntil:     yearUntil,
	}

	result, err := h.archiveRepo.SearchMembers(c.Request.Context(), filters, page)
	if err != nil {
		log.Printf("archive search: repo error: %v", err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  result.Members,
		"total": result.Total,
		"page":  page,
	})
}
