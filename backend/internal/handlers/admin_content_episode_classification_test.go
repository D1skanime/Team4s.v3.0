package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

func episodeClassificationPatchRequest(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/episodes/40", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "40"}}
	c.Set("auth_identity", evecFixturePlatformAdminIdentity())
	// repo bleibt nil: ungültige Werte müssen vor jedem Repository-Zugriff scheitern.
	(&AdminContentHandler{authzRepo: adminRoleCheckerStub{isAdmin: true}}).UpdateEpisode(c)
	return w
}

func TestUpdateEpisode_RejectsInvalidClassificationValuesWith400(t *testing.T) {
	cases := map[string]string{
		"unknown filler type":        `{"filler_type":"sidestory"}`,
		"filler type wrong case":     `{"filler_type":"Canon"}`,
		"empty filler type":          `{"filler_type":""}`,
		"null filler type":           `{"filler_type":null}`,
		"unknown episode type":       `{"episode_type":"tv"}`,
		"episode type wrong case":    `{"episode_type":"OVA"}`,
		"relation label as type":     `{"episode_type":"Nebengeschichte"}`,
		"invalid with valid sibling": `{"filler_type":"canon","episode_type":"nope"}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			w := episodeClassificationPatchRequest(t, body)
			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			var payload struct {
				Error struct {
					Message string `json:"message"`
				} `json:"error"`
			}
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
			require.Contains(t, payload.Error.Message, "ungültiger")
		})
	}
}

func TestValidateAdminEpisodePatchRequest_AcceptsAllClassificationValues(t *testing.T) {
	for _, fillerType := range models.EpisodeFillerTypeNames {
		value := " " + fillerType + " "
		input, message := validateAdminEpisodePatchRequest(models.AdminEpisodePatchInput{
			FillerType: models.OptionalString{Set: true, Value: &value},
		})
		require.Empty(t, message, fillerType)
		require.Equal(t, fillerType, *input.FillerType.Value)
		require.False(t, input.EpisodeType.Set, "filler patch must not touch episode type")
	}
	for _, episodeType := range models.EpisodeTypeNames {
		value := episodeType
		input, message := validateAdminEpisodePatchRequest(models.AdminEpisodePatchInput{
			EpisodeType: models.OptionalString{Set: true, Value: &value},
		})
		require.Empty(t, message, episodeType)
		require.Equal(t, episodeType, *input.EpisodeType.Value)
		require.False(t, input.FillerType.Set, "episode type patch must not touch filler type")
	}
}

func TestEpisodeClassificationAllowlistsMatchLookupSeeds(t *testing.T) {
	require.Equal(t, []string{"unknown", "canon", "filler", "mixed", "recap"}, models.EpisodeFillerTypeNames)
	require.Equal(t, []string{
		"episode", "special", "ova", "ona", "movie",
		"recap", "preview", "prologue", "epilogue", "bonus",
	}, models.EpisodeTypeNames)
}

// openEpisodeClassificationOptionsFixture opens a real, schema-isolated Postgres
// fixture (never DATABASE_URL/team4s_v2) and seeds both lookup tables with the
// exact migration 0169 code/label pairs (GAP-11), matching
// admin_content_tag_genre_names_test.go's real-repository-over-real-DB precedent
// for lean admin lookup-list handlers.
func openEpisodeClassificationOptionsFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	fixture := testsupport.OpenPhase106Postgres(t)
	_, err := fixture.Exec(context.Background(), `
CREATE TABLE episode_filler_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL, label TEXT);
INSERT INTO episode_filler_types (id,name,label) VALUES
 (1,'unknown','Unbekannt'),(2,'canon','Haupthandlung'),(3,'filler','Zusatzfolge'),(4,'mixed','Teilweise Zusatzfolge'),(5,'recap','Rückblick');
CREATE TABLE episode_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL, label TEXT);
INSERT INTO episode_types (id,name,label) VALUES
 (1,'episode','Episode'),(2,'special','Special'),(3,'ova','OVA'),(4,'ona','ONA'),(5,'movie','Movie'),
 (6,'recap','Recap'),(7,'preview','Preview'),(8,'prologue','Prologue'),(9,'epilogue','Epilogue'),(10,'bonus','Bonus');
`)
	require.NoError(t, err, "create episode classification options fixture schema")
	return fixture
}

type episodeClassificationOptionsEnvelope struct {
	Data models.EpisodeClassificationOptions `json:"data"`
}

// TestListEpisodeClassificationOptions_RequiresAdmin proves GET
// /admin/episode-classification-options 401/403s without an admin identity, before
// any repository call runs (T-164-19).
func TestListEpisodeClassificationOptions_RequiresAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openEpisodeClassificationOptionsFixture(t)
	handler := &AdminContentHandler{
		repo:      repository.NewAdminContentRepository(pool),
		authzRepo: adminRoleCheckerStub{isAdmin: false},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/episode-classification-options", nil)
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Non-Admin"})
	handler.ListEpisodeClassificationOptions(c)

	require.True(t, w.Code == http.StatusUnauthorized || w.Code == http.StatusForbidden,
		"expected 401/403 for non-admin, got %d: %s", w.Code, w.Body.String())
}

// TestListEpisodeClassificationOptions_ReturnsBothLookupTables proves an admin
// request returns both lookup tables' code+label pairs, ordered by id, sourced
// from the same migration 0169 label columns (GAP-11).
func TestListEpisodeClassificationOptions_ReturnsBothLookupTables(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openEpisodeClassificationOptionsFixture(t)
	handler := &AdminContentHandler{
		repo:      repository.NewAdminContentRepository(pool),
		authzRepo: adminRoleCheckerStub{isAdmin: true},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/episode-classification-options", nil)
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Admin"})
	handler.ListEpisodeClassificationOptions(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var payload episodeClassificationOptionsEnvelope
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))

	require.Len(t, payload.Data.FillerTypes, 5)
	require.Equal(t, []models.EpisodeClassificationOption{
		{Code: "unknown", Label: "Unbekannt"},
		{Code: "canon", Label: "Haupthandlung"},
		{Code: "filler", Label: "Zusatzfolge"},
		{Code: "mixed", Label: "Teilweise Zusatzfolge"},
		{Code: "recap", Label: "Rückblick"},
	}, payload.Data.FillerTypes)

	require.Len(t, payload.Data.EpisodeTypes, 10)
	require.Equal(t, []models.EpisodeClassificationOption{
		{Code: "episode", Label: "Episode"},
		{Code: "special", Label: "Special"},
		{Code: "ova", Label: "OVA"},
		{Code: "ona", Label: "ONA"},
		{Code: "movie", Label: "Movie"},
		{Code: "recap", Label: "Recap"},
		{Code: "preview", Label: "Preview"},
		{Code: "prologue", Label: "Prologue"},
		{Code: "epilogue", Label: "Epilogue"},
		{Code: "bonus", Label: "Bonus"},
	}, payload.Data.EpisodeTypes)
}
