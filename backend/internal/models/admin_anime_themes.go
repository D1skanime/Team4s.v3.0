package models

import "time"

// AdminThemeType repräsentiert einen Theme-Typ (z.B. OP1, ED2).
type AdminThemeType struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// AdminAnimeTheme repräsentiert ein OP/ED-Theme eines Anime.
type AdminAnimeTheme struct {
	ID            int64     `json:"id"`
	AnimeID       int64     `json:"anime_id"`
	ThemeTypeID   int64     `json:"theme_type_id"`
	ThemeTypeName string    `json:"theme_type_name"`
	Title         *string   `json:"title"`
	CreatedAt     time.Time `json:"created_at"`
}

// AdminAnimeThemeCreateInput enthält die Felder zum Anlegen eines neuen Themes.
type AdminAnimeThemeCreateInput struct {
	ThemeTypeID int64   `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// AdminAnimeThemePatchInput enthält die optionalen Felder für ein Theme-Update.
// Nur gesetzte Felder (non-nil) werden aktualisiert.
type AdminAnimeThemePatchInput struct {
	ThemeTypeID *int64  `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// AdminThemeSegment repraesentiert ein Release-Segment (OP/ED-Timing) fuer eine Fansub-Gruppe und Version.
type AdminThemeSegment struct {
	ID            int64   `json:"id"`
	ThemeID       int64   `json:"theme_id"`
	AnimeID       int64   `json:"anime_id"`
	ThemeTitle    *string `json:"theme_title"`
	ThemeTypeName string  `json:"theme_type_name"`
	FansubGroupID *int64  `json:"fansub_group_id"`
	// OriginReleaseVersionID ist die stabile, administrativ korrigierbare Herkunfts-Referenz
	// des Segments (Phase 156, Workstream C -- Migration 0161). nil bedeutet "Origin nicht
	// bestimmt" (kein Fehler), z.B. bei einem Segment ohne jede Zuweisung.
	OriginReleaseVersionID *int64     `json:"origin_release_version_id"`
	Version                string     `json:"version"`
	StartEpisode           *int       `json:"start_episode"`
	EndEpisode             *int       `json:"end_episode"`
	StartTime              *string    `json:"start_time"` // Interval als HH:MM:SS-String
	EndTime                *string    `json:"end_time"`   // Interval als HH:MM:SS-String
	SourceJellyfinItemID   *string    `json:"source_jellyfin_item_id"`
	SourceType             *string    `json:"source_type,omitempty"`
	SourceRef              *string    `json:"source_ref,omitempty"`
	SourceLabel            *string    `json:"source_label,omitempty"`
	PlaybackSourceID       *int64     `json:"playback_source_id,omitempty"`
	PlaybackSourceKind     *string    `json:"playback_source_kind,omitempty"`
	PlaybackVariantID      *int64     `json:"playback_release_variant_id,omitempty"`
	PlaybackJellyfinID     *string    `json:"playback_jellyfin_item_id,omitempty"`
	PlaybackMediaAssetID   *int64     `json:"playback_media_asset_id,omitempty"`
	PlaybackSourceLabel    *string    `json:"playback_source_label,omitempty"`
	PlaybackStartSeconds   *int32     `json:"playback_start_offset_seconds,omitempty"`
	PlaybackEndSeconds     *int32     `json:"playback_end_offset_seconds,omitempty"`
	PlaybackDuration       *int32     `json:"playback_duration_seconds,omitempty"`
	RenderCacheID          *int64     `json:"render_cache_id,omitempty"`
	RenderCacheKey         *string    `json:"render_cache_key,omitempty"`
	RenderStatus           *string    `json:"render_status,omitempty"`
	RenderErrorMessage     *string    `json:"render_error_message,omitempty"`
	RenderDuration         *int32     `json:"render_duration_seconds,omitempty"`
	RenderCompletedAt      *time.Time `json:"render_completed_at,omitempty"`
	CanRetryRender         bool       `json:"can_retry_render"`
	LibraryDefinitionID    *int64     `json:"library_definition_id,omitempty"`
	LibraryAssetID         *int64     `json:"library_asset_id,omitempty"`
	LibrarySegmentKind     *string    `json:"library_segment_kind,omitempty"`
	LibrarySegmentName     *string    `json:"library_segment_name,omitempty"`
	LibraryAnimeProvider   *string    `json:"library_anime_source_provider,omitempty"`
	LibraryAnimeExternal   *string    `json:"library_anime_source_external_id,omitempty"`
	LibraryIdentity        *string    `json:"library_identity_status,omitempty"`
	LibraryOwnership       *string    `json:"library_ownership_scope,omitempty"`
	LibraryAttachSource    *string    `json:"library_attach_source,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`

	// Zuweisungs-/Override-Uebersicht fuer geteilte Kara-Segmente (Phase 117, D-01/D-03).
	AssignedReleaseVersionIDs []int64                              `json:"assigned_release_version_ids,omitempty"`
	IsShared                  bool                                 `json:"is_shared"`
	HasEpisodeOverride        bool                                 `json:"has_episode_override"`
	AssignedEpisodes          []AdminThemeSegmentAssignmentEpisode `json:"assigned_episodes,omitempty"`
}

// AdminThemeSegmentAssignmentEpisode traegt die ECHTE Episodennummer einer
// Zuweisung (nicht die interne release_version_id) -- Grundlage fuer die
// "Folge {N}"-Zuweisungs-Chips im Admin-UI (Phase 117, Plan 117-07, B3-Fix).
// HasOverride (Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix): PRO-FOLGE-Flag, ob
// GENAU DIESE release_version_id einen theme_segment_episode_overrides-Eintrag hat --
// im Gegensatz zum segmentweiten AdminThemeSegment.HasEpisodeOverride (true, sobald
// IRGENDEINE zugewiesene Folge ueberschrieben ist). Ohne dieses Feld zeigte das Frontend
// den "verschoben"-Chip faelschlich auf JEDER zugewiesenen Folge, sobald irgendeine
// einzelne Folge einen Override hatte -- ein Korrektheits-Bug, kein kosmetisches Problem.
type AdminThemeSegmentAssignmentEpisode struct {
	ReleaseVersionID int64  `json:"release_version_id"`
	EpisodeNumber    string `json:"episode_number"`
	HasOverride      bool   `json:"has_override"`
}

// AdminThemeSegmentCreateInput enthaelt die Felder zum Anlegen eines neuen Segments.
type AdminThemeSegmentCreateInput struct {
	ThemeID              int64   `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              string  `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
	SourceType           *string `json:"source_type"`
	SourceRef            *string `json:"source_ref"`
	SourceLabel          *string `json:"source_label"`
}

// AdminThemeSegmentPatchInput enthaelt die optionalen Felder fuer ein Segment-Update.
type AdminThemeSegmentPatchInput struct {
	ThemeID              *int64  `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              *string `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
	SourceType           *string `json:"source_type"`
	SourceRef            *string `json:"source_ref"`
	SourceLabel          *string `json:"source_label"`
}

// AdminThemeSegmentAssignment repraesentiert die Zuweisung eines geteilten
// Kara-Segments zu einer konkreten Release-Version (Phase 117, D-03).
type AdminThemeSegmentAssignment struct {
	ID               int64     `json:"id"`
	ThemeSegmentID   int64     `json:"theme_segment_id"`
	ReleaseVersionID int64     `json:"release_version_id"`
	CreatedAt        time.Time `json:"created_at"`
}

// AdminThemeSegmentEpisodeOverride repraesentiert einen optionalen
// Per-Release-Version-Zeit-Override fuer ein zugewiesenes Kara-Segment
// (Phase 117, D-01). StartTime/EndTime sind HH:MM:SS-Strings, exakt wie
// AdminThemeSegment.StartTime/EndTime.
type AdminThemeSegmentEpisodeOverride struct {
	ID               int64     `json:"id"`
	ThemeSegmentID   int64     `json:"theme_segment_id"`
	ReleaseVersionID int64     `json:"release_version_id"`
	StartTime        string    `json:"start_time"`
	EndTime          string    `json:"end_time"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// AdminThemeSegmentEpisodeOverrideUpsertInput enthaelt die Felder zum Anlegen
// oder Aktualisieren eines Per-Release-Version-Zeit-Overrides.
type AdminThemeSegmentEpisodeOverrideUpsertInput struct {
	ThemeSegmentID   int64  `json:"theme_segment_id"`
	ReleaseVersionID int64  `json:"release_version_id"`
	StartTime        string `json:"start_time"`
	EndTime          string `json:"end_time"`
}

// ThemeSegmentAssignmentSyncResult ist der Rueckgabewert der Soll-Ist-Synchronisation
// AssignThemeSegmentToEpisodeRange (Phase 156, Workstream A -- ersetzt die rein additive
// Quick-Task-260819-lm5-Semantik). Added enthaelt die release_version_id's, die durch diesen
// Aufruf NEU zugewiesen wurden (Basis fuer gezielten Render-Fan-out). Removed enthaelt die
// release_version_id's, deren Zuweisung entfernt wurde, weil sie ausserhalb des neuen Bereichs
// liegen UND keinen aktiven theme_segment_episode_overrides-Eintrag haben. ProtectedByOverride
// enthaelt release_version_id's, die ausserhalb des neuen Bereichs liegen, aber WEGEN eines
// aktiven Overrides NICHT entfernt wurden -- sichtbar gemeldet statt still geloescht (P156-03).
type ThemeSegmentAssignmentSyncResult struct {
	Added               []int64                          `json:"added"`
	Removed             []int64                          `json:"removed"`
	ProtectedByOverride []int64                          `json:"protected_by_override"`
	SkippedConflicts    []ThemeSegmentAssignmentConflict `json:"skipped_conflicts"`
	// OriginBefore ist die Herkunfts-Release-Version vor diesem Aufruf (nil == "Origin nicht
	// bestimmt") -- Phase 156, Plan 156-16, GAP-04/GAP-05, P156-05/P156-06.
	OriginBefore *int64 `json:"origin_before,omitempty"`
	// OriginAfter ist die Herkunfts-Release-Version nach diesem Aufruf, nachdem
	// ensureThemeSegmentOriginTx die zentrale Gueltigkeitsregel angewandt hat.
	OriginAfter *int64 `json:"origin_after,omitempty"`
	// RemovedContributorCount zaehlt die theme_segment_contributors-Zeilen, die als atomare
	// Nebenwirkung eines tatsaechlichen Origin-Wechsels in diesem Aufruf entfernt wurden.
	RemovedContributorCount int `json:"removed_contributor_count"`
	// PreselectedContributorCount zaehlt die theme_segment_contributors-Zeilen, die als
	// einmalige GAP-07-Vorauswahl (Phase 156, Plan 156-18, 156-UAT.md GAP-07) in diesem Aufruf
	// NEU eingefuegt wurden -- 0, wenn das Segment bereits initialisiert war, die Origin nil
	// blieb, oder kein effektiver Contributor der Origin eine segment-relevante Rolle haelt.
	PreselectedContributorCount int `json:"preselected_contributor_count"`
}

// ThemeSegmentAssignmentConflict describes an occupied slot without changing its assignment.
type ThemeSegmentAssignmentConflict struct {
	ReleaseVersionID  int64  `json:"release_version_id"`
	EpisodeNumber     string `json:"episode_number"`
	ExistingSegmentID int64  `json:"existing_segment_id"`
}

// AdminThemeSegmentContributorCandidate ist ein Eintrag der Admin-Kandidatenliste fuer
// Segment-Contributor-Auswahl (Phase 156, Plan 156-12/GAP-01): jede Person, die aktuell
// effektiver Beitragender der Origin-Release-Version des Segments ist (unfiltered by
// permissions.SegmentCreditRoleCodes -- ein Encoder-only-Beitragender ist bewusst
// referenzierbar, siehe 156-UAT.md Regressionsfall D), mit Selected je nach aktuellem
// theme_segment_contributors-Eintrag.
type AdminThemeSegmentContributorCandidate struct {
	MemberID   int64    `json:"member_id"`
	Name       string   `json:"name"`
	AvatarURL  *string  `json:"avatar_url"`
	RoleLabel  string   `json:"role_label"`
	RoleCodes  []string `json:"role_codes"`
	MemberSlug *string  `json:"member_slug"`
	Selected   bool     `json:"selected"`
}

type SegmentLibraryIdentityStatus string

const (
	SegmentLibraryIdentityStatusVerified         SegmentLibraryIdentityStatus = "verified"
	SegmentLibraryIdentityStatusLegacyUnverified SegmentLibraryIdentityStatus = "legacy_unverified"
)

type SegmentLibraryOwnershipScope string

const (
	SegmentLibraryOwnershipScopeReusable  SegmentLibraryOwnershipScope = "reusable"
	SegmentLibraryOwnershipScopeLocalOnly SegmentLibraryOwnershipScope = "local_only"
)

type SegmentLibraryAttachSource string

const (
	SegmentLibraryAttachSourceMigrated     SegmentLibraryAttachSource = "migrated"
	SegmentLibraryAttachSourceUpload       SegmentLibraryAttachSource = "upload"
	SegmentLibraryAttachSourceReuse        SegmentLibraryAttachSource = "reuse"
	SegmentLibraryAttachSourceManualLink   SegmentLibraryAttachSource = "manual_link"
	SegmentLibraryAttachSourceLocalSegment SegmentLibraryAttachSource = "local_segment"
	SegmentLibraryAttachSourceReuseAttach  SegmentLibraryAttachSource = "reuse_attach"
	SegmentLibraryAttachSourceReimportBind SegmentLibraryAttachSource = "reimport_rebind"
)

type SegmentLibraryDefinition struct {
	ID                    int64                        `json:"id"`
	AnimeSourceProvider   string                       `json:"anime_source_provider"`
	AnimeSourceExternalID string                       `json:"anime_source_external_id"`
	FansubGroupID         int64                        `json:"fansub_group_id"`
	SegmentKind           string                       `json:"segment_kind"`
	SegmentName           *string                      `json:"segment_name,omitempty"`
	NormalizedSegmentName string                       `json:"normalized_segment_name"`
	IdentityStatus        SegmentLibraryIdentityStatus `json:"identity_status"`
	OwnershipScope        SegmentLibraryOwnershipScope `json:"ownership_scope"`
	CreatedAt             time.Time                    `json:"created_at"`
	UpdatedAt             time.Time                    `json:"updated_at"`
}

type SegmentLibraryAsset struct {
	ID           int64                      `json:"id"`
	DefinitionID int64                      `json:"definition_id"`
	MediaAssetID *int64                     `json:"media_asset_id,omitempty"`
	SourceRef    string                     `json:"source_ref"`
	SourceLabel  *string                    `json:"source_label,omitempty"`
	AttachSource SegmentLibraryAttachSource `json:"attach_source"`
	IsPrimary    bool                       `json:"is_primary"`
	CreatedAt    time.Time                  `json:"created_at"`
}

type SegmentLibraryAssignment struct {
	ID             int64                      `json:"id"`
	DefinitionID   int64                      `json:"definition_id"`
	AssetID        *int64                     `json:"asset_id,omitempty"`
	AnimeID        *int64                     `json:"anime_id,omitempty"`
	ThemeSegmentID *int64                     `json:"theme_segment_id,omitempty"`
	ReleaseVersion *string                    `json:"release_version,omitempty"`
	AttachSource   SegmentLibraryAttachSource `json:"attach_source"`
	AttachedAt     time.Time                  `json:"attached_at"`
	DetachedAt     *time.Time                 `json:"detached_at,omitempty"`
}

type SegmentLibraryCandidate struct {
	DefinitionID          int64                        `json:"definition_id"`
	AssetID               int64                        `json:"asset_id"`
	MediaAssetID          *int64                       `json:"media_asset_id,omitempty"`
	AnimeSourceProvider   string                       `json:"anime_source_provider"`
	AnimeSourceExternalID string                       `json:"anime_source_external_id"`
	FansubGroupID         int64                        `json:"fansub_group_id"`
	SegmentKind           string                       `json:"segment_kind"`
	SegmentName           *string                      `json:"segment_name,omitempty"`
	IdentityStatus        SegmentLibraryIdentityStatus `json:"identity_status"`
	OwnershipScope        SegmentLibraryOwnershipScope `json:"ownership_scope"`
	SourceRef             string                       `json:"source_ref"`
	SourceLabel           *string                      `json:"source_label,omitempty"`
	AssetAttachSource     SegmentLibraryAttachSource   `json:"asset_attach_source"`
	CurrentAttachSource   *SegmentLibraryAttachSource  `json:"current_attach_source,omitempty"`
	ActiveAssignmentCount int32                        `json:"active_assignment_count"`
	LastAttachedAt        *time.Time                   `json:"last_attached_at,omitempty"`
}

type SegmentLibraryAttachInput struct {
	AssetID int64 `json:"asset_id"`
}
