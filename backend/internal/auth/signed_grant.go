package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
)

var (
	errSignedGrantFormat    = errors.New("signed grant format invalid")
	errSignedGrantSignature = errors.New("signed grant signature invalid")
	errSignedGrantPayload   = errors.New("signed grant payload invalid")
)

func createSignedGrant(payload any, secret string) (string, error) {
	trimmedSecret := strings.TrimSpace(secret)
	if trimmedSecret == "" {
		return "", errSignedGrantPayload
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", errSignedGrantPayload
	}

	payloadSegment := base64.RawURLEncoding.EncodeToString(payloadBytes)
	signatureSegment, err := signGrantPayloadSegment(payloadSegment, trimmedSecret)
	if err != nil {
		return "", errSignedGrantPayload
	}

	return payloadSegment + "." + signatureSegment, nil
}

func parseSignedGrant(token string, secret string, target any) error {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(secret) == "" {
		return errSignedGrantFormat
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return errSignedGrantFormat
	}

	payloadSegment := parts[0]
	signatureSegment := parts[1]

	signature, err := base64.RawURLEncoding.DecodeString(signatureSegment)
	if err != nil {
		return errSignedGrantFormat
	}

	expectedSignatureSegment, err := signGrantPayloadSegment(payloadSegment, strings.TrimSpace(secret))
	if err != nil {
		return errSignedGrantFormat
	}
	expectedSignature, err := base64.RawURLEncoding.DecodeString(expectedSignatureSegment)
	if err != nil {
		return errSignedGrantFormat
	}
	if !hmac.Equal(signature, expectedSignature) {
		return errSignedGrantSignature
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadSegment)
	if err != nil {
		return errSignedGrantFormat
	}
	if err := json.Unmarshal(payloadBytes, target); err != nil {
		return errSignedGrantPayload
	}
	return nil
}

func signGrantPayloadSegment(payloadSegment string, secret string) (string, error) {
	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := mac.Write([]byte(payloadSegment)); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}
