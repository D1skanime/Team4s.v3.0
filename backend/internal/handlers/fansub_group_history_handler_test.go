package handlers

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Diese Tests sind echte Source-Inspection-Tests: Sie lesen die tatsächliche
// Handler-/Routen-Quelle und prüfen, dass die sicherheitskritische Cross-Group-
// Guard-Logik (T-68-02-03) und der D-11-Default je Funktion vorhanden sind.
// Wird der Guard entfernt oder umbenannt, schlagen die Tests fehl.
//
// Hintergrund: FansubGroupHistoryHandler hängt an einem konkreten Repository-Typ
// (kein Interface), Verhaltens-Tests bräuchten einen Mocking-Refactor. Bis dahin
// schützen diese Quellprüfungen gegen stille Regressionen der Sicherheitslogik.

// funcBody extrahiert den Quelltext einer Go-Methode ab "func (...) Name(" bis zur
// nächsten Top-Level-Funktionsdeklaration (Spalte-0 "func ").
func funcBody(t *testing.T, src, name string) string {
	t.Helper()
	startRe := regexp.MustCompile(`(?m)^func \([^)]*\) ` + regexp.QuoteMeta(name) + `\(`)
	loc := startRe.FindStringIndex(src)
	require.NotNil(t, loc, "Funktion %s nicht in Handler-Quelle gefunden", name)
	rest := src[loc[1]:]
	nextRe := regexp.MustCompile(`(?m)^func `)
	if nl := nextRe.FindStringIndex(rest); nl != nil {
		return rest[:nl[0]]
	}
	return rest
}

func readSource(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	require.NoError(t, err, "Quelldatei %s lesbar", path)
	return string(b)
}

const handlerSrcPath = "fansub_group_history_handler.go"

// T-68-02-03: DeleteGroupHistory muss den Eintrag VOR dem Löschen via GetByID
// laden und bei FansubGroupID-Mismatch mit 404 antworten (kein Cross-Group-Delete).
func TestDeleteGroupHistory_CrossGroupGuard(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "DeleteGroupHistory")
	assert.Contains(t, body, "GetByID", "DeleteGroupHistory lädt den Eintrag vor dem Löschen")
	assert.Contains(t, body, "existing.FansubGroupID != fansubID",
		"DeleteGroupHistory vergleicht die Gruppen-Zugehörigkeit")
	assert.Contains(t, body, "http.StatusNotFound",
		"DeleteGroupHistory gibt 404 bei fremder Gruppe zurück")
	// Der Guard muss VOR dem eigentlichen Delete-Aufruf stehen.
	guardIdx := strings.Index(body, "existing.FansubGroupID != fansubID")
	deleteIdx := strings.Index(body, "historyRepo.Delete(")
	require.GreaterOrEqual(t, deleteIdx, 0, "DeleteGroupHistory ruft Delete auf")
	assert.Less(t, guardIdx, deleteIdx, "Cross-Group-Guard steht vor dem Delete-Aufruf")
}

// T-68-02-03: UpdateGroupHistory hat dieselbe Angriffsfläche und denselben Guard.
func TestUpdateGroupHistory_CrossGroupGuard(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "UpdateGroupHistory")
	assert.Contains(t, body, "GetByID", "UpdateGroupHistory lädt den Eintrag vor dem Aktualisieren")
	assert.Contains(t, body, "existing.FansubGroupID != fansubID",
		"UpdateGroupHistory vergleicht die Gruppen-Zugehörigkeit")
	assert.Contains(t, body, "http.StatusNotFound",
		"UpdateGroupHistory gibt 404 bei fremder Gruppe zurück")
}

// D-11: CreateGroupHistory setzt Leader-Einträge fest auf status='confirmed'.
func TestCreateGroupHistory_StatusConfirmedDefault(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "CreateGroupHistory")
	assert.Contains(t, body, `status := "confirmed"`,
		"CreateGroupHistory setzt status='confirmed' als Default (D-11)")
	assert.NotContains(t, body, "normalizeHistoricalContributionStatus",
		"CreateGroupHistory umgeht die alte Status-Normalisierung (D-11)")
}

// D-10: Titel ist Pflichtfeld in CreateGroupHistory (422 bei fehlendem Titel).
func TestCreateGroupHistory_TitleRequired(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "CreateGroupHistory")
	assert.Contains(t, body, "http.StatusUnprocessableEntity",
		"CreateGroupHistory lehnt fehlenden Titel mit 422 ab (D-10)")
}

func TestGroupHistoryYearValidation(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	yearGuardBody := funcBody(t, src, "validateGroupHistoryYear")

	assert.Contains(t, src, "Meilenstein-Jahr darf nicht vor dem Gründungsjahr liegen.",
		"CreateGroupHistory muss year < founded_year mit fachlicher Fehlermeldung ablehnen")
	assert.Contains(t, src, "Meilenstein-Jahr darf nicht in der Zukunft liegen.",
		"CreateGroupHistory muss future years mit fachlicher Fehlermeldung ablehnen")
	assert.Contains(t, yearGuardBody, "GetFansubFoundedYear",
		"Year-Guard muss founded_year aus der Gruppenquelle laden")
	assert.Contains(t, yearGuardBody, "time.Now().Year()",
		"Year-Guard muss gegen das aktuelle Kalenderjahr prüfen")
	assert.Contains(t, yearGuardBody, "http.StatusUnprocessableEntity",
		"Ungültige Jahre müssen als 422 zurückgegeben werden")
	assert.Contains(t, repoSrc, "GetFansubFoundedYear",
		"Repository muss einen founded_year-Lookup für den Guard bereitstellen")
	assert.Contains(t, repoSrc, "SELECT founded_year",
		"Repository muss founded_year aus fansub_groups lesen")

	assert.Contains(t, createBody, "validateGroupHistoryYear(c, fansubID, req.Year)",
		"CreateGroupHistory muss das eingereichte Jahr vor dem Speichern validieren")
	createGuardIdx := strings.Index(createBody, "validateGroupHistoryYear(c, fansubID, req.Year)")
	createIdx := strings.Index(createBody, "historyRepo.Create(")
	require.GreaterOrEqual(t, createGuardIdx, 0, "CreateGroupHistory ruft validateGroupHistoryYear auf")
	require.GreaterOrEqual(t, createIdx, 0, "CreateGroupHistory ruft Create auf")
	assert.Less(t, createGuardIdx, createIdx, "Year-Guard steht vor Create")

	assert.Contains(t, updateBody, "req.Year != nil && *req.Year != nil",
		"UpdateGroupHistory darf explizites year:null nicht durch den Year-Guard ablehnen")
	assert.Contains(t, updateBody, "validateGroupHistoryYear(c, fansubID, *req.Year)",
		"UpdateGroupHistory muss nicht-null Jahre vor dem Speichern validieren")
}

// Die DELETE-Route muss registriert und mit auth-Middleware geschützt sein.
func TestWebsiteLaunchRequiresCommunityWebsiteLink(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss event_type gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "website_launch"`,
		"validateEventUnlocked muss website_launch gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateWebsiteLaunchAllowed",
		"CreateGroupHistory muss website_launch gegen Community-Link absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss event_type-Wechsel gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, "ValidateWebsiteLaunchAllowed",
		"UpdateGroupHistory muss website_launch gegen Community-Link absichern")
}

func TestRevivalRequiresPreviousHiatus(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss revival gegen Freischaltregeln absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss Wechsel auf revival gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "revival"`,
		"validateEventUnlocked muss revival gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateRevivalAllowed",
		"revival darf erst nach Pause gespeichert werden")
	assert.Contains(t, repoSrc, `HasEventType(ctx, fansubGroupID, "hiatus", nil)`,
		"Repository muss fuer revival eine bestehende Pause verlangen")
}

func TestFirstProjectRequiresQualifiedProjectCoverage(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss first_project gegen Freischaltregeln absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss Wechsel auf first_project gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "first_project"`,
		"validateEventUnlocked muss first_project gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateFirstProjectAllowed",
		"first_project darf erst nach qualifizierter Projekt-Coverage gespeichert werden")
}

func TestFirstReleaseRequiresReleaseContributionAndKaraCoverage(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	coverageRepoSrc := readSource(t, "../repository/anime_coverage_repository.go")
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss first_release gegen Freischaltregeln absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss Wechsel auf first_release gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "first_release"`,
		"validateEventUnlocked muss first_release gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateFirstReleaseAllowed",
		"first_release darf erst nach Release-Beitrag und Kara-Segment gespeichert werden")
	assert.Contains(t, repoSrc, "anime_contributions ac_note",
		"first_release-Textbeitrag muss einem Beitrag derselben Fansubgruppe zuordenbar sein")
	assert.Contains(t, repoSrc, "member_claims mc_media",
		"first_release-Media muss den Uploader ueber verifizierte Claims aufloesen")
	assert.Contains(t, repoSrc, "ac_media.fansub_group_id = rvg.fansub_group_id",
		"first_release-Media darf keine fremde Coop-Gruppe freischalten")
	assert.Contains(t, repoSrc, "FROM release_version_groups rvg_segment",
		"first_release muss Kara von jeder Coop-Gruppe derselben Release-Version akzeptieren")
	assert.Contains(t, repoSrc, "WHERE rvg_segment.release_version_id = rv.id",
		"first_release-Kara darf nur von derselben Release-Version kommen")
	assert.Contains(t, coverageRepoSrc, "FROM release_version_groups rvg_segment",
		"first_release-Coverage muss Kara von jeder Coop-Gruppe derselben Release-Version akzeptieren")
	assert.Contains(t, coverageRepoSrc, "WHERE rvg_segment.release_version_id = rv.id",
		"first_release-Coverage darf nur Kara derselben Release-Version zaehlen")
	assert.NotContains(t, repoSrc, "LOWER(tt.name) LIKE '%kara%'",
		"first_release darf nicht vom Theme-Typ-Namen abhaengen, OP/ED/Insert-Segmente sind Kara-Segmente")
	assert.NotContains(t, coverageRepoSrc, "LOWER(tt.name) LIKE '%kara%'",
		"first_release-Coverage darf nicht vom Theme-Typ-Namen abhaengen")
}

func TestProjectCompletedRequiresContributionOnEveryRelease(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	coverageRepoSrc := readSource(t, "../repository/anime_coverage_repository.go")
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss project_completed gegen Freischaltregeln absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss Wechsel auf project_completed gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "project_completed"`,
		"validateEventUnlocked muss project_completed gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateCompletedProjectAllowed",
		"project_completed darf erst nach Beitrags-Coverage aller Releases gespeichert werden")
	assert.Contains(t, repoSrc, "HasQualifiedCompletedProject",
		"Repository muss project_completed fachlich pruefen")
	assert.Contains(t, repoSrc, "AND NOT EXISTS",
		"project_completed muss fehlende Release-Beitraege ausschliessen")
	assert.Contains(t, repoSrc, "release_version_notes rvn",
		"project_completed muss Release-Texte als Beitrag zaehlen")
	assert.Contains(t, repoSrc, "release_version_media rvm",
		"project_completed muss Release-Bilder als Beitrag zaehlen")
	assert.Contains(t, coverageRepoSrc, "has_completed_project",
		"Anime-Coverage muss project_completed fuer die UI liefern")
}

func TestProjectCountAchievementsRequireCompletedProjectThresholds(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	for _, code := range []string{"projects_10", "projects_50", "projects_100", "projects_500"} {
		assert.Contains(t, unlockBody, `"`+code+`"`,
			"validateEventUnlocked muss %s gesondert validieren", code)
		assert.Contains(t, src, `"`+code+`"`,
			"%s muss im Handler bekannt sein", code)
	}
	assert.Contains(t, src, "projectCountHistoryEventThresholds",
		"Handler muss zentrale Schwellenwerte fuer Projekt-Erfolge besitzen")
	assert.Contains(t, unlockBody, "ValidateProjectCountAllowed",
		"Projekt-Zaehler duerfen erst nach ausreichend abgeschlossenen Projekten gespeichert werden")
	assert.Contains(t, repoSrc, "CountQualifiedCompletedProjects",
		"Repository muss abgeschlossene Projekte zaehlen")
	assert.Contains(t, repoSrc, "ValidateProjectCountAllowed",
		"Repository muss Projekt-Zaehler fachlich validieren")
}

func TestReleaseCountAchievementsRequireQualifiedReleaseThresholds(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	coverageRepoSrc := readSource(t, "../repository/anime_coverage_repository.go")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	for _, code := range []string{"releases_100", "releases_500", "releases_1000", "releases_5000", "releases_10000"} {
		assert.Contains(t, unlockBody, `"`+code+`"`,
			"validateEventUnlocked muss %s gesondert validieren", code)
		assert.Contains(t, src, `"`+code+`"`,
			"%s muss im Handler bekannt sein", code)
	}
	assert.Contains(t, src, "releaseCountHistoryEventThresholds",
		"Handler muss zentrale Schwellenwerte fuer Release-Erfolge besitzen")
	assert.Contains(t, unlockBody, "ValidateReleaseCountAllowed",
		"Release-Zaehler duerfen erst nach ausreichend qualifizierten Releases gespeichert werden")
	assert.Contains(t, repoSrc, "CountQualifiedFirstReleases",
		"Repository muss qualifizierte Releases zaehlen")
	assert.Contains(t, repoSrc, "ValidateReleaseCountAllowed",
		"Repository muss Release-Zaehler fachlich validieren")
	assert.Contains(t, coverageRepoSrc, "qualified_release_count",
		"Anime-Coverage muss qualifizierte Releases fuer die UI liefern")
}

func TestCollaborationRequiresCoopReleaseVersion(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	repoSrc := readSource(t, "../repository/fansub_group_history_repository.go")
	coverageRepoSrc := readSource(t, "../repository/anime_coverage_repository.go")
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")
	unlockBody := funcBody(t, src, "validateEventUnlocked")

	assert.Contains(t, createBody, "validateEventUnlocked",
		"CreateGroupHistory muss collaboration gegen Freischaltregeln absichern")
	assert.Contains(t, updateBody, "validateEventUnlocked",
		"UpdateGroupHistory muss Wechsel auf collaboration gegen Freischaltregeln absichern")
	assert.Contains(t, unlockBody, `case "collaboration"`,
		"validateEventUnlocked muss collaboration gesondert validieren")
	assert.Contains(t, unlockBody, "ValidateCollaborationAllowed",
		"collaboration darf erst nach einer Coop-Release-Version gespeichert werden")
	assert.Contains(t, repoSrc, "HasQualifiedCollaboration",
		"Repository muss collaboration fachlich pruefen")
	assert.Contains(t, repoSrc, "COUNT(DISTINCT rvg_peer.fansub_group_id)",
		"collaboration muss mindestens zwei beteiligte Gruppen verlangen")
	assert.Contains(t, coverageRepoSrc, "has_collaboration",
		"Anime-Coverage muss collaboration fuer die UI liefern")
}

func TestSingleUseAchievementEventsAreGuardedServerSide(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	createBody := funcBody(t, src, "CreateGroupHistory")
	updateBody := funcBody(t, src, "UpdateGroupHistory")

	assert.Contains(t, src, "singleUseGroupHistoryEventTypes",
		"Handler muss eine zentrale Einmal-Liste fuer Achievements besitzen")
	for _, code := range []string{"disbanding", "first_project", "first_release", "project_completed", "collaboration", "projects_10", "projects_50", "projects_100", "projects_500", "releases_100", "releases_500", "releases_1000", "releases_5000", "releases_10000"} {
		assert.Contains(t, src, `"`+code+`"`, "event type %s muss als Einmal-Meilenstein geschuetzt sein", code)
	}
	assert.Contains(t, createBody, "validateSingleUseEvent",
		"CreateGroupHistory muss Einmal-Meilensteine vor Duplikaten schuetzen")
	assert.Contains(t, updateBody, "validateSingleUseEvent",
		"UpdateGroupHistory muss Wechsel auf Einmal-Meilensteine vor Duplikaten schuetzen")
	assert.Contains(t, src, "HasEventType",
		"Handler muss bestehende Eventtypen ueber das Repository pruefen")
}

func TestGroupHistoryEventTypeWhitelistIncludesAchievementPreviewTypes(t *testing.T) {
	src := readSource(t, handlerSrcPath)
	assert.NotContains(t, src, `"other":`,
		"other darf nicht mehr als Group-History-Typ erstellt werden")
	assert.NotContains(t, src, "milestone, other,",
		"Fehlermeldung darf other nicht mehr als erlaubten Group-History-Typ nennen")
	for _, code := range []string{
		"first_project",
		"first_release",
		"anniversary",
		"collaboration",
		"revival",
		"project_completed",
		"team_change",
		"website_launch",
		"award",
		"projects_10",
		"projects_50",
		"projects_100",
		"projects_500",
		"releases_100",
		"releases_500",
		"releases_1000",
		"releases_5000",
		"releases_10000",
	} {
		assert.Contains(t, src, `"`+code+`"`, "event type %s is allowed for manual preview assignment", code)
	}
}

func TestDeleteGroupHistory_RouteRegistered(t *testing.T) {
	routes := readSource(t, "../../cmd/server/admin_routes.go")
	assert.Regexp(t,
		`v1\.DELETE\("/admin/fansubs/:id/history/:historyId",\s*auth,\s*deps\.groupHistoryHandler\.DeleteGroupHistory\)`,
		routes, "DELETE-Route ist mit auth-Middleware registriert")
}

// permissionSvc-Verdrahtung: das Struct trägt das Feld und WithPermissionSvc chaint.
func TestFansubGroupHistoryHandler_PermissionSvcField(t *testing.T) {
	h := NewFansubGroupHistoryHandler(nil)
	assert.Nil(t, h.permissionSvc, "permissionSvc ist initial nil")
	result := h.WithPermissionSvc(nil)
	assert.Same(t, h, result, "WithPermissionSvc gibt denselben Handler zurück (Chaining)")
}
