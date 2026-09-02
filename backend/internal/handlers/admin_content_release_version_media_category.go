package handlers

// rvmCategoryPatchResult is the parsed outcome of an optional "category" field
// on a release-version-media PATCH request body.
// Category nil means the field was absent in the request body (no change requested).
// Invalid true means the field was present but not a string in rvmValidCategories.
type rvmCategoryPatchResult struct {
	Category *string
	Invalid  bool
}

// parseRVMCategoryPatchField reads rawBody["category"] and validates it against the
// package-level rvmValidCategories allow-list (Zielbild 2, 144-CONTEXT.md — replaces the
// former hard-block on category changes). Returns the zero value when the field is absent.
func parseRVMCategoryPatchField(rawBody map[string]interface{}) rvmCategoryPatchResult {
	rawCategory, hasCategory := rawBody["category"]
	if !hasCategory {
		return rvmCategoryPatchResult{}
	}
	value, ok := rawCategory.(string)
	if !ok || !rvmValidCategories[value] {
		return rvmCategoryPatchResult{Invalid: true}
	}
	return rvmCategoryPatchResult{Category: &value}
}

// rvmCategoryAllowsPreview reports whether the effective category (newCategory if a
// change was requested, otherwise currentCategory) allows is_preview_candidate=true.
// Checking the effective category (not just the pre-patch one) closes T-144-01-02: a
// category change to a non-preview-allowed category cannot bypass PREVIEW_NOT_ALLOWED_FOR_CATEGORY.
func rvmCategoryAllowsPreview(currentCategory string, newCategory *string) bool {
	effective := currentCategory
	if newCategory != nil {
		effective = *newCategory
	}
	return rvmPreviewAllowedCategories[effective]
}

// rvmPreviewGuardBlocked decides whether PREVIEW_NOT_ALLOWED_FOR_CATEGORY must fire.
// The row's current is_preview_candidate (currentPreview) is the fallback ONLY when the
// request omits the field (requestPreview == nil) — closing 144-VERIFICATION.md's gap where
// a request that only patches category silently skipped the guard because it never checked
// the row's actual current state. An explicit request value (true or false) always wins over
// the row's current state, so existing behavior for every request that DOES set
// is_preview_candidate is unchanged.
func rvmPreviewGuardBlocked(requestPreview *bool, currentPreview bool, currentCategory string, newCategory *string) bool {
	effectivePreview := currentPreview
	if requestPreview != nil {
		effectivePreview = *requestPreview
	}
	if !effectivePreview {
		return false
	}
	return !rvmCategoryAllowsPreview(currentCategory, newCategory)
}
