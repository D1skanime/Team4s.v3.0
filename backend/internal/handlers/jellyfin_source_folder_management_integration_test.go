package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// jellyfinIntegrationTestMockServer builds a minimal fake Jellyfin server satisfying exactly the
// two endpoints buildAnimeJellyfinMetadataPreview's real-Postgres HTTP-chain test needs:
// GET /Items (series lookup by explicit ID, used by both getJellyfinSeriesByID and
// getJellyfinSeriesIntakeDetail) and GET /Items/{id}/ThemeVideos (theme video enumeration, empty
// result is fine here).
func jellyfinIntegrationTestMockServer(t *testing.T, seriesID, seriesName, seriesPath string) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/Items":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"Items": []map[string]any{
					{"Id": seriesID, "Name": seriesName, "Path": seriesPath},
				},
			})
		default:
			_ = json.NewEncoder(w).Encode(map[string]any{"Items": []map[string]any{}})
		}
	}))
	t.Cleanup(server.Close)
	return server
}

func insertPhase165TestAnime(t *testing.T, pool *pgxpool.Pool, source, folderName string) int64 {
	t.Helper()
	var animeID int64
	if err := pool.QueryRow(
		context.Background(),
		`INSERT INTO anime (title, source, folder_name) VALUES ($1, $2, $3) RETURNING id`,
		"Phase165 Test Anime",
		source,
		folderName,
	).Scan(&animeID); err != nil {
		t.Fatalf("seed phase165 test anime: %v", err)
	}
	return animeID
}

// TestPhase165Postgres_ConnectJellyfinFolderAdditively_JellyfinMainSourceStaysAdditive is the exact
// GAP-05 scenario a fake repo cannot prove: an anime whose anime.source is already jellyfin:<A> (the
// normal shape for anime created via Jellyfin preview/intake) connects a second folder B -- proving,
// against REAL Postgres unique-constraint/ON CONFLICT semantics, that anime.source/folder_name stay
// untouched and B lands additively in anime_source_links.
func TestPhase165Postgres_ConnectJellyfinFolderAdditively_JellyfinMainSourceStaysAdditive(t *testing.T) {
	pool := testsupport.OpenPhase165Postgres(t)
	repo := repository.NewAdminContentRepository(pool)
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}

	animeID := insertPhase165TestAnime(t, pool, "jellyfin:A", "/media/Anime/A")

	animeSource, err := repo.GetAnimeSyncSource(context.Background(), animeID)
	if err != nil {
		t.Fatalf("load anime sync source: %v", err)
	}

	preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "B"}
	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, animeID, animeSource, preview, "B", true); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	reloaded, err := repo.GetAnimeSyncSource(context.Background(), animeID)
	if err != nil {
		t.Fatalf("reload anime sync source: %v", err)
	}
	if reloaded.Source == nil || *reloaded.Source != "jellyfin:A" {
		t.Fatalf("expected anime.source to remain jellyfin:A, got %+v", reloaded.Source)
	}
	if reloaded.FolderName == nil || *reloaded.FolderName != "/media/Anime/A" {
		t.Fatalf("expected anime.folder_name to remain /media/Anime/A, got %+v", reloaded.FolderName)
	}

	var linkedAnimeID int64
	if err := pool.QueryRow(
		context.Background(),
		`SELECT anime_id FROM anime_source_links WHERE source = $1`,
		"jellyfin:B",
	).Scan(&linkedAnimeID); err != nil {
		t.Fatalf("expected anime_source_links row for jellyfin:B, query failed: %v", err)
	}
	if linkedAnimeID != animeID {
		t.Fatalf("expected jellyfin:B to be linked to anime %d, got %d", animeID, linkedAnimeID)
	}

	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", audit.calls)
	}
}

// TestPhase165Postgres_ConnectJellyfinFolderAdditively_OwnershipConflictReturns409NoAudit is the
// GAP-10 real-Postgres proof: connecting a folder already owned by a DIFFERENT anime must never
// silently no-op to success. Part 1 exercises connectJellyfinFolderAdditively directly against real
// Postgres; Part 2 routes the SAME scenario through the actual ApplyAnimeMetadataFromJellyfin HTTP
// handler (real repo, real Jellyfin mock server, httptest) and asserts the HTTP surface.
func TestPhase165Postgres_ConnectJellyfinFolderAdditively_OwnershipConflictReturns409NoAudit(t *testing.T) {
	pool := testsupport.OpenPhase165Postgres(t)
	repo := repository.NewAdminContentRepository(pool)

	animeA := insertPhase165TestAnime(t, pool, "jellyfin:A2", "/media/Anime/A2")
	animeB := insertPhase165TestAnime(t, pool, "jellyfin:B2", "/media/Anime/B2")

	if err := repo.LinkAdditionalJellyfinSource(context.Background(), animeB, "jellyfin:shared"); err != nil {
		t.Fatalf("seed pre-existing link for animeB: %v", err)
	}

	// --- Part 1: direct connectJellyfinFolderAdditively call against real Postgres -------------
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}

	animeSourceA, err := repo.GetAnimeSyncSource(context.Background(), animeA)
	if err != nil {
		t.Fatalf("load animeA sync source: %v", err)
	}
	preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "shared"}

	connectErr := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, animeA, animeSourceA, preview, "shared", true)
	if !errors.Is(connectErr, repository.ErrConflict) {
		t.Fatalf("expected error satisfying errors.Is(err, repository.ErrConflict), got %v", connectErr)
	}

	rows, err := pool.Query(context.Background(), `SELECT anime_id FROM anime_source_links WHERE source = $1`, "jellyfin:shared")
	if err != nil {
		t.Fatalf("query anime_source_links: %v", err)
	}
	var owners []int64
	for rows.Next() {
		var owner int64
		if err := rows.Scan(&owner); err != nil {
			t.Fatalf("scan owner: %v", err)
		}
		owners = append(owners, owner)
	}
	rows.Close()
	if len(owners) != 1 || owners[0] != animeB {
		t.Fatalf("expected exactly one unchanged jellyfin:shared row owned by animeB (%d), got %+v", animeB, owners)
	}

	if audit.calls != 0 {
		t.Fatalf("expected zero audit writes on an ownership conflict, got %d", audit.calls)
	}

	// --- Part 2: the SAME scenario through the actual HTTP handler ------------------------------
	mockJellyfin := jellyfinIntegrationTestMockServer(t, "shared", "Shared Series", "/media/Anime/Shared")

	httpHandler := &AdminContentHandler{
		repo:                  repo,
		folderManagementRepo:  repo,
		authzRepo:             stubAdminRoleChecker{allowed: true},
		adminRoleName:         "admin",
		jellyfinBaseURL:       mockJellyfin.URL,
		jellyfinAPIKey:        "phase165-test-key",
		httpClient:            mockJellyfin.Client(),
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	identity := withTestAdminIdentityAppUser(7, 7)
	router.POST("/api/v1/admin/anime/:id/jellyfin/metadata/apply", identity, httpHandler.ApplyAnimeMetadataFromJellyfin)

	body, err := json.Marshal(map[string]any{"jellyfin_series_id": "shared", "connect": true})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/"+strconv.FormatInt(animeA, 10)+"/jellyfin/metadata/apply", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var decoded struct {
		Data struct {
			ExistingAnimeID int64 `json:"existing_anime_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response body: %v (body=%s)", err, rec.Body.String())
	}
	if decoded.Data.ExistingAnimeID != animeB {
		t.Fatalf("expected data.existing_anime_id=%d, got %d", animeB, decoded.Data.ExistingAnimeID)
	}
}
