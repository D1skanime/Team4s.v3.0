package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"team4s.v3/backend/internal/observability"

	"github.com/gin-gonic/gin"
)

const testAuthSecret = "unit-test-secret"

type testSignedTokenPayload struct {
	UserID      int64  `json:"user_id"`
	DisplayName string `json:"display_name"`
	SessionID   string `json:"sid,omitempty"`
	ExpiresAt   int64  `json:"exp"`
}

type authCheckerStub struct {
	revoked       bool
	sessionActive bool
	checkTokenErr error
	checkSidErr   error
}

func (s authCheckerStub) IsAccessTokenRevoked(_ context.Context, _ string) (bool, error) {
	if s.checkTokenErr != nil {
		return false, s.checkTokenErr
	}

	return s.revoked, nil
}

func (s authCheckerStub) IsSessionActive(_ context.Context, _ string) (bool, error) {
	if s.checkSidErr != nil {
		return false, s.checkSidErr
	}

	return s.sessionActive, nil
}

func TestCommentAuthMiddlewareMissingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/comments", CommentAuthMiddleware(testAuthSecret), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareRejectsInvalidScheme(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/comments", CommentAuthMiddleware(testAuthSecret), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, "Token abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareRejectsInvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/comments", CommentAuthMiddleware(testAuthSecret), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      7,
		DisplayName: "Nico",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, "different-secret")

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareRejectsExpiredToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/comments", CommentAuthMiddleware(testAuthSecret), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      9,
		DisplayName: "Nico",
		ExpiresAt:   time.Now().Add(-time.Minute).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareSetsContextIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/comments", CommentAuthMiddleware(testAuthSecret), func(c *gin.Context) {
		identity, ok := CommentAuthIdentityFromContext(c)
		if !ok {
			t.Fatalf("expected identity in context")
		}
		if identity.UserID != 11 {
			t.Fatalf("expected user id %d, got %d", 11, identity.UserID)
		}
		if identity.DisplayName != "Nico" {
			t.Fatalf("expected display name %q, got %q", "Nico", identity.DisplayName)
		}
		if identity.SessionID != "session-11" {
			t.Fatalf("expected session id %q, got %q", "session-11", identity.SessionID)
		}
		c.Status(http.StatusCreated)
	})

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      11,
		DisplayName: " Nico ",
		SessionID:   "session-11",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, rec.Code)
	}
}

func TestCommentAuthMiddlewareRejectsRevokedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST(
		"/comments",
		CommentAuthMiddlewareWithState(testAuthSecret, authCheckerStub{revoked: true, sessionActive: true}),
		func(c *gin.Context) {
			c.Status(http.StatusCreated)
		},
	)

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      17,
		DisplayName: "Nico",
		SessionID:   "session-17",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareRejectsInactiveSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST(
		"/comments",
		CommentAuthMiddlewareWithState(testAuthSecret, authCheckerStub{revoked: false, sessionActive: false}),
		func(c *gin.Context) {
			c.Status(http.StatusCreated)
		},
	)

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      19,
		DisplayName: "Nico",
		SessionID:   "session-19",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestCommentAuthMiddlewareStateCheckErrorReturnsServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	before := observability.GetDegradedCounters()
	router := gin.New()
	router.POST(
		"/comments",
		CommentAuthMiddlewareWithState(
			testAuthSecret,
			authCheckerStub{checkTokenErr: errors.New("redis unavailable"), sessionActive: true},
		),
		func(c *gin.Context) {
			c.Status(http.StatusCreated)
		},
	)

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      23,
		DisplayName: "Nico",
		SessionID:   "session-23",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}

	after := observability.GetDegradedCounters()
	if after.AuthStateUnavailableCommentAuthTotal < before.AuthStateUnavailableCommentAuthTotal+1 {
		t.Fatalf(
			"expected auth state unavailable comment-auth counter to increase by at least 1 (before=%d after=%d)",
			before.AuthStateUnavailableCommentAuthTotal,
			after.AuthStateUnavailableCommentAuthTotal,
		)
	}
}

func TestCommentAuthMiddlewareSessionCheckErrorReturnsServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	before := observability.GetDegradedCounters()
	router := gin.New()
	router.POST(
		"/comments",
		CommentAuthMiddlewareWithState(
			testAuthSecret,
			authCheckerStub{checkSidErr: errors.New("redis unavailable"), sessionActive: true},
		),
		func(c *gin.Context) {
			c.Status(http.StatusCreated)
		},
	)

	token := makeSignedToken(t, testSignedTokenPayload{
		UserID:      29,
		DisplayName: "Nico",
		SessionID:   "session-29",
		ExpiresAt:   time.Now().Add(time.Hour).Unix(),
	}, testAuthSecret)

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req.Header.Set(commentAuthAuthorizationHeader, commentAuthBearerPrefix+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}

	after := observability.GetDegradedCounters()
	if after.AuthStateUnavailableCommentAuthTotal < before.AuthStateUnavailableCommentAuthTotal+1 {
		t.Fatalf(
			"expected auth state unavailable comment-auth counter to increase by at least 1 (before=%d after=%d)",
			before.AuthStateUnavailableCommentAuthTotal,
			after.AuthStateUnavailableCommentAuthTotal,
		)
	}
}

func makeSignedToken(t *testing.T, payload testSignedTokenPayload, secret string) string {
	t.Helper()

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	payloadSegment := base64.RawURLEncoding.EncodeToString(payloadBytes)
	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		t.Fatalf("sign payload: %v", err)
	}
	signatureSegment := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payloadSegment + "." + signatureSegment
}
