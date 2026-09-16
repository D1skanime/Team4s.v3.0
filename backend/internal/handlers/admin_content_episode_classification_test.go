package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
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
