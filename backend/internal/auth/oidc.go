package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
)

type KeycloakVerifier struct {
	issuerURL      string
	discoveryURL   string
	clientID       string
	apiAudience    string
	accessVerifier *oidc.IDTokenVerifier
	logoutVerifier *oidc.IDTokenVerifier
	now            func() time.Time
}

type KeycloakTokenClaims struct {
	Subject           string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
	SessionID         string `json:"sid"`
}

type keycloakAccessTokenClaims struct {
	Issuer            string        `json:"iss"`
	Subject           string        `json:"sub"`
	Audience          audienceClaim `json:"aud"`
	ExpiresAt         int64         `json:"exp"`
	NotBefore         int64         `json:"nbf"`
	Type              string        `json:"typ"`
	AuthorizedParty   string        `json:"azp"`
	Email             string        `json:"email"`
	EmailVerified     bool          `json:"email_verified"`
	Name              string        `json:"name"`
	PreferredUsername string        `json:"preferred_username"`
	GivenName         string        `json:"given_name"`
	FamilyName        string        `json:"family_name"`
	SessionID         string        `json:"sid"`
}

type KeycloakLogoutTokenClaims struct {
	Subject string         `json:"sub"`
	Session string         `json:"sid"`
	Events  map[string]any `json:"events"`
}

type oidcDiscoveryDocument struct {
	Issuer  string `json:"issuer"`
	JWKSURI string `json:"jwks_uri"`
}

type audienceClaim []string

func (a *audienceClaim) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		*a = audienceClaim{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return err
	}
	*a = audienceClaim(many)
	return nil
}

func (a audienceClaim) Contains(expected string) bool {
	expected = strings.TrimSpace(expected)
	if expected == "" {
		return false
	}
	for _, value := range a {
		if strings.TrimSpace(value) == expected {
			return true
		}
	}
	return false
}

func NewKeycloakVerifier(ctx context.Context, issuerURL string, discoveryURL string, clientID string, apiAudience string) (*KeycloakVerifier, error) {
	trimmedIssuer := strings.TrimSpace(issuerURL)
	trimmedDiscovery := strings.TrimSpace(discoveryURL)
	trimmedClientID := strings.TrimSpace(clientID)
	trimmedAPIAudience := strings.TrimSpace(apiAudience)
	if trimmedIssuer == "" {
		return nil, fmt.Errorf("keycloak verifier: issuer url is required")
	}
	if trimmedDiscovery == "" {
		trimmedDiscovery = trimmedIssuer
	}
	if trimmedClientID == "" {
		return nil, fmt.Errorf("keycloak verifier: client id is required")
	}
	if trimmedAPIAudience == "" {
		return nil, fmt.Errorf("keycloak verifier: api audience is required")
	}

	discoveryDoc, err := fetchOIDCDiscoveryDocument(ctx, trimmedDiscovery)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(discoveryDoc.JWKSURI) == "" {
		return nil, fmt.Errorf("keycloak verifier: discovery document missing jwks_uri")
	}

	keySet := oidc.NewRemoteKeySet(ctx, discoveryDoc.JWKSURI)

	return &KeycloakVerifier{
		issuerURL:    trimmedIssuer,
		discoveryURL: trimmedDiscovery,
		clientID:     trimmedClientID,
		apiAudience:  trimmedAPIAudience,
		accessVerifier: oidc.NewVerifier(trimmedIssuer, keySet, &oidc.Config{
			ClientID: trimmedAPIAudience,
		}),
		logoutVerifier: oidc.NewVerifier(trimmedIssuer, keySet, &oidc.Config{
			ClientID: trimmedClientID,
		}),
		now: time.Now,
	}, nil
}

func fetchOIDCDiscoveryDocument(ctx context.Context, discoveryURL string) (oidcDiscoveryDocument, error) {
	wellKnownURL := strings.TrimRight(discoveryURL, "/") + "/.well-known/openid-configuration"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, wellKnownURL, nil)
	if err != nil {
		return oidcDiscoveryDocument{}, fmt.Errorf("keycloak verifier: create discovery request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return oidcDiscoveryDocument{}, fmt.Errorf("keycloak verifier: discover provider: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return oidcDiscoveryDocument{}, fmt.Errorf("keycloak verifier: discovery endpoint returned %d", resp.StatusCode)
	}

	var doc oidcDiscoveryDocument
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return oidcDiscoveryDocument{}, fmt.Errorf("keycloak verifier: decode discovery document: %w", err)
	}

	return doc, nil
}

func (v *KeycloakVerifier) VerifyAccessToken(ctx context.Context, rawToken string) (KeycloakTokenClaims, time.Time, error) {
	if v == nil {
		return KeycloakTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: verifier is nil")
	}

	token, err := v.accessVerifier.Verify(ctx, strings.TrimSpace(rawToken))
	if err != nil {
		return KeycloakTokenClaims{}, time.Time{}, err
	}

	var rawClaims keycloakAccessTokenClaims
	if err := token.Claims(&rawClaims); err != nil {
		return KeycloakTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: decode access claims: %w", err)
	}

	expiresAt, err := v.validateAccessClaims(rawClaims)
	if err != nil {
		return KeycloakTokenClaims{}, time.Time{}, err
	}

	return KeycloakTokenClaims{
		Subject:           strings.TrimSpace(rawClaims.Subject),
		Email:             strings.TrimSpace(rawClaims.Email),
		EmailVerified:     rawClaims.EmailVerified,
		Name:              strings.TrimSpace(rawClaims.Name),
		PreferredUsername: strings.TrimSpace(rawClaims.PreferredUsername),
		GivenName:         strings.TrimSpace(rawClaims.GivenName),
		FamilyName:        strings.TrimSpace(rawClaims.FamilyName),
		SessionID:         strings.TrimSpace(rawClaims.SessionID),
	}, expiresAt, nil
}

func (v *KeycloakVerifier) validateAccessClaims(claims keycloakAccessTokenClaims) (time.Time, error) {
	now := time.Now()
	if v.now != nil {
		now = v.now()
	}

	if strings.TrimSpace(claims.Issuer) != v.issuerURL {
		return time.Time{}, fmt.Errorf("keycloak verifier: invalid issuer")
	}
	if strings.EqualFold(strings.TrimSpace(claims.Type), "ID") {
		return time.Time{}, fmt.Errorf("keycloak verifier: id token cannot be used as api bearer")
	}
	if !claims.Audience.Contains(v.apiAudience) {
		return time.Time{}, fmt.Errorf("keycloak verifier: access token missing api audience")
	}
	if strings.TrimSpace(claims.AuthorizedParty) != v.clientID {
		return time.Time{}, fmt.Errorf("keycloak verifier: invalid authorized party")
	}
	if strings.TrimSpace(claims.Subject) == "" {
		return time.Time{}, fmt.Errorf("keycloak verifier: subject is required")
	}
	if strings.TrimSpace(claims.SessionID) == "" {
		return time.Time{}, fmt.Errorf("keycloak verifier: session id is required")
	}
	if claims.ExpiresAt <= now.Unix() {
		return time.Time{}, fmt.Errorf("keycloak verifier: access token expired")
	}
	if claims.NotBefore > 0 && claims.NotBefore > now.Add(60*time.Second).Unix() {
		return time.Time{}, fmt.Errorf("keycloak verifier: access token not valid yet")
	}

	return time.Unix(claims.ExpiresAt, 0), nil
}

func (v *KeycloakVerifier) VerifyLogoutToken(ctx context.Context, rawToken string) (KeycloakLogoutTokenClaims, time.Time, error) {
	if v == nil {
		return KeycloakLogoutTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: verifier is nil")
	}

	token, err := v.logoutVerifier.Verify(ctx, strings.TrimSpace(rawToken))
	if err != nil {
		return KeycloakLogoutTokenClaims{}, time.Time{}, err
	}

	var claims KeycloakLogoutTokenClaims
	if err := token.Claims(&claims); err != nil {
		return KeycloakLogoutTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: decode logout claims: %w", err)
	}

	return claims, token.Expiry, nil
}

func (v *KeycloakVerifier) IssuerURL() string {
	if v == nil {
		return ""
	}
	return v.issuerURL
}

func (v *KeycloakVerifier) DiscoveryURL() string {
	if v == nil {
		return ""
	}
	return v.discoveryURL
}

func (v *KeycloakVerifier) ClientID() string {
	if v == nil {
		return ""
	}
	return v.clientID
}

func (v *KeycloakVerifier) APIAudience() string {
	if v == nil {
		return ""
	}
	return v.apiAudience
}
