package repository_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

func dateFixtureTime(raw string) *time.Time {
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		panic(err)
	}
	return &parsed
}

func TestEpisodeVersionDatePatchMergedValidation(t *testing.T) {
	cases := []struct {
		name    string
		input   models.EpisodeVersionPatchInput
		invalid bool
	}{
		{"start only after saved completion", models.EpisodeVersionPatchInput{ProductionStartedOn: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-03-01T00:00:00Z")}}, true},
		{"completion only before saved start", models.EpisodeVersionPatchInput{ReleaseDate: models.OptionalTime{Set: true, Value: dateFixtureTime("2019-12-31T00:00:00Z")}}, true},
		{"same UTC calendar day with earlier clock time", models.EpisodeVersionPatchInput{ProductionStartedOn: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-02-01T23:00:00Z")}}, false},
		{"completion same day", models.EpisodeVersionPatchInput{ReleaseDate: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-01-01T00:00:00Z")}}, false},
		{"clear start", models.EpisodeVersionPatchInput{ProductionStartedOn: models.OptionalTime{Set: true}}, false},
		{"clear completion", models.EpisodeVersionPatchInput{ReleaseDate: models.OptionalTime{Set: true}}, false},
		{"both before", models.EpisodeVersionPatchInput{ProductionStartedOn: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-03-02T00:00:00Z")}, ReleaseDate: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-03-01T00:00:00Z")}}, true},
		{"timezone uses UTC calendar", models.EpisodeVersionPatchInput{ProductionStartedOn: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-02-02T00:30:00+02:00")}}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			pool, _ := openEpisodeVersionPublicFixture(t)
			ctx := context.Background()
			title := "date patch title"
			tc.input.Title = models.OptionalString{Set: true, Value: &title}
			repo := repository.NewEpisodeVersionRepository(pool)
			got, err := repo.Update(ctx, 100, tc.input)
			if tc.invalid {
				require.ErrorIs(t, err, models.ErrEpisodeVersionDateOrder)
				require.Nil(t, got)
				var storedTitle string
				require.NoError(t, pool.QueryRow(ctx, "SELECT title FROM release_versions WHERE id=10").Scan(&storedTitle))
				require.Equal(t, "First release", storedTitle, "invalid merged dates roll back all metadata")
				return
			}
			require.NoError(t, err)
			require.Equal(t, &title, got.Title)
			if tc.input.ProductionStartedOn.Set {
				if tc.input.ProductionStartedOn.Value == nil {
					require.Nil(t, got.ProductionStartedOn)
				} else {
					require.True(t, got.ProductionStartedOn.Equal(*tc.input.ProductionStartedOn.Value))
				}
			}
			if tc.input.ReleaseDate.Set {
				if tc.input.ReleaseDate.Value == nil {
					require.Nil(t, got.ReleaseDate)
				} else {
					require.True(t, got.ReleaseDate.Equal(*tc.input.ReleaseDate.Value))
				}
			}
		})
	}
}

func TestEpisodeVersionDatePatchDoesNotBlockUnrelatedMetadata(t *testing.T) {
	pool, _ := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, "UPDATE release_versions SET production_started_on='2020-03-01' WHERE id=10")
	require.NoError(t, err)
	title := "Unrelated correction"
	got, err := repository.NewEpisodeVersionRepository(pool).Update(ctx, 100, models.EpisodeVersionPatchInput{Title: models.OptionalString{Set: true, Value: &title}})
	require.NoError(t, err)
	require.Equal(t, &title, got.Title)
}

func TestEpisodeVersionDatePatchConcurrentPartialUpdates(t *testing.T) {
	fixture, _ := openEpisodeVersionPublicFixture(t)
	cfg := fixture.Config()
	cfg.MaxConns = 4
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	require.NoError(t, err)
	defer pool.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	repo := repository.NewEpisodeVersionRepository(pool)
	inputs := []models.EpisodeVersionPatchInput{
		{ProductionStartedOn: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-01-20T00:00:00Z")}},
		{ReleaseDate: models.OptionalTime{Set: true, Value: dateFixtureTime("2020-01-10T00:00:00Z")}},
	}
	start := make(chan struct{})
	outcomes := make(chan error, 2)
	var wg sync.WaitGroup
	for _, input := range inputs {
		wg.Add(1)
		go func(input models.EpisodeVersionPatchInput) {
			defer wg.Done()
			<-start
			_, err := repo.Update(ctx, 100, input)
			outcomes <- err
		}(input)
	}
	close(start)
	wg.Wait()
	close(outcomes)
	rejected, succeeded := 0, 0
	for err := range outcomes {
		if errors.Is(err, models.ErrEpisodeVersionDateOrder) {
			rejected++
		} else {
			require.NoError(t, err)
			succeeded++
		}
	}
	require.Equal(t, 1, rejected)
	require.Equal(t, 1, succeeded)
	got, err := repo.GetByID(ctx, 100)
	require.NoError(t, err)
	require.NoError(t, models.ValidateEpisodeVersionDates(got.ProductionStartedOn, got.ReleaseDate))
}

func datePatchRequest(pool *pgxpool.Pool, body string, authenticated bool) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	h := handlers.NewFansubHandler(repository.NewFansubRepository(pool), repository.NewEpisodeVersionRepository(pool), nil, "admin", handlers.FansubProxyConfig{})
	c, w := func() (*gin.Context, *httptest.ResponseRecorder) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		return c, w
	}()
	c.Request = httptest.NewRequest("PATCH", "/episode-versions/100", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "versionId", Value: "100"}}
	if authenticated {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 7, DisplayName: "Date fixture", AppUserID: 7, AppUserStatus: "active", IsPlatformAdmin: true})
	}
	h.UpdateEpisodeVersion(c)
	return w
}

func TestEpisodeVersionDatePatchHTTPValidation(t *testing.T) {
	pool, _ := openEpisodeVersionPublicFixture(t)
	for _, body := range []string{
		`{"production_started_on":"2020-03-01T00:00:00Z"}`,
		`{"release_date":"2019-12-31T00:00:00Z"}`,
		`{"production_started_on":"2020-03-01T00:00:00Z","release_date":"2020-02-28T00:00:00Z"}`,
	} {
		got := datePatchRequest(pool, body, true)
		require.Equal(t, 400, got.Code, got.Body.String())
		var result struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		require.NoError(t, json.Unmarshal(got.Body.Bytes(), &result))
		require.Equal(t, models.ErrEpisodeVersionDateOrder.Error(), result.Error.Message)
	}
	got := datePatchRequest(pool, `{"production_started_on":"2020-02-01T23:00:00Z","release_date":"2020-02-01T00:00:00Z"}`, true)
	require.Equal(t, 200, got.Code, got.Body.String())
	require.Equal(t, 401, datePatchRequest(pool, `{"release_date":null}`, false).Code)
}

func openDateNeighborsFixture(t *testing.T) (*pgxpool.Pool, *episodePublicTracer) {
	pool, tr := openEpisodeVersionPublicFixture(t)
	_, err := pool.Exec(context.Background(), `
        INSERT INTO anime(id) VALUES (77),(78);
        INSERT INTO fansub_groups(id,name) VALUES (71,'Own A'),(72,'Own B'),(73,'Foreign');
        INSERT INTO episodes(id,anime_id,episode_number) VALUES
            (701,77,'01'),(702,77,'2'),(703,77,'3'),(704,77,'4'),(705,77,'5'),(706,77,'06'),
            (707,77,'SP'),(708,78,'1');
        INSERT INTO fansub_releases(id,episode_id,release_date) VALUES
            (801,701,NULL),(802,702,NULL),(803,703,NULL),(804,704,NULL),(805,705,NULL),(806,706,'2013-07-21'),
            (807,707,NULL),(808,708,NULL);
        INSERT INTO release_versions(id,release_id,version,production_started_on,release_date) VALUES
            (501,801,'v1','2013-07-18','2013-07-20'),(502,802,'v1',NULL,NULL),(503,803,' v1 ',NULL,NULL),
            (504,804,'v1',NULL,NULL),(505,805,'v1',NULL,NULL),(506,806,'v1','2013-07-19',NULL),
            (507,807,'v1','1900-01-01','1900-01-01'),(508,808,'v1','2099-01-01','2099-01-01'),
            (509,801,'v2','2099-01-01','2099-01-01'),(510,806,'V1','1900-01-01','1900-01-01'),
            (511,801,'v1','2099-01-01','2099-01-01');
        INSERT INTO release_version_groups VALUES (501,71),(502,71),(503,71),(503,72),(504,71),(505,71),(506,71),
            (507,71),(508,71),(509,71),(510,71),(511,73);
        INSERT INTO release_variants(id,release_version_id,duration_seconds) VALUES (10503,503,1440),(503,508,1440);
    `)
	require.NoError(t, err)
	tr.reset()
	return pool, tr
}

func neighborMap(items []models.EpisodeVersionDateNeighbor) map[string]models.EpisodeVersionDateNeighbor {
	result := map[string]models.EpisodeVersionDateNeighbor{}
	for _, item := range items {
		result[fmt.Sprintf("%d/%s/%s", item.FansubGroupID, item.Field, item.Direction)] = item
	}
	return result
}

func TestEpisodeVersionDateNeighborsGapsScopeIdentityAndUTC(t *testing.T) {
	pool, tr := openDateNeighborsFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	// Resolve route alias first, then pass only the explicit canonical owner.
	resolved, err := repo.GetByID(ctx, 10503)
	require.NoError(t, err)
	require.EqualValues(t, 503, resolved.ReleaseVersionID)
	require.EqualValues(t, 10503, resolved.VariantID)
	tr.reset()
	got, err := repo.ListDateNeighbors(ctx, resolved.ReleaseVersionID)
	require.NoError(t, err)
	require.Len(t, got, 4)
	require.Len(t, tr.queries, 1)
	m := neighborMap(got)
	require.Equal(t, models.EpisodeVersionDateNeighbor{FansubGroupID: 71, Field: "production_started_on", Direction: "previous", ReleaseVersionID: 501, EpisodeNumber: "01", Date: "2013-07-18"}, m["71/production_started_on/previous"])
	require.Equal(t, models.EpisodeVersionDateNeighbor{FansubGroupID: 71, Field: "production_started_on", Direction: "next", ReleaseVersionID: 506, EpisodeNumber: "06", Date: "2013-07-19"}, m["71/production_started_on/next"])
	require.Equal(t, "2013-07-20", m["71/release_date/previous"].Date)
	require.Equal(t, "2013-07-21", m["71/release_date/next"].Date, "effective release-level fallback remains the same as the editor")
	_, err = pool.Exec(ctx, "UPDATE release_versions SET production_started_on='2013-07-19T00:30:00+02:00' WHERE id=501")
	require.NoError(t, err)
	got, err = repo.ListDateNeighbors(ctx, 503)
	require.NoError(t, err)
	require.Equal(t, "2013-07-18", neighborMap(got)["71/production_started_on/previous"].Date, "UTC day agrees with frontend date projection")
}

func TestEpisodeVersionDateNeighborsExtremaTieBreakAndRowBudget(t *testing.T) {
	pool, tr := openDateNeighborsFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	_, err := pool.Exec(ctx, `
        UPDATE release_versions SET production_started_on='2013-07-20' WHERE id=501;
        UPDATE release_versions SET production_started_on='2013-07-19' WHERE id=502;
        INSERT INTO release_version_groups SELECT id,72 FROM release_versions WHERE id IN (501,502,506);
    `)
	require.NoError(t, err)
	tr.reset()
	got, err := repo.ListDateNeighbors(ctx, 503)
	require.NoError(t, err)
	require.Len(t, got, 8)
	require.EqualValues(t, 501, neighborMap(got)["71/production_started_on/previous"].ReleaseVersionID, "most restrictive earlier date wins rather than just nearest episode")
	require.Len(t, tr.queries, 1)
	require.EqualValues(t, 8, tr.queries[0].Rows)
	_, err = pool.Exec(ctx, `
        UPDATE release_versions SET production_started_on='2013-07-20' WHERE id=502;
        INSERT INTO release_versions(id,release_id,version,production_started_on) VALUES(512,802,'v1','2013-07-20');
        INSERT INTO release_version_groups VALUES(512,71);
        INSERT INTO episodes(id,anime_id,episode_number) SELECT 10000+n,77,(10+n)::text FROM generate_series(1,100) n;
        INSERT INTO fansub_releases(id,episode_id) SELECT 20000+n,10000+n FROM generate_series(1,100) n;
        INSERT INTO release_versions(id,release_id,version,production_started_on,release_date)
            SELECT 30000+n,20000+n,'v1','2020-01-01','2020-01-02' FROM generate_series(1,100) n;
        INSERT INTO release_version_groups SELECT 30000+n,g FROM generate_series(1,100)n CROSS JOIN (VALUES(71),(72))groups(g);
    `)
	require.NoError(t, err)
	tr.reset()
	got, err = repo.ListDateNeighbors(ctx, 503)
	require.NoError(t, err)
	require.EqualValues(t, 502, neighborMap(got)["71/production_started_on/previous"].ReleaseVersionID, "closest episode and then lower real version ID breaks equal-day ties")
	require.Len(t, got, 8)
	require.Len(t, tr.queries, 1)
	require.EqualValues(t, 8, tr.queries[0].Rows)
	require.EqualValues(t, 506, neighborMap(got)["71/production_started_on/next"].ReleaseVersionID, "earliest following date wins")
	t.Log("date neighbors: one SQL statement and <=4 rows per persisted group for small and +100-release inventory")
}

func TestEpisodeVersionDateNeighborsEmptyOneSideAndFailure(t *testing.T) {
	pool, _ := openDateNeighborsFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	empty, err := repo.ListDateNeighbors(ctx, 10503)
	require.NoError(t, err)
	require.NotNil(t, empty)
	require.Empty(t, empty, "variant aliases are not accepted as canonical owners")
	_, err = pool.Exec(ctx, `UPDATE release_versions SET production_started_on=NULL,release_date=NULL WHERE id IN (506); UPDATE fansub_releases SET release_date=NULL WHERE id=806`)
	require.NoError(t, err)
	got, err := repo.ListDateNeighbors(ctx, 503)
	require.NoError(t, err)
	require.Len(t, got, 2)
	for _, item := range got {
		require.Equal(t, "previous", item.Direction)
	}
	_, err = pool.Exec(ctx, `UPDATE release_versions SET production_started_on=NULL,release_date=NULL WHERE id=501`)
	require.NoError(t, err)
	got, err = repo.ListDateNeighbors(ctx, 503)
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Empty(t, got)
	raw, err := json.Marshal(models.EpisodeVersionEditorContext{DateNeighbors: got})
	require.NoError(t, err)
	require.Contains(t, string(raw), `"date_neighbors":[]`)
	_, err = pool.Exec(ctx, `ALTER TABLE release_versions RENAME COLUMN production_started_on TO hidden_test_start`)
	require.NoError(t, err)
	got, err = repo.ListDateNeighbors(ctx, 503)
	require.Error(t, err)
	require.Nil(t, got, "lookup failure is never represented as successful empty anchors")
}

// Permission behavior itself is established coverage. This scoped resolver only
// grants an existing group-lead role so both real editor projections are exercised.
type dateEditorResolver struct{ permissions.Resolver }

func (dateEditorResolver) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{71, 72}}, nil
}
func (dateEditorResolver) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return []string{permissions.RoleFansubLead}, nil
}
func (dateEditorResolver) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

// Fixture-scoped explicit grants avoid mutating the process-global role cache.
func (dateEditorResolver) ResolveActorUserOverrides(_ context.Context, _ int64, _ int64) ([]permissions.UserCapabilityOverride, error) {
	return []permissions.UserCapabilityOverride{
		{ActionCode: permissions.ActionReleaseVersionView, Effect: "allow"},
		{ActionCode: permissions.ActionReleaseVersionMediaView, Effect: "allow"},
		{ActionCode: permissions.ActionReleaseVersionNotesWrite, Effect: "allow"},
	}, nil
}

type dateContextTracer struct {
	*episodePublicTracer
	failAnchors bool
}

func (tr *dateContextTracer) TraceQueryStart(ctx context.Context, conn *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	ctx = tr.episodePublicTracer.TraceQueryStart(ctx, conn, data)
	if tr.failAnchors && strings.Contains(data.SQL, "WITH current_version AS") {
		var cancel context.CancelFunc
		ctx, cancel = context.WithCancel(ctx)
		cancel()
	}
	return ctx
}

func TestEpisodeVersionDateEditorContextBothSurfacesAndFailure(t *testing.T) {
	fixture, tr := openDateNeighborsFixture(t)
	_, err := fixture.Exec(context.Background(), `
        -- GAP-23 (165-UAT.md): anime.title already exists via openEpisodeVersionPublicFixture
        -- (publicReleaseNameSQL's filmTitleSQL reads it) -- only set the fixture's own default here.
        ALTER TABLE anime ALTER COLUMN title SET DEFAULT 'Date fixture';
        ALTER TABLE anime ADD COLUMN title_de TEXT,
            ADD COLUMN title_en TEXT,ADD COLUMN source TEXT,ADD COLUMN folder_name TEXT,
            ADD COLUMN year SMALLINT,ADD COLUMN max_episodes SMALLINT,ADD COLUMN description TEXT,ADD COLUMN cover_image TEXT;
        CREATE TABLE anime_source_links(anime_id BIGINT,source TEXT);
    `)
	require.NoError(t, err)
	tracer := &dateContextTracer{episodePublicTracer: tr}
	cfg := fixture.Config()
	cfg.ConnConfig.Tracer = tracer
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	require.NoError(t, err)
	defer pool.Close()
	h := handlers.NewAdminContentHandler(repository.NewAdminContentRepository(pool), nil, nil,
		repository.NewEpisodeVersionRepository(pool), nil, nil, "admin", "", handlers.AdminContentJellyfinConfig{}, handlers.AdminContentAssetSearchConfig{})
	h.WithPermissionDeps(permissions.NewService(dateEditorResolver{}), nil)
	request := func(admin bool, id string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/episode-versions/"+id+"/editor", nil)
		c.Params = gin.Params{{Key: "versionId", Value: id}}
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 7, DisplayName: "Date fixture", AppUserID: 7, AppUserStatus: "active", IsPlatformAdmin: admin})
		h.GetEpisodeVersionEditorContext(c)
		return w
	}
	for _, admin := range []bool{true, false} {
		t.Run(fmt.Sprintf("admin=%t", admin), func(t *testing.T) {
			tracer.failAnchors = false
			tr.reset()
			response := request(admin, "10503")
			require.Equal(t, 200, response.Code, response.Body.String())
			var envelope struct {
				Data models.EpisodeVersionEditorContext `json:"data"`
			}
			require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
			require.EqualValues(t, 10503, envelope.Data.Version.VariantID)
			require.EqualValues(t, 503, envelope.Data.Version.ReleaseVersionID)
			require.Len(t, envelope.Data.SelectedGroups, 2)
			require.Len(t, envelope.Data.DateNeighbors, 4)
			require.EqualValues(t, 501, neighborMap(envelope.Data.DateNeighbors)["71/production_started_on/previous"].ReleaseVersionID)
			count := 0
			for _, query := range tr.queries {
				if strings.Contains(query.SQL, "WITH current_version AS") {
					count++
				}
			}
			require.Equal(t, 1, count, "shared admin/contributor context adds exactly one anchor statement")
			tracer.failAnchors = true
			failed := request(admin, "10503")
			require.Equal(t, 500, failed.Code, failed.Body.String())
			require.NotContains(t, failed.Body.String(), `"date_neighbors":[]`, "failed anchor query cannot masquerade as empty confirmed context")
			tracer.failAnchors = false
			missing := request(admin, "999999")
			require.Equal(t, 404, missing.Code, missing.Body.String())
		})
	}
}
