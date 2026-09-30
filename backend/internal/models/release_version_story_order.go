package models

// ReleaseVersionStoryItemType identifies one domain that may appear in the
// release-version story order. The order never owns either domain object.
type ReleaseVersionStoryItemType string

const (
	ReleaseVersionStoryItemMedia ReleaseVersionStoryItemType = "media"
	ReleaseVersionStoryItemKara  ReleaseVersionStoryItemType = "kara"
)
