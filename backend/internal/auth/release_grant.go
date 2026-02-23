package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrReleaseGrantFormat    = errors.New("release grant format invalid")
	ErrReleaseGrantSignature = errors.New("release grant signature invalid")
	ErrReleaseGrantPayload   = errors.New("release grant payload invalid")
	ErrReleaseGrantExpired   = errors.New("release grant expired")
)

type ReleaseStreamGrantClaims struct {
	ReleaseID int64
	UserID    int64
	ExpiresAt int64
}

type releaseStreamGrantPayload struct {
	ReleaseID int64 `json:"rid"`
	UserID    int64 `json:"uid"`
	ExpiresAt int64 `json:"exp"`
}

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

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", 0, ErrReleaseGrantPayload
	}

	payloadSegment := base64.RawURLEncoding.EncodeToString(payloadBytes)
	mac := hmac.New(sha256.New, []byte(trimmedSecret))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		return "", 0, ErrReleaseGrantPayload
	}
	signatureSegment := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payloadSegment + "." + signatureSegment, expiresAt, nil
}

func ParseAndVerifyReleaseStreamGrant(
	token string,
	secret string,
	now time.Time,
) (ReleaseStreamGrantClaims, error) {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(secret) == "" {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}

	payloadSegment := parts[0]
	signatureSegment := parts[1]

	signature, err := base64.RawURLEncoding.DecodeString(signatureSegment)
	if err != nil {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}

	mac := hmac.New(sha256.New, []byte(strings.TrimSpace(secret)))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}
	expectedSignature := mac.Sum(nil)
	if !hmac.Equal(signature, expectedSignature) {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantSignature
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadSegment)
	if err != nil {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantFormat
	}

	var payload releaseStreamGrantPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return ReleaseStreamGrantClaims{}, ErrReleaseGrantPayload
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
