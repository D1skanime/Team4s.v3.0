# Plan 159-02 evidence

Starting HEAD `3c94b2e8`. The pre-change 159-01 consumer matrix identifies the defect: canonical entitlement/grant path IDs can collide with legacy variant aliases in the existing OR source lookup. This plan adds an explicit optional selector at that existing seam; omission preserves the OR query and stream order. Both handlers share parsing and keep versionID as the permission/claim owner. Admin write identifiers and Public Play UI are outside this plan.

Regression data is confined to the guarded Phase-117 helper's schemas in a dedicated postgres:16 tmpfs container; no application DATABASE_URL, live streams, host DB edits or migrations are used. HTTP stream delivery uses a synthetic RoundTripper, and Next fetch is mocked. Backend compilation/tests run from the Air-excluded /app/tmp/phase15902 copy before completed-source sync.
