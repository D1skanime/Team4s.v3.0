package handlers

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase136NarrowRoleDefaultsSeedToHandlerContract(t *testing.T) {
	root := phase136RepositoryRoot(t)
	read := func(path string) string {
		content, err := os.ReadFile(filepath.Join(root, path))
		require.NoError(t, err)
		return string(content)
	}

	migration := read("database/migrations/0146_capability_policy_catalog.up.sql")
	permissionsSource := read("backend/internal/permissions/permissions.go")
	cases := []struct {
		role, action, handler string
	}{
		{"gfxler", "fansub_group_media.upload", read("backend/internal/handlers/fansub_media_upload.go")},
		{"gfxler", "fansub_group_media.update", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"gfxler", "fansub_group_media.reorder", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"techadmin", "fansub_group_media.upload", read("backend/internal/handlers/fansub_media_upload.go")},
		{"techadmin", "fansub_group_media.update", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"techadmin", "fansub_group_media.reorder", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"techadmin", "fansub_group_page.technical_links_edit", read("backend/internal/handlers/fansub_groups.go")},
		{"founder", "fansub_group_media.upload", read("backend/internal/handlers/fansub_media_upload.go")},
		{"founder", "fansub_group_media.update", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"founder", "fansub_group_media.reorder", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"founder", "fansub_group_page.founding_history_edit", read("backend/internal/handlers/fansub_group_history_handler.go")},
		{"co_leader", "fansub_group_media.upload", read("backend/internal/handlers/fansub_media_upload.go")},
		{"co_leader", "fansub_group_media.update", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"co_leader", "fansub_group_media.reorder", read("backend/internal/handlers/fansub_media_review_handler.go")},
		{"co_leader", "fansub_group_page.general_edit", read("backend/internal/handlers/fansub_groups.go")},
		{"co_leader", "fansub_group_links.update", read("backend/internal/handlers/fansub_group_links.go")},
	}
	for _, tc := range cases {
		t.Run(tc.role+"/"+tc.action, func(t *testing.T) {
			require.Contains(t, migration, "('"+tc.role+"', '"+tc.action+"')", "default must be seeded exactly")
			constant := phase136ActionConstant(tc.action)
			require.Contains(t, permissionsSource, constant+" ", "action needs a compile-time identifier")
			require.Contains(t, tc.handler, "permissions."+constant, "seeded action needs exact handler enforcement")
		})
	}

	for _, role := range []string{"gfxler", "techadmin", "founder", "co_leader"} {
		for _, forbidden := range []string{"fansub_group.edit", "fansub_group_media.delete", "fansub_group.members.manage", "fansub_group.links.manage"} {
			require.NotContains(t, migration, "('"+role+"', '"+forbidden+"')")
		}
	}
}

func TestPhase136NarrowRoleDefaultsPatchClasses(t *testing.T) {
	source, err := os.ReadFile(filepath.Join(phase136RepositoryRoot(t), "backend/internal/handlers/fansub_groups.go"))
	require.NoError(t, err)
	text := string(source)
	require.Contains(t, text, "requiredFansubGroupPatchActions")
	require.Contains(t, text, "ActionFansubGroupPageGeneralEdit")
	require.Contains(t, text, "ActionFansubGroupPageTechnicalLinksEdit")
	require.Contains(t, text, "ActionFansubGroupPageFoundingHistoryEdit")
	require.Contains(t, text, "for _, action := range requiredActions")
}

func phase136ActionConstant(action string) string {
	parts := strings.FieldsFunc(action, func(r rune) bool { return r == '.' || r == '_' })
	var out strings.Builder
	out.WriteString("Action")
	for _, part := range parts {
		out.WriteString(strings.ToUpper(part[:1]))
		out.WriteString(part[1:])
	}
	return out.String()
}

func phase136RepositoryRoot(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
}
