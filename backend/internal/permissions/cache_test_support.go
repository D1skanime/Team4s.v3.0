package permissions

// WR-05 (176-REVIEW): loadedCache is a single package-level variable shared by every test
// file in this package's (and importing packages') test binary. A test that replaces it via
// LoadCache with a narrower stub -- done to satisfy LoadCache's D-10 "every known action
// covered" completeness check without needing a full, real role_capabilities row set -- had
// no way to undo that replacement afterwards, so the narrower cache silently leaked into
// whichever unrelated test happened to run next in the same binary. Correctness then depended
// on Go's test run order rather than on the test itself.
//
// SnapshotLoadedCacheForTests/RestoreLoadedCacheForTests let a test capture whatever cache
// state it found on entry and put it back (via t.Cleanup) once it is done, regardless of how
// many LoadCache calls happened in between. Test-only: production code must never call these.

// SnapshotLoadedCacheForTests returns the current package-level permission cache so a test can
// restore it later via RestoreLoadedCacheForTests.
func SnapshotLoadedCacheForTests() map[string][]Action {
	cacheMu.RLock()
	defer cacheMu.RUnlock()
	return loadedCache
}

// RestoreLoadedCacheForTests puts a previously snapshotted cache back in place, undoing any
// LoadCache call the test made in between. Intended for use via t.Cleanup.
func RestoreLoadedCacheForTests(cache map[string][]Action) {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	loadedCache = cache
}
