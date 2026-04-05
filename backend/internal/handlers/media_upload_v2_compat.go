package handlers

import (
	"context"

	"team4s.v3/backend/internal/models"
)

type legacyUploadSchemaDetector interface {
	SupportsLegacyUploadSchema(ctx context.Context) (bool, error)
}

func (h *MediaUploadHandler) shouldUseAnimePosterPathFallback(ctx context.Context, req models.UploadRequest) (bool, error) {
	_ = ctx
	if req.EntityType != "anime" || req.AssetType != "cover" {
		return false, nil
	}

	// Phase 6+ is V2-first: anime cover uploads must always persist a real media
	// asset so the later assign step can link the uploaded asset by ID.
	return false, nil
}
