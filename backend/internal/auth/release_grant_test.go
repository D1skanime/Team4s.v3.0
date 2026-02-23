package auth

import (
	"testing"
	"time"
)

func TestReleaseStreamGrant_CreateAndVerify(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, expiresAt, err := CreateReleaseStreamGrant(42, 7, "secret", now, 2*time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}
	if token == "" {
		t.Fatalf("expected token")
	}
	if expiresAt <= now.Unix() {
		t.Fatalf("expected future expiry")
	}

	claims, err := ParseAndVerifyReleaseStreamGrant(token, "secret", now.Add(30*time.Second))
	if err != nil {
		t.Fatalf("verify grant: %v", err)
	}
	if claims.ReleaseID != 42 {
		t.Fatalf("unexpected release id: %d", claims.ReleaseID)
	}
	if claims.UserID != 7 {
		t.Fatalf("unexpected user id: %d", claims.UserID)
	}
}

func TestReleaseStreamGrant_Expired(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, _, err := CreateReleaseStreamGrant(42, 7, "secret", now, time.Second)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	_, err = ParseAndVerifyReleaseStreamGrant(token, "secret", now.Add(2*time.Second))
	if err != ErrReleaseGrantExpired {
		t.Fatalf("expected ErrReleaseGrantExpired, got %v", err)
	}
}

func TestReleaseStreamGrant_InvalidSignature(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, _, err := CreateReleaseStreamGrant(42, 7, "secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	_, err = ParseAndVerifyReleaseStreamGrant(token, "wrong-secret", now)
	if err != ErrReleaseGrantSignature {
		t.Fatalf("expected ErrReleaseGrantSignature, got %v", err)
	}
}
