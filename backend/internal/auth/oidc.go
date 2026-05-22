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
	issuerURL    string
	discoveryURL string
	clientID     string
	verifier     *oidc.IDTokenVerifier
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

type KeycloakLogoutTokenClaims struct {
	Subject string         `json:"sub"`
	Session string         `json:"sid"`
	Events  map[string]any `json:"events"`
}

type oidcDiscoveryDocument struct {
	Issuer  string `json:"issuer"`
	JWKSURI string `json:"jwks_uri"`
}

func NewKeycloakVerifier(ctx context.Context, issuerURL string, discoveryURL string, clientID string) (*KeycloakVerifier, error) {
	trimmedIssuer := strings.TrimSpace(issuerURL)
	trimmedDiscovery := strings.TrimSpace(discoveryURL)
	trimmedClientID := strings.TrimSpace(clientID)
	if trimmedIssuer == "" {
		return nil, fmt.Errorf("keycloak verifier: issuer url is required")
	}
	if trimmedDiscovery == "" {
		trimmedDiscovery = trimmedIssuer
	}
	if trimmedClientID == "" {
		return nil, fmt.Errorf("keycloak verifier: client id is required")
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
		verifier: oidc.NewVerifier(trimmedIssuer, keySet, &oidc.Config{
			ClientID: trimmedClientID,
		}),
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

	token, err := v.verifier.Verify(ctx, strings.TrimSpace(rawToken))
	if err != nil {
		return KeycloakTokenClaims{}, time.Time{}, err
	}

	var claims KeycloakTokenClaims
	if err := token.Claims(&claims); err != nil {
		return KeycloakTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: decode access claims: %w", err)
	}

	return claims, token.Expiry, nil
}

func (v *KeycloakVerifier) VerifyLogoutToken(ctx context.Context, rawToken string) (KeycloakLogoutTokenClaims, time.Time, error) {
	if v == nil {
		return KeycloakLogoutTokenClaims{}, time.Time{}, fmt.Errorf("keycloak verifier: verifier is nil")
	}

	token, err := v.verifier.Verify(ctx, strings.TrimSpace(rawToken))
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
