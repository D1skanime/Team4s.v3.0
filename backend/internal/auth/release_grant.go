package auth

import (
	"errors"
	"strings"
	"time"
)

var (
	// ErrReleaseGrantFormat wird zurückgegeben, wenn das Grant-Token-Format ungültig ist.
	ErrReleaseGrantFormat = errors.New("release grant format invalid")
	// ErrReleaseGrantSignature wird zurückgegeben, wenn die Grant-Signatur nicht übereinstimmt.
	ErrReleaseGrantSignature = errors.New("release grant signature invalid")
	// ErrReleaseGrantPayload wird zurückgegeben, wenn das Grant-Payload unvollständig oder ungültig ist.
	ErrReleaseGrantPayload = errors.New("release grant payload invalid")
	// ErrReleaseGrantExpired wird zurückgegeben, wenn das Grant-Token abgelaufen ist.
	ErrReleaseGrantExpired = errors.New("release grant expired")
)

// ReleaseStreamGrantClaims enthält die Nutzinformationen eines Release-Stream-Grants,
// der kurzlebigen Zugriff auf einen einzelnen Release-Stream gewährt.
type ReleaseStreamGrantClaims struct {
	ReleaseID int64 // ID der freigegebenen Episodenversion
	UserID    int64 // ID des berechtigten Benutzers
	ExpiresAt int64 // Unix-Zeitstempel des Ablaufdatums
}

type releaseStreamGrantPayload struct {
	ReleaseID int64 `json:"rid"`
	UserID    int64 `json:"uid"`
	ExpiresAt int64 `json:"exp"`
}

// CreateReleaseStreamGrant erzeugt ein kurzlebiges, HMAC-signiertes Grant-Token
// für den Zugriff auf einen einzelnen Release-Stream und gibt Token sowie Ablaufzeitstempel zurück.
func CreateReleaseStreamGrant(
	releaseID int64,
	userID int64,
	secret string,
	now time.Time,
	ttl time.Duration,
) (string, int64, error) {
	trimmedSecret := strings.TrimSpace(secret)
	if releaseID <= 0 || userID <= 0 || trimmedSecret == "" || ttl <= 0 {
		return "", 0, ErrReleaseGrantPayload
	}

	expiresAt := now.Add(ttl).Unix()
	payload := releaseStreamGrantPayload{
		ReleaseID: releaseID,
		UserID:    userID,
		ExpiresAt: expiresAt,
	}

	token, err := createSignedGrant(payload, trimmedSecret)
	if err != nil {
		return "", 0, ErrReleaseGrantPayload
	}
	return token, expiresAt, nil
}

// ParseAndVerifyReleaseStreamGrant parst ein Release-Stream-Grant-Token, verifiziert Signatur
// und Ablaufzeit und gibt die enthaltenen Claims zurück.
func ParseAndVerifyReleaseStreamGrant(
	token string,
	secret string,
	now time.Time,
) (ReleaseStreamGrantClaims, error) {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(secret) == "" {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}

	var payload releaseStreamGrantPayload
	if err := parseSignedGrant(token, secret, &payload); err != nil {
		switch err {
		case errSignedGrantFormat:
			return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
		case errSignedGrantSignature:
			return ReleaseStreamGrantClaims{}, ErrReleaseGrantSignature
		default:
			return ReleaseStreamGrantClaims{}, ErrReleaseGrantPayload
		}
	}
	if payload.ReleaseID <= 0 || payload.UserID <= 0 {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantPayload
	}
	if payload.ExpiresAt <= now.Unix() {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantExpired
	}

	return ReleaseStreamGrantClaims{
		ReleaseID: payload.ReleaseID,
		UserID:    payload.UserID,
		ExpiresAt: payload.ExpiresAt,
	}, nil
}
