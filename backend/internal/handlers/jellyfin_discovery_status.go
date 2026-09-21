package handlers

// resolveDiscoveryItemStatus (165-01, D-17) — pure status-priority resolver for the
// Jellyfin Library Discovery list. No source-file precedent exists for this exact
// shape (PATTERNS.md "No Analog Found"); the priority order comes directly from
// CONTEXT.md D-17: "bereits vorhanden > ignoriert > teilweise > offen".
//
// Kept intentionally side-effect-free (no I/O, no repository/handler dependency) so
// its full truth table can be locked down and unit-tested now, independent of any
// consumer. The 165-06 Discovery list handler consumes it today; the D-15
// "teilweise" wiring (season-mapping data feeding a real `partial` value) was
// presented as a checkpoint in 165-11 and, per Auftraggeber-Entscheidung
// 2026-09-21 (option-c), deferred indefinitely to a future standalone phase
// "Mehrstaffel-Ordner" — see 165-CONTEXT.md D-15. This resolver's `partial`
// branch and its truth-table tests are kept intentionally as tested, inert
// scaffolding so that future phase only needs to supply real data, not rebuild
// this function.

const (
	// DiscoveryStatusExisting — Jellyfin item already has a matching anime (highest
	// priority: an exact technical reference always wins, D-03).
	DiscoveryStatusExisting = "existing"
	// DiscoveryStatusIgnored — the admin explicitly ignored this Jellyfin item (D-17).
	DiscoveryStatusIgnored = "ignored"
	// DiscoveryStatusPartial — a multi-season Jellyfin item where not every season is
	// yet mapped to an anime (D-15). Wiring this status to real data was deferred by
	// Auftraggeber-Entscheidung 2026-09-21 (option-c, see 165-CONTEXT.md D-15) to a
	// future standalone phase "Mehrstaffel-Ordner"; this constant and the resolver
	// branch that returns it are kept as tested, currently-unreachable scaffolding.
	DiscoveryStatusPartial = "partial"
	// DiscoveryStatusOpen — none of the above; still actionable in the default filter.
	DiscoveryStatusOpen = "open"
)

// resolveDiscoveryItemStatus resolves a Discovery list item's single overall status
// from three independent boolean signals, applying the fixed priority order
// existing > ignored > partial > open (D-17).
func resolveDiscoveryItemStatus(existing, ignored, partial bool) string {
	switch {
	case existing:
		return DiscoveryStatusExisting
	case ignored:
		return DiscoveryStatusIgnored
	case partial:
		return DiscoveryStatusPartial
	default:
		return DiscoveryStatusOpen
	}
}
