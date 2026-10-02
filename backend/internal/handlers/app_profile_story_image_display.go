package handlers

// Phase 173-06 Task 1: story-image display-variant constants (D-15 fix).
//
// UploadOwnProfileStoryImage now writes TWO files per upload: a true 1:1 original
// (EXIF-stripped only, never resized) and a long-edge-capped display file that keeps
// playing the role the old 1600px "original" file used to play -- media_assets.file_path
// still points at this capped file, so the embedded <img src> in rendered story HTML is
// unaffected. The actual resize/encode logic is 173-05's capLongEdgeAndSaveJPEG
// (app_profile_display.go, same package) -- reused directly here rather than duplicated.
// Kept as a dedicated sibling file (not inside app_profile_story_image.go, which must stay
// under the CLAUDE.md 450-line limit) and with story-image-specific constant names to avoid
// confusion with the identically-shaped avatar/background constants
// (profileDisplayMaxLongEdge/profileDisplayJPEGQuality) already defined there.
const (
	storyImageDisplayLongEdge    = 1920
	storyImageDisplayJPEGQuality = 88
)
