package handlers

// ContributionProposalsMeHandler liefert Member-seitige Endpunkte für Vorschläge (Phase 65).
// POST /api/v1/me/contribution-proposals    — Vorschlag einreichen (P65-SC1)
// POST /api/v1/me/anime-contributions/:id/self-publish — 90-Tage-Selbstschaltung (P65-SC3)
// GET  /api/v1/me/memberships              — eigene hist_fansub_group_members-Eintraege

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProposalRepository ist das Interface, das ContributionProposalsMeHandler für
// Datenbankoperationen nutzt. Ermöglicht Stub-Tests ohne echte DB-Verbindung.
type ProposalRepository interface {
	CreateProposal(ctx context.Context, fansubGroupID, animeID int64, input repository.ProposalInput) (*repository.AnimeContributionRow, error)
	SelfPublish(ctx context.Context, contributionID, appUserID int64) error
	GetByID(ctx context.Context, id int64) (*repository.AnimeContributionRow, error)
}

// RolesRepository ist das Interface für die Rollenvalidierung im Handler.
type RolesRepository interface {
	RoleCodeExistsForContext(ctx context.Context, code, contextName string) (bool, error)
}

// MemberResolver loest eine app_user_id in eine verifiedMemberID auf.
// Abstraktion über die member_claims-DB-Query für Stub-Tests.
type MemberResolver interface {
	ResolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error)
}

// OwnershipChecker prüft Eigentümer-Verhältnisse über hist_fansub_group_members.
// Abstraktion über direkte DB-Queries für Stub-Tests.
type OwnershipChecker interface {
	MemberIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error)
	FansubGroupIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error)
	MemberIDForAnimeContribution(ctx context.Context, contributionID int64) (int64, error)
}

// FansubMembershipChecker prüft Gruppenzugehörigkeit über member_id (hist UNION app),
// analog AnimeContributionsRepository.MemberBelongsToFansub. Ersetzt im CreateProposal-Pfad
// den bisherigen hist-only Ownership-Check über fansub_group_member_id (quick-260707-kut).
type FansubMembershipChecker interface {
	MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error)
}

// MembershipsLister gibt die hist_fansub_group_members eines Members zurück.
type MembershipsLister interface {
	ListMembershipsForMember(ctx context.Context, memberID int64) ([]MembershipEntry, error)
}

// ReleaseVersionParticipationChecker prüft, ob eine Gruppe an einer Release-Version
// beteiligt ist (D-03). Spiegel des Leader-Pfads, damit der Member-Vorschlag nicht
// übergangen wird (Pitfall 5). Abstraktion für Stub-Tests.
type ReleaseVersionParticipationChecker interface {
	GroupParticipatesInReleaseVersion(ctx context.Context, fansubGroupID, releaseVersionID int64) (bool, error)
}

// MembershipEntry ist ein Eintrag in der Mitgliedschaftsliste des Members.
type MembershipEntry struct {
	FansubGroupMemberID int64  `json:"fansub_group_member_id"`
	FansubGroupID       int64  `json:"fansub_group_id"`
	GroupName           string `json:"group_name"`
}

// ContributionProposalsMeHandler verwaltet Member-seitige Vorschlags-Endpunkte.
type ContributionProposalsMeHandler struct {
	proposalRepo          ProposalRepository
	rolesRepo             RolesRepository
	auditLogRepo          *repository.AuditLogRepository
	memberResolver        MemberResolver
	ownershipChecker      OwnershipChecker
	membershipChecker     FansubMembershipChecker
	membershipsLister     MembershipsLister
	releaseVersionChecker ReleaseVersionParticipationChecker
}

// NewContributionProposalsMeHandler erstellt einen neuen Handler mit echter DB-Verbindung.
func NewContributionProposalsMeHandler(
	proposalRepo ProposalRepository,
	rolesRepo RolesRepository,
	db *pgxpool.Pool,
	auditLogRepo *repository.AuditLogRepository,
) *ContributionProposalsMeHandler {
	dbResolver := &dbMemberResolver{db: db}
	var releaseVersionChecker ReleaseVersionParticipationChecker
	if checker, ok := proposalRepo.(ReleaseVersionParticipationChecker); ok {
		releaseVersionChecker = checker
	}
	var membershipChecker FansubMembershipChecker
	if checker, ok := proposalRepo.(FansubMembershipChecker); ok {
		membershipChecker = checker
	}
	return &ContributionProposalsMeHandler{
		proposalRepo:          proposalRepo,
		rolesRepo:             rolesRepo,
		auditLogRepo:          auditLogRepo,
		memberResolver:        dbResolver,
		ownershipChecker:      &dbOwnershipChecker{db: db},
		membershipChecker:     membershipChecker,
		membershipsLister:     &dbMembershipsLister{db: db},
		releaseVersionChecker: releaseVersionChecker,
	}
}

// --- DB-Implementierungen der Interfaces siehe contribution_proposals_me_db.go ---

// --- Request-Typen ---

type createProposalRequest struct {
	FansubGroupID       int64    `json:"fansub_group_id"`
	AnimeID             int64    `json:"anime_id"`
	FansubGroupMemberID int64    `json:"fansub_group_member_id"`
	RoleCodes           []string `json:"role_codes"`
	Note                *string  `json:"note"`
	StartedYear         *int     `json:"started_year"`
	EndedYear           *int     `json:"ended_year"`
	ReleaseVersionID    *int64   `json:"release_version_id"`
}

// --- Hilfsfunktionen ---

func requireMeIdentityForProposals(c *gin.Context) (middleware.AuthIdentity, bool) {
	return requireMeIdentity(c)
}

// --- Handler-Methoden ---

// CreateProposal verarbeitet POST /api/v1/me/contribution-proposals.
// Sicherheitskette: Auth → Pflichtfelder → Member-Identitaet → Ownership → Rollenvalidierung → DB → Audit.
func (h *ContributionProposalsMeHandler) CreateProposal(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok {
		return
	}

	var req createProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	// D-04: Mindestens eine Rolle erforderlich.
	if len(req.RoleCodes) == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "Bitte wähle mindestens eine Rolle aus."},
		})
		return
	}

	// Member-Identitaet aus member_claims ermitteln.
	memberID, err := h.memberResolver.ResolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// D-03/T-260707kut-02: Ownership-Check — der eingeloggte Member muss Mitglied der
	// Ziel-Gruppe sein (hist UNION app), ersetzt die bisherige rein hist-basierte
	// fansub_group_member_id-Doppelprüfung. req.FansubGroupMemberID darf 0 sein
	// (App-Mitglied ohne hist-Anker) — wird hier nicht mehr hart validiert.
	if h.membershipChecker == nil {
		internalError(c, "interner Serverfehler")
		return
	}
	belongs, err := h.membershipChecker.MemberBelongsToFansub(c.Request.Context(), memberID, req.FansubGroupID)
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}
	if !belongs {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return
	}

	if req.ReleaseVersionID != nil {
		if h.releaseVersionChecker == nil {
			log.Printf("contribution proposals: release version checker missing (fansub_group_id=%d, release_version_id=%d)", req.FansubGroupID, *req.ReleaseVersionID)
			internalError(c, "interner Serverfehler")
			return
		}
		participates, err := h.releaseVersionChecker.GroupParticipatesInReleaseVersion(c.Request.Context(), req.FansubGroupID, *req.ReleaseVersionID)
		if err != nil {
			log.Printf("contribution proposals: release version participation check error (fansub_group_id=%d, release_version_id=%d): %v", req.FansubGroupID, *req.ReleaseVersionID, err)
			internalError(c, "interner Serverfehler")
			return
		}
		if !participates {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{"message": "Diese Gruppe war an der gewählten Release-Version nicht beteiligt."},
			})
			return
		}
	}

	// Rollenvalidierung — jede role_code muss im anime_contribution-Kontext gueltig sein.
	for _, code := range req.RoleCodes {
		valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
		if err != nil {
			internalError(c, "interner Serverfehler")
			return
		}
		if !valid {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{"message": "ungültiger Rollencode: " + code},
			})
			return
		}
	}

	input := repository.ProposalInput{
		FansubGroupMemberID: req.FansubGroupMemberID,
		MemberID:            memberID,
		RoleCodes:           req.RoleCodes,
		Note:                req.Note,
		StartedYear:         req.StartedYear,
		EndedYear:           req.EndedYear,
		ReleaseVersionID:    req.ReleaseVersionID,
		AppUserID:           identity.AppUserID,
	}

	row, err := h.proposalRepo.CreateProposal(c.Request.Context(), req.FansubGroupID, req.AnimeID, input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag."},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Gruppe, Anime oder Mitglied nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// D-14: Audit-Log nach erfolgreichem Insert.
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.proposed",
		TargetType:     "anime_contribution",
		TargetID:       &row.ID,
		Outcome:        "allowed",
	})

	c.JSON(http.StatusCreated, gin.H{"data": row})
}

// SelfPublish verarbeitet POST /api/v1/me/anime-contributions/:contributionId/self-publish.
// D-11/D-15: Status bleibt 'proposed'; 90-Tage-Check laeuft serverseitig im Repository.
func (h *ContributionProposalsMeHandler) SelfPublish(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok {
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige Contribution-ID")
		return
	}

	memberID, err := h.memberResolver.ResolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// Ownership-Check — Contribution muss dem eingeloggten Member gehören.
	ownerMemberID, err := h.ownershipChecker.MemberIDForAnimeContribution(c.Request.Context(), contributionID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Contribution nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}
	if ownerMemberID != memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return
	}

	// 90-Tage-Check und Status-Update delegiert vollstaendig an Repository (D-11, T-65-02-03).
	// Status bleibt 'proposed' — kein Uebergang auf 'confirmed' (D-15, T-65-02-04).
	err = h.proposalRepo.SelfPublish(c.Request.Context(), contributionID, identity.AppUserID)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "Vorschlag kann noch nicht selbst veröffentlicht werden. 90 Tage müssen seit Einreichung vergangen sein."},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Contribution nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// Audit-Log nach erfolgreicher Selbstschaltung.
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.self_published",
		TargetType:     "anime_contribution",
		TargetID:       &contributionID,
		Outcome:        "allowed",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Vorschlag erfolgreich veröffentlicht."})
}

// ListMemberships verarbeitet GET /api/v1/me/memberships.
// Gibt die hist_fansub_group_members-Einträge des verifizierten Members zurück
// (Datenpfad für ProposalForm.ownGroups im Frontend).
func (h *ContributionProposalsMeHandler) ListMemberships(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok {
		return
	}

	memberID, err := h.memberResolver.ResolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	entries, err := h.membershipsLister.ListMembershipsForMember(c.Request.Context(), memberID)
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entries})
}
