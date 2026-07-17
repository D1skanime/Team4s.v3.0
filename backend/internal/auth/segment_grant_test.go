package auth

import (
	"testing"
	"time"
)

func TestSegmentStreamGrant_CreateAndVerify(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, expiresAt, err := CreateSegmentStreamGrant(123, 7, "render-cache-key", "secret", now, 2*time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}
	if token == "" {
		t.Fatalf("expected token")
	}
	if expiresAt <= now.Unix() {
		t.Fatalf("expected future expiry")
	}

	claims, err := ParseAndVerifySegmentStreamGrant(token, "secret", now.Add(30*time.Second))
	if err != nil {
		t.Fatalf("verify grant: %v", err)
	}
	if claims.SegmentID != 123 {
		t.Fatalf("unexpected segment id: %d", claims.SegmentID)
	}
	if claims.UserID != 7 {
		t.Fatalf("unexpected user id: %d", claims.UserID)
	}
	if claims.CacheKey != "render-cache-key" {
		t.Fatalf("unexpected cache key: %q", claims.CacheKey)
	}
}

func TestSegmentStreamGrant_Expired(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, _, err := CreateSegmentStreamGrant(123, 7, "", "secret", now, time.Second)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	_, err = ParseAndVerifySegmentStreamGrant(token, "secret", now.Add(2*time.Second))
	if err != ErrSegmentGrantExpired {
		t.Fatalf("expected ErrSegmentGrantExpired, got %v", err)
	}
}

func TestSegmentStreamGrant_InvalidSignature(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, _, err := CreateSegmentStreamGrant(123, 7, "", "secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	_, err = ParseAndVerifySegmentStreamGrant(token, "wrong-secret", now)
	if err != ErrSegmentGrantSignature {
		t.Fatalf("expected ErrSegmentGrantSignature, got %v", err)
	}
}

func TestSegmentStreamGrant_RejectsInvalidPayload(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	cases := []struct {
		name      string
		segmentID int64
		userID    int64
		ttl       time.Duration
	}{
		{name: "missing segment", segmentID: 0, userID: 7, ttl: time.Minute},
		{name: "missing user", segmentID: 123, userID: 0, ttl: time.Minute},
		{name: "missing ttl", segmentID: 123, userID: 7, ttl: 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := CreateSegmentStreamGrant(tc.segmentID, tc.userID, "", "secret", now, tc.ttl)
			if err != ErrSegmentGrantPayload {
				t.Fatalf("expected ErrSegmentGrantPayload, got %v", err)
			}
		})
	}
}

func TestPublicSegmentStreamGrant_CreateAndVerifyBoundClaims(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	token, _, err := CreatePublicSegmentStreamGrant(123, 17, "render-cache-key", "secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create public grant: %v", err)
	}

	claims, err := ParseAndVerifyPublicSegmentStreamGrant(token, "secret", now.Add(10*time.Second))
	if err != nil {
		t.Fatalf("verify public grant: %v", err)
	}
	if claims.SegmentID != 123 || claims.ReleaseVersionID != 17 || claims.CacheKey != "render-cache-key" {
		t.Fatalf("unexpected public claims: %+v", claims)
	}
}

func TestPublicSegmentStreamGrant_IsRejectedByLegacyAndReleaseParsers(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	publicToken, _, err := CreatePublicSegmentStreamGrant(123, 17, "", "secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create public grant: %v", err)
	}
	if _, err := ParseAndVerifySegmentStreamGrant(publicToken, "secret", now); err != ErrSegmentGrantPayload {
		t.Fatalf("legacy segment parser accepted public token: %v", err)
	}
	if _, err := ParseAndVerifyReleaseStreamGrant(publicToken, "secret", now); err != ErrReleaseGrantPayload {
		t.Fatalf("release parser accepted public token: %v", err)
	}

	legacyToken, _, err := CreateSegmentStreamGrant(123, 7, "", "secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create legacy grant: %v", err)
	}
	if _, err := ParseAndVerifyPublicSegmentStreamGrant(legacyToken, "secret", now); err != ErrSegmentGrantPayload {
		t.Fatalf("public parser accepted legacy token: %v", err)
	}
}

func TestPublicSegmentStreamGrant_RejectsExpiryAndInvalidBinding(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	if _, _, err := CreatePublicSegmentStreamGrant(123, 0, "", "secret", now, time.Minute); err != ErrSegmentGrantPayload {
		t.Fatalf("expected invalid release binding, got %v", err)
	}
	token, _, err := CreatePublicSegmentStreamGrant(123, 17, "", "secret", now, time.Second)
	if err != nil {
		t.Fatalf("create public grant: %v", err)
	}
	if _, err := ParseAndVerifyPublicSegmentStreamGrant(token, "secret", now.Add(2*time.Second)); err != ErrSegmentGrantExpired {
		t.Fatalf("expected expired public grant, got %v", err)
	}
}
