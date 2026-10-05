package handlers

// This file holds the small set of package-level constants and allow-lists shared across the
// release-version-media sibling files (upload, category, patch, replace): file/image size and
// GIF-frame limits, the MIME allow-list, and the category allow-lists. Everything else that used
// to live here (upload, permission-annotation, list, patch, delete, capabilities) has been split
// into admin_content_release_version_media_{upload,permissions,list,patch,delete,capabilities}.go
// following the project's existing rvm-prefix sibling-file convention (D-16).

const (
	rvmMaxFileSizeBytes  = 15 * 1024 * 1024 // 15 MB
	rvmMaxFilesPerUpload = 20
	rvmMaxImageWidth     = 8000
	rvmMaxImageHeight    = 8000
	rvmMaxGIFFrames      = 300
	rvmThumbnailWidth    = 400
)

var rvmAllowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

var rvmValidCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
	"fun_outtake":         true,
	"other":               true,
}

var rvmPreviewAllowedCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
}

