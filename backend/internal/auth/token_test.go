package auth

import (
	"testing"
	"time"
)

func TestCreateAndParseSignedToken(t *testing.T) {
	now := time.Now().UTC()
	token, expiresAt, err := CreateSignedToken(Claims{
		UserID:      42,
		DisplayName: "Nico",
		SessionID:   "session-42",
	}, "test-secret", now, 10*time.Minute)
	if err != nil {
		t.Fatalf("create signed token: %v", err)
	}
	if expiresAt <= now.Unix() {
		t.Fatalf("expected future expiry, got %d", expiresAt)
	}

	claims, err := ParseAndVerifySignedToken(token, "test-secret", now)
	if err != nil {
		t.Fatalf("parse signed token: %v", err)
	}
	if claims.UserID != 42 {
		t.Fatalf("expected user id %d, got %d", 42, claims.UserID)
	}
	if claims.DisplayName != "Nico" {
		t.Fatalf("expected display name %q, got %q", "Nico", claims.DisplayName)
	}
	if claims.SessionID != "session-42" {
		t.Fatalf("expected session id %q, got %q", "session-42", claims.SessionID)
	}
}

func TestParseAndVerifySignedTokenRejectsExpired(t *testing.T) {
	now := time.Now().UTC()
	token, _, err := CreateSignedToken(Claims{
		UserID:      1,
		DisplayName: "Nico",
	}, "test-secret", now.Add(-2*time.Minute), time.Minute)
	if err != nil {
		t.Fatalf("create signed token: %v", err)
	}

	_, err = ParseAndVerifySignedToken(token, "test-secret", now)
	if err == nil {
		t.Fatalf("expected expired token error")
	}
	if err != ErrTokenExpired {
		t.Fatalf("expected %v, got %v", ErrTokenExpired, err)
	}
}
