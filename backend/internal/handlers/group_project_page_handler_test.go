package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// projectPageSourceStub erfuellt alle 7 Source-Interfaces zugleich, sodass ein
// einziger Stub in den Handler injiziert werden kann. Jede Quelle hat einen
// eigenen Rueckgabewert + Fehler, um Komposition und Fehlerisolation getrennt
// steuern zu koennen.
type projectPageSourceStub struct {
	group    *models.GroupDetail
	groupErr error

	anime    *models.AnimeDetail
	animeErr error

	contributors    *repository.GroupContributorsResponse
	contributorsErr error

	themes    *repository.GroupThemesResponse
	themesErr error

	releaseMedia    *repository.GroupReleaseMediaResponse
	releaseMediaErr error

	note    *repository.PublicAnimeFansubProjectNote
	noteErr error

	fansubs    []models.AnimeFansubRelation
	fansubsErr error
}

func (s *projectPageSourceStub) GetGroupDetail(_ context.Context, _, _ int64) (*models.GroupDetail, error) {
	return s.group, s.groupErr
}

func (s *projectPageSourceStub) GetByID(_ context.Context, _ int64, _ bool) (*models.AnimeDetail, error) {
	return s.anime, s.animeErr
}

func (s *projectPageSourceStub) GetProjectContributors(_ context.Context, _, _ int64) (*repository.GroupContributorsResponse, error) {
	return s.contributors, s.contributorsErr
}

func (s *projectPageSourceStub) GetPublicGroupThemes(_ context.Context, _, _ int64) (*repository.GroupThemesResponse, error) {
	return s.themes, s.themesErr
}

func (s *projectPageSourceStub) GetPublicReleaseMedia(_ context.Context, _, _ int64) (*repository.GroupReleaseMediaResponse, error) {
	return s.releaseMedia, s.releaseMediaErr
}

func (s *projectPageSourceStub) GetPublicAnimeFansubProjectNote(_ context.Context, _, _ int64) (*repository.PublicAnimeFansubProjectNote, error) {
	return s.note, s.noteErr
}

func (s *projectPageSourceStub) ListAnimeFansubs(_ context.Context, _ int64) ([]models.AnimeFansubRelation, error) {
	return s.fansubs, s.fansubsErr
}

// fullyPopulatedProjectPageStub liefert alle 7 Sektionen erfolgreich.
func fullyPopulatedProjectPageStub() *projectPageSourceStub {
	return &projectPageSourceStub{
		group:        &models.GroupDetail{},
		anime:        &models.AnimeDetail{},
		contributors: &repository.GroupContributorsResponse{},
		themes:       &repository.GroupThemesResponse{},
		releaseMedia: &repository.GroupReleaseMediaResponse{},
		note:         &repository.PublicAnimeFansubProjectNote{ID: 7, Title: "Notiz"},
		fansubs:      []models.AnimeFansubRelation{},
	}
}

func newProjectPageHandlerFromStub(s *projectPageSourceStub) *ProjectPageHandler {
	return NewProjectPageHandler(s, s, s, s, s, s, s)
}

func makeProjectPageContext() (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/anime/1/group/1/project-page", nil)
	c.Params = gin.Params{
		{Key: "id", Value: "1"},
		{Key: "groupId", Value: "1"},
	}
	return c, recorder
}

// projectPageEnvelope dekodiert die Antwort mit RawMessage je Sektion, sodass
// null (fehlende Sektion) von einem Wert (gesetzte Sektion) unterschieden werden kann.
type projectPageEnvelope struct {
	Data struct {
		Group        json.RawMessage `json:"group"`
		Anime        json.RawMessage `json:"anime"`
		Contributors json.RawMessage `json:"contributors"`
		Themes       json.RawMessage `json:"themes"`
		ReleaseMedia json.RawMessage `json:"release_media"`
		ProjectNote  json.RawMessage `json:"project_note"`
		AnimeFansubs json.RawMessage `json:"anime_fansubs"`
	} `json:"data"`
}

func decodeProjectPageEnvelope(t *testing.T, body []byte) projectPageEnvelope {
	t.Helper()
	var env projectPageEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatalf("unmarshal response failed: %v (body=%s)", err, string(body))
	}
	return env
}

func isJSONNull(raw json.RawMessage) bool {
	return string(raw) == "null" || len(raw) == 0
}

func TestProjectPageHappyPathComposesAllSections(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := newProjectPageHandlerFromStub(fullyPopulatedProjectPageStub())
	c, recorder := makeProjectPageContext()

	handler.GetProjectPage(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	env := decodeProjectPageEnvelope(t, recorder.Body.Bytes())
	sections := map[string]json.RawMessage{
		"group":         env.Data.Group,
		"anime":         env.Data.Anime,
		"contributors":  env.Data.Contributors,
		"themes":        env.Data.Themes,
		"release_media": env.Data.ReleaseMedia,
		"project_note":  env.Data.ProjectNote,
		"anime_fansubs": env.Data.AnimeFansubs,
	}
	for name, raw := range sections {
		if isJSONNull(raw) {
			t.Fatalf("expected section %q to be present, got null", name)
		}
	}
}

func TestProjectPageOptionalSectionDegradationIsolated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name       string
		nullField  string
		injectFail func(s *projectPageSourceStub)
	}{
		{
			name:      "contributors",
			nullField: "contributors",
			injectFail: func(s *projectPageSourceStub) {
				s.contributors, s.contributorsErr = nil, errors.New("boom contributors")
			},
		},
		{
			name:      "themes",
			nullField: "themes",
			injectFail: func(s *projectPageSourceStub) {
				s.themes, s.themesErr = nil, errors.New("boom themes")
			},
		},
		{
			name:      "release_media",
			nullField: "release_media",
			injectFail: func(s *projectPageSourceStub) {
				s.releaseMedia, s.releaseMediaErr = nil, errors.New("boom release media")
			},
		},
		{
			name:      "project_note",
			nullField: "project_note",
			injectFail: func(s *projectPageSourceStub) {
				s.note, s.noteErr = nil, errors.New("boom project note")
			},
		},
		{
			name:      "anime_fansubs",
			nullField: "anime_fansubs",
			injectFail: func(s *projectPageSourceStub) {
				s.fansubs, s.fansubsErr = nil, errors.New("boom anime fansubs")
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			stub := fullyPopulatedProjectPageStub()
			tc.injectFail(stub)
			handler := newProjectPageHandlerFromStub(stub)
			c, recorder := makeProjectPageContext()

			handler.GetProjectPage(c)

			if recorder.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
			}

			env := decodeProjectPageEnvelope(t, recorder.Body.Bytes())
			sections := map[string]json.RawMessage{
				"contributors":  env.Data.Contributors,
				"themes":        env.Data.Themes,
				"release_media": env.Data.ReleaseMedia,
				"project_note":  env.Data.ProjectNote,
				"anime_fansubs": env.Data.AnimeFansubs,
			}

			// Gate-Sektionen bleiben immer gesetzt.
			if isJSONNull(env.Data.Group) || isJSONNull(env.Data.Anime) {
				t.Fatalf("gate sections must stay set; group=%s anime=%s", env.Data.Group, env.Data.Anime)
			}

			// Die fehlgeschlagene Sektion ist null, alle anderen bleiben gefuellt.
			for name, raw := range sections {
				if name == tc.nullField {
					if !isJSONNull(raw) {
						t.Fatalf("expected failed section %q to be null, got %s", name, raw)
					}
					continue
				}
				if isJSONNull(raw) {
					t.Fatalf("expected sibling section %q to stay filled, got null", name)
				}
			}
		})
	}
}

func TestProjectPageProjectNoteNotFoundIsNullWithoutError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := fullyPopulatedProjectPageStub()
	stub.note, stub.noteErr = nil, repository.ErrNotFound
	handler := newProjectPageHandlerFromStub(stub)
	c, recorder := makeProjectPageContext()

	handler.GetProjectPage(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	env := decodeProjectPageEnvelope(t, recorder.Body.Bytes())
	if !isJSONNull(env.Data.ProjectNote) {
		t.Fatalf("expected project_note null for ErrNotFound, got %s", env.Data.ProjectNote)
	}
	if isJSONNull(env.Data.Contributors) {
		t.Fatalf("expected other sections to remain filled")
	}
}

func TestProjectPageGroupNotFoundReturns404(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := fullyPopulatedProjectPageStub()
	stub.group, stub.groupErr = nil, repository.ErrNotFound
	handler := newProjectPageHandlerFromStub(stub)
	c, recorder := makeProjectPageContext()

	handler.GetProjectPage(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}

func TestProjectPageAnimeNotFoundReturns404(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := fullyPopulatedProjectPageStub()
	stub.anime, stub.animeErr = nil, repository.ErrNotFound
	handler := newProjectPageHandlerFromStub(stub)
	c, recorder := makeProjectPageContext()

	handler.GetProjectPage(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}

func TestProjectPageGroupHardErrorReturns500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := fullyPopulatedProjectPageStub()
	stub.group, stub.groupErr = nil, errors.New("db connection lost")
	handler := newProjectPageHandlerFromStub(stub)
	c, recorder := makeProjectPageContext()

	handler.GetProjectPage(c)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}
