---
phase: 35-release-version-media-backend-upload-service-and-api
plan: "01"
subsystem: backend
tags: [govips, CGO, Docker, libvips, image-processing]
dependency_graph:
  requires: []
  provides: [govips-build-foundation]
  affects: [backend/Dockerfile, backend/go.mod, backend/cmd/server/main.go]
tech_stack:
  added: [github.com/davidbyttow/govips/v2 v2.15.0]
  patterns: [CGO-enabled Alpine multi-stage Docker build, govips lifecycle init in main]
key_files:
  created: []
  modified:
    - backend/Dockerfile
    - backend/go.mod
    - backend/go.sum
    - backend/cmd/server/main.go
decisions:
  - CGO_ENABLED=1 required for govips — both go build commands in Dockerfile changed
  - govips v2.15.0 pinned as the stable release matching plan requirements
  - vips.Startup(nil) placed after ffmpeg check and before router init so it runs before any handler initializes
  - defer vips.Shutdown() placed after govips startup so LIFO order ensures vips shuts down before DB pool closes
metrics:
  duration: "2 minutes"
  completed: "2026-05-08"
  tasks_completed: 2
  files_modified: 4
---

# Phase 35 Plan 01: CGO + libvips Build Foundation Summary

CGO-enabled Alpine Docker build with libvips installed in both builder and runtime stages; govips v2.15.0 added as a Go dependency and initialized in main.go before router setup.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite Dockerfile for CGO + libvips | cddb27bc | backend/Dockerfile |
| 2 | Add govips dependency and initialize in main.go | 005b83bc | backend/go.mod, backend/go.sum, backend/cmd/server/main.go |

## What Was Built

### Task 1 — Dockerfile rewrite

Replaced the CGO-disabled single-stage build with a proper multi-stage build:

- Builder stage: added `build-base pkgconfig vips-dev` via apk before the Go build steps
- Both `go build` commands changed from `CGO_ENABLED=0` to `CGO_ENABLED=1`
- Runtime stage: added `vips` (no -dev suffix) for the shared library needed at runtime

### Task 2 — govips dependency and lifecycle

- Added `github.com/davidbyttow/govips/v2 v2.15.0` to go.mod via `go get`
- Updated go.sum with correct hashes via `go mod tidy`
- Added import `"github.com/davidbyttow/govips/v2/vips"` to main.go
- Inserted `vips.Startup(nil)` with error check after ffmpeg availability check (line 51), before `router := gin.New()` (line 56)
- Deferred `vips.Shutdown()` for clean teardown

## Verification

Local `CGO_ENABLED=0 go build` returns expected `undefined: vips.Startup/Shutdown` errors (correct — govips requires CGO). The actual compilation happens inside Docker with CGO_ENABLED=1 and libvips available. Docker build verification requires a container rebuild.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- backend/Dockerfile exists and contains CGO_ENABLED=1: confirmed
- backend/go.mod contains govips/v2 v2.15.0: confirmed
- backend/cmd/server/main.go contains vips.Startup(nil) at line 51, before gin.New() at line 56: confirmed
- Commits cddb27bc and 005b83bc exist in git log: confirmed
