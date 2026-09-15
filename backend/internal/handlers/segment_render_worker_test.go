package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"net/http/httptest"
	"strings"
	"testing"
 "time"
 "team4s.v3/backend/internal/services"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeSegmentStreamThemeRepo implementiert segmentStreamThemeRepository (und via eingebettetem
// adminThemeRepository das breitere Handler-Feld), damit RenderSegment ohne echte DB getestet
// werden kann. Nicht gesetzte Funktionsfelder liefern ErrNotFound bzw. bleiben no-op.
type fakeSegmentStreamThemeRepo struct {
	adminThemeRepository

	source     *models.ThemeSegmentRenderSource
	readyCache *models.ThemeSegmentRenderCache

	upsertCalled bool
	upsertResult *models.ThemeSegmentRenderCache
	upsertErr    error

	upsertInputs []models.ThemeSegmentRenderCacheUpsertInput
 cacheLookups []string
 failureCodes []string
 readyInputs []models.ThemeSegmentRenderCacheReadyInput
 claimCalled bool
	failureMessages []string
}

func (f *fakeSegmentStreamThemeRepo) GetThemeSegmentRenderSource(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderSource, error) {
	if f.source == nil {
		return nil, repository.ErrNotFound
	}
	copy := *f.source
 return &copy, nil
}

func (f *fakeSegmentStreamThemeRepo) GetThemeSegmentRenderCacheByKey(ctx context.Context, cacheKey string) (*models.ThemeSegmentRenderCache, error) {
 f.cacheLookups=append(f.cacheLookups,cacheKey)
 if f.readyCache!=nil && f.readyCache.CacheKey==cacheKey {return f.readyCache,nil}
 return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) GetReadyThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	if f.readyCache != nil {
		return f.readyCache, nil
	}
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) GetLatestThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) ListThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) ([]models.ThemeSegmentRenderCache, error) {
	return nil, nil
}

func (f *fakeSegmentStreamThemeRepo) DeleteThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) (int64, error) {
	return 0, nil
}

func (f *fakeSegmentStreamThemeRepo) UpsertThemeSegmentRenderCacheQueued(ctx context.Context, input models.ThemeSegmentRenderCacheUpsertInput) (*models.ThemeSegmentRenderCache, error) {
	f.upsertCalled = true
 f.upsertInputs=append(f.upsertInputs,input)
	if f.upsertErr != nil {
		return nil, f.upsertErr
	}
	if f.upsertResult != nil {
		return f.upsertResult, nil
	}
	return &models.ThemeSegmentRenderCache{
		ID:             1,
		ThemeSegmentID: input.ThemeSegmentID,
		CacheKey:       input.CacheKey,
 SourceFingerprint:input.SourceFingerprint,
		SourceKind:     input.SourceKind,
		Status:         models.ThemeSegmentRenderStatusQueued,
	}, nil
}

func (f *fakeSegmentStreamThemeRepo) ClaimNextQueuedThemeSegmentRender(ctx context.Context) (*models.ThemeSegmentRenderCache, error) {
	f.claimCalled = true
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) MarkThemeSegmentRenderCacheReady(ctx context.Context, input models.ThemeSegmentRenderCacheReadyInput) error {
 f.readyInputs=append(f.readyInputs,input)
 return nil
}

func (f *fakeSegmentStreamThemeRepo) MarkThemeSegmentRenderCacheFailed(ctx context.Context, cacheKey string, errorCode string, errorMessage string) error {
	f.failureCodes=append(f.failureCodes,errorCode)
 f.failureMessages=append(f.failureMessages,errorMessage)
	return nil
}

func segmentRenderTestSource() *models.ThemeSegmentRenderSource {
	start := int32(10)
	end := int32(30)
	streamURL := "https://jellyfin.example/stream"
	return &models.ThemeSegmentRenderSource{
		SegmentID:          42,
		PlaybackSourceID:   7,
		SourceKind:         "jellyfin_theme",
		StartOffsetSeconds: &start,
		EndOffsetSeconds:   &end,
		StreamURL:          &streamURL,
	}
}

// TestRenderSegment_ReturnsAcceptedAndDoesNotRenderInline verifiziert, dass RenderSegment nur
// noch enqueued (202 + queued-Status) und KEIN ffmpeg inline ausfuehrt. Der Fake-Repo hat keinen
// ffmpeg-Pfad konfiguriert; wuerde synchron gerendert, wuerde der Handler mit einem ffmpeg-Fehler
// (409/500) statt 202 antworten.
func TestRenderSegment_ReturnsAcceptedAndDoesNotRenderInline(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repoStub := &fakeSegmentStreamThemeRepo{source: segmentRenderTestSource()}
	handler := &AdminContentHandler{
		themeRepo:               repoStub,
		segmentRenderEnabled:    true,
		segmentRenderDir:        t.TempDir(),
		segmentRenderMaxSeconds: 300,
		segmentRenderFFmpegPath: "/nonexistent/ffmpeg-should-never-run",
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusAccepted {
		t.Fatalf("expected 202 Accepted, got %d (body=%s)", recorder.Code, recorder.Body.String())
	}
	if !repoStub.upsertCalled {
		t.Fatal("expected UpsertThemeSegmentRenderCacheQueued to be called")
	}
	if repoStub.claimCalled {
		t.Fatal("RenderSegment must not claim/render inline; the background worker owns that")
	}

	var payload struct {
		Data models.ThemeSegmentRenderCache `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Data.Status != models.ThemeSegmentRenderStatusQueued {
		t.Fatalf("expected queued status in response, got %q", payload.Data.Status)
	}
}

// TestRenderSegment_UploadedAssetSourceRejected verifiziert, dass hochgeladene Segment-Quellen
// weiterhin sofort mit 409 abgelehnt werden, ohne die Queue zu beruehren.
func TestRenderSegment_UploadedAssetSourceRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)

	source := segmentRenderTestSource()
	source.SourceKind = "uploaded_asset"
	repoStub := &fakeSegmentStreamThemeRepo{source: source}
	handler := &AdminContentHandler{
		themeRepo:            repoStub,
		segmentRenderEnabled: true,
		segmentRenderDir:     t.TempDir(),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict, got %d (body=%s)", recorder.Code, recorder.Body.String())
	}
	if repoStub.upsertCalled {
		t.Fatal("uploaded_asset sources must not be enqueued for rendering")
	}
}

// TestRenderSegment_DisabledReturnsServiceUnavailable verifiziert das bestehende Verhalten,
// dass ein deaktiviertes Segment-Rendering weiterhin 503 liefert.
func TestRenderSegment_DisabledReturnsServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repoStub := &fakeSegmentStreamThemeRepo{source: segmentRenderTestSource()}
	handler := &AdminContentHandler{
		themeRepo:            repoStub,
		segmentRenderEnabled: false,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
}

// fakeAttachLibraryAssetThemeRepo implementiert adminThemeRepository UND
// segmentStreamThemeRepository (via eingebettetem adminThemeRepository fuer die ungenutzten
// Methoden), um AttachSegmentLibraryAsset (Plan 117-04 Task 2, RESEARCH.md Risk 5) ohne echte DB
// zu testen: beweist, dass der Handler nach einem erfolgreichen Attach fuer JEDE zugewiesene
// Release-Version einen Render-Cache-Eintrag im Status 'queued' einreiht -- vor Plan 117-04 loeste
// AttachSegmentLibraryAsset ueberhaupt keinen Invalidierungslauf aus.
type fakeAttachLibraryAssetThemeRepo struct {
	adminThemeRepository

	segment            *models.AdminThemeSegment
	assignedVersionIDs []int64
	source             *models.ThemeSegmentRenderSource

	upsertedReleaseVersionIDs []int64
}

func (f *fakeAttachLibraryAssetThemeRepo) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	if f.segment == nil {
		return nil, repository.ErrNotFound
	}
	return f.segment, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) AttachSegmentLibraryAsset(ctx context.Context, animeID int64, segmentID int64, input models.SegmentLibraryAttachInput) (*models.AdminThemeSegment, error) {
	return f.segment, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error) {
	return f.assignedVersionIDs, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) GetThemeSegmentRenderSource(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderSource, error) {
	if f.source == nil {
		return nil, repository.ErrNotFound
	}
	cloned := *f.source
	cloned.ReleaseVersionID = &releaseVersionID
	return &cloned, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) GetThemeSegmentRenderCacheByKey(ctx context.Context, cacheKey string) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeAttachLibraryAssetThemeRepo) GetReadyThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeAttachLibraryAssetThemeRepo) GetLatestThemeSegmentRenderCache(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeAttachLibraryAssetThemeRepo) ListThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) ([]models.ThemeSegmentRenderCache, error) {
	return nil, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) DeleteThemeSegmentRenderCaches(ctx context.Context, segmentID int64, releaseVersionID int64) (int64, error) {
	return 0, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) UpsertThemeSegmentRenderCacheQueued(ctx context.Context, input models.ThemeSegmentRenderCacheUpsertInput) (*models.ThemeSegmentRenderCache, error) {
	if input.ReleaseVersionID != nil {
		f.upsertedReleaseVersionIDs = append(f.upsertedReleaseVersionIDs, *input.ReleaseVersionID)
	}
	return &models.ThemeSegmentRenderCache{
		ID:             int64(len(f.upsertedReleaseVersionIDs)),
		ThemeSegmentID: input.ThemeSegmentID,
		CacheKey:       input.CacheKey,
		SourceKind:     input.SourceKind,
		Status:         models.ThemeSegmentRenderStatusQueued,
	}, nil
}

func (f *fakeAttachLibraryAssetThemeRepo) ClaimNextQueuedThemeSegmentRender(ctx context.Context) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeAttachLibraryAssetThemeRepo) MarkThemeSegmentRenderCacheReady(ctx context.Context, input models.ThemeSegmentRenderCacheReadyInput) error {
	return nil
}

func (f *fakeAttachLibraryAssetThemeRepo) MarkThemeSegmentRenderCacheFailed(ctx context.Context, cacheKey string, errorCode string, errorMessage string) error {
	return nil
}

// TestAttachSegmentLibraryAsset_QueuesRenderForAllAssignedReleaseVersions ist der
// Regressionstest fuer RESEARCH.md Risk 5 (Plan 117-04 Task 2/3): vor diesem Plan loeste
// AttachSegmentLibraryAsset ueberhaupt keinen Render-Invalidierungslauf aus, obwohl es die
// gemeinsame Wiedergabequelle des Segments aendert.
func TestAttachSegmentLibraryAsset_QueuesRenderForAllAssignedReleaseVersions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	segment := &models.AdminThemeSegment{ID: 7, AnimeID: 1, Version: "v1"}
	start := int32(10)
	end := int32(40)
	streamURL := "https://jellyfin.example/stream"
	source := &models.ThemeSegmentRenderSource{
		SegmentID:          7,
		PlaybackSourceID:   99,
		SourceKind:         "episode_version",
		StartOffsetSeconds: &start,
		EndOffsetSeconds:   &end,
		StreamURL:          &streamURL,
	}

	repoStub := &fakeAttachLibraryAssetThemeRepo{
		segment:            segment,
		assignedVersionIDs: []int64{101, 102, 103},
		source:             source,
	}
	handler := &AdminContentHandler{
		themeRepo:            repoStub,
		segmentRenderEnabled: true,
		segmentRenderDir:     t.TempDir(),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/1/segments/7/reuse", strings.NewReader(`{"asset_id":42}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "segmentId", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.AttachSegmentLibraryAsset(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d (body=%s)", recorder.Code, recorder.Body.String())
	}
	if len(repoStub.upsertedReleaseVersionIDs) != len(repoStub.assignedVersionIDs) {
		t.Fatalf("expected a queued render cache entry for each of the %d assigned release versions, got %d (%v)",
			len(repoStub.assignedVersionIDs), len(repoStub.upsertedReleaseVersionIDs), repoStub.upsertedReleaseVersionIDs)
	}
	for _, releaseVersionID := range repoStub.assignedVersionIDs {
		found := false
		for _, upserted := range repoStub.upsertedReleaseVersionIDs {
			if upserted == releaseVersionID {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected release_version_id=%d to have a queued render cache entry, upserted=%v", releaseVersionID, repoStub.upsertedReleaseVersionIDs)
		}
	}
}

func TestFFmpegWorkerUsesSeparateAuthAndRedactsFailures(t *testing.T) {
 dir:=t.TempDir()
 binary:=filepath.Join(dir,"fixture-ffmpeg")
 script := "#!/bin/sh\ncase \"$*\" in *'Authorization: MediaBrowser Token=\"worker-private-token\"'*) ;; *) exit 7 ;; esac\ncase \"$*\" in *'api_key='*) exit 8 ;; esac\nprintf '%s\\n' 'Authorization: MediaBrowser Token=\"worker-private-token\" failure' >&2\nexit 1\n"
 if err:=os.WriteFile(binary,[]byte(script),0700);err!=nil {t.Fatal(err)}
 source:=segmentRenderTestSource()
 stream:="https://jellyfin.example/stream?api_key=worker-private-token"
 source.StreamURL=&stream
 repo:=&fakeSegmentStreamThemeRepo{source:source}
 h:=&AdminContentHandler{themeRepo:repo,jellyfinBaseURL:"https://jellyfin.example",jellyfinAPIKey:"worker-private-token",segmentRenderDir:dir,segmentRenderFFmpegPath:binary}
 err:=h.executeSegmentRender(context.Background(),&models.ThemeSegmentRenderCache{CacheKey:"fixture",ThemeSegmentID:42},source)
 if err==nil||len(repo.failureMessages)!=1 {t.Fatal("expected controlled render failure")}
 message:=repo.failureMessages[0]
 if !strings.Contains(message,"[REDACTED]")||strings.Contains(message,"worker-private-token")||strings.Contains(err.Error(),"worker-private-token") {t.Fatal("worker authentication missing or failure not sanitized")}
}

func TestSegmentSourceIdentityActualQueueAndCachedIsolation(t *testing.T) {
 gin.SetMode(gin.TestMode)
 item,provider,oldURL:="item","jellyfin","http://jellyfin.invalid/old"
 version:=int64(17)
 source:=segmentRenderTestSource()
 source.SourceKind="episode_version";source.StreamProvider=&provider;source.StreamExternalID=&item;source.StreamURL=&oldURL;source.ReleaseVersionID=&version
 source.JellyfinSource=&models.JellyfinSourceSnapshot{Version:1,MediaSourceID:"A"}
 repo:=&fakeSegmentStreamThemeRepo{source:source}
 h:=&AdminContentHandler{themeRepo:repo,jellyfinBaseURL:"http://jellyfin.invalid",jellyfinAPIKey:"fixture",segmentRenderEnabled:true,segmentRenderDir:t.TempDir(),segmentGrantSecret:"secret",segmentGrantTTL:time.Minute}
 a,err:=h.buildQueuedSegmentRenderCache(context.Background(),repo,42,source)
 if err!=nil {t.Fatal(err)}
 repo.readyCache=&models.ThemeSegmentRenderCache{ThemeSegmentID:42,ReleaseVersionID:&version,CacheKey:a.CacheKey,SourceFingerprint:a.SourceFingerprint,Status:models.ThemeSegmentRenderStatusReady}
 source.JellyfinSource=&models.JellyfinSourceSnapshot{Version:1,MediaSourceID:"B"}
 source.MediaSourceID=nil
 w:=httptest.NewRecorder();c,_:=gin.CreateTestContext(w)
 c.Request=httptest.NewRequest("POST","/segments/42/render?release_version_id=17",nil);c.Params=gin.Params{{Key:"id",Value:"42"}}
 c.Set("auth_identity",middleware.AuthIdentity{UserID:1,AppUserID:1,DisplayName:"Admin",IsPlatformAdmin:true})
 h.RenderSegment(c)
 if w.Code!=202 || len(repo.upsertInputs)!=2 {t.Fatalf("queue: %d %s",w.Code,w.Body)}
 b:=repo.upsertInputs[1]
 if a.CacheKey==b.CacheKey || a.SourceFingerprint==b.SourceFingerprint {t.Fatal("A and B shared cache identity")}
 for _,public:=range []bool{true,false} {
  var result *httptest.ResponseRecorder
  if public {result=publicSegmentGrantContext(h,"/segments/42/grant?release_version_id=17")} else {result=segmentGrantContext(t,h,"/segments/42/grant?release_version_id=17",true)}
  if result.Code!=409 {t.Fatalf("cached A leaked into B grant: %d",result.Code)}
 }
 if len(repo.cacheLookups)!=2 || repo.cacheLookups[0]!=b.CacheKey || repo.cacheLookups[1]!=b.CacheKey {t.Fatalf("lookup happened before source identity: %v",repo.cacheLookups)}
}

func TestSegmentRenderWorkerRejectsSourceDriftBeforeFFmpeg(t *testing.T) {
 metadata:=0
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  metadata++
  w.Write([]byte(`{"Items":[{"Id":"item","MediaSources":[{"Id":"B","Path":"/B","MediaStreams":[]}]}]}`))
 }))
 defer server.Close()
 item,provider:="item","jellyfin"
 source:=segmentRenderTestSource()
 source.SourceKind="episode_version";source.StreamExternalID=&item;source.StreamProvider=&provider
 source.JellyfinSource=&models.JellyfinSourceSnapshot{Version:1,MediaSourceID:"B",SourcePath:"/B"}
 repo:=&fakeSegmentStreamThemeRepo{source:source}
 h:=&AdminContentHandler{themeRepo:repo,jellyfinBaseURL:server.URL,jellyfinAPIKey:"fixture",httpClient:server.Client(),segmentRenderDir:t.TempDir(),segmentRenderFFmpegPath:"/must-not-run"}
 cache:=&models.ThemeSegmentRenderCache{CacheKey:"cached-A",ThemeSegmentID:42,SourceFingerprint:"jellyfin:4:item:A"}
 if err:=h.executeSegmentRender(context.Background(),cache,source);err==nil {t.Fatal("expected drift failure")}
 if metadata!=1 || len(repo.failureCodes)!=1 || repo.failureCodes[0]!="segment_source_stale" || len(repo.readyInputs)!=0 {t.Fatalf("drift was not rejected before FFmpeg: %v metadata=%d",repo.failureCodes,metadata)}
}

func TestSegmentRenderWorkerSelectedVideoAndSubtitleSingleRead(t *testing.T) {
 metadata,subtitles:=0,0
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path=="/Items" {metadata++;w.Write([]byte(`{"Items":[{"Id":"item","Path":"/A","MediaSources":[{"Id":"A","Path":"/A","MediaStreams":[{"Index":2,"Type":"Subtitle","Codec":"ass"}]},{"Id":"B","Path":"/B","MediaStreams":[{"Index":8,"Type":"Subtitle","Codec":"ass"}]}]}]}`));return}
  if r.URL.Path=="/Videos/item/B/Subtitles/8/Stream.ass" {subtitles++;w.Write([]byte("[Script Info]"));return}
  t.Errorf("unexpected request %s",r.URL.Path)
 }))
 defer server.Close()
 dir:=t.TempDir();binary:=filepath.Join(dir,"ffmpeg-fixture")
 script:="#!/bin/sh\ncase \"$*\" in *'MediaSourceId=B'*'subtitles='*) exit 0;; *) exit 5;; esac\n"
 if err:=os.WriteFile(binary,[]byte(script),0700);err!=nil {t.Fatal(err)}
 item,provider:="item","jellyfin"
 source:=segmentRenderTestSource();source.SourceKind="episode_version";source.StreamExternalID=&item;source.StreamProvider=&provider
 source.JellyfinSource=&models.JellyfinSourceSnapshot{Version:1,MediaSourceID:"B",SourcePath:"/B"}
 repo:=&fakeSegmentStreamThemeRepo{source:source}
 h:=&AdminContentHandler{themeRepo:repo,jellyfinBaseURL:server.URL,jellyfinAPIKey:"fixture",httpClient:server.Client(),segmentRenderDir:dir,segmentRenderFFmpegPath:binary}
 cache:=&models.ThemeSegmentRenderCache{CacheKey:"cached-B",ThemeSegmentID:42,SourceFingerprint:"jellyfin:4:item:B"}
 if err:=h.executeSegmentRender(context.Background(),cache,source);err!=nil {t.Fatal(err)}
 if metadata!=1 || subtitles!=1 || len(repo.readyInputs)!=1 || *repo.readyInputs[0].SubtitleStreamIndex!=8 {t.Fatalf("mixed source/fanout metadata=%d subtitles=%d ready=%v",metadata,subtitles,repo.readyInputs)}
 // The existing service hashes exactly the prepared selected-source fingerprint.
 a,_:=services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{SegmentID:42,SourceKind:"episode_version",SourceIdentity:"jellyfin:4:item:A",StartSeconds:10,EndSeconds:30})
 b,_:=services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{SegmentID:42,SourceKind:"episode_version",SourceIdentity:cache.SourceFingerprint,StartSeconds:10,EndSeconds:30})
 if a==b {t.Fatal("same key")}
}
