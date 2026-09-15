package repository

// Plan 156-09 (Requirements P156-16, P156-17): a table-driven, DB-independent
// unit test for hasAnySegmentRelevantRole
// (release_detail_public_repository_segment_credits.go, Plan 156-07) -- the
// exact role-code overlap check loadReleaseSegments' bundled origin+credit
// load uses to decide which of a segment's origin-release contributors are
// segment-relevant. Exercises the actual production function and the actual
// production allow-list (permissions.SegmentCreditRoleCodes) directly, no
// database and no duplicated inline check.
//
// Repointed by GAP-09 (Plan 156-21, 156-UAT.md, Auftraggeber-Entscheidung im Chat,
// 2026-09-15): encoder and designer are now segment-relevant like every other role in
// permissions.SegmentCreditRoleCodes (Plan 156-20 extended the catalog to 8 codes) --
// the old "encoder-only is excluded" case is factually wrong now and is replaced with
// "encoder-only is included". permissions.RoleRawProvider is the new standing example
// of a role that stays permanently excluded from this allow-list.

import (
	"testing"

	"team4s.v3/backend/internal/permissions"

	"github.com/stretchr/testify/require"
)

func TestSegmentCreditRoleFilter(t *testing.T) {
	segmentRelevantRoles := make(map[string]struct{}, len(permissions.SegmentCreditRoleCodes))
	for _, code := range permissions.SegmentCreditRoleCodes {
		segmentRelevantRoles[code] = struct{}{}
	}

	tests := []struct {
		name      string
		roleCodes []string
		want      bool
	}{
		{
			name:      "allow-listed role (translator) is included",
			roleCodes: []string{permissions.RoleTranslator},
			want:      true,
		},
		{
			name:      "encoder-only is included (156-UAT.md GAP-09: encoder is now segment-relevant like every other role -- actual appearance is still gated by explicit selection elsewhere, not by this role-catalog check)",
			roleCodes: []string{permissions.RoleEncoder},
			want:      true,
		},
		{
			name:      "designer-only is included (156-UAT.md GAP-09, new)",
			roleCodes: []string{permissions.RoleDesigner},
			want:      true,
		},
		{
			name:      "raw_provider-only is excluded (156-UAT.md GAP-09's new standing example of a permanently excluded role)",
			roleCodes: []string{permissions.RoleRawProvider},
			want:      false,
		},
		{
			name:      "quality_checker-only is included (segment-relevant per Plan 156-12's catalog extension -- actual appearance is gated by explicit selection elsewhere, not by this role-catalog check)",
			roleCodes: []string{permissions.RoleQualityChecker},
			want:      true,
		},
		{
			name:      "editor-only is included (segment-relevant per Plan 156-12's catalog extension -- actual appearance is gated by explicit selection elsewhere, not by this role-catalog check)",
			roleCodes: []string{permissions.RoleEditor},
			want:      true,
		},
		{
			name:      "mixed raw_provider+translator is included -- any overlapping relevant role includes the contributor (T-156-13)",
			roleCodes: []string{permissions.RoleRawProvider, permissions.RoleTranslator},
			want:      true,
		},
		{
			name:      "empty role-code list is excluded",
			roleCodes: []string{},
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := hasAnySegmentRelevantRole(tt.roleCodes, segmentRelevantRoles)
			require.Equal(t, tt.want, got)
		})
	}
}
