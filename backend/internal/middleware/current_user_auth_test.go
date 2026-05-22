package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type stubCurrentUserResolver struct {
	identity AuthIdentity
	err      error
}

func (s stubCurrentUserResolver) ResolveCurrentUser(ctx context.Context, rawToken string) (AuthIdentity, error) {
	return s.identity, s.err
}

func TestCurrentUserMiddlewareStoresIdentityOnSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/secure", nil)
	request.Header.Set("Authorization", "Bearer valid-token")
	router := gin.New()

	router.Use(CurrentUserMiddleware(stubCurrentUserResolver{
		identity: AuthIdentity{UserID: 9, AppUserID: 17, DisplayName: "Phase Admin"},
	}))
	router.GET("/secure", func(ctx *gin.Context) {
		identity, ok := CommentAuthIdentityFromContext(ctx)
		if !ok {
			t.Fatalf("expected auth identity in context")
		}
		ctx.JSON(http.StatusOK, gin.H{
			"user_id":     identity.UserID,
			"app_user_id": identity.AppUserID,
		})
	})

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
}

func TestCurrentUserMiddlewareRejectsUnauthorizedResolverResult(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/secure", nil)
	request.Header.Set("Authorization", "Bearer invalid-token")
	router := gin.New()

	router.Use(CurrentUserMiddleware(stubCurrentUserResolver{
		err: ErrCurrentUserUnauthorized,
	}))
	router.GET("/secure", func(ctx *gin.Context) {
		ctx.Status(http.StatusOK)
	})

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}

func TestCurrentUserOptionalMiddlewareAllowsAnonymousRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/optional", nil)
	router := gin.New()

	router.Use(CurrentUserOptionalMiddleware(stubCurrentUserResolver{}))
	router.GET("/optional", func(ctx *gin.Context) {
		ctx.Status(http.StatusNoContent)
	})

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recorder.Code)
	}
}
