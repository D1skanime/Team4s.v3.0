package handlers

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPublicMemberProfileUnavailableResponsesAreByteIdentical(t *testing.T) {
	gin.SetMode(gin.TestMode)
	missing := phase128UnavailableResponse()
	privateAnonymous := phase128UnavailableResponse()
	privateNonOwner := phase128UnavailableResponse()
	adminNonOwner := phase128UnavailableResponse()

	require.Equal(t, http.StatusNotFound, missing.Code)
	require.Equal(t, missing.Code, privateAnonymous.Code)
	require.Equal(t, missing.Code, privateNonOwner.Code)
	require.Equal(t, missing.Code, adminNonOwner.Code)
	require.Equal(t, missing.Body.Bytes(), privateAnonymous.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), privateNonOwner.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), adminNonOwner.Body.Bytes())
}
