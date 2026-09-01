package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
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
	claimsRepo    *repository.MemberClaimsRepository
	permissionSvc *permissions.Service
}

// NewDashboardMeHandler erstellt einen neuen DashboardMeHandler.
func NewDashboardMeHandler(dashboardRepo ownDashboardLoader, db *pgxpool.Pool) *DashboardMeHandler {
	return &DashboardMeHandler{dashboardRepo: dashboardRepo, db: db}
}

// WithClaimAttention reuses the existing claim repository and central authorization
// service so the dashboard cannot disagree with the verify/reject action.
func (h *DashboardMeHandler) WithClaimAttention(
	claimsRepo *repository.MemberClaimsRepository,
	permissionSvc *permissions.Service,
) *DashboardMeHandler {
	h.claimsRepo = claimsRepo
	h.permissionSvc = permissionSvc
	return h
}

// emptyOwnDashboardData ist der D-09-Leerzustand für eingeloggte User ohne
// verifiziertes Member-Profil -- graceful 200 statt 403. Bewusster Kontrast zu
// respondMemberProfileRequired (siehe D-09 / 116-RESEARCH "Open Questions" #2):
// das Dashboard ist laut CONTEXT.md ein Landing-Hub für JEDEN eingeloggten User,
// nicht nur für Member mit abgeschlossenem Claim.
func emptyOwnDashboardData() repository.OwnDashboardData {
	return repository.OwnDashboardData{
		HasMemberProfile:         false,
		TotalPoints:              0,
		BadgesCount:              0,
		ProjectsCount:            0,
		ImagesCount:              0,
		ContributionsCount:       0,
		RoleVolume:               []repository.OwnDashboardRoleVolumeEntry{},
		CategoryProgress:         []repository.OwnDashboardCategoryProgress{},
		PendingClaims:            []repository.OwnDashboardPendingClaim{},
		PendingGroupMediaReviews: []repository.OwnDashboardPendingGroupMediaReview{},
		PendingReleaseReviews:    []repository.OwnDashboardPendingReleaseReview{},
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
		data := emptyOwnDashboardData()
		if err := h.attachPendingReleaseReviewAttention(c, identity, &data); err != nil {
			internalError(c, "interner serverfehler")
			return
		}
		if err := h.attachPendingGroupMediaReviewAttention(c, identity, &data); err != nil {
			internalError(c, "interner serverfehler")
			return
		}
		if err := h.attachPendingClaimAttention(c, identity, &data); err != nil {
			internalError(c, "interner serverfehler")
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": data})
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

	if err := h.attachPendingReleaseReviewAttention(c, identity, data); err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	if err := h.attachPendingGroupMediaReviewAttention(c, identity, data); err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	if err := h.attachPendingClaimAttention(c, identity, data); err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}

func (h *DashboardMeHandler) attachPendingClaimAttention(
	c *gin.Context,
	identity middleware.AuthIdentity,
	data *repository.OwnDashboardData,
) error {
	if h.claimsRepo == nil || h.permissionSvc == nil || data == nil {
		return nil
	}

	candidates, err := h.claimsRepo.ListPendingClaimAttentionCandidates(c.Request.Context())
	if err != nil {
		return err
	}

	actor := permissions.Actor{
		AppUserID:       identity.AppUserID,
		Status:          identity.AppUserStatus,
		IsPlatformAdmin: identity.IsPlatformAdmin,
	}
	allowedByGroup := make(map[int64]bool)
	data.PendingClaims = make([]repository.OwnDashboardPendingClaim, 0, len(candidates))
	for _, candidate := range candidates {
		allowed, checked := allowedByGroup[candidate.FansubGroupID]
		if !checked {
			result, err := h.permissionSvc.CanForFansubGroup(
				c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersLink, candidate.FansubGroupID,
			)
			if err != nil {
				return err
			}
			allowed = result.Allowed
			allowedByGroup[candidate.FansubGroupID] = allowed
		}
		if !allowed {
			continue
		}
		data.PendingClaims = append(data.PendingClaims, repository.OwnDashboardPendingClaim{
			ClaimID:         candidate.ClaimID,
			FansubGroupID:   candidate.FansubGroupID,
			FansubGroupName: candidate.FansubGroupName,
			MemberNickname:  candidate.MemberNickname,
			CreatedAt:       candidate.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return nil
}

func (h *DashboardMeHandler) attachPendingGroupMediaReviewAttention(c *gin.Context, identity middleware.AuthIdentity, data *repository.OwnDashboardData) error {
	if h.db == nil || h.permissionSvc == nil || data == nil {
		return nil
	}
	rows, err := h.db.Query(c.Request.Context(), `
		SELECT fgm.group_id, fg.name, COUNT(*)
		FROM fansub_group_media fgm
		JOIN media_assets ma ON ma.id = fgm.media_id
		JOIN fansub_groups fg ON fg.id = fgm.group_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE fgm.deleted_at IS NULL AND rs.code = 'in_review'
		AND (fg.logo_id IS NULL OR ma.id <> fg.logo_id) AND (fg.banner_id IS NULL OR ma.id <> fg.banner_id)
		GROUP BY fgm.group_id, fg.name`)
	if err != nil {
		return err
	}
	defer rows.Close()
	actor := permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	data.PendingGroupMediaReviews = []repository.OwnDashboardPendingGroupMediaReview{}
	for rows.Next() {
		var item repository.OwnDashboardPendingGroupMediaReview
		if err := rows.Scan(&item.FansubGroupID, &item.FansubGroupName, &item.Count); err != nil {
			return err
		}
		allowed, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, item.FansubGroupID)
		if err != nil {
			return err
		}
		if allowed.Allowed {
			data.PendingGroupMediaReviews = append(data.PendingGroupMediaReviews, item)
		}
	}
	return rows.Err()
}

// attachPendingReleaseReviewAttention groups only actionable, still-pending release
// reviews. The lifecycle view is the same source used by the release review queue; the
// dashboard merely summarizes it per anime instead of creating a second review workflow.
func (h *DashboardMeHandler) attachPendingReleaseReviewAttention(c *gin.Context, identity middleware.AuthIdentity, data *repository.OwnDashboardData) error {
	if h.db == nil || h.permissionSvc == nil || data == nil {
		return nil
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT
			version_group.fansub_group_id,
			anime.id,
			COALESCE(anime.title_de, anime.title_en, anime.title, ''),
			COUNT(*) FILTER (WHERE lifecycle.review_kind = 'image'),
			COUNT(*) FILTER (WHERE lifecycle.review_kind = 'text')
		FROM release_review_lifecycle_sources lifecycle
		LEFT JOIN release_version_notes note
		  ON lifecycle.source_type = 'release_version_note'
		 AND note.id = lifecycle.source_id
		 AND note.deleted_at IS NULL
		LEFT JOIN release_version_media media
		  ON lifecycle.source_type = 'release_version_media'
		 AND media.id = lifecycle.source_id
		 AND media.deleted_at IS NULL
		JOIN release_versions version
		  ON version.id = COALESCE(note.release_version_id, media.release_version_id)
		JOIN release_version_groups version_group
		  ON version_group.release_version_id = version.id
		 AND version_group.fansub_group_id = COALESCE(note.fansub_group_id, media.fansub_group_id)
		JOIN fansub_releases release ON release.id = version.release_id
		JOIN episodes episode ON episode.id = release.episode_id
		JOIN anime ON anime.id = episode.anime_id
		WHERE lifecycle.review_state = 'pending'
		  AND lifecycle.submitter_app_user_id <> $1
		  AND NOT EXISTS (
			SELECT 1
			FROM member_claims own_claim
			WHERE own_claim.app_user_id = $1
			  AND own_claim.claim_status = 'verified'
			  AND own_claim.member_id = lifecycle.submitter_member_id
		  )
		GROUP BY version_group.fansub_group_id, anime.id, anime.title_de, anime.title_en, anime.title
		ORDER BY anime.id, version_group.fansub_group_id
	`, identity.AppUserID)
	if err != nil {
		return err
	}
	defer rows.Close()

	actor := permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	data.PendingReleaseReviews = []repository.OwnDashboardPendingReleaseReview{}
	for rows.Next() {
		var item repository.OwnDashboardPendingReleaseReview
		if err := rows.Scan(&item.FansubGroupID, &item.AnimeID, &item.AnimeTitle, &item.ImageCount, &item.TextCount); err != nil {
			return err
		}
		authorization, err := h.permissionSvc.ResolveReviewGroupAuthorization(c.Request.Context(), actor, item.FansubGroupID)
		if err != nil {
			return err
		}
		if !authorization[permissions.ActionReviewImageDecide].Allowed {
			item.ImageCount = 0
		}
		if !authorization[permissions.ActionReviewTextDecide].Allowed {
			item.TextCount = 0
		}
		if item.ImageCount > 0 || item.TextCount > 0 {
			data.PendingReleaseReviews = append(data.PendingReleaseReviews, item)
		}
	}
	return rows.Err()
}
