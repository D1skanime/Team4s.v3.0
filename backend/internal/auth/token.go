package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	MaxDisplayNameLengthRune = 80
	MaxSessionIDLengthRune   = 128
)

var (
	ErrTokenFormat    = errors.New("token format invalid")
	ErrTokenSignature = errors.New("token signature invalid")
	ErrTokenPayload   = errors.New("token payload invalid")
	ErrTokenExpired   = errors.New("token expired")
)

type Claims struct {
	UserID      int64
	DisplayName string
	SessionID   string
	ExpiresAt   int64
}

type signedTokenPayload struct {
	UserID      int64  `json:"user_id"`
	DisplayName string `json:"display_name"`
	SessionID   string `json:"sid,omitempty"`
	ExpiresAt   int64  `json:"exp"`
}

func CreateSignedToken(claims Claims, secret string, now time.Time, ttl time.Duration) (string, int64, error) {
	trimmedSecret := strings.TrimSpace(secret)
	if trimmedSecret == "" || ttl <= 0 {
		return "", 0, ErrTokenPayload
	}

	normalizedClaims, err := normalizeClaims(claims)
	if err != nil {
		return "", 0, err
	}

	expiresAt := now.Add(ttl).Unix()
	payload := signedTokenPayload{
		UserID:      normalizedClaims.UserID,
		DisplayName: normalizedClaims.DisplayName,
		SessionID:   normalizedClaims.SessionID,
		ExpiresAt:   expiresAt,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", 0, ErrTokenPayload
	}

	payloadSegment := base64.RawURLEncoding.EncodeToString(payloadBytes)
	mac := hmac.New(sha256.New, []byte(trimmedSecret))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		return "", 0, ErrTokenPayload
	}
	signatureSegment := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payloadSegment + "." + signatureSegment, expiresAt, nil
}

func ParseAndVerifySignedToken(token string, secret string, now time.Time) (Claims, error) {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(secret) == "" {
		return Claims{}, ErrTokenFormat
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return Claims{}, ErrTokenFormat
	}

	payloadSegment := parts[0]
	signatureSegment := parts[1]

	signature, err := base64.RawURLEncoding.DecodeString(signatureSegment)
	if err != nil {
		return Claims{}, ErrTokenFormat
	}

	mac := hmac.New(sha256.New, []byte(strings.TrimSpace(secret)))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		return Claims{}, ErrTokenFormat
	}
	expectedSignature := mac.Sum(nil)
	if !hmac.Equal(signature, expectedSignature) {
		return Claims{}, ErrTokenSignature
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadSegment)
	if err != nil {
		return Claims{}, ErrTokenFormat
	}

	var payload signedTokenPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return Claims{}, ErrTokenPayload
	}

	claims := Claims{
		UserID:      payload.UserID,
		DisplayName: payload.DisplayName,
		SessionID:   payload.SessionID,
		ExpiresAt:   payload.ExpiresAt,
	}
	normalizedClaims, err := normalizeClaims(claims)
	if err != nil {
		return Claims{}, err
	}
	if normalizedClaims.ExpiresAt <= now.Unix() {
		return Claims{}, ErrTokenExpired
	}

	return normalizedClaims, nil
}

func HashToken(rawToken string) string {
	hash := sha256.Sum256([]byte(strings.TrimSpace(rawToken)))
	return hex.EncodeToString(hash[:])
}

func normalizeClaims(claims Claims) (Claims, error) {
	displayName := strings.TrimSpace(claims.DisplayName)
	if claims.UserID <= 0 || displayName == "" || len([]rune(displayName)) > MaxDisplayNameLengthRune {
		return Claims{}, ErrTokenPayload
	}

	sessionID := strings.TrimSpace(claims.SessionID)
	if sessionID != "" && len([]rune(sessionID)) > MaxSessionIDLengthRune {
		return Claims{}, ErrTokenPayload
	}

	return Claims{
		UserID:      claims.UserID,
		DisplayName: displayName,
		SessionID:   sessionID,
		ExpiresAt:   claims.ExpiresAt,
	}, nil
}
