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

const publicSegmentStreamGrantAudience = "team4s-public-segment-stream"

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

// PublicSegmentStreamGrantClaims bindet einen anonym nutzbaren Grant an genau
// ein vorbereitetes Segment innerhalb einer Release-Version.
type PublicSegmentStreamGrantClaims struct {
	SegmentID        int64
	ReleaseVersionID int64
	CacheKey         string
	ExpiresAt        int64
}

type publicSegmentStreamGrantPayload struct {
	Audience         string `json:"aud"`
	SegmentID        int64  `json:"sid"`
	ReleaseVersionID int64  `json:"rvid"`
	CacheKey         string `json:"ck,omitempty"`
	ExpiresAt        int64  `json:"exp"`
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

// CreatePublicSegmentStreamGrant erzeugt einen kurzlebigen Grant ohne
// BenutzeridentitÃ¤t. Audience, Segment und Release-Version verhindern, dass
// der Grant von Release- oder Legacy-Segment-Endpunkten zweckentfremdet wird.
func CreatePublicSegmentStreamGrant(
	segmentID int64,
	releaseVersionID int64,
	cacheKey string,
	secret string,
	now time.Time,
	ttl time.Duration,
) (string, int64, error) {
	if segmentID <= 0 || releaseVersionID <= 0 || strings.TrimSpace(secret) == "" || ttl <= 0 {
		return "", 0, ErrSegmentGrantPayload
	}

	expiresAt := now.Add(ttl).Unix()
	token, err := createSignedGrant(publicSegmentStreamGrantPayload{
		Audience:         publicSegmentStreamGrantAudience,
		SegmentID:        segmentID,
		ReleaseVersionID: releaseVersionID,
		CacheKey:         strings.TrimSpace(cacheKey),
		ExpiresAt:        expiresAt,
	}, secret)
	if err != nil {
		return "", 0, ErrSegmentGrantPayload
	}
	return token, expiresAt, nil
}

// ParseAndVerifyPublicSegmentStreamGrant akzeptiert ausschlieÃŸlich den
// Public-Karaoke-Vertrag mit seinem festen Audience-Wert.
func ParseAndVerifyPublicSegmentStreamGrant(
	token string,
	secret string,
	now time.Time,
) (PublicSegmentStreamGrantClaims, error) {
	var payload publicSegmentStreamGrantPayload
	if err := parseSignedGrant(token, secret, &payload); err != nil {
		switch err {
		case errSignedGrantFormat:
			return PublicSegmentStreamGrantClaims{}, ErrSegmentGrantFormat
		case errSignedGrantSignature:
			return PublicSegmentStreamGrantClaims{}, ErrSegmentGrantSignature
		default:
			return PublicSegmentStreamGrantClaims{}, ErrSegmentGrantPayload
		}
	}
	if payload.Audience != publicSegmentStreamGrantAudience || payload.SegmentID <= 0 || payload.ReleaseVersionID <= 0 {
		return PublicSegmentStreamGrantClaims{}, ErrSegmentGrantPayload
	}
	if payload.ExpiresAt <= now.Unix() {
		return PublicSegmentStreamGrantClaims{}, ErrSegmentGrantExpired
	}

	return PublicSegmentStreamGrantClaims{
		SegmentID:        payload.SegmentID,
		ReleaseVersionID: payload.ReleaseVersionID,
		CacheKey:         payload.CacheKey,
		ExpiresAt:        payload.ExpiresAt,
	}, nil
}
