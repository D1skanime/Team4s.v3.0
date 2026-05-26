package auth

import (
	"encoding/json"
	"testing"
	"time"
)

func testKeycloakVerifier(now time.Time) *KeycloakVerifier {
	return &KeycloakVerifier{
		issuerURL:   "http://127.0.0.1:8081/realms/team4s",
		clientID:    "team4s-frontend",
		apiAudience: "team4s-api",
		now:         func() time.Time { return now },
	}
}

func validAccessClaims(now time.Time) keycloakAccessTokenClaims {
	return keycloakAccessTokenClaims{
		Issuer:            "http://127.0.0.1:8081/realms/team4s",
		Subject:           "kc-sub-1",
		Audience:          audienceClaim{"account", "team4s-api"},
		ExpiresAt:         now.Add(5 * time.Minute).Unix(),
		Type:              "Bearer",
		AuthorizedParty:   "team4s-frontend",
		Email:             "phase43-admin@example.local",
		Name:              "Phase Admin",
		PreferredUsername: "phase43-admin",
		SessionID:         "sid-1",
	}
}

func TestKeycloakAccessTokenClaimValidationAcceptsAPIAudience(t *testing.T) {
	now := time.Unix(1710000000, 0)
	expiresAt, err := testKeycloakVerifier(now).validateAccessClaims(validAccessClaims(now))
	if err != nil {
		t.Fatalf("expected valid access token claims, got %v", err)
	}
	if !expiresAt.Equal(time.Unix(now.Add(5*time.Minute).Unix(), 0)) {
		t.Fatalf("unexpected expiry: %v", expiresAt)
	}
}

func TestKeycloakAccessTokenClaimValidationRejectsIDTokenAudience(t *testing.T) {
	now := time.Unix(1710000000, 0)
	claims := validAccessClaims(now)
	claims.Type = "ID"
	claims.Audience = audienceClaim{"team4s-frontend"}

	_, err := testKeycloakVerifier(now).validateAccessClaims(claims)
	if err == nil {
		t.Fatalf("expected id token to be rejected")
	}
}

func TestKeycloakAccessTokenClaimValidationRejectsWrongAudience(t *testing.T) {
	now := time.Unix(1710000000, 0)
	claims := validAccessClaims(now)
	claims.Audience = audienceClaim{"account"}

	_, err := testKeycloakVerifier(now).validateAccessClaims(claims)
	if err == nil {
		t.Fatalf("expected token without api audience to be rejected")
	}
}

func TestKeycloakAccessTokenClaimValidationRejectsWrongIssuer(t *testing.T) {
	now := time.Unix(1710000000, 0)
	claims := validAccessClaims(now)
	claims.Issuer = "http://evil.example/realms/team4s"

	_, err := testKeycloakVerifier(now).validateAccessClaims(claims)
	if err == nil {
		t.Fatalf("expected wrong issuer to be rejected")
	}
}

func TestKeycloakAccessTokenClaimValidationRejectsExpiredToken(t *testing.T) {
	now := time.Unix(1710000000, 0)
	claims := validAccessClaims(now)
	claims.ExpiresAt = now.Add(-1 * time.Second).Unix()

	_, err := testKeycloakVerifier(now).validateAccessClaims(claims)
	if err == nil {
		t.Fatalf("expected expired token to be rejected")
	}
}

func TestKeycloakAccessTokenClaimValidationRejectsWrongAuthorizedParty(t *testing.T) {
	now := time.Unix(1710000000, 0)
	claims := validAccessClaims(now)
	claims.AuthorizedParty = "other-client"

	_, err := testKeycloakVerifier(now).validateAccessClaims(claims)
	if err == nil {
		t.Fatalf("expected wrong authorized party to be rejected")
	}
}

func TestAudienceClaimAcceptsStringAndArray(t *testing.T) {
	var single audienceClaim
	if err := json.Unmarshal([]byte(`"team4s-api"`), &single); err != nil {
		t.Fatalf("decode string audience: %v", err)
	}
	if !single.Contains("team4s-api") {
		t.Fatalf("expected string audience to contain team4s-api")
	}

	var many audienceClaim
	if err := json.Unmarshal([]byte(`["account","team4s-api"]`), &many); err != nil {
		t.Fatalf("decode array audience: %v", err)
	}
	if !many.Contains("team4s-api") {
		t.Fatalf("expected array audience to contain team4s-api")
	}
}
