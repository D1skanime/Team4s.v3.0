package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stub-Implementierungen für Tests ---

type proposalRepoStub struct {
	createResult   *repository.AnimeContributionRow
	createErr      error
	selfPublishErr error
	getByIDResult  *repository.AnimeContributionRow
	getByIDErr     error
}

func (s *proposalRepoStub) CreateProposal(ctx context.Context, fansubGroupID, animeID int64, input repository.ProposalInput) (*repository.AnimeContributionRow, error) {
	return s.createResult, s.createErr
}

func (s *proposalRepoStub) SelfPublish(ctx context.Context, contributionID, appUserID int64) error {
	return s.selfPublishErr
}

func (s *proposalRepoStub) GetByID(ctx context.Context, id int64) (*repository.AnimeContributionRow, error) {
	return s.getByIDResult, s.getByIDErr
}

type rolesRepoStub struct {
	exists bool
	err    error
}

func (s *rolesRepoStub) RoleCodeExistsForContext(ctx context.Context, code, contextName string) (bool, error) {
	return s.exists, s.err
}

// memberResolverStub gibt eine feste member_id oder einen Fehler zurück.
type memberResolverStub struct {
	memberID int64
	err      error
}

func (s *memberResolverStub) ResolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	return s.memberID, s.err
}

// ownershipCheckerStub gibt an ob der Ownership-Check bestanden hat.
type ownershipCheckerStub struct {
	ownerMemberID int64
	ownerGroupID  int64
	err           error
	groupErr      error
}

func (s *ownershipCheckerStub) MemberIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	return s.ownerMemberID, s.err
}

func (s *ownershipCheckerStub) FansubGroupIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	if s.groupErr != nil {
		return 0, s.groupErr
	}
	if s.ownerGroupID == 0 {
		return 1, nil
	}
	return s.ownerGroupID, nil
}

func (s *ownershipCheckerStub) MemberIDForAnimeContribution(ctx context.Context, contributionID int64) (int64, error) {
	return s.ownerMemberID, s.err
}

// releaseVersionCheckerStub steuert die D-03-Beteiligungspruefung im Member-Pfad.
// participates wird nur abgefragt, wenn der Handler bei gesetztem release_version_id
// den Check aufruft.
type releaseVersionCheckerStub struct {
	participates bool
	err          error
	called       bool
}

func (s *releaseVersionCheckerStub) GroupParticipatesInReleaseVersion(ctx context.Context, fansubGroupID, releaseVersionID int64) (bool, error) {
	s.called = true
	return s.participates, s.err
}

// Hilfsfunktion: setzt Auth-Identität in Gin-Kontext
// UserID muss > 0 sein (Pflichtfeld in CommentAuthIdentityFromContext).
func setTestAuthIdentity(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      appUserID, // Legacy-UserID muss > 0 sein
		AppUserID:   appUserID,
		DisplayName: "Testuser",
	})
}

// Hilfsfunktion: baut einen Handler für Tests mit steuerbaren Stubs
func buildTestProposalHandler(
	proposalRepo ProposalRepository,
	rolesRepo RolesRepository,
	memberResolver MemberResolver,
	ownershipChecker OwnershipChecker,
) *ContributionProposalsMeHandler {
	return &ContributionProposalsMeHandler{
		proposalRepo:          proposalRepo,
		rolesRepo:             rolesRepo,
		auditLogRepo:          repository.NewAuditLogRepository(nil),
		memberResolver:        memberResolver,
		ownershipChecker:      ownershipChecker,
		releaseVersionChecker: &releaseVersionCheckerStub{participates: true},
	}
}

// --- Tests für CreateProposal ---

func TestCreateProposal_RequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	// Keine auth_identity gesetzt → 401 erwartet
	h.CreateProposal(c)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("erwartet 401, bekommen %d", recorder.Code)
	}
}

func TestCreateProposal_RequiresRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":[]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("erwartet 422, bekommen %d", recorder.Code)
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	errMap, _ := body["error"].(map[string]any)
	msg, _ := errMap["message"].(string)
	if !strings.Contains(msg, "mindestens eine Rolle") {
		t.Fatalf("erwartet Rolle-Fehlermeldung, bekommen %q", msg)
	}
}

func TestCreateProposal_DuplicateBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{createErr: repository.ErrConflict},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusConflict {
		t.Fatalf("erwartet 409, bekommen %d", recorder.Code)
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	errMap, _ := body["error"].(map[string]any)
	msg, _ := errMap["message"].(string)
	if !strings.Contains(msg, "Rolle") || !strings.Contains(msg, "Hinweis oder Beitrag") {
		t.Fatalf("erwartet Duplikat-Fehlermeldung, bekommen %q", msg)
	}
}

func TestCreateProposal_ForeignMembershipRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// ownerMemberID 99 != memberID 10 → 403
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 99},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, bekommen %d", recorder.Code)
	}
}

func TestCreateProposal_MembershipGroupMismatchRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10, ownerGroupID: 2},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestCreateProposal_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	row := &repository.AnimeContributionRow{ID: 7, Status: "proposed"}
	h := buildTestProposalHandler(
		&proposalRepoStub{createResult: row},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("erwartet 201, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	data, _ := body["data"].(map[string]any)
	status, _ := data["status"].(string)
	if status != "proposed" {
		t.Fatalf("erwartet status='proposed', bekommen %q", status)
	}
}

// TestCreateProposal_ForeignReleaseVersionRejected prüft D-03 im Member-Pfad
// (Pitfall 5): ist release_version_id gesetzt und die Gruppe war an dieser
// Version NICHT beteiligt, antwortet der Endpunkt mit 422.
func TestCreateProposal_ForeignReleaseVersionRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{createResult: &repository.AnimeContributionRow{ID: 7, Status: "proposed"}},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	// Gruppe ist an der gewählten Version NICHT beteiligt.
	h.releaseVersionChecker = &releaseVersionCheckerStub{participates: false}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"],"release_version_id":99}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("erwartet 422, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	errMap, _ := body["error"].(map[string]any)
	msg, _ := errMap["message"].(string)
	if !strings.Contains(msg, "nicht beteiligt") {
		t.Fatalf("erwartet Beteiligungs-Fehlermeldung, bekommen %q", msg)
	}
	// Korrekte Umlaute (D-19): keine ASCII-Ersetzung von ä.
	if strings.Contains(msg, "gewaehlten") || strings.Contains(msg, "ae") {
		t.Fatalf("erwartet korrekte Umlaute in Fehlermeldung, bekommen %q", msg)
	}
}

// TestCreateProposal_ReleaseVersionParticipatingAccepted prüft, dass bei gesetztem
// release_version_id und beteiligter Gruppe der Vorschlag normal angelegt wird (201).
func TestCreateProposal_ReleaseVersionParticipatingAccepted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{createResult: &repository.AnimeContributionRow{ID: 7, Status: "proposed"}},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	checker := &releaseVersionCheckerStub{participates: true}
	h.releaseVersionChecker = checker
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"],"release_version_id":99}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("erwartet 201, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	if !checker.called {
		t.Fatalf("erwartet GroupParticipatesInReleaseVersion-Aufruf bei gesetztem release_version_id")
	}
}

// TestCreateProposal_NoReleaseVersionSkipsCheck prüft, dass ohne release_version_id
// die Beteiligungspruefung NICHT aufgerufen wird (additiv, NULL-default).
func TestCreateProposal_NoReleaseVersionSkipsCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{createResult: &repository.AnimeContributionRow{ID: 7, Status: "proposed"}},
		&rolesRepoStub{exists: true},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	checker := &releaseVersionCheckerStub{participates: false} // würde 422 erzwingen, falls aufgerufen
	h.releaseVersionChecker = checker
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"fansub_group_member_id":3,"role_codes":["sub"]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	setTestAuthIdentity(c, 42)
	h.CreateProposal(c)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("erwartet 201, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	if checker.called {
		t.Fatalf("erwartet KEINEN Beteiligungs-Check ohne release_version_id")
	}
}

// --- Tests für SelfPublish ---

func TestSelfPublish_Before90Days(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{
			selfPublishErr: repository.ErrConflict,
			getByIDResult:  &repository.AnimeContributionRow{ID: 5, FansubGroupMemberID: 3},
		},
		&rolesRepoStub{},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/anime-contributions/5/self-publish", nil)
	c.Params = gin.Params{{Key: "contributionId", Value: "5"}}
	setTestAuthIdentity(c, 42)
	h.SelfPublish(c)
	if recorder.Code != http.StatusConflict {
		t.Fatalf("erwartet 409, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	errMap, _ := body["error"].(map[string]any)
	msg, _ := errMap["message"].(string)
	if !strings.Contains(msg, "90 Tage") {
		t.Fatalf("erwartet 90-Tage-Fehlermeldung, bekommen %q", msg)
	}
}

func TestSelfPublish_NotOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Contribution gehört memberID 99, aber eingeloggter Member ist 10 → 403
	h := buildTestProposalHandler(
		&proposalRepoStub{
			getByIDResult: &repository.AnimeContributionRow{ID: 5, FansubGroupMemberID: 3},
		},
		&rolesRepoStub{},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 99},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/anime-contributions/5/self-publish", nil)
	c.Params = gin.Params{{Key: "contributionId", Value: "5"}}
	setTestAuthIdentity(c, 42)
	h.SelfPublish(c)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestSelfPublish_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{
			selfPublishErr: nil,
			getByIDResult:  &repository.AnimeContributionRow{ID: 5, FansubGroupMemberID: 3},
		},
		&rolesRepoStub{},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/anime-contributions/5/self-publish", nil)
	c.Params = gin.Params{{Key: "contributionId", Value: "5"}}
	setTestAuthIdentity(c, 42)
	h.SelfPublish(c)
	if recorder.Code != http.StatusOK {
		t.Fatalf("erwartet 200, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
}

// --- Tests für ListMemberships ---

// TestListMemberships_RequiresAuth prüft, dass ohne Auth-Identität 401 zurückgegeben wird.
// ListMemberships erfordert eine echte DB-Verbindung für den Query — ein Integrationstest
// ist für das Erfolgs-Szenario vorgesehen. Hier wird nur der Auth-Guard geprüft.
func TestListMemberships_RequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/memberships", nil)
	// Keine auth_identity gesetzt
	h.ListMemberships(c)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("erwartet 401, bekommen %d", recorder.Code)
	}
}

// TestListMemberships_Success prüft, dass mit Auth 200 zurückgegeben wird
// und kein Fehler aus dem memberResolver zurückkommt.
// Hinweis: Das eigentliche DB-Query wird in einem Integrationstest verifiziert.
func TestListMemberships_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := buildTestProposalHandler(
		&proposalRepoStub{},
		&rolesRepoStub{},
		&memberResolverStub{memberID: 10},
		&ownershipCheckerStub{ownerMemberID: 10},
	)
	// membershipsLister separat durch stub abgedeckt
	h.membershipsLister = &membershipsListerStub{
		entries: []MembershipEntry{
			{FansubGroupMemberID: 3, FansubGroupID: 1, GroupName: "Teststudio"},
		},
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/memberships", nil)
	setTestAuthIdentity(c, 42)
	h.ListMemberships(c)
	if recorder.Code != http.StatusOK {
		t.Fatalf("erwartet 200, bekommen %d (%s)", recorder.Code, recorder.Body.String())
	}
	var body map[string]any
	json.Unmarshal(recorder.Body.Bytes(), &body)
	data, _ := body["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("erwartet 1 Mitgliedschaft, bekommen %d", len(data))
	}
}

// membershipsListerStub erfüllt das MembershipsLister-Interface für Tests.
type membershipsListerStub struct {
	entries []MembershipEntry
	err     error
}

func (s *membershipsListerStub) ListMembershipsForMember(ctx context.Context, memberID int64) ([]MembershipEntry, error) {
	return s.entries, s.err
}

// Compile-Zeit-Prüfung der Stub-Konformität mit Interfaces (werden im Handler-File definiert)
var _ ProposalRepository = (*proposalRepoStub)(nil)
var _ RolesRepository = (*rolesRepoStub)(nil)
var _ MemberResolver = (*memberResolverStub)(nil)
var _ OwnershipChecker = (*ownershipCheckerStub)(nil)
var _ MembershipsLister = (*membershipsListerStub)(nil)
var _ ReleaseVersionParticipationChecker = (*releaseVersionCheckerStub)(nil)

// Sicherheitsinvariant: SelfPublish darf status nicht auf 'confirmed' setzen.
// Dieser Test prüft die Repository-Datei direkt, weil SelfPublish dort das DB-Gate ist.
func TestSelfPublish_StatusBleibtProposed(t *testing.T) {
	repoPath := filepath.Join("..", "repository", "anime_contributions_proposal_repository.go")
	content, err := os.ReadFile(repoPath)
	if err != nil {
		t.Fatalf("repository-Datei lesen: %v", err)
	}
	source := string(content)
	start := strings.Index(source, "func (r *AnimeContributionsRepository) SelfPublish")
	if start < 0 {
		t.Fatalf("SelfPublish-Methode nicht gefunden")
	}
	selfPublishSource := source[start:]
	if next := strings.Index(selfPublishSource[len("func "):], "\nfunc "); next >= 0 {
		selfPublishSource = selfPublishSource[:len("func ")+next]
	}
	if strings.Contains(selfPublishSource, "status = 'confirmed'") {
		t.Fatalf("SelfPublish darf status nicht auf confirmed setzen")
	}
	if !strings.Contains(selfPublishSource, "is_public_on_anime_page = true") ||
		!strings.Contains(selfPublishSource, "is_public_on_member_profile = true") {
		t.Fatalf("SelfPublish muss beide Sichtbarkeitsflags setzen, damit der historische Beitrag öffentlich sichtbar wird")
	}
}

// Sicherheitsinvariant: Korrekte Umlaute in Fehlermeldungen.
// Wird beim Code-Review manuell geprüft — D-19.
var _ = errors.New // Sicherstellt dass errors-Paket importiert bleibt
