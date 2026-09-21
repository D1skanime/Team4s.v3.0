package handlers

import "testing"

// TestResolveDiscoveryItemStatus_TruthTable covers all 8 (existing, ignored, partial)
// combinations, one subtest per row, and locks down the D-17 priority order
// existing > ignored > partial > open before any handler consumes this function.
func TestResolveDiscoveryItemStatus_TruthTable(t *testing.T) {
	cases := []struct {
		name                       string
		existing, ignored, partial bool
		want                       string
	}{
		{"all true -> existing wins", true, true, true, DiscoveryStatusExisting},
		{"existing+ignored -> existing wins", true, true, false, DiscoveryStatusExisting},
		{"existing+partial -> existing wins", true, false, true, DiscoveryStatusExisting},
		{"existing only -> existing", true, false, false, DiscoveryStatusExisting},
		{"ignored+partial -> ignored wins", false, true, true, DiscoveryStatusIgnored},
		{"ignored only -> ignored", false, true, false, DiscoveryStatusIgnored},
		{"partial only -> partial", false, false, true, DiscoveryStatusPartial},
		{"all false -> open", false, false, false, DiscoveryStatusOpen},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := resolveDiscoveryItemStatus(tc.existing, tc.ignored, tc.partial)
			if got != tc.want {
				t.Fatalf("resolveDiscoveryItemStatus(%v,%v,%v) = %q, want %q",
					tc.existing, tc.ignored, tc.partial, got, tc.want)
			}
		})
	}
}

// TestResolveDiscoveryItemStatus_ReturnsExportedConstants proves the returned
// strings are exactly the four exported constants (not re-typed string literals),
// so 165-06/165-09/165-11 can import and compare against them directly.
func TestResolveDiscoveryItemStatus_ReturnsExportedConstants(t *testing.T) {
	if got := resolveDiscoveryItemStatus(true, false, false); got != DiscoveryStatusExisting {
		t.Fatalf("expected DiscoveryStatusExisting, got %q", got)
	}
	if got := resolveDiscoveryItemStatus(false, true, false); got != DiscoveryStatusIgnored {
		t.Fatalf("expected DiscoveryStatusIgnored, got %q", got)
	}
	if got := resolveDiscoveryItemStatus(false, false, true); got != DiscoveryStatusPartial {
		t.Fatalf("expected DiscoveryStatusPartial, got %q", got)
	}
	if got := resolveDiscoveryItemStatus(false, false, false); got != DiscoveryStatusOpen {
		t.Fatalf("expected DiscoveryStatusOpen, got %q", got)
	}
}
