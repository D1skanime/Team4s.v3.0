package repository

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestAuthRepository(t *testing.T) (*AuthRepository, *miniredis.Miniredis) {
	t.Helper()

	mini, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() {
		_ = client.Close()
		mini.Close()
	})

	return NewAuthRepository(client), mini
}

func TestOIDCRevocationRoundTrip(t *testing.T) {
	repo, _ := newTestAuthRepository(t)
	ctx := context.Background()

	if err := repo.RevokeOIDCSession(ctx, "issuer-a", "session-1", time.Minute); err != nil {
		t.Fatalf("revoke oidc session: %v", err)
	}
	if err := repo.RevokeOIDCSubject(ctx, "issuer-a", "subject-1", time.Minute); err != nil {
		t.Fatalf("revoke oidc subject: %v", err)
	}

	sessionRevoked, err := repo.IsOIDCSessionRevoked(ctx, "issuer-a", "session-1")
	if err != nil {
		t.Fatalf("check oidc session: %v", err)
	}
	if !sessionRevoked {
		t.Fatalf("expected oidc session to be revoked")
	}

	subjectRevoked, err := repo.IsOIDCSubjectRevoked(ctx, "issuer-a", "subject-1")
	if err != nil {
		t.Fatalf("check oidc subject: %v", err)
	}
	if !subjectRevoked {
		t.Fatalf("expected oidc subject to be revoked")
	}

	otherIssuerRevoked, err := repo.IsOIDCSubjectRevoked(ctx, "issuer-b", "subject-1")
	if err != nil {
		t.Fatalf("check oidc subject with other issuer: %v", err)
	}
	if otherIssuerRevoked {
		t.Fatalf("expected issuer-specific revocation lookup")
	}
}
