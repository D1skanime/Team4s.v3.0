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
	// MaxDisplayNameLengthRune gibt die maximale Zeichenlänge (Runes) für einen Anzeigenamen an.
	MaxDisplayNameLengthRune = 80
	// MaxSessionIDLengthRune gibt die maximale Zeichenlänge (Runes) für eine Session-ID an.
	MaxSessionIDLengthRune = 128
)

var (
	// ErrTokenFormat wird zurückgegeben, wenn das Token-Format ungültig ist (z.B. fehlendes Trennzeichen).
	ErrTokenFormat = errors.New("token format invalid")
	// ErrTokenSignature wird zurückgegeben, wenn die HMAC-Signatur nicht übereinstimmt.
	ErrTokenSignature = errors.New("token signature invalid")
	// ErrTokenPayload wird zurückgegeben, wenn das Token-Payload fehlerhafte oder unvollständige Daten enthält.
	ErrTokenPayload = errors.New("token payload invalid")
	// ErrTokenExpired wird zurückgegeben, wenn das Token abgelaufen ist.
	ErrTokenExpired = errors.New("token expired")
)

// Claims enthält die Nutzinformationen eines signierten Tokens.
type Claims struct {
	UserID      int64  // Eindeutige Benutzer-ID
	DisplayName string // Anzeigename des Benutzers
	SessionID   string // Optionale Session-ID für Widerrufsprüfungen
	ExpiresAt   int64  // Unix-Zeitstempel des Ablaufdatums
}

type signedTokenPayload struct {
	UserID      int64  `json:"user_id"`
	DisplayName string `json:"display_name"`
	SessionID   string `json:"sid,omitempty"`
	ExpiresAt   int64  `json:"exp"`
}

// CreateSignedToken erzeugt ein HMAC-SHA256-signiertes Token aus den übergebenen Claims
// und gibt den Token-String sowie den Unix-Ablaufzeitstempel zurück.
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

// ParseAndVerifySignedToken parst ein signiertes Token, prüft Signatur und Ablaufzeit
// und gibt die enthaltenen Claims zurück.
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

// HashToken erzeugt einen SHA-256-Hex-Hash des übergebenen Token-Strings
// und wird für Widerruf-Lookups in Redis verwendet.
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
