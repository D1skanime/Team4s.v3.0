package models

import "time"

type ContributorGroupCapabilities struct {
	CanOpenContributorGroup    bool `json:"can_open_contributor_group"`
	CanEditGroup               bool `json:"can_edit_group"`
	CanViewGroupMedia          bool `json:"can_view_group_media"`
	CanUploadGroupMedia        bool `json:"can_upload_group_media"`
	CanViewReleases            bool `json:"can_view_releases"`
	CanEditReleaseDescriptions bool `json:"can_edit_release_descriptions"`
	CanUploadReleaseMedia      bool `json:"can_upload_release_media"`
	CanManageMembers           bool `json:"can_manage_members"`
}

type ContributorGroupQueryInput struct {
	AppUserID       int64
	LegacyUserID    *int64
	IsPlatformAdmin bool
}

type ContributorGroupOverview struct {
	ID                  int64                        `json:"id"`
	Slug                string                       `json:"slug"`
	Name                string                       `json:"name"`
	Status              string                       `json:"status"`
	GroupType           string                       `json:"group_type"`
	LogoURL             *string                      `json:"logo_url,omitempty"`
	BannerURL           *string                      `json:"banner_url,omitempty"`
	FansubName          string                       `json:"fansub_name"`
	MembershipStatus    string                       `json:"membership_status"`
	AppMemberStatus     *string                      `json:"app_member_status,omitempty"`
	AppMemberRoles      []string                     `json:"app_member_roles"`
	JoinedYear          *int32                       `json:"joined_year,omitempty"`
	LeftYear            *int32                       `json:"left_year,omitempty"`
	ActiveFrom          *time.Time                   `json:"active_from,omitempty"`
	ActiveUntil         *time.Time                   `json:"active_until,omitempty"`
	HasHistoricalLink   bool                         `json:"has_historical_link"`
	AnimeCount          int                          `json:"anime_count"`
	ReleaseCount        int                          `json:"release_count"`
	ReleaseVersionCount int                          `json:"release_version_count"`
	GroupMediaCount     int                          `json:"group_media_count"`
	Capabilities        ContributorGroupCapabilities `json:"capabilities"`
}

type ContributorAnimeSummary struct {
	ID                  int64                              `json:"id"`
	Title               string                             `json:"title"`
	Type                string                             `json:"type"`
	HeaderImage         *string                            `json:"header_image,omitempty"`
	CoverImage          *string                            `json:"cover_image,omitempty"`
	ReleaseCount        int                                `json:"release_count"`
	ReleaseVersionCount int                                `json:"release_version_count"`
	Releases            []ContributorReleaseVersionSummary `json:"releases"`
}

type ContributorReleaseVersionSummary struct {
	ReleaseID        int64      `json:"release_id"`
	ReleaseVersionID int64      `json:"release_version_id"`
	Version          string     `json:"version"`
	AnimeID          int64      `json:"anime_id"`
	AnimeTitle       string     `json:"anime_title"`
	EpisodeID        int64      `json:"episode_id"`
	EpisodeNumber    string     `json:"episode_number"`
	EpisodeTitle     *string    `json:"episode_title,omitempty"`
	ReleaseDate      *time.Time `json:"release_date,omitempty"`
	DurationSeconds  *int32     `json:"duration_seconds,omitempty"`
	MediaCount       int        `json:"media_count"`
	HasThemeAssets   bool       `json:"has_theme_assets"`
	IsCoop           bool       `json:"is_coop"`
}

type ContributorContributionSummary struct {
	FansubGroupID   int64  `json:"fansub_group_id"`
	FansubGroupName string `json:"fansub_group_name"`
	RoleName        string `json:"role_name"`
	RoleLabel       string `json:"role_label"`
	ReleaseCount    int32  `json:"release_count"`
}

type ContributorGroupDetail struct {
	Group         ContributorGroupOverview         `json:"group"`
	Anime         []ContributorAnimeSummary        `json:"anime"`
	Contributions []ContributorContributionSummary `json:"contributions"`
}
