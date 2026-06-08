---
phase: 74-public-member-profile-members-slug-memorial
plan: 08
subsystem: member-profile
tags: [gap-closure, slug, lock-k, full-stack, seo]
requires: []
provides:
  - "MemberProfile.Slug (/me-DTO) — nickname-abgeleiteter Public-Slug"
  - "openapi MemberProfile.slug (property + required)"
  - "MemberProfileData.slug (frontend type)"
affects:
  - "frontend/src/app/me/profile (Link 'Öffentliches Profil ansehen')"
tech-stack:
  added: []
  patterns:
    - "Go-Helper deriveMemberSlug spiegelt SQL memberSlugExpr (kein NFD-Stripping, bit-identisch zum Public-Slug)"
key-files:
  created: []
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_repository.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/app/me/profile/components/MemberProfileHero.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
decisions:
  - "Slug in Go aus dem bereits gescannten m.nickname abgeleitet (deriveMemberSlug) statt zusätzlicher SELECT-Spalte — deckt auch den Member-Auto-Create-Pfad ab, ohne doppeltes SQL; Regel bit-identisch zu memberSlugExpr"
  - "Frontend-Link mit member_id-Fallback (profile.slug || profile.member_id) — Public-Seite löst id::text weiterhin auf, Link bleibt robust bei leerem Nickname"
metrics:
  duration: ~12min
  completed: 2026-06-08
---

# Phase 74 Plan 08: GAP-9 /me-Profil-Link auf nickname-abgeleitete Slug-URL Summary

GAP-9 geschlossen: Der Button „Öffentliches Profil ansehen" auf `/me/profile` verlinkt jetzt auf die kanonische, nickname-abgeleitete Slug-URL (`/members/{slug}`) statt `/members/{member_id}`; `slug` wurde Lock-K-konsistent end-to-end modelliert (Backend-Modell + Repo-Projektion + OpenAPI + frontend type).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Backend — MemberProfile.Slug ableiten + projizieren | 8cece241 | models/member_profile.go, repository/member_profile_repository.go |
| 2 | Contract + frontend type (Lock K) — slug | 3cc6f7f0 | openapi.yaml, types/profile.ts (+2 Test-Fixtures) |
| 3 | Frontend — /me/profile Link auf Slug umstellen | 184ea362 | components/MemberProfileHero.tsx |

## What Changed

- **Backend:** `MemberProfile` struct hat `Slug string \`json:"slug"\`` (nach `FansubName`). Neuer Helper `deriveMemberSlug(nickname)` im repository-Paket spiegelt `memberSlugExpr` exakt (zuerst `ToLower`+Trim, dann `[^a-z0-9]+` → `-`, Rand-`-` trimmen; bewusst **kein** NFD-Diakritika-Stripping, damit bit-identisch zum kanonischen Public-Slug). `ensureProfileBaseTx` setzt `profile.Slug` aus dem gescannten Nickname (`valueOrDefault(row.memberNickname, row.accountName)`) — derselbe Wert, der auch `FansubName` speist.
- **Contract:** `openapi.yaml` MemberProfile-Schema um `slug` (property `type: string` + `required`) ergänzt, mit Description „Nickname-derived public profile slug (mirror of the /members/:slug route key)."
- **Frontend type:** `MemberProfileData` um `slug: string` (nach `fansub_name`) erweitert. `PublicMemberProfileData` unverändert (Public-Slug kommt dort über die Route).
- **Link:** `MemberProfileHero.tsx` Z. 19 → `const publicProfileHref = \`/members/${profile.slug || profile.member_id}\`` (member_id-Fallback).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test-Fixtures um neues required-Feld `slug` ergänzt**
- **Found during:** Task 2 (`npm run typecheck`)
- **Issue:** Da `slug` jetzt im required-`MemberProfileData`-Type ist, schlugen zwei Test-Fixtures fehl, die `MemberProfileData` ohne `slug` konstruierten.
- **Fix:** `slug` in beide Fixtures eingetragen (`page.test.tsx` → `'mikafx'`, `OwnHiddenProfilePreview.test.tsx` → `'subaru'`).
- **Files modified:** frontend/src/app/me/profile/page.test.tsx, frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
- **Commit:** 3cc6f7f0

## Deferred Issues

- **Repo-weiter ESLint-Baseline (18 pre-existing errors, ~326 warnings)** in nicht-betroffenen Dateien (admin episode/anime Seiten). `npm run lint` (gesamtes Projekt) exit 1 ist ein Vorbestand; die 74-08-geänderte Datei `MemberProfileHero.tsx` lintet sauber (`npx eslint <file>` exit 0). Festgehalten in `deferred-items.md`. Out of scope.
- **Geteilte git stashes** (`stash@{0..2}`) zur Ausführungszeit vorhanden — unangetastet gelassen (Stash-Sicherheitskonvention).

## Verification

- `cd backend && go build ./...` → grün (GO_BUILD_OK)
- `cd backend && go vet ./internal/...` → grün
- `cd frontend && npm run typecheck` → grün (TYPECHECK_OK)
- `npx eslint src/app/me/profile/components/MemberProfileHero.tsx` → exit 0 (changed file clean)
- Live-Verifikation offen (Plan 74-11): /me/profile → „Öffentliches Profil ansehen" landet auf /members/ballelboy statt /members/3.

## Self-Check: PASSED

- FOUND: backend/internal/models/member_profile.go (Slug-Feld)
- FOUND: backend/internal/repository/member_profile_repository.go (deriveMemberSlug + profile.Slug)
- FOUND: shared/contracts/openapi.yaml (slug property + required)
- FOUND: frontend/src/types/profile.ts (slug: string)
- FOUND: frontend/src/app/me/profile/components/MemberProfileHero.tsx (profile.slug)
- FOUND commit: 8cece241
- FOUND commit: 3cc6f7f0
- FOUND commit: 184ea362
