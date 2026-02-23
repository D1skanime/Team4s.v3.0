package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestResolveTrustedIssueIdentity_DevMode(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name             string
		config           AuthIssueConfig
		headers          map[string]string
		wantStatusCode   int
		wantUserID       int64
		wantDisplayName  string
		wantErrorMessage string
	}{
		{
			name: "dev mode disabled requires trusted auth",
			config: AuthIssueConfig{
				DevMode: false,
			},
			wantStatusCode:   http.StatusUnauthorized,
			wantErrorMessage: authIssueRequiredMessage,
		},
		{
			name: "dev mode enabled returns configured identity",
			config: AuthIssueConfig{
				DevMode:        true,
				DevUserID:      7,
				DevDisplayName: "  Nico  ",
			},
			wantUserID:      7,
			wantDisplayName: "Nico",
		},
		{
			name: "dev mode with key requires header",
			config: AuthIssueConfig{
				DevMode:        true,
				DevUserID:      7,
				DevDisplayName: "Nico",
				DevKey:         "issue-secret",
			},
			wantStatusCode:   http.StatusUnauthorized,
			wantErrorMessage: authIssueRequiredMessage,
		},
		{
			name: "dev mode with key accepts valid header",
			config: AuthIssueConfig{
				DevMode:        true,
				DevUserID:      7,
				DevDisplayName: "Nico",
				DevKey:         "issue-secret",
			},
			headers: map[string]string{
				authIssueDevKeyHeader: "issue-secret",
			},
			wantUserID:      7,
			wantDisplayName: "Nico",
		},
		{
			name: "invalid dev identity config returns server error",
			config: AuthIssueConfig{
				DevMode:        true,
				DevUserID:      0,
				DevDisplayName: "Nico",
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantErrorMessage: "interner serverfehler",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			handler := &AuthHandler{
				issueConfig: tc.config,
			}

			c := newAuthIssueTestContext(tc.headers)
			userID, displayName, statusCode, message := handler.resolveTrustedIssueIdentity(c, time.Now().UTC())

			if statusCode != tc.wantStatusCode {
				t.Fatalf("expected status code %d, got %d", tc.wantStatusCode, statusCode)
			}
			if message != tc.wantErrorMessage {
				t.Fatalf("expected message %q, got %q", tc.wantErrorMessage, message)
			}
			if userID != tc.wantUserID {
				t.Fatalf("expected user id %d, got %d", tc.wantUserID, userID)
			}
			if displayName != tc.wantDisplayName {
				t.Fatalf("expected display name %q, got %q", tc.wantDisplayName, displayName)
			}
		})
	}
}

func newAuthIssueTestContext(headers map[string]string) *gin.Context {
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/issue", nil)
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = req
	return ctx
}
