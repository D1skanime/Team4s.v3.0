package handlers

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/permissions"
)

type playbackEntitlementStub struct{ allowed bool }

func (s playbackEntitlementStub) ResolveReleasePlaybackEntitlement(_ context.Context, _ permissions.Actor, _ int64) (permissions.ReleasePlaybackEntitlementDecision, error) {
	return permissions.ReleasePlaybackEntitlementDecision{Allowed: s.allowed}, nil
}

func TestAuthorizeReleaseStreamRequiresGrantAndEffectiveEntitlement(t *testing.T) {
	gin.SetMode(gin.TestMode)
	token, _, err := auth.CreateReleaseStreamGrant(42, 9, "secret", time.Now(), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name    string
		grant   string
		allowed bool
		want    int
	}{
		{name: "missing grant", allowed: true, want: 401},
		{name: "tampered grant", grant: token + "x", allowed: true, want: 401},
		{name: "revoked entitlement", grant: token, allowed: false, want: 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := &FansubHandler{releaseGrantSecret: "secret", releasePlaybackEntitlements: playbackEntitlementStub{allowed: tc.allowed}}
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest("GET", "/?grant="+tc.grant, nil)
			if h.authorizeReleaseStream(c, 42) {
				t.Fatal("expected denial")
			}
			if recorder.Code != tc.want {
				t.Fatalf("status=%d want=%d", recorder.Code, tc.want)
			}
		})
	}
}

func TestAuthorizeReleaseStreamAllowsValidEntitledGrant(t *testing.T) {
	token, _, _ := auth.CreateReleaseStreamGrant(42, 9, "secret", time.Now(), time.Minute)
	h := &FansubHandler{releaseGrantSecret: "secret", releasePlaybackEntitlements: playbackEntitlementStub{allowed: true}}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest("GET", "/?grant="+token, nil)
	if !h.authorizeReleaseStream(c, 42) {
		t.Fatalf("expected grant, status=%d", recorder.Code)
	}
}
