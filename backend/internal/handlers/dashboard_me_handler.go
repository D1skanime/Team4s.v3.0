package handlers

import (
	"context"
	"errors"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ownDashboardLoader ist die schmale Schnittstelle, die DashboardMeHandler von
// *repository.MemberProfileRepository benötigt (nur GetOwnDashboard). Erlaubt
// Testbarkeit ohne die volle Repository-Implementierung an den Handler zu binden.
type ownDashboardLoader interface {
	GetOwnDashboard(ctx context.Context, memberID int64) (*repository.OwnDashboardData, error)
}

// DashboardMeHandler verwaltet GET /api/v1/me/dashboard (D-08 Ownership-Gate,
// D-09 gracefuler Leerzustand ohne verifiziertes Member-Profil).
type DashboardMeHandler struct {
	dashboardRepo ownDashboardLoader
	db            *pgxpool.Pool
}

// NewDashboardMeHandler erstellt einen neuen DashboardMeHandler.
func NewDashboardMeHandler(dashboardRepo ownDashboardLoader, db *pgxpool.Pool) *DashboardMeHandler {
	return &DashboardMeHandler{dashboardRepo: dashboardRepo, db: db}
}

// emptyOwnDashboardData ist der D-09-Leerzustand für eingeloggte User ohne
// verifiziertes Member-Profil -- graceful 200 statt 403. Bewusster Kontrast zu
// respondMemberProfileRequired (siehe D-09 / 116-RESEARCH "Open Questions" #2):
// das Dashboard ist laut CONTEXT.md ein Landing-Hub für JEDEN eingeloggten User,
// nicht nur für Member mit abgeschlossenem Claim.
func emptyOwnDashboardData() repository.OwnDashboardData {
	return repository.OwnDashboardData{
		HasMemberProfile:   false,
		TotalPoints:        0,
		BadgesCount:        0,
		ProjectsCount:      0,
		ImagesCount:        0,
		ContributionsCount: 0,
		RoleVolume:         []repository.OwnDashboardRoleVolumeEntry{},
		CategoryProgress:   []repository.OwnDashboardCategoryProgress{},
	}
}

// GetOwnDashboard handles GET /api/v1/me/dashboard.
//
// Sicherheitskontrakt (D-08, T-116-02-01): die member_id wird AUSSCHLIESSLICH über
// resolveVerifiedMemberIDForAppUser(ctx, db, identity.AppUserID) aufgelöst -- niemals
// aus einem Query-, Body- oder Path-Parameter. Diese Route definiert überhaupt keinen
// derartigen Parameter.
//
// D-09-Kontrast zu respondMemberProfileRequired (siehe ListMyAnimeContributions):
// fehlt ein verifizierter member_claims-Eintrag, antwortet dieser Handler NICHT mit
// 403, sondern graceful mit 200 + has_member_profile=false und All-Null-Kennzahlen,
// weil das Dashboard für jeden eingeloggten User erreichbar bleiben muss.
func (h *DashboardMeHandler) GetOwnDashboard(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	memberID, err := resolveVerifiedMemberIDForAppUser(c.Request.Context(), h.db, identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusOK, gin.H{"data": emptyOwnDashboardData()})
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	data, err := h.dashboardRepo.GetOwnDashboard(c.Request.Context(), memberID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}
