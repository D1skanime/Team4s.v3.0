package handlers

// quick-261018-l5r Task 2 (CLAUDE.md 450-Zeilen-Regel): adminThemeRepository wurde rein
// umbauend (kein Verhaltenswechsel) aus admin_content_handler.go hierher verschoben, da die
// Übernahme-Feature-Erweiterung diese Datei über das 450-Zeilen-Limit getrieben hätte.
// adminThemeRepository bleibt die größte, am stärksten in sich geschlossene Schnittstelle in
// admin_content_handler.go (Theme/Segment/Fansub-Release-Zugriff) und eignet sich daher am besten
// für eine eigenständige Datei.

import (
	"context"

	"team4s.v3/backend/internal/models"
)

// adminThemeRepository definiert den Datenbankzugriff für Anime-Themes im Admin-Bereich.
type adminThemeRepository interface {
	ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error)
	ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error)
	CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error)
	ReleaseVariantBelongsToAnime(ctx context.Context, releaseVariantID int64, animeID int64) (bool, error)
	UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error
	DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error
	ListAnimeSegments(ctx context.Context, animeID int64, groupID int64, version string, currentReleaseVersionID int64) ([]models.AdminThemeSegment, error)
	ListAnimeSegmentSuggestions(ctx context.Context, animeID int64, episodeNumber int, excludeGroupID int64, excludeVersion string) ([]models.AdminThemeSegment, error)
	ListSegmentLibraryCandidates(ctx context.Context, animeID int64, fansubGroupID int64, segmentKind string, segmentName string) ([]models.SegmentLibraryCandidate, error)
	CreateAnimeSegment(ctx context.Context, animeID int64, input models.AdminThemeSegmentCreateInput, currentReleaseVersionID int64) (*models.AdminThemeSegment, *models.ThemeSegmentAssignmentSyncResult, error)
	UpdateAnimeSegment(ctx context.Context, segmentID int64, input models.AdminThemeSegmentPatchInput) (*models.ThemeSegmentAssignmentSyncResult, error)
	DeleteAnimeSegment(ctx context.Context, segmentID int64) error
	GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error)
	GetStableSegmentAnimeSource(ctx context.Context, animeID int64) (string, string, error)
	// ListThemeSegmentAssignments/GetThemeSegmentEpisodeOverride (Phase 117, Plan 117-02/117-04):
	// tragen den Fan-Out ueber alle zugewiesenen Release-Versionen einer Basis-Zeit-Aenderung
	// bzw. den Override-Ausschlussfilter (D-01/D-03).
	ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error)
	GetThemeSegmentEpisodeOverride(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.AdminThemeSegmentEpisodeOverride, error)
	// AssignThemeSegmentToReleaseVersion/UnassignThemeSegmentFromReleaseVersion und
	// UpsertThemeSegmentEpisodeOverride/DeleteThemeSegmentEpisodeOverride (Phase 117, Plan
	// 117-02/117-05): die vier Admin-Schreibpfade fuer geteilte Kara-Zuweisung (D-03) und
	// Per-Version-Zeit-Override (D-01).
	AssignThemeSegmentToReleaseVersion(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.AdminThemeSegmentAssignment, error)
	UnassignThemeSegmentFromReleaseVersion(ctx context.Context, segmentID int64, releaseVersionID int64) error
	// AssignThemeSegmentToEpisodeRange (Phase 156, Workstream A): Soll-Ist-Synchronisation
	// zwischen einem Segment und seinen zugewiesenen Release-Versionen beim Speichern
	// (Create/Update) -- start_episode/end_episode SIND der Mechanismus, kein separater Button.
	// Liefert Added/Removed/ProtectedByOverride (siehe models.ThemeSegmentAssignmentSyncResult).
	AssignThemeSegmentToEpisodeRange(ctx context.Context, segmentID int64, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) (*models.ThemeSegmentAssignmentSyncResult, error)
	UpsertThemeSegmentEpisodeOverride(ctx context.Context, input models.AdminThemeSegmentEpisodeOverrideUpsertInput) (*models.AdminThemeSegmentEpisodeOverride, error)
	DeleteThemeSegmentEpisodeOverride(ctx context.Context, segmentID int64, releaseVersionID int64) error
	// SetThemeSegmentOrigin (Phase 156, Workstream C): setzt/korrigiert die administrativ
	// korrigierbare origin_release_version_id eines Segments (P156-06). Lehnt ein Ziel, das dem
	// Segment nicht ueber theme_segment_assignments zugewiesen ist, mit ErrConflict ab. Seit Plan
	// 156-12/GAP-01 laeuft der Vorgang atomar: der int-Rueckgabewert meldet, wie viele jetzt
	// ungueltige theme_segment_contributors-Zeilen im selben Commit entfernt wurden.
	SetThemeSegmentOrigin(ctx context.Context, segmentID int64, releaseVersionID int64) (int, error)
	// ListThemeSegmentContributorCandidates/SetThemeSegmentContributors (Phase 156,
	// Plan 156-12/GAP-01): die Segment-Contributor-Kandidatenliste (jeder effektive
	// Origin-Contributor, ungefiltert) und der validierte Schreibpfad (all-or-nothing gegen die
	// effektive Contributor-Aufloesung der Origin).
	ListThemeSegmentContributorCandidates(ctx context.Context, segmentID int64) ([]models.AdminThemeSegmentContributorCandidate, error)
	SetThemeSegmentContributors(ctx context.Context, segmentID int64, memberIDs []int64) (int, int, error)
	ClearSegmentAsset(ctx context.Context, animeID int64, segmentID int64) (*string, error)
	BindUploadedSegmentAsset(ctx context.Context, animeID int64, segmentID int64, mediaAssetID int64, sourceRef string, sourceLabel *string) (*models.AdminThemeSegment, error)
	AttachSegmentLibraryAsset(ctx context.Context, animeID int64, segmentID int64, input models.SegmentLibraryAttachInput) (*models.AdminThemeSegment, error)
	IsReusableSegmentAsset(ctx context.Context, sourceRef string) (bool, error)
	GetSegmentReleaseDuration(ctx context.Context, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) (*int32, error)
	GetCanonicalFansubAnimeRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error)
	GetFansubRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error)
	ListFansubAnime(ctx context.Context, fansubGroupID int64) ([]models.AdminFansubAnimeEntry, error)
	ListReleaseThemeAssets(ctx context.Context, releaseID int64) ([]models.AdminReleaseThemeAsset, error)
	ListReleaseThemeAssetsByFansubAnime(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, []models.AdminReleaseThemeAsset, error)
	HasGlobalThemeSegmentCoverageForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error)
	HasReleaseAssetSegmentUploadBlockedForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error)
	CreateReleaseThemeAsset(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error)
	DeleteReleaseThemeAsset(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error
	ListFansubAnimeReleasesPage(ctx context.Context, fansubGroupID int64, animeID int64, page int, perPage int) ([]models.AdminFansubReleaseSummary, int64, error)
	GetCanonicalFansubAnimeReleaseSummary(ctx context.Context, fansubGroupID int64, animeID int64) (*models.CanonicalFansubAnimeReleaseResponse, error)
	GetAdminReleaseByID(ctx context.Context, releaseID int64) (*models.AdminFansubReleaseSummary, error)
	// SetThemeSegmentManualPreview/ResetThemeSegmentManualPreview/
	// AttachSegmentPreviewImageFromReleaseVersion/ListSegmentPreviewImageCandidates (Phase 172,
	// Plan 172-03, D-08/D-11): die vier manuellen Vorschaubild-Schreibpfade (Upload/
	// Picker-Attach/Reset) plus der Picker-Kandidatenlisten-Lesepfad.
	SetThemeSegmentManualPreview(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error)
	AssignUploadedSegmentPreviewImage(ctx context.Context, animeID int64, segmentID int64, mediaAssetID int64) (*int64, error)
	ResetThemeSegmentManualPreview(ctx context.Context, segmentID int64) (*int64, error)
	AttachSegmentPreviewImageFromReleaseVersion(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error)
	ListSegmentPreviewImageCandidates(ctx context.Context, segmentID int64, mediaStorageDir string) ([]models.AdminSegmentPreviewImageCandidate, error)
	// IsMediaAssetExclusiveSegmentPreview (Phase 172, Code-Review-Fix, D-11): Datenverlust-Schutz
	// vor cleanupOldPreviewAsset -- ein ersetztes altes Asset wird nur geloescht, wenn es NICHT
	// von release_version_media oder einem anderen Segment weiterhin referenziert wird.
	IsMediaAssetExclusiveSegmentPreview(ctx context.Context, mediaAssetID int64, excludeSegmentID int64) (bool, error)
}
