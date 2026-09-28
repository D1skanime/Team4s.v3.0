package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestReleaseVersionMediaHighlightHandlersRequireAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		run  func(*AdminContentHandler, *gin.Context)
	}{
		{
			name: "set or remove highlight",
			run: func(h *AdminContentHandler, c *gin.Context) {
				h.SetReleaseVersionMediaHighlight(c)
			},
		},
		{
			name: "reorder highlights",
			run: func(h *AdminContentHandler, c *gin.Context) {
				h.ReorderReleaseVersionMediaHighlights(c)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequest(http.MethodPut, "/release-versions/41/media/1/highlight", nil)
			ctx.Params = gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: "1"}}

			tt.run(&AdminContentHandler{}, ctx)

			require.Equal(t, http.StatusUnauthorized, recorder.Code)
		})
	}
}