package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// rvmPreviewGuardBlockedCase describes one table-driven scenario for TestRvmPreviewGuardBlocked.
func strPtrRVM(v string) *string { return &v }
func boolPtrRVM(v bool) *bool    { return &v }

// TestRvmPreviewGuardBlocked exercises rvmPreviewGuardBlocked's corrected decision logic directly,
// proving 144-VERIFICATION.md's exact gap scenario (omitted request field + row already
// is_preview_candidate=true + category changed to a non-preview category) is now blocked, while
// every pre-existing, already-verified behavior (explicit request values always win) is unchanged.
func TestRvmPreviewGuardBlocked(t *testing.T) {
	cases := []struct {
		name            string
		requestPreview  *bool
		currentPreview  bool
		currentCategory string
		newCategory     *string
		wantBlocked     bool
	}{
		{
			name:            "omitted field, row already true, category changed to disallowed -> blocked (the 144-VERIFICATION.md gap)",
			requestPreview:  nil,
			currentPreview:  true,
			currentCategory: "screenshot",
			newCategory:     strPtrRVM("fun_outtake"),
			wantBlocked:     true,
		},
		{
			name:            "omitted field, row already false -> nothing to guard",
			requestPreview:  nil,
			currentPreview:  false,
			currentCategory: "screenshot",
			newCategory:     strPtrRVM("fun_outtake"),
			wantBlocked:     false,
		},
		{
			name:            "explicit false always overrides row's current true",
			requestPreview:  boolPtrRVM(false),
			currentPreview:  true,
			currentCategory: "screenshot",
			newCategory:     strPtrRVM("fun_outtake"),
			wantBlocked:     false,
		},
		{
			name:            "explicit true against disallowed category is still blocked (pre-existing behavior)",
			requestPreview:  boolPtrRVM(true),
			currentPreview:  false,
			currentCategory: "screenshot",
			newCategory:     strPtrRVM("fun_outtake"),
			wantBlocked:     true,
		},
		{
			name:            "omitted field, row already true, own current category already disallows preview, no category patch",
			requestPreview:  nil,
			currentPreview:  true,
			currentCategory: "fun_outtake",
			newCategory:     nil,
			wantBlocked:     true,
		},
		{
			name:            "omitted field, row already true, category changed TO an allowed one -> guard must not fire",
			requestPreview:  nil,
			currentPreview:  true,
			currentCategory: "fun_outtake",
			newCategory:     strPtrRVM("screenshot"),
			wantBlocked:     false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.wantBlocked, rvmPreviewGuardBlocked(tc.requestPreview, tc.currentPreview, tc.currentCategory, tc.newCategory))
		})
	}
}
