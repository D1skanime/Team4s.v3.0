package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// rangeAutoAssignCall captures one AssignThemeSegmentToEpisodeRange invocation for assertions
// (Quick-Task 260819-lm5: Bereich-Auto-Zuweisung beim Speichern -- start_episode/end_episode SIND
// der Mechanismus, kein separater Button).
type rangeAutoAssignCall struct {
	segmentID     int64
	animeID       int64
	fansubGroupID int64
	version       string
	startEpisode  int
	endEpisode    int
}

// rangeAutoAssignThemeRepo implementiert nur die Methoden, die CreateAnimeSegment/
// UpdateAnimeSegment fuer die Bereich-Auto-Zuweisung UND den (unveraendert bestehenden)
// Basis-Zeit-Fan-out-Pfad benoetigen -- inklusive der vollen segmentStreamThemeRepository-
// Schnittstelle, weil UpdateAnimeSegment diese bereits VOR jeder Aenderung dieses Plans
// unbedingt per Typ-Assertion prueft (captureSegmentRenderSources/
// resetAndQueueSegmentRenderForAssignments). Der Rest von adminThemeRepository bleibt
// bewusst ungesetzt (nil-embedded), analog fakeSegmentAssignmentThemeRepo.
type rangeAutoAssignThemeRepo struct {
	adminThemeRepository

	// segment wird von GetAnimeSegmentByID IMMER zurueckgegeben (existingSegment-Load,
	// Zwischen-Reloads UND der finale Reload nach der Bereich-Auto-Zuweisung) -- die Tests
	// unterscheiden nicht zwischen den Aufrufen, sondern pruefen den AssignThemeSegmentToEpisodeRange-
	// Aufruf direkt sowie den Inhalt der finalen JSON-Response.
	segment *models.AdminThemeSegment

	createErr error
	updateErr error

	assignedIDs []int64 // ListThemeSegmentAssignments (nonOverriddenSegmentAssignments) -- leer haelt den bestehenden Basis-Zeit-Fan-out-Pfad trivial.

	rangeCall   *rangeAutoAssignCall
	rangeResult []int64
	rangeErr    error

	getSegmentByIDCalls int
}

func (f *rangeAutoAssignThemeRepo) CreateAnimeSegment(ctx context.Context, animeID int64, input models.AdminThemeSegmentCreateInput, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	return &models.AdminThemeSegment{
		ID:            f.segment.ID,
		ThemeID:       input.ThemeID,
		AnimeID:       animeID,
		ThemeTypeName: "OP1",
		FansubGroupID: input.FansubGroupID,
		Version:       input.Version,
		StartEpisode:  input.StartEpisode,
		EndEpisode:    input.EndEpisode,
	}, nil
}

func (f *rangeAutoAssignThemeRepo) UpdateAnimeSegment(ctx context.Context, segmentID int64, input models.AdminThemeSegmentPatchInput) error {
	return f.updateErr
}

func (f *rangeAutoAssignThemeRepo) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	f.getSegmentByIDCalls++
	return f.segment, nil
}

func (f *rangeAutoAssignThemeRepo) GetSegmentReleaseDuration(ctx context.Context, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) (*int32, error) {
	return nil, nil
}

func (f *rangeAutoAssignThemeRepo) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error) {
	return f.assignedIDs, nil
}

func (f *rangeAutoAssignThemeRepo) GetThemeSegmentEpisodeOverride(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.AdminThemeSegmentEpisodeOverride, error) {
	return nil, repository.ErrNotFound
}

func (f *rangeAutoAssignThemeRepo) AssignThemeSegmentToEpisodeRange(ctx context.Context, segmentID int64, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) ([]int64, error) {
	f.rangeCall = &rangeAutoAssignCall{segmentID, animeID, fansubGroupID, version, startEpisode, endEpisode}
	return f.rangeResult, f.rangeErr
}

// --- segmentStreamThemeRepository (9 Methoden, trivial -- h.segmentRenderEnabled bleibt in
// diesen Tests auf dem Zero-Value false, daher werden die meisten davon nie tatsaechlich
// ausgefuehrt, muessen aber fuer die Interface-Typ-Assertion vorhanden sein). ---

func (f *rangeAutoAssignThemeRepo) GetThemeSegmentRenderSource(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderSource, error) {
	return nil, repository.ErrNotFound
}
func (f *rangeAutoAssignThemeRepo) GetThemeSegmentRenderCacheByKey(ctx context.Context, cacheKey string) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}
func (f *rangeAutoAssignThemeRepo) GetReadyThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}
func (f *rangeAutoAssignThemeRepo) GetLatestThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}
func (f *rangeAutoAssignThemeRepo) ListThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) ([]models.ThemeSegmentRenderCache, error) {
	return nil, nil
}
func (f *rangeAutoAssignThemeRepo) DeleteThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) (int64, error) {
	return 0, nil
}
func (f *rangeAutoAssignThemeRepo) UpsertThemeSegmentRenderCacheQueued(ctx context.Context, input models.ThemeSegmentRenderCacheUpsertInput) (*models.ThemeSegmentRenderCache, error) {
	return nil, nil
}
func (f *rangeAutoAssignThemeRepo) ClaimNextQueuedThemeSegmentRender(ctx context.Context) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}
func (f *rangeAutoAssignThemeRepo) MarkThemeSegmentRenderCacheReady(ctx context.Context, input models.ThemeSegmentRenderCacheReadyInput) error {
	return nil
}
func (f *rangeAutoAssignThemeRepo) MarkThemeSegmentRenderCacheFailed(ctx context.Context, cacheKey string, errorCode string, errorMessage string) error {
	return nil
}

// TestCreateAnimeSegment_RangeAutoAssignsAllEpisodesInRange beweist, dass ein neu angelegtes
// Segment mit einem Episodenbereich (start_episode/end_episode) beim Speichern AUTOMATISCH allen
// Release-Versionen im Bereich zugewiesen wird -- KEIN separater Button, start_episode/end_episode
// SIND der Mechanismus (Quick-Task 260819-lm5, Nutzer-Korrektur der urspruenglichen Button-Idee).
func TestCreateAnimeSegment_RangeAutoAssignsAllEpisodesInRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fansubGroupID := int64(3)
	stub := &rangeAutoAssignThemeRepo{
		segment: &models.AdminThemeSegment{
			ID:                        99,
			AnimeID:                   10,
			ThemeTypeName:             "OP1",
			FansubGroupID:             &fansubGroupID,
			Version:                   "v1",
			AssignedReleaseVersionIDs: []int64{201, 202, 203},
			IsShared:                  true,
		},
		rangeResult: []int64{201, 202, 203},
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/10/segments?release_variant_id=201", strings.NewReader(
		`{"theme_id":5,"fansub_group_id":3,"version":"v1","start_episode":1,"end_episode":3}`,
	))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.CreateAnimeSegment(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	if stub.rangeCall == nil {
		t.Fatal("expected AssignThemeSegmentToEpisodeRange to be called")
	}
	want := rangeAutoAssignCall{segmentID: 99, animeID: 10, fansubGroupID: 3, version: "v1", startEpisode: 1, endEpisode: 3}
	if *stub.rangeCall != want {
		t.Fatalf("unexpected AssignThemeSegmentToEpisodeRange call: got %+v, want %+v", *stub.rangeCall, want)
	}

	var resp struct {
		Data models.AdminThemeSegment `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.Data.IsShared || len(resp.Data.AssignedReleaseVersionIDs) != 3 {
		t.Fatalf("expected the reloaded, fully hydrated segment (3 assignments) in the response, got %+v", resp.Data)
	}
	if stub.getSegmentByIDCalls != 1 {
		t.Fatalf("expected exactly one reload after a non-empty range assignment, got %d calls", stub.getSegmentByIDCalls)
	}
}

// TestCreateAnimeSegment_RangeAutoAssignIdempotentSkipsReload beweist den Idempotenz-Fall: wenn
// AssignThemeSegmentToEpisodeRange keine NEUEN Zuweisungen meldet (leeres Ergebnis -- z. B. erneutes
// Speichern desselben Bereichs), wird KEIN zusaetzlicher Reload ausgefuehrt und die urspruengliche
// create()-Antwort unveraendert zurueckgegeben.
func TestCreateAnimeSegment_RangeAutoAssignIdempotentSkipsReload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fansubGroupID := int64(3)
	stub := &rangeAutoAssignThemeRepo{
		segment: &models.AdminThemeSegment{
			ID:            99,
			AnimeID:       10,
			ThemeTypeName: "OP1",
			FansubGroupID: &fansubGroupID,
			Version:       "v1",
		},
		rangeResult: nil, // keine neuen Zuweisungen -- bereits alles zugewiesen
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/10/segments?release_variant_id=201", strings.NewReader(
		`{"theme_id":5,"fansub_group_id":3,"version":"v1","start_episode":1,"end_episode":3}`,
	))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.CreateAnimeSegment(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if stub.rangeCall == nil {
		t.Fatal("expected AssignThemeSegmentToEpisodeRange to still be called (idempotent no-op check happens inside the repo)")
	}
	if stub.getSegmentByIDCalls != 0 {
		t.Fatalf("expected NO reload when the range assignment returned no new assignments, got %d calls", stub.getSegmentByIDCalls)
	}
}

// TestCreateAnimeSegment_RangeAutoAssignFailureIsNonFatal beweist, dass ein Fehler bei der
// Bereich-Auto-Zuweisung NICHT die erfolgreiche Create-Response zerstoert -- das Segment wurde
// bereits angelegt, ein 500 hier waere irrefuehrend und ein Retry wuerde ein Duplikat-Segment
// anlegen (Quick-Task 260819-lm5, non-fatal Fehlerbehandlung).
func TestCreateAnimeSegment_RangeAutoAssignFailureIsNonFatal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fansubGroupID := int64(3)
	stub := &rangeAutoAssignThemeRepo{
		segment: &models.AdminThemeSegment{
			ID:            99,
			AnimeID:       10,
			ThemeTypeName: "OP1",
			FansubGroupID: &fansubGroupID,
			Version:       "v1",
		},
		rangeErr: context.DeadlineExceeded,
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/10/segments?release_variant_id=201", strings.NewReader(
		`{"theme_id":5,"fansub_group_id":3,"version":"v1","start_episode":1,"end_episode":3}`,
	))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.CreateAnimeSegment(c)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 despite range auto-assign failure (non-fatal), got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

// TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues beweist, dass die
// Bereich-Auto-Zuweisung beim Update die EFFEKTIVEN (bereits gepatchten) Werte aus dem neu
// geladenen Segment verwendet, NICHT die rohen Request-Felder -- deckt sowohl "nur Zeit geaendert,
// Bereich blieb gleich" als auch "Bereich nachtraeglich erweitert" ab.
func TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fansubGroupID := int64(3)
	stub := &rangeAutoAssignThemeRepo{
		segment: &models.AdminThemeSegment{
			ID:                        7,
			AnimeID:                   10,
			ThemeTypeName:             "OP1",
			FansubGroupID:             &fansubGroupID,
			Version:                   "v1",
			StartEpisode:              intPtr(1),
			EndEpisode:                intPtr(12),
			AssignedReleaseVersionIDs: []int64{481, 482, 483},
			IsShared:                  true,
		},
		rangeResult: []int64{483}, // Folge 12 kam durch die Bereichserweiterung neu hinzu
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	// Der Patch-Body enthaelt bewusst KEIN start_episode/end_episode (z. B. nur ein
	// theme_id-Wechsel) -- die effektiven Werte muessen trotzdem aus dem neu geladenen
	// (unveraenderten Basis-)Segment kommen, nicht aus req.*.
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/anime/10/segments/7?release_variant_id=481", strings.NewReader(`{"theme_id":5}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.UpdateAnimeSegment(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	if stub.rangeCall == nil {
		t.Fatal("expected AssignThemeSegmentToEpisodeRange to be called")
	}
	want := rangeAutoAssignCall{segmentID: 7, animeID: 10, fansubGroupID: 3, version: "v1", startEpisode: 1, endEpisode: 12}
	if *stub.rangeCall != want {
		t.Fatalf("unexpected AssignThemeSegmentToEpisodeRange call: got %+v, want %+v (must use effective/patched values, not raw request fields)", *stub.rangeCall, want)
	}

	var resp struct {
		Data models.AdminThemeSegment `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp.Data.AssignedReleaseVersionIDs) != 3 {
		t.Fatalf("expected the reloaded segment with all 3 assignments in the response, got %+v", resp.Data)
	}
}

