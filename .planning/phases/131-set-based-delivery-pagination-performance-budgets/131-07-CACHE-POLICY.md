# 131-07 — Cache-class separation policy (D-09)

**Requirement:** PMPF-04, D-09. **Status:** Locked (verify-only — no production header change in 131-07).

## Policy

Public member routes keep viewer-specific and anonymous responses in **separate cache
classes**. No shared/public cache is introduced in milestone 131.

### Response classes

| Class | Trigger | Headers emitted |
|-------|---------|-----------------|
| Viewer-specific | `is_owner` OR `is_private_preview` true (authenticated viewer resolves to owner/private-preview) | `Cache-Control: private, no-store` + `Vary: Authorization` |
| Anonymous public | no viewer / no owner-preview | `Vary: Authorization` (no `Cache-Control`; explicitly **no** shared/public cache) |

### Why this prevents leakage

1. **Owner/private-preview bodies are never stored.** `private, no-store` forbids any
   cache (shared or private) from persisting the response, so an owner preview can never be
   replayed to a later request.
2. **Authorization is the cache key discriminant.** `Vary: Authorization` on every public
   member response guarantees an anonymous request (no `Authorization` header) and an
   authenticated owner request never collide on the same cache entry, even under heuristic
   caching of anonymous responses.
3. **No shared cache exists to leak into.** No public member route emits `public`,
   `max-age`, or `s-maxage`. There is no shared/public cache class in 131, so there is no
   place an owner preview could leak into.

## Seam

`backend/internal/handlers/public_member_access.go` → `setPublicMemberResponseCache(c, viewerDependent bool)`.
Called twice in `resolvePublicMemberAccess`: pre-resolve with `viewerAppUserID > 0`, and
post-resolve with `access.IsOwner || access.IsPrivatePreview`. Established in Phase 128; left
unchanged by 131-07.

## Lock test

`TestPublicMemberCacheClassSeparationLock` in
`backend/internal/handlers/app_public_profile_test.go` asserts:
- owner/private-preview response → `private, no-store` + `Vary: Authorization`;
- anonymous response → `Vary: Authorization` and **no** `public`/`max-age`/`s-maxage`;
- the `setPublicMemberResponseCache` seam never emits a shared cache for either input.

DB-free: `go test ./internal/handlers/ -run "Cache|Viewer" -count=1` (GREEN).

## Future shared cache (out of scope for 131)

Introducing a shared/public cache for anonymous public member responses is deferred (D-09).
It requires BOTH: (1) a measured bottleneck proving the shared cache is needed, and (2) a
complete invalidation story so stale or viewer-specific data can never be served. Absent
both, the separate-classes / no-store policy above stands.
