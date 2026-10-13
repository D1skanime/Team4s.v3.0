package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *ContributionsMeHandler) GetMyProjectDetail(c *gin.Context) {
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
	if err != nil || fansubGroupID <= 0 {
		badRequest(c, "fansub_group_id ist erforderlich")
		return
	}

	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		// D-05 (181-RESEARCH.md Pattern 4): ein Plattform-Admin ohne verifizierten
		// member_claims-Eintrag bekommt kein 404 mehr, sondern den Sentinel memberID=0.
		// members.id ist BIGSERIAL und startet bei 1 (verifiziert in
		// database/migrations/0044_add_db_schema_v2_target_tables.up.sql:128), also
		// matcht 0 garantiert keinen echten Member -- own_roles bleibt leer,
		// role_codes wird korrekt [], GetMemberProjectDetail liefert dank der
		// LEFT JOIN own_roles-Reparatur trotzdem echte anime_title/fansub_group_name/
		// release_versions-Daten (graceful, analog zu GetOwnDashboard, "D-09-Kontrast").
		// memberID=0 wird NIEMALS fuer Schreib-Autorisierung verwendet, nur fuer diese
		// read-only Projekt-Detailabfrage.
		memberID = 0
	} else if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	project, err := h.contributionsRepo.GetMemberProjectDetail(
		c.Request.Context(),
		memberID,
		identity.AppUserID,
		animeID,
		fansubGroupID,
	)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": project})
}
