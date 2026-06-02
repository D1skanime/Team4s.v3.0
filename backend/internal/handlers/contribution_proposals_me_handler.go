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
	"github.com/jackc/pgx/v5"
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
	return &ContributionProposalsMeHandler{
		proposalRepo:          proposalRepo,
		rolesRepo:             rolesRepo,
		auditLogRepo:          auditLogRepo,
		memberResolver:        dbResolver,
		ownershipChecker:      &dbOwnershipChecker{db: db},
		membershipsLister:     &dbMembershipsLister{db: db},
		releaseVersionChecker: releaseVersionChecker,
	}
}

// --- DB-Implementierungen der Interfaces ---

// dbMemberResolver loest member_claims aus der Datenbank auf.
type dbMemberResolver struct {
	db *pgxpool.Pool
}

func (r *dbMemberResolver) ResolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// dbOwnershipChecker prueft Eigentuemer via DB-Joins.
type dbOwnershipChecker struct {
	db *pgxpool.Pool
}

func (c *dbOwnershipChecker) MemberIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	var memberID int64
	err := c.db.QueryRow(ctx, `
		SELECT member_id FROM hist_fansub_group_members WHERE id = $1
	`, fansubGroupMemberID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

func (c *dbOwnershipChecker) FansubGroupIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	var fansubGroupID int64
	err := c.db.QueryRow(ctx, `
		SELECT fansub_group_id FROM hist_fansub_group_members WHERE id = $1
	`, fansubGroupMemberID).Scan(&fansubGroupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return fansubGroupID, nil
}

func (c *dbOwnershipChecker) MemberIDForAnimeContribution(ctx context.Context, contributionID int64) (int64, error) {
	var memberID int64
	err := c.db.QueryRow(ctx, `
		SELECT hfgm.member_id
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE ac.id = $1
	`, contributionID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// dbMembershipsLister fragt hist_fansub_group_members aus der Datenbank ab.
type dbMembershipsLister struct {
	db *pgxpool.Pool
}

func (l *dbMembershipsLister) ListMembershipsForMember(ctx context.Context, memberID int64) ([]MembershipEntry, error) {
	rows, err := l.db.Query(ctx, `
		SELECT hfgm.id AS fansub_group_member_id, fg.id AS fansub_group_id, fg.name AS group_name
		FROM hist_fansub_group_members hfgm
		JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id
		WHERE hfgm.member_id = $1
		ORDER BY fg.name ASC
	`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]MembershipEntry, 0)
	for rows.Next() {
		var e MembershipEntry
		if err := rows.Scan(&e.FansubGroupMemberID, &e.FansubGroupID, &e.GroupName); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}

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

	// D-03: Ownership-Check — fansub_group_member_id muss zum eingeloggten Member gehören.
	ownerMemberID, err := h.ownershipChecker.MemberIDForFansubGroupMember(c.Request.Context(), req.FansubGroupMemberID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
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

	ownerFansubGroupID, err := h.ownershipChecker.FansubGroupIDForFansubGroupMember(c.Request.Context(), req.FansubGroupMemberID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}
	if ownerFansubGroupID != req.FansubGroupID {
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
		RoleCodes:           req.RoleCodes,
		Note:                req.Note,
		StartedYear:         req.StartedYear,
		EndedYear:           req.EndedYear,
		ReleaseVersionID:    req.ReleaseVersionID,
		AppUserID:           identity.AppUserID,
	}

	row, err := h.proposalRepo.CreateProposal(c.Request.Context(), req.FansubGroupID, req.AnimeID, input)
	if errors.Is(err, repository.ErrConflict) {
		// D-05: Duplikat-Fehlermeldung mit korrekten Umlauten.
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "für diese Kombination aus Gruppe, Anime und deiner Identität existiert bereits ein Beitrag."},
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
