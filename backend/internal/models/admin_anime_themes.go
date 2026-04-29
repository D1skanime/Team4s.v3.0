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
	ID                   int64     `json:"id"`
	ThemeID              int64     `json:"theme_id"`
	AnimeID              int64     `json:"anime_id"`
	ThemeTitle           *string   `json:"theme_title"`
	ThemeTypeName        string    `json:"theme_type_name"`
	FansubGroupID        *int64    `json:"fansub_group_id"`
	Version              string    `json:"version"`
	StartEpisode         *int      `json:"start_episode"`
	EndEpisode           *int      `json:"end_episode"`
	StartTime            *string   `json:"start_time"` // Interval als HH:MM:SS-String
	EndTime              *string   `json:"end_time"`   // Interval als HH:MM:SS-String
	SourceJellyfinItemID *string   `json:"source_jellyfin_item_id"`
	SourceType           *string   `json:"source_type,omitempty"`
	SourceRef            *string   `json:"source_ref,omitempty"`
	SourceLabel          *string   `json:"source_label,omitempty"`
	PlaybackSourceID     *int64    `json:"playback_source_id,omitempty"`
	PlaybackSourceKind   *string   `json:"playback_source_kind,omitempty"`
	PlaybackVariantID    *int64    `json:"playback_release_variant_id,omitempty"`
	PlaybackJellyfinID   *string   `json:"playback_jellyfin_item_id,omitempty"`
	PlaybackMediaAssetID *int64    `json:"playback_media_asset_id,omitempty"`
	PlaybackSourceLabel  *string   `json:"playback_source_label,omitempty"`
	PlaybackStartSeconds *int32    `json:"playback_start_offset_seconds,omitempty"`
	PlaybackEndSeconds   *int32    `json:"playback_end_offset_seconds,omitempty"`
	PlaybackDuration     *int32    `json:"playback_duration_seconds,omitempty"`
	LibraryDefinitionID  *int64    `json:"library_definition_id,omitempty"`
	LibraryAssetID       *int64    `json:"library_asset_id,omitempty"`
	LibrarySegmentKind   *string   `json:"library_segment_kind,omitempty"`
	LibrarySegmentName   *string   `json:"library_segment_name,omitempty"`
	LibraryAnimeProvider *string   `json:"library_anime_source_provider,omitempty"`
	LibraryAnimeExternal *string   `json:"library_anime_source_external_id,omitempty"`
	LibraryIdentity      *string   `json:"library_identity_status,omitempty"`
	LibraryOwnership     *string   `json:"library_ownership_scope,omitempty"`
	LibraryAttachSource  *string   `json:"library_attach_source,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
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
