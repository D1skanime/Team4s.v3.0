package handlers

// This file exists to keep the display-variant call-site glue for
// ReplaceReleaseVersionMediaFile out of the already-oversized
// admin_content_release_version_media_replace.go (454 lines, over CLAUDE.md's 450-line
// per-file cap), mirroring the Phase 172 theme_segment_preview.go ->
// theme_segment_preview_writes.go split precedent (also used by 173-02's
// admin_content_release_version_media_display.go split).

import "path/filepath"

// rvmReplaceDisplayPath builds the on-disk path for a replace request's new "display" media
// variant, matching the "display.<ext>" naming generateRVMDisplay/processOneRVMFile already use
// for the upload path (173-02). ext is whatever generateRVMDisplay returned for this file (jpg,
// png, webp, or gif -- Phase 173 review-korrektur: display is no longer unconditionally JPEG,
// see D-18/D-19). Kept as a tiny named helper so the replace handler's own diff stays limited to
// call sites.
func rvmReplaceDisplayPath(assetDir string, ext string) string {
	return filepath.Join(assetDir, "display."+ext)
}
