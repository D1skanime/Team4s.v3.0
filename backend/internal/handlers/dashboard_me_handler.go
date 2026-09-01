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
	dashboardRepo   ownDashboardLoader
	db              *pgxpool.Pool
	claimsRepo      *repository.MemberClaimsRepository
	permissionSvc   *permissions.Service
	reviewQueryRepo *repository.ReleaseReviewQueryRepository
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

// WithReviewQueryRepo wires the same ReleaseReviewQueryRepository the release review queue
// already uses (RQUE-02/D15's anchored self-exclusion predicate) so the dashboard's
// group-media and release-review attention lanes delegate to it instead of running their
// own raw SQL (Criterion 3, Plan 143-09).
func (h *DashboardMeHandler) WithReviewQueryRepo(
	reviewQueryRepo *repository.ReleaseReviewQueryRepository,
) *DashboardMeHandler {
	h.reviewQueryRepo = reviewQueryRepo
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
		PendingOwnNoteRevisions:  []repository.OwnDashboardPendingOwnNoteRevisionGroup{},
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
		if err := h.attachPendingOwnNoteRevisionAttention(c, identity, 0, &data); err != nil {
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

	if err := h.attachPendingOwnNoteRevisionAttention(c, identity, memberID, data); err != nil {
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

// attachPendingGroupMediaReviewAttention delegates the group-media candidate list to
// reviewQueryRepo (Criterion 3, Plan 143-09) and keeps only the permission-filtering loop
// here. The gate is permissions.ActionReviewImageDecide -- the actual review-decision
// right -- not the too-broad group-edit right this plan corrects away from; permission
// checks are memoized per distinct fansub group, matching attachPendingClaimAttention's
// existing map shape (never once per row).
func (h *DashboardMeHandler) attachPendingGroupMediaReviewAttention(c *gin.Context, identity middleware.AuthIdentity, data *repository.OwnDashboardData) error {
	if h.reviewQueryRepo == nil || h.permissionSvc == nil || data == nil {
		return nil
	}
	candidates, err := h.reviewQueryRepo.PendingGroupMediaReviewAttention(c.Request.Context())
	if err != nil {
		return err
	}
	actor := permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	allowedByGroup := make(map[int64]bool)
	data.PendingGroupMediaReviews = make([]repository.OwnDashboardPendingGroupMediaReview, 0, len(candidates))
	for _, item := range candidates {
		allowed, checked := allowedByGroup[item.FansubGroupID]
		if !checked {
			result, err := h.permissionSvc.CanForFansubGroup(
				c.Request.Context(), actor, permissions.ActionReviewImageDecide, item.FansubGroupID,
			)
			if err != nil {
				return err
			}
			allowed = result.Allowed
			allowedByGroup[item.FansubGroupID] = allowed
		}
		if !allowed {
			continue
		}
		data.PendingGroupMediaReviews = append(data.PendingGroupMediaReviews, item)
	}
	return nil
}

// attachPendingReleaseReviewAttention groups only actionable, still-pending release
// reviews. reviewQueryRepo (the same repository the release review queue itself uses,
// RQUE-02/D15) owns the query and its self-exclusion predicate now (Criterion 3, Plan
// 143-09) -- this handler is a thin permission-filtering loop, memoized per distinct
// fansub group (the authorization result covers both text and image decide actions, so
// the whole ReviewAuthorizationResult map is cached per group, not re-resolved per row).
func (h *DashboardMeHandler) attachPendingReleaseReviewAttention(c *gin.Context, identity middleware.AuthIdentity, data *repository.OwnDashboardData) error {
	if h.reviewQueryRepo == nil || h.permissionSvc == nil || data == nil {
		return nil
	}

	candidates, err := h.reviewQueryRepo.PendingReleaseReviewAttention(c.Request.Context(), identity.AppUserID)
	if err != nil {
		return err
	}

	actor := permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	authorizationByGroup := make(map[int64]map[permissions.Action]permissions.ReviewAuthorizationResult)
	data.PendingReleaseReviews = make([]repository.OwnDashboardPendingReleaseReview, 0, len(candidates))
	for _, item := range candidates {
		authorization, checked := authorizationByGroup[item.FansubGroupID]
		if !checked {
			result, err := h.permissionSvc.ResolveReviewGroupAuthorization(c.Request.Context(), actor, item.FansubGroupID)
			if err != nil {
				return err
			}
			authorization = result
			authorizationByGroup[item.FansubGroupID] = authorization
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
	return nil
}

// attachPendingOwnNoteRevisionAttention surfaces the actor's OWN rejected release-
// version notes, grouped by (anime, fansub group), for ROADMAP Success Criterion 7's
// dashboard lane. Unlike the three sibling attach* methods above, this one is
// permission-check-free -- it is the actor's own data, gated only by the verified
// memberID the caller resolved via resolveVerifiedMemberIDForAppUser (D-08). When no
// verified member profile exists (the empty-state branch of GetOwnDashboard calls this
// with memberID <= 0), no query runs at all -- a user with no verified member profile
// cannot have submitted notes.
func (h *DashboardMeHandler) attachPendingOwnNoteRevisionAttention(
	c *gin.Context,
	identity middleware.AuthIdentity,
	memberID int64,
	data *repository.OwnDashboardData,
) error {
	if data == nil {
		return nil
	}
	if h.reviewQueryRepo == nil || memberID <= 0 {
		data.PendingOwnNoteRevisions = []repository.OwnDashboardPendingOwnNoteRevisionGroup{}
		return nil
	}

	rows, err := h.reviewQueryRepo.PendingOwnNoteRevisionAttention(c.Request.Context(), memberID)
	if err != nil {
		return err
	}
	data.PendingOwnNoteRevisions = groupPendingOwnNoteRevisions(rows)
	return nil
}

// groupPendingOwnNoteRevisions groups PendingOwnNoteRevisionAttention's flat rows by
// (AnimeID, FansubGroupID), relying on the repository query's own
// ORDER BY anime.id, fg.id, ... so both the resulting groups and each group's nested
// items come out in stable, sorted order without a second sort pass here.
func groupPendingOwnNoteRevisions(rows []repository.PendingOwnNoteRevisionRow) []repository.OwnDashboardPendingOwnNoteRevisionGroup {
	groups := make([]repository.OwnDashboardPendingOwnNoteRevisionGroup, 0)
	var current *repository.OwnDashboardPendingOwnNoteRevisionGroup
	for _, row := range rows {
		if current == nil || current.AnimeID != row.AnimeID || current.FansubGroupID != row.FansubGroupID {
			groups = append(groups, repository.OwnDashboardPendingOwnNoteRevisionGroup{
				AnimeID:         row.AnimeID,
				AnimeTitle:      row.AnimeTitle,
				FansubGroupID:   row.FansubGroupID,
				FansubGroupName: row.FansubGroupName,
				Items:           []repository.OwnDashboardPendingOwnNoteRevisionItem{},
			})
			current = &groups[len(groups)-1]
		}
		current.Items = append(current.Items, repository.OwnDashboardPendingOwnNoteRevisionItem{
			ReleaseVersionID: row.ReleaseVersionID,
			EpisodeNumber:    row.EpisodeNumber,
			NoteTitle:        row.NoteTitle,
		})
	}
	return groups
}
