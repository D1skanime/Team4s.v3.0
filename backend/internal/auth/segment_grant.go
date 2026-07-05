package auth

import (
	"errors"
	"strings"
	"time"
)

var (
	// ErrSegmentGrantFormat wird zurueckgegeben, wenn das Grant-Token-Format ungueltig ist.
	ErrSegmentGrantFormat = errors.New("segment grant format invalid")
	// ErrSegmentGrantSignature wird zurueckgegeben, wenn die Grant-Signatur nicht uebereinstimmt.
	ErrSegmentGrantSignature = errors.New("segment grant signature invalid")
	// ErrSegmentGrantPayload wird zurueckgegeben, wenn das Grant-Payload unvollstaendig oder ungueltig ist.
	ErrSegmentGrantPayload = errors.New("segment grant payload invalid")
	// ErrSegmentGrantExpired wird zurueckgegeben, wenn das Grant-Token abgelaufen ist.
	ErrSegmentGrantExpired = errors.New("segment grant expired")
)

// SegmentStreamGrantClaims enthaelt die Nutzinformationen eines Segment-Stream-Grants.
type SegmentStreamGrantClaims struct {
	SegmentID int64
	UserID    int64
	CacheKey  string
	ExpiresAt int64
}

type segmentStreamGrantPayload struct {
	SegmentID int64  `json:"sid"`
	UserID    int64  `json:"uid"`
	CacheKey  string `json:"ck,omitempty"`
	ExpiresAt int64  `json:"exp"`
}

// CreateSegmentStreamGrant erzeugt ein kurzlebiges, HMAC-signiertes Grant-Token
// fuer genau ein Theme-Segment. cacheKey ist optional und kann spaeter genutzt
// werden, um Grants an einen konkreten vorbereiteten Render-Cache zu binden.
func CreateSegmentStreamGrant(
	segmentID int64,
	userID int64,
	cacheKey string,
	secret string,
	now time.Time,
	ttl time.Duration,
) (string, int64, error) {
	if segmentID <= 0 || userID <= 0 || strings.TrimSpace(secret) == "" || ttl <= 0 {
		return "", 0, ErrSegmentGrantPayload
	}

	expiresAt := now.Add(ttl).Unix()
	token, err := createSignedGrant(segmentStreamGrantPayload{
		SegmentID: segmentID,
		UserID:    userID,
		CacheKey:  strings.TrimSpace(cacheKey),
		ExpiresAt: expiresAt,
	}, secret)
	if err != nil {
		return "", 0, ErrSegmentGrantPayload
	}
	return token, expiresAt, nil
}

// ParseAndVerifySegmentStreamGrant parst ein Segment-Stream-Grant-Token,
// verifiziert Signatur und Ablaufzeit und gibt die enthaltenen Claims zurueck.
func ParseAndVerifySegmentStreamGrant(
	token string,
	secret string,
	now time.Time,
) (SegmentStreamGrantClaims, error) {
	var payload segmentStreamGrantPayload
	if err := parseSignedGrant(token, secret, &payload); err != nil {
		switch err {
		case errSignedGrantFormat:
			return SegmentStreamGrantClaims{}, ErrSegmentGrantFormat
		case errSignedGrantSignature:
			return SegmentStreamGrantClaims{}, ErrSegmentGrantSignature
		default:
			return SegmentStreamGrantClaims{}, ErrSegmentGrantPayload
		}
	}
	if payload.SegmentID <= 0 || payload.UserID <= 0 {
		return SegmentStreamGrantClaims{}, ErrSegmentGrantPayload
	}
	if payload.ExpiresAt <= now.Unix() {
		return SegmentStreamGrantClaims{}, ErrSegmentGrantExpired
	}

	return SegmentStreamGrantClaims{
		SegmentID: payload.SegmentID,
		UserID:    payload.UserID,
		CacheKey:  payload.CacheKey,
		ExpiresAt: payload.ExpiresAt,
	}, nil
}
