---
phase: quick-260915-dws
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
  - backend/internal/handlers/admin_content_episode_version_editor_context_test.go
  - backend/internal/models/episode_version.go
  - shared/contracts/openapi.yaml
  - frontend/src/types/episodeVersion.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.module.css
  - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
autonomous: true
requirements: [QUICK-260915-DWS-01, QUICK-260915-DWS-02, QUICK-260915-DWS-03, QUICK-260915-DWS-04]

must_haves:
  truths:
    - "GET /api/v1/admin/episode-versions/:versionId/editor-context returns 200 (never 500) for a platform admin, even when Jellyfin is configured but the upstream call fails (401/403/5xx/timeout/network error) while resolving the folder path."
    - "In that failure case, anime_folder_path in the response falls back to the anime source's stored folder_name, exactly like the existing 'Jellyfin not configured' case — and the response carries jellyfin_enrichment_degraded: true, with a server log line naming the upstream error."
    - "When Jellyfin is not configured at all, or when Jellyfin succeeds, behavior and response shape are byte-identical to before this plan (jellyfin_enrichment_degraded is false/absent in both cases)."
    - "POST /api/v1/admin/episode-versions/:versionId/scan (which functionally requires Jellyfin) still fails on the same Jellyfin outage, but with a clear 502 and a German message, never a blanket 500."
    - "An admin viewing the editor page during a Jellyfin outage sees a subtle German-language notice using only global UI primitives / plain existing-pattern markup, with real umlauts, and no new CSS design tokens; the notice is absent when Jellyfin is simply not configured."
  artifacts:
    - path: "backend/internal/handlers/admin_content_episode_version_editor_helpers.go"
      provides: "resolveEpisodeVersionFolderPath tolerates any Jellyfin upstream error (mirrors resolveEpisodeVersionDuration's existing tolerance pattern) and reports a jellyfinEnrichmentDegraded bool up through resolveEpisodeVersionEditor into loadEpisodeVersionEditorContext"
    - path: "backend/internal/models/episode_version.go"
      provides: "EpisodeVersionEditorContext.JellyfinEnrichmentDegraded bool \`json:\"jellyfin_enrichment_degraded,omitempty\"\`"
    - path: "backend/internal/handlers/admin_content_episode_version_editor_context_test.go"
      provides: "Real-Postgres httptest proof: 401-Jellyfin-stub -> 200+fallback+degraded=true; 200-Jellyfin-stub -> 200+series path+degraded=false (unchanged); no-Jellyfin-config -> 200+fallback+degraded=false (unchanged); scanEpisodeVersionFolder with the same 401 stub -> 502 with the German message, not 500"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx"
      provides: "Small presentational component rendering the German degraded-enrichment notice, isolated so the already-oversized EpisodeVersionEditorPage.tsx only needs a one-line conditional render"
    - path: "shared/contracts/openapi.yaml"
      provides: "EpisodeVersionEditorContext schema documents the new optional jellyfin_enrichment_degraded boolean (not in required[])"
  key_links:
    - from: "resolveEpisodeVersionFolderPath's tolerated-error branch"
      to: "episodeVersionEditorResolved.jellyfinEnrichmentDegraded -> models.EpisodeVersionEditorContext.JellyfinEnrichmentDegraded"
      via: "resolveEpisodeVersionEditor / loadEpisodeVersionEditorContext plain field pass-through"
      pattern: "JellyfinEnrichmentDegraded"
    - from: "backend JSON field jellyfin_enrichment_degraded"
      to: "frontend EpisodeVersionEditorPage.tsx notice"
      via: "editor.contextData?.jellyfin_enrichment_degraded conditional render of JellyfinEnrichmentNotice"
      pattern: "jellyfin_enrichment_degraded"
---

<objective>
Fix a live 500 on `GET /api/v1/admin/episode-versions/:versionId/editor-context`: `resolveEpisodeVersionFolderPath` currently treats Jellyfin as a hard dependency (propagates any upstream error, e.g. the live 401 from an invalid API key) even though the folder path is only optional enrichment — `resolveEpisodeVersionDuration` already tolerates the identical failure mode and must be the model to follow. Make this tolerance global (any admin's editor-context request, any anime, any upstream failure kind), surface it as a visible German UI notice per project constraint ("operational errors must be visible immediately in the UI"), and confirm the one other real caller of the shared resolver (the folder-scan endpoint, which genuinely needs Jellyfin) degrades to a clear 502 instead of a blanket 500.

Purpose: an admin must never be blocked from editing an episode version's notes/metadata just because Jellyfin is temporarily down or misconfigured — manual admin control (CLAUDE.md's core constraint) must survive Jellyfin outages, not depend on them.

Output: `resolveEpisodeVersionFolderPath` tolerates all Jellyfin upstream error kinds; `EpisodeVersionEditorContext` carries an additive `jellyfin_enrichment_degraded` field (contract + Go + TS); the editor page shows a subtle, umlaut-correct notice when degraded; a real-Postgres handler test proves the 401 case, the passing case, and the not-configured case all behave exactly as specified; a live curl against the currently-broken version 27 proves 200 on the running system.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- Current resolveEpisodeVersionFolderPath / resolveEpisodeVersionDuration / episodeVersionEditorResolved
     (backend/internal/handlers/admin_content_episode_version_editor_helpers.go) — the tolerance pattern
     to copy is resolveEpisodeVersionDuration's "if durationSeconds, err := ...; err == nil && ... != nil"
     shape (the caller in loadEpisodeVersionEditorContext already silently ignores a duration error). Do
     the equivalent for the folder-path resolver ITSELF (inside resolveEpisodeVersionFolderPath, not just
     at its caller), because resolveEpisodeVersionFolderPath is also called from scanEpisodeVersionFolder
     (admin_content_episode_version_editor_scan.go), which must still see jellyfinSeriesID populated even
     when the Jellyfin folder-path lookup itself failed. -->

type episodeVersionEditorResolved struct {
	version          *models.EpisodeVersion
	animeSource      *models.AdminAnimeSyncSource
	animeFolderPath  *string
	jellyfinSeriesID string
	// ADD: jellyfinEnrichmentDegraded bool
	selectedGroups   []models.FansubGroupSummary
}

// resolveEpisodeVersionFolderPath current signature: (*string, string, error) — becomes
// (*string, string, bool, error). Current body's Jellyfin branch:
//   if seriesID := jellyfinSeriesIDFromAnimeSource(animeSource.Source, animeSource.SourceLinks); seriesID != "" {
//       if h.ensureJellyfinConfiguredForEditor() {
//           series, err := h.getJellyfinSeriesByID(ctx, seriesID)
//           if err != nil { return nil, "", err }                 // <-- THIS is the bug: hard-propagates
//           if series != nil { return normalizeNullableStringPtr(series.Path), seriesID, nil }
//       }
//       return normalizeNullableStringPtr(derefString(animeSource.FolderName)), seriesID, nil
//   }
//   ...(two more non-Jellyfin branches, unaffected)

// getJellyfinSeriesByID / fetchJellyfinJSON (jellyfin_client_series.go, jellyfin_client.go): on any
// resp.StatusCode >= 400 (401 included) fetchJellyfinJSON returns (statusCode, fmt.Errorf("jellyfin
// returned status %d", statusCode)); getJellyfinSeriesByID passes that error straight through UNLESS
// statusCode == http.StatusNotFound (which it maps to (nil, nil)). A 401 is therefore always a non-nil
// err today — exactly what must now be tolerated in resolveEpisodeVersionFolderPath specifically.

// scanEpisodeVersionFolder (admin_content_episode_version_editor_scan.go) already returns clean statuses
// for a genuine Jellyfin failure ONCE resolveEpisodeVersionEditor stops erroring on folder-path lookup
// failure — no code change needed there, only a new test proving it:
//   items, err := h.listJellyfinEpisodes(ctx, resolved.jellyfinSeriesID)
//   if err != nil { return nil, http.StatusBadGateway, fmt.Errorf("ordner konnte nicht synchronisiert werden") }
</interfaces>

<interfaces>
<!-- Real-Postgres handler-test fixture pattern to follow, condensed from
     backend/internal/handlers/episode_version_stream_identity_test.go (pool := testsupport.OpenPhase117Postgres(t);
     manual INSERTs; handler struct literal; gin.CreateTestContext + c.Set("auth_identity", ...) + c.Params)
     and backend/internal/handlers/admin_content_release_version_media_test.go (rvmExecPlatformAdminIdentity:
     IsPlatformAdmin: true short-circuits AdminContentHandler.GetEpisodeVersionEditorContext's actor.IsPlatformAdmin
     branch WITHOUT needing permissionSvc/auditLogRepo set at all — do not wire those on the test handler).

     testsupport.OpenPhase117Postgres(t)'s stub `anime` table is only `(id BIGINT PRIMARY KEY)`, `release_variants`
     is only `(id, release_version_id, duration_seconds)`, `fansub_groups` is only `(id, name)`, and there is NO
     release_variant_episodes table at all — repository.AdminContentRepository.GetAnimeSyncSource's plain (non-V2)
     branch and EpisodeVersionRepository.GetByID/ListDateNeighbors need more columns than that stub provides.
     ALTER/CREATE them onto the SAME isolated per-test schema OpenPhase117Postgres already gives you (do this in
     the fixture helper, once, via pool.Exec — do not touch testsupport/ itself):

       ALTER TABLE anime
           ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS title_de TEXT, ADD COLUMN IF NOT EXISTS title_en TEXT,
           ADD COLUMN IF NOT EXISTS source TEXT, ADD COLUMN IF NOT EXISTS folder_name TEXT,
           ADD COLUMN IF NOT EXISTS year SMALLINT, ADD COLUMN IF NOT EXISTS max_episodes SMALLINT,
           ADD COLUMN IF NOT EXISTS description TEXT, ADD COLUMN IF NOT EXISTS cover_image TEXT;
       ALTER TABLE release_variants
           ADD COLUMN IF NOT EXISTS video_quality TEXT, ADD COLUMN IF NOT EXISTS resolution TEXT,
           ADD COLUMN IF NOT EXISTS subtitle_type TEXT, ADD COLUMN IF NOT EXISTS crc32 TEXT,
           ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL, ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ NULL;
       ALTER TABLE release_versions ADD COLUMN IF NOT EXISTS production_started_on TIMESTAMPTZ NULL;
       ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS slug TEXT, ADD COLUMN IF NOT EXISTS logo_url TEXT;
       CREATE TABLE IF NOT EXISTS release_variant_episodes (
           release_variant_id BIGINT REFERENCES release_variants(id),
           episode_id BIGINT REFERENCES episodes(id), position INT NOT NULL DEFAULT 0
       );

       INSERT INTO anime (id, title, source, folder_name) VALUES
           (301, 'Fixture-Anime', 'jellyfin:series-401', '/data/anime/FixtureFallback');
       INSERT INTO episodes (id, anime_id, episode_number) VALUES (3001, 301, '1');
       INSERT INTO fansub_releases (id, episode_id) VALUES (3101, 3001);
       INSERT INTO release_versions (id, release_id) VALUES (3201, 3101);
       INSERT INTO release_variants (id, release_version_id) VALUES (3301, 3201);

     (GetAnimeSyncSource's plain branch is `loadAnimeV2SchemaInfo`-selected because this stub `anime` table
     has no `slug` column — confirmed via repository/anime_schema.go — so exactly the 9-column SELECT above
     is what must scan cleanly; `source = 'jellyfin:series-401'` makes jellyfinSeriesIDFromAnimeSource resolve
     the series id via jellyfinSeriesIDFromSource WITHOUT needing source_links, since the plain branch never
     selects source_links at all.)

     Handler under test needs only: repo: repository.NewAdminContentRepository(pool), episodeVersionRepo:
     repository.NewEpisodeVersionRepository(pool), plus jellyfinAPIKey/jellyfinBaseURL/httpClient per subtest.
     Request context: c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1,
     AppUserStatus: models.AppUserStatusActive, IsPlatformAdmin: true}); c.Params = gin.Params{{Key: "versionId",
     Value: "3301"}}; call h.GetEpisodeVersionEditorContext(c) directly (no router needed, matches existing
     precedent in this package). Response envelope: {"data": models.EpisodeVersionEditorContext}.

     Four subtests in one new file admin_content_episode_version_editor_context_test.go:
       1. Jellyfin stub returns 401 (http.Error(w, "unauthorized", http.StatusUnauthorized) for every path) ->
          200, Data.AnimeFolderPath == "/data/anime/FixtureFallback", Data.JellyfinEnrichmentDegraded == true.
       2. Jellyfin stub returns 200 with {"Items":[{"Id":"series-401","Path":"D:\\Anime\\TV\\FixtureSeries"}]} ->
          200, Data.AnimeFolderPath == `D:\Anime\TV\FixtureSeries`, Data.JellyfinEnrichmentDegraded == false
          (unchanged passing-case behavior).
       3. No jellyfinAPIKey/jellyfinBaseURL set on the handler at all (not-configured case) -> 200,
          Data.AnimeFolderPath == "/data/anime/FixtureFallback", Data.JellyfinEnrichmentDegraded == false
          (unchanged not-configured behavior — this is the case that must NOT show the flag).
       4. Same 401 stub as (1), but call h.scanEpisodeVersionFolder(context.Background(), 3301) directly
          (the internal method, no gin/requireAdmin needed) -> statusCode == http.StatusBadGateway, err.Error()
          == "ordner konnte nicht synchronisiert werden" (proves requirement 2: the genuinely-Jellyfin-dependent
          endpoint degrades to a clear German 502, not a blanket 500, as a side effect of the same central fix).

     If Postgres reports a missing-column/relation error not listed above, the authoritative column list is
     whatever GetAnimeSyncSource's plain branch SELECT (repository/admin_content_sync.go) and
     EpisodeVersionRepository.GetByID / ListDateNeighbors (repository/episode_version_repository.go,
     repository/episode_version_date_neighbors.go) actually reference — add the missing column/table there,
     not by seeding relations these queries do not use. -->
</interfaces>

<interfaces>
<!-- Frontend: exact existing render point to extend, EpisodeVersionEditorPage.tsx (~line 359-368,
     `const editor = useEpisodeVersionEditor();` is already bound at line 97):
       {scopeError ? <div className={styles.errorBox}>{scopeError}</div> : null}
       {editor.errorMessage ? <div className={styles.errorBox}>{editor.errorMessage}</div> : null}
       {editor.successMessage ? <div className={styles.successBox}>{editor.successMessage}</div> : null}
     Add exactly one more conditional line here (this file is already 931 lines, pre-existing debt unrelated
     to this fix — do NOT split it in this plan; keep this file's own growth to that single new line by
     putting the actual markup/styling in the new JellyfinEnrichmentNotice.tsx component instead):
       {editor.contextData?.jellyfin_enrichment_degraded ? <JellyfinEnrichmentNotice /> : null}

     Test mocking pattern to extend, page.test.tsx's makeEditorState() (contextData object, ~line 161-175) and
     mockPlatformAdminScope()/useEpisodeVersionEditorMock.mockReturnValue(...)/render(<EpisodeVersionEditorPage />)
     already used by every test in this file — add jellyfin_enrichment_degraded: true to a cloned contextData
     for a new "shows the Jellyfin degraded notice" test (assert screen.getByText on the exact German sentence),
     and confirm the existing makeEditorState() (no such field) keeps NOT rendering it in at least one existing
     or new negative assertion.

     types/episodeVersion.ts EpisodeVersionEditorContext interface (~line 64-71): add
       jellyfin_enrichment_degraded?: boolean
     as one more optional field, same style as the existing anime_folder_path?: string | null. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Make Jellyfin folder-path enrichment tolerant of upstream failure, everywhere it is used</name>
  <files>backend/internal/handlers/admin_content_episode_version_editor_helpers.go, backend/internal/handlers/admin_content_episode_version_editor_context_test.go, backend/internal/models/episode_version.go, shared/contracts/openapi.yaml</files>
  <behavior>
    - Case A (401/any upstream error while configured): resolveEpisodeVersionFolderPath returns the anime
      source's folder_name fallback, the resolved jellyfinSeriesID (unchanged), degraded=true, err=nil — and
      logs one line naming the seriesID and the underlying error (log.Printf, "admin_content
      episode_version_editor_context: ..." prefix style, matching this file's existing log conventions).
    - Case B (Jellyfin succeeds): unchanged — returns series.Path, seriesID, degraded=false, err=nil.
    - Case C (Jellyfin not configured): unchanged — returns folder_name fallback, seriesID, degraded=false,
      err=nil (ensureJellyfinConfiguredForEditor() short-circuits before ever calling getJellyfinSeriesByID,
      so this path never even attempts the upstream call — degraded must stay false here, never true).
    - Case D (scanEpisodeVersionFolder hitting the same upstream 401, via the now-tolerant shared resolver):
      returns (nil, http.StatusBadGateway, error "ordner konnte nicht synchronisiert werden") — proves the
      OTHER real caller of resolveEpisodeVersionEditor already degrades correctly once the central propagation
      bug is fixed, with no separate code change to admin_content_episode_version_editor_scan.go needed.
  </behavior>
  <action>
    Change resolveEpisodeVersionFolderPath's signature from (*string, string, error) to (*string, string, bool,
    error) per the first &lt;interfaces&gt; block: on a getJellyfinSeriesByID error, do NOT return early with the
    error — log it and fall through to the same folder_name-fallback return already used by the "series == nil"
    and "not configured" branches, but with a new degraded=true. Every other return in the function keeps
    degraded=false. Add "log" to this file's imports. Add a jellyfinEnrichmentDegraded bool field to the
    episodeVersionEditorResolved struct and thread the new return value through resolveEpisodeVersionEditor.
    In loadEpisodeVersionEditorContext, copy resolved.jellyfinEnrichmentDegraded onto the new
    models.EpisodeVersionEditorContext.JellyfinEnrichmentDegraded field (json tag
    "jellyfin_enrichment_degraded,omitempty", placed after DateNeighbors in the struct). Do not touch
    loadEpisodeVersionContributorContext (it never calls resolveEpisodeVersionFolderPath, so it is unaffected
    and must stay unaffected — no jellyfin_enrichment_degraded field for the contributor-tab response path).
    Do not touch permissions, roles, .env, or any Jellyfin credential — this is a pure enrichment-tolerance fix
    per the bug report's explicit constraint. Update shared/contracts/openapi.yaml's EpisodeVersionEditorContext
    schema (components/schemas, ~line 14716) to add jellyfin_enrichment_degraded as an additional `properties`
    entry (type boolean, NOT added to the existing `required` array) with a one-line description explaining it
    is true only when a configured Jellyfin connection was attempted and failed. Write the new test file exactly
    per the second &lt;interfaces&gt; block's four subtests before writing the production fix (RED), then implement
    the fix (GREEN); all four subtests plus the existing (unmodified) test suite in this package must pass.
  </action>
  <verify>
    <automated>docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -e TEAM4S_PHASE117_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_156?sslmode=disable -w /workspace/backend golang:1.25-alpine go test ./internal/handlers/... -run TestEpisodeVersionEditorContext -v -count=1</automated>
  </verify>
  <done>All four new subtests pass against real Postgres; go build ./... and go vet ./... succeed from backend/; openapi.yaml's EpisodeVersionEditorContext gains the additive, non-required jellyfin_enrichment_degraded property.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Surface a German degraded-enrichment notice in the episode-version editor</name>
  <files>frontend/src/types/episodeVersion.ts, frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx, frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.module.css, frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx, frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx</files>
  <behavior>
    - Given contextData.jellyfin_enrichment_degraded is true, EpisodeVersionEditorPage renders text containing
      exactly "Jellyfin ist gerade nicht erreichbar. Ordnerpfad und Laufzeit können fehlen." (real umlauts:
      ö in "können").
    - Given contextData has no jellyfin_enrichment_degraded field (or it is false) — i.e. every existing test's
      makeEditorState() — that text is absent (queryByText returns null).
  </behavior>
  <action>
    Add `jellyfin_enrichment_degraded?: boolean` to the EpisodeVersionEditorContext interface in
    types/episodeVersion.ts (third &lt;interfaces&gt; block). Create JellyfinEnrichmentNotice.tsx as a small,
    self-contained, prop-less component (no native &lt;select&gt;/&lt;input&gt;/&lt;textarea&gt;/&lt;button&gt; — this is a
    static notice, not an interactive element, so it does not fall under the @/components/ui primitive-only
    rule the way a new form control would; keep it a plain div, mirroring this page's existing local
    errorBox/successBox convention) rendering the exact German sentence above, plus its own small
    JellyfinEnrichmentNotice.module.css class visually distinct from the existing red errorBox/green
    successBox (e.g. an amber/warning palette; literal hex values only, matching this codebase's existing
    errorBox/successBox convention — no new CSS custom properties/design tokens). Wire it into
    EpisodeVersionEditorPage.tsx with exactly the one new conditional render line specified in the third
    &lt;interfaces&gt; block, immediately after the existing successMessage block. Extend page.test.tsx with a new
    test that clones makeEditorState(), sets contextData.jellyfin_enrichment_degraded: true, renders the page,
    and asserts the German sentence is present; and a negative assertion (existing makeEditorState(), unchanged)
    that it is absent.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/page.test.tsx'"</automated>
  </verify>
  <done>New notice component renders only when jellyfin_enrichment_degraded is true; page.test.tsx proves both the positive and negative case; no native form-control elements introduced; real umlauts used throughout.</done>
</task>

<task type="auto">
  <name>Task 3: Rebuild, full regression, and live proof against the currently-broken version 27</name>
  <files></files>
  <action>
    Before any git add, run `git status --short` and confirm only this plan's own files (listed in
    files_modified above) are staged/touched — the concurrent, unrelated GSD phase-156 GAP-09 work
    (permissions/segment_credit_roles.go, repository segment files, 156-UAT.md) must not be included; stage
    only this plan's files by explicit path. Rebuild the backend container
    (docker compose up -d --build team4sv30-backend) and restart the frontend container
    (docker compose restart team4sv30-frontend) after Task 2's changes. Run the full backend handlers package
    test suite and the full frontend vitest suite inside their respective containers and confirm no new
    failures versus the pre-existing baseline (report exact pass/fail counts, do not silently accept new
    failures). Run `npm run typecheck` and `npm run lint` inside team4sv30-frontend and confirm no new errors.
    For the live proof: obtain a platform-admin access token via the existing Keycloak direct-grant pattern
    (POST http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token, grant_type=password,
    client_id=team4s-frontend, username=csubs-leader@team4s.local, password=<Fixture-Passwort> — this is the project's
    existing, already-provisioned real-database admin fixture account, reused verbatim from prior plans'
    live-verification steps, e.g. 129-01-PLAN.md/139-06-PLAN.md), then curl
    http://192.168.235.196:18092/api/v1/admin/episode-versions/27/editor-context with that bearer token and
    confirm HTTP 200 plus jellyfin_enrichment_degraded in the response body (the live Jellyfin API key is
    still invalid per the bug report — that is intentional and proves the fix; do not touch .env or Jellyfin
    credentials). Also tail/grep the backend container's recent logs for the new degraded-enrichment log line
    naming the upstream error, as a second independent proof. Do not attempt a browser-based visual check of
    the notice — that remains an explicit, separate human UAT step; state this plainly rather than claiming it
    was done.
  </action>
  <verify>
    <automated>curl -s -o /tmp/editor-context-27.json -w "%{http_code}" http://192.168.235.196:18092/api/v1/admin/episode-versions/27/editor-context -H "Authorization: Bearer $TOKEN"</automated>
  </verify>
  <done>Both containers rebuilt/restarted; full backend and frontend suites reported with exact pass/fail counts and 0 new failures; typecheck/lint clean; live curl against version 27 returns 200 with jellyfin_enrichment_degraded present; backend log shows the degraded-enrichment line; git status confirms no foreign phase-156 files were touched; human browser UAT explicitly flagged as not performed by this plan.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Backend -> Jellyfin API | Untrusted/unreliable upstream (auth failures, 5xx, timeouts, network errors); this plan changes how failures here are handled |
| Admin browser -> editor-context/scan endpoints | Already-authenticated admin traffic; this plan does not change permission checks on either endpoint |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-260915-01 | Information Disclosure | resolveEpisodeVersionFolderPath's new log line | mitigate | Raw Jellyfin error text (e.g. internal URLs, status codes) is logged server-side only via log.Printf; the client-facing response carries only a boolean (jellyfin_enrichment_degraded), never the underlying error string |
| T-260915-02 | Denial of Service | fetchJellyfinJSON call chain reused unchanged by this fix | accept | h.httpClient already has a 20s Timeout (admin_content_handler.go, pre-existing, unchanged by this plan) bounding worst-case latency; this plan does not add any new unbounded call |
| T-260915-03 | Elevation of Privilege | GetEpisodeVersionEditorContext / ScanEpisodeVersionFolder permission checks | accept | Explicitly out of scope per the bug report ("Do NOT touch permissions, roles, or bypass logic"); this plan's diff touches only the Jellyfin-tolerance branch inside the already-authorized code path, never the permission checks themselves (verified via reachability: the platform-admin actor.IsPlatformAdmin branch and the contributor CanForReleaseVersion branches are both unmodified call sites) |
| T-260915-04 | Tampering | Live verification curl/token step (Task 3) | mitigate | Reuses an existing, already-provisioned dev/test fixture account (csubs-leader@team4s.local) documented in prior plans; no new credentials created, no .env/Jellyfin credential changes, no production data mutation |
</threat_model>

<verification>
- Backend: the four new subtests in admin_content_episode_version_editor_context_test.go pass against real
  Postgres (Task 1's verify command); go build/go vet clean.
- Frontend: page.test.tsx's new positive/negative notice assertions pass; full vitest/typecheck/lint clean
  with 0 new failures (Task 3).
- Live: curl against the real, currently-broken episode-version 27 returns 200 with jellyfin_enrichment_degraded
  in the body, and the backend log shows the new degraded-enrichment line (Task 3).
- Explicit non-claim: no browser-based visual verification of the German notice is performed by this plan —
  that is a separate human UAT step.
</verification>

<success_criteria>
- resolveEpisodeVersionFolderPath never propagates a Jellyfin upstream error as a 500 for ANY anime/version,
  only ever falls back to folder_name with jellyfin_enrichment_degraded=true, matching the existing
  resolveEpisodeVersionDuration tolerance pattern.
- The not-configured case and the Jellyfin-succeeds case are provably byte-identical to pre-plan behavior
  (no regression), including jellyfin_enrichment_degraded staying false/absent in both.
- scanEpisodeVersionFolder, the one other real caller of the shared resolver, degrades to 502 + German message
  instead of 500 for the same upstream failure, with no separate code change required beyond the central fix.
- The admin-facing editor page shows a real-umlaut German notice, built only from plain existing-pattern
  markup (no native form-control elements, no new CSS design tokens), exactly when degraded.
- Live curl against version 27 (the exact live-evidence case from the bug report) returns 200 on the running
  system, with the invalid Jellyfin API key left untouched.
</success_criteria>

<output>
Create `.planning/quick/260915-dws-jellyfin-ausfall-darf-episode-version-ed/260915-dws-SUMMARY.md` when done
</output>
