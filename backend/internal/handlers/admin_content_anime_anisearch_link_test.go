package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeAniSearchLinkLookupRepo is an in-memory adminAniSearchRepository fake, letting the Task-1
// tests assert the exact pre-check/race-fallback lookup behaviour (real handler code execution via
// httptest, Teststil per CLAUDE.md) without a live Postgres instance. findResultsBySequence lets a
// test simulate the race window (pre-check finds nothing, the follow-up fallback lookup after the
// repo's ErrConflict does find the real owner) by returning a different result per call; if it is
// empty, every call falls back to the static findResult/findErr fields.
type fakeAniSearchLinkLookupRepo struct {
	findCalls           int
	findArgs            []string
	findResult          *models.AdminAnimeSourceMatch
	findErr             error
	findResultsBySequence []*models.AdminAnimeSourceMatch
}

func (f *fakeAniSearchLinkLookupRepo) FindAnimeBySource(_ context.Context, source string) (*models.AdminAnimeSourceMatch, error) {
	f.findCalls++
	f.findArgs = append(f.findArgs, source)
	if f.findErr != nil {
		return nil, f.findErr
	}
	if len(f.findResultsBySequence) > 0 {
		idx := f.findCalls - 1
		if idx < len(f.findResultsBySequence) {
			return f.findResultsBySequence[idx], nil
		}
		return f.findResultsBySequence[len(f.findResultsBySequence)-1], nil
	}
	return f.findResult, nil
}

func (f *fakeAniSearchLinkLookupRepo) ResolveAdminAnimeRelationTargetsByTitles(_ context.Context, _ []string) ([]models.AdminAnimeRelationTitleMatch, error) {
	return nil, nil
}

func (f *fakeAniSearchLinkLookupRepo) ResolveAdminAnimeRelationTargetsBySources(_ context.Context, _ []string) ([]models.AdminAnimeSourceMatch, error) {
	return nil, nil
}

// fakeAniSearchLinkRepo is an in-memory adminAniSearchLinkRepository fake for the actual link write.
type fakeAniSearchLinkRepo struct {
	linkCalls int
	linkIDs   []string
	linkErr   error
}

func (f *fakeAniSearchLinkRepo) LinkAniSearchSource(_ context.Context, _ int64, aniSearchID string) error {
	f.linkCalls++
	f.linkIDs = append(f.linkIDs, aniSearchID)
	return f.linkErr
}

func newAniSearchLinkTestHandler(lookup adminAniSearchRepository, link adminAniSearchLinkRepository, audit auditLogWriter) *AdminContentHandler {
	return &AdminContentHandler{
		authzRepo:              stubAdminRoleChecker{allowed: true},
		adminRoleName:          "admin",
		aniSearchRepo:          lookup,
		animeAniSearchLinkRepo: link,
		auditLogRepo:           audit,
	}
}

func newAniSearchLinkTestRouter(h *AdminContentHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	identity := withTestAdminIdentityAppUser(7, 7)
	router.POST("/api/v1/admin/anime/:id/anisearch/link", identity, h.LinkAnimeAniSearchSource)
	return router
}

func postAniSearchLink(router *gin.Engine, animeID string, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/"+animeID+"/anisearch/link", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// --- 400: leere/nur-Leerzeichen anisearch_id --------------------------------------------------

func TestAniSearchLink_EmptyIDReturns400(t *testing.T) {
	lookup := &fakeAniSearchLinkLookupRepo{}
	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"   "}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if link.linkCalls != 0 {
		t.Fatalf("expected LinkAniSearchSource not to be attempted for an empty id, got %d calls", link.linkCalls)
	}
	if lookup.findCalls != 0 {
		t.Fatalf("expected the pre-check lookup not to run before id validation, got %d calls", lookup.findCalls)
	}
	if audit.calls != 0 {
		t.Fatalf("expected no audit write on a 400, got %d", audit.calls)
	}
}

// --- 409: Pre-Check findet bereits existierende Fremd-Verknüpfung ------------------------------

func TestAniSearchLink_PreCheckConflictReturns409WithExistingTitle(t *testing.T) {
	lookup := &fakeAniSearchLinkLookupRepo{findResult: &models.AdminAnimeSourceMatch{AnimeID: 12, Title: "Angel Beats!"}}
	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if link.linkCalls != 0 {
		t.Fatalf("expected LinkAniSearchSource not to be attempted when the pre-check already found a conflict, got %d calls", link.linkCalls)
	}
	if lookup.findCalls != 1 || lookup.findArgs[0] != "anisearch:6465" {
		t.Fatalf("expected FindAnimeBySource(\"anisearch:6465\") exactly once, got calls=%d args=%+v", lookup.findCalls, lookup.findArgs)
	}

	var decoded struct {
		Data struct {
			Mode            string `json:"mode"`
			ExistingAnimeID int64  `json:"existing_anime_id"`
			ExistingTitle   string `json:"existing_title"`
			RedirectPath    string `json:"redirect_path"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if decoded.Data.Mode != "conflict" {
		t.Fatalf("expected mode=conflict, got %q", decoded.Data.Mode)
	}
	if decoded.Data.ExistingAnimeID != 12 {
		t.Fatalf("expected existing_anime_id=12, got %d", decoded.Data.ExistingAnimeID)
	}
	if decoded.Data.ExistingTitle != "Angel Beats!" {
		t.Fatalf("expected existing_title=%q, got %q", "Angel Beats!", decoded.Data.ExistingTitle)
	}
	if decoded.Data.RedirectPath != "/admin/anime/12/edit" {
		t.Fatalf("unexpected redirect_path %q", decoded.Data.RedirectPath)
	}
	if audit.calls != 0 {
		t.Fatalf("expected no audit write on a 409, got %d", audit.calls)
	}
}

// --- 409: Repo liefert ErrConflict (Race nach Pre-Check), Fallback-Lookup greift --------------

func TestAniSearchLink_RepoConflictFallbackLookupReturns409(t *testing.T) {
	// Pre-check finds nothing (race window), but the repo write itself reports ErrConflict; the
	// handler must look up the owner again and surface the same conflict shape, never a 500.
	lookup := &fakeAniSearchLinkLookupRepo{findResultsBySequence: []*models.AdminAnimeSourceMatch{
		nil,
		{AnimeID: 12, Title: "Angel Beats!"},
	}}
	link := &fakeAniSearchLinkRepo{linkErr: repository.ErrConflict}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if link.linkCalls != 1 {
		t.Fatalf("expected exactly 1 LinkAniSearchSource attempt, got %d", link.linkCalls)
	}
	// Pre-check (1) + race fallback lookup (2) both call FindAnimeBySource on the same source tag.
	if lookup.findCalls < 2 {
		t.Fatalf("expected the race-fallback lookup to run after the repo ErrConflict, got %d calls", lookup.findCalls)
	}

	var decoded struct {
		Data struct {
			ExistingAnimeID int64  `json:"existing_anime_id"`
			ExistingTitle   string `json:"existing_title"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if decoded.Data.ExistingAnimeID != 12 || decoded.Data.ExistingTitle != "Angel Beats!" {
		t.Fatalf("expected the race-fallback lookup result in the body, got %+v", decoded.Data)
	}
	if audit.calls != 0 {
		t.Fatalf("expected no audit write on a 409, got %d", audit.calls)
	}
}

// --- 409 fallback never 500 when the follow-up lookup itself finds nothing ---------------------

func TestAniSearchLink_RepoConflictFallbackLookupFindsNothingStillReturns409(t *testing.T) {
	lookup := &fakeAniSearchLinkLookupRepo{findResult: nil}
	link := &fakeAniSearchLinkRepo{linkErr: repository.ErrConflict}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 even when the follow-up lookup found nothing, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	var decoded map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if _, hasData := decoded["data"]; hasData {
		t.Fatalf("expected no data field when the fallback lookup returned nothing, got %+v", decoded)
	}
}

// --- 200: Erfolg -------------------------------------------------------------------------------

func TestAniSearchLink_SuccessReturns200WithLinkedMode(t *testing.T) {
	lookup := &fakeAniSearchLinkLookupRepo{findResult: nil}
	link := &fakeAniSearchLinkRepo{}
	audit := &fakeAuditLogWriter{}
	router := newAniSearchLinkTestRouter(newAniSearchLinkTestHandler(lookup, link, audit))

	rec := postAniSearchLink(router, "13", `{"anisearch_id":"6465"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if link.linkCalls != 1 || link.linkIDs[0] != "6465" {
		t.Fatalf("expected LinkAniSearchSource(\"6465\") exactly once, got calls=%d ids=%+v", link.linkCalls, link.linkIDs)
	}

	var decoded struct {
		Data struct {
			Mode        string `json:"mode"`
			AniSearchID string `json:"anisearch_id"`
			Source      string `json:"source"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if decoded.Data.Mode != "linked" {
		t.Fatalf("expected mode=linked, got %q", decoded.Data.Mode)
	}
	if decoded.Data.AniSearchID != "6465" {
		t.Fatalf("expected anisearch_id=6465, got %q", decoded.Data.AniSearchID)
	}
	if decoded.Data.Source != "anisearch:6465" {
		t.Fatalf("expected source=anisearch:6465, got %q", decoded.Data.Source)
	}
	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write on success, got %d", audit.calls)
	}
	entry := audit.entries[0]
	if entry.EventType != "anisearch.linked" {
		t.Fatalf("unexpected event_type %q", entry.EventType)
	}
	if entry.TargetType != "anime" {
		t.Fatalf("unexpected target_type %q", entry.TargetType)
	}
	if entry.TargetID == nil || *entry.TargetID != 13 {
		t.Fatalf("unexpected target_id %+v", entry.TargetID)
	}
}
