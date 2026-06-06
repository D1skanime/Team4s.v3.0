package models_test

// Lock-K-Konformitäts-Test: MediaAssetCreateInput muss VisibilityCode und ReviewStatusCode enthalten.
// RED-Phase: schlägt fehl bis die Felder in media.go ergänzt werden.

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"team4s.v3/backend/internal/models"
)

func TestMediaAssetCreateInput_HasVisibilityAndReviewStatusFields(t *testing.T) {
	// Test: VisibilityCode und ReviewStatusCode sind optional (*string)
	vis := "public"
	rev := "approved"

	input := models.MediaAssetCreateInput{
		Kind:             models.MediaKindLogo,
		Filename:         "logo.png",
		StoragePath:      "/media/logo.png",
		PublicURL:        "http://example.com/logo.png",
		MimeType:         "image/png",
		SizeBytes:        1024,
		VisibilityCode:   &vis,
		ReviewStatusCode: &rev,
	}

	assert.NotNil(t, input.VisibilityCode, "VisibilityCode sollte gesetzt sein")
	assert.Equal(t, "public", *input.VisibilityCode)
	assert.NotNil(t, input.ReviewStatusCode, "ReviewStatusCode sollte gesetzt sein")
	assert.Equal(t, "approved", *input.ReviewStatusCode)
}

func TestMediaAssetCreateInput_VisibilityAndReviewStatusAreOptional(t *testing.T) {
	// nil bedeutet: Backend-Default verwenden
	input := models.MediaAssetCreateInput{
		Kind:        models.MediaKindImage,
		Filename:    "image.jpg",
		StoragePath: "/media/image.jpg",
		MimeType:    "image/jpeg",
		SizeBytes:   512,
	}

	assert.Nil(t, input.VisibilityCode, "VisibilityCode sollte nil sein wenn nicht gesetzt")
	assert.Nil(t, input.ReviewStatusCode, "ReviewStatusCode sollte nil sein wenn nicht gesetzt")
}
