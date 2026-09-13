# Plan 159-02 evidence

Starting HEAD `3c94b2e8`. The pre-change 159-01 consumer matrix identifies the defect: canonical entitlement/grant path IDs can collide with legacy variant aliases in the existing OR source lookup. This plan adds an explicit optional selector at that existing seam; omission preserves the OR query and stream order. Both handlers share parsing and keep versionID as the permission/claim owner. Admin write identifiers and Public Play UI are outside this plan.

Regression data is confined to the guarded Phase-117 helper's schemas in a dedicated postgres:16 tmpfs container; no application DATABASE_URL, live streams, host DB edits or migrations are used. HTTP stream delivery uses a synthetic RoundTripper, and Next fetch is mocked. Backend compilation/tests run from the Air-excluded /app/tmp/phase15902 copy before completed-source sync.

## Results and reproduction

Run the existing test helper with the explicit isolated DSN pointing at database `team4s_phase117_test_p15902` on owned container `team4s-phase15902-test`. The container used `postgres:16`, tmpfs `/var/lib/postgresql/data`, `--rm`, the Compose network, and no host ports. Source/migrations were copied to `/app/tmp/phase15902/backend` and `/app/tmp/phase15902/database/migrations`; Air excludes tmp. Source copies excluded `.env`, media and tmp. No Ubuntu dependency installation.

Backend command (in the scratch workdir with TEAM4S_PHASE117_TEST_DSN set only for exec):

```text
go test ./internal/repository ./internal/handlers -run 'Test.*(StreamIdentity|ReleaseStream)' -count=1 -v
go vet ./internal/repository ./internal/handlers
go build ./...
```

The repository fixture reuses the committed 159-01 collision inventory. The handler fixture keeps an independent minimal source inventory, a recorded entitlement resolver and real signed grants, then delivers bytes through a fake RoundTripper. It proves request/claim/permission ownership and exact SQL source selection; it does not claim to retest the unchanged entitlement rule engine. Existing entitlement/grant tests run in the same suite. Final parser cases explicitly include `variant%5Fid=%ZZ`, `%76ariant_id=%ZZ`, duplicate selectors, semicolon syntax, and unchanged no-selector behavior with `ignored=%ZZ`.

Frontend executes the actual Next route and unchanged `resolveStreamRelayTarget` with mocked cookies/fetch. It verifies initial grant, provided grant, refresh-only, grant 401 retry, upstream 401 recovery, canonical path/variant transport, offset/Range/User-Agent/response headers, refreshed cookies, malformed/foreign IDs and default compatibility. OpenAPI is parsed with already installed js-yaml; 33 tests, typecheck and three-file scoped lint pass.

The exact test container and resolved `/app/tmp/phase15902` directory were removed and absence verified. Root synchronized three finished backend source files in one tarstream and verified hashes/current Air child plus a benign malformed-selector HTTP400. No container restart or migration entrypoint; no live stream, grant creation or data write. See root-owned `../root-runtime-sync-15902.json`.

Transcripts are retained with ANSI escapes removed and whitespace normalized for Git; test content/results are preserved. `verification.json` maps every result to its log. The default resolver deliberately retains the prior ambiguous OR behavior; explicit identity is the new safe opt-in path and UI adoption belongs to 159-03.
