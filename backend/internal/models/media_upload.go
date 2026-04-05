package models

import "time"

// UploadMediaAsset represents a media upload asset in the database
type UploadMediaAsset struct {
	ID         string    `json:"id"`
	EntityType string    `json:"entity_type"`
	EntityID   int64     `json:"entity_id"`
	AssetType  string    `json:"asset_type"`
	Format     string    `json:"format"` // 'image' or 'video'
	MimeType   string    `json:"mime_type"`
	UploadedBy *int64    `json:"uploaded_by,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	FilePath   string    `json:"-"`
	MediaType  string    `json:"-"`
}

// UploadMediaFile represents a variant of a media asset (original, thumb)
type UploadMediaFile struct {
	ID      int64  `json:"id"`
	MediaID string `json:"media_id"`
	Variant string `json:"variant"` // 'original' or 'thumb'
	Path    string `json:"path"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Size    int64  `json:"size"`
}

// UploadRequest represents the incoming upload request
type UploadRequest struct {
	EntityType string `form:"entity_type" binding:"required"`
	EntityID   int64  `form:"entity_id" binding:"required"`
	AssetType  string `form:"asset_type" binding:"required"`
}

// UploadResponse represents the response after successful upload
type UploadResponse struct {
	ID           string              `json:"id"`
	Status       string              `json:"status"`
	Files        []UploadFileInfo    `json:"files"`
	URL          string              `json:"url"`
	Provisioning *ProvisioningResult `json:"provisioning,omitempty"`
}

// UploadFileInfo contains information about an uploaded file variant
type UploadFileInfo struct {
	Variant string `json:"variant"`
	Path    string `json:"path"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
}
