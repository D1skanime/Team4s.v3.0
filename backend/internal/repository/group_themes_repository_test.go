package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGroupThemesRepository_QueryJoinsThemeSegments ist ein Source-Inspection-Test
// (siehe Phase-37-Muster fuer DB-lose Verifikation): setupTestRepo skippt ohne
// Testdatenbank, daher wird die Query-Erweiterung direkt am Quelltext geprueft.
// Stellt sicher, dass die Themes-Query theme_segments joint und die Zeitcode-
// Spalten per ::text-Cast selektiert (AO4-04).
func TestGroupThemesRepository_QueryJoinsThemeSegments(t *testing.T) {
	src, err := os.ReadFile("group_themes_repository.go")
	require.NoError(t, err, "group_themes_repository.go muss lesbar sein")

	content := string(src)

	assert.True(t, strings.Contains(content, "LEFT JOIN theme_segments ts"),
		"Query muss theme_segments per LEFT JOIN einbeziehen")
	assert.True(t, strings.Contains(content, "ts.start_time::text"),
		"Query muss start_time per ::text-Cast selektieren")
	assert.True(t, strings.Contains(content, "ts.end_time::text"),
		"Query muss end_time per ::text-Cast selektieren")
	assert.True(t, strings.Contains(content, "StartTime") && strings.Contains(content, `json:"start_time"`),
		"DTO muss nullable StartTime-Feld mit start_time-json-Tag enthalten")
	assert.True(t, strings.Contains(content, "EndTime") && strings.Contains(content, `json:"end_time"`),
		"DTO muss nullable EndTime-Feld mit end_time-json-Tag enthalten")
}

// TestGetPublicGroupThemes_EmptyResult_WithSegmentJoin verifiziert, dass
// GetPublicGroupThemes auch nach der theme_segments-Erweiterung fehlerfrei
// eine leere Themes-Liste liefert, wenn keine Daten existieren.
func TestGetPublicGroupThemes_EmptyResult_WithSegmentJoin(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	themesRepo := NewGroupThemesRepository(repo.db)

	response, err := themesRepo.GetPublicGroupThemes(ctx, 999998, 999999)

	require.NoError(t, err, "GetPublicGroupThemes sollte bei leerem Ergebnis nicht fehlschlagen")
	require.NotNil(t, response, "response darf nicht nil sein")
	assert.NotNil(t, response.Themes, "Themes darf nicht nil sein")
	assert.Equal(t, 0, len(response.Themes), "Themes muss bei nicht existierendem Anime+Gruppe leer sein")
}
