---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "07"
subsystem: verification
tags: [verification, uat, test-suite, roadmap, migration-smoke]
status: verified
dependency_graph:
  requires:
    - 70-03 (TipTap-Service Image-Node)
    - 70-04 (Upload-Handler + Repository)
    - 70-05 (Frontend Extension + Upload-Utility)
    - 70-06 (Save-Flow: IDOR + Cleanup + deferred Batch-Upload)
  provides:
    - Automatisierte Verifikation (Backend-Suite gruen, Phase-70-Frontend-Tests gruen)
    - Migration-0090-Smoke (DB-Spalte + Index bestaetigt)
    - ROADMAP-Korrekturen (SC1 D-05-Gap, SC5 D-13-Override) bestaetigt vorhanden
  affects:
    - .planning/ROADMAP.md
tech_stack:
  added: []
  patterns:
    - DB-Smoke via information_schema.columns + pg_indexes statt Browser-UAT
    - Out-of-scope Test-Triage via git log -1 je Fehlerquelle
key_files:
  created:
    - .planning/phases/70-tiptap-bilder-fuer-member-profilgeschichte/70-07-SUMMARY.md
  modified: []
decisions:
  - "Task 2 (7 Browser-UAT-Szenarien) per User-Entscheidung auf 'Migration anwenden + Smoke' reduziert — funktionale Browser-Verifikation bleibt ausstehend (UAT-pending)."
  - "13 fremde Frontend-Test-Fehler (Phasen 50/66) als out-of-scope eingestuft und NICHT behoben — gehoeren parallelen Agenten (per User-Entscheidung 'nur melden')."
  - "Migration 0090 wird nicht manuell angewendet — Backend-Entrypoint hatte sie beim Container-Start bereits ausgefuehrt (DB-Smoke bestaetigt)."
  - "Backend-Container NICHT rebuilt — geteilte Infra (:8092) mit parallelen 50/66/67-Agenten; Rebuild ist Voraussetzung fuer Browser-UAT und bleibt dem User ueberlassen."
---

# Plan 70-07 — Verifikation + UAT

## Was verifiziert wurde (automatisiert)

**Task 1 — Test-Suiten:**
- Backend `go test ./... -count=1`: **vollstaendig gruen** (alle Pakete inkl. handlers, services, repository, models).
- Frontend Phase-70-Tests: **17/17 gruen** (`StoryImageExtension.test.ts`, `storyImageUpload.test.ts`); TipTap-Service-Image-Tests + Handler-Tests (IDOR/RoundTrip/Cleanup/PixelBomb/EXIF) gruen.
- Frontend `tsc --noEmit`: sauber.

**Task 1 — ROADMAP-Korrekturen (bereits vorhanden, bestaetigt):**
- SC1 traegt `[Korrigiert D-05]` — Alt-/Caption-Text als dokumentierter Contract-Gap.
- SC5 traegt `[Ueberschrieben D-13]` — Cleanup-on-Save in Phase 70 implementiert.
- Alle 7 Plaene gelistet; Fortschritts-Count wird per SDK gefuehrt.

**Migration-0090-Smoke (statt Browser):**
- DB `team4s_v2`: Spalte `media_assets.owner_member_id` (bigint, nullable) existiert.
- Index `idx_media_assets_owner_member` existiert.
- Route `POST /api/v1/me/profile/story-images` im committeten Source registriert (`main.go:281`, mit `authMiddleware`).
- Backend `/health`: HTTP 200.

## Offene Punkte (NICHT abgeschlossen)

### Browser-UAT ausstehend (Task 2 — blockierender human-verify Gate)
Die 7 funktionalen UAT-Szenarien wurden NICHT durchgefuehrt (User waehlte Smoke statt Browser-UAT):
1. Round-Trip (D-21) · 2. Cleanup-on-Save (D-22) · 3. IDOR 422 (D-23) ·
4. Public-Profil (D-24) · 5. Sanitizing (D-20/D-23) · 6. Upload-Fehler-Atomizitaet (D-06/D-07) ·
7. /me/profile Lesemodus (D-12).

**Voraussetzung fuer UAT:** Backend-Container ist stale (Build 09:04 UTC, vor den 70-03..70-06-Commits) →
laufender `:8092` liefert 404 auf den neuen Endpoint. Vor dem Browser-UAT muss das Backend neu
gebaut/gestartet werden (`docker compose up -d --build team4sv30-backend`). Dev-Server `:3000` fuers Frontend.

### Out-of-scope Test-Fehler (nur gemeldet, nicht behoben)
13 Frontend-Test-Fehler aus Fremdphasen, per git-Triage zugeordnet:
- `api.no-token-boundary.test.ts` — `authToken`-Props in `MemberClaimSection.tsx` (`feat 66-06`), `fetch` in `ProfileBackgroundCard.tsx` (vorbestehend).
- `admin/anime/page.test.tsx`, `admin/anime/create/page.test.tsx`, `useAdminAnimeCreateController.test.ts` — Admin-Anime/Jellyfin (`feat 50`).
Keine dieser Dateien gehoert zu Phase 70.

## UAT-Durchlauf (2026-06-03) — 3 Bugs gefunden und gefixt

Manueller Browser-UAT (Dev-Server :3000, Backend-Container neu gebaut, Migration 0090 aktiv)
deckte drei Defekte auf, die alle behoben + mit Regressionstests abgesichert wurden:

1. **Editor-Ausrichtung rechts/mitte ohne Wirkung** — `align-*`-Klassen nutzten `margin:auto`
   auf dem vollbreiten Block-Wrapper (wirkungslos). Fix: `text-align` auf dem Wrapper (inline-block
   Container). Commit `4b40cf37`.
2. **Read/Public-View: `<img>` ohne `src`** — Render-Resolver baute eine absolute URL
   (`mediaBaseURL + file_path`), die die bluemonday-img-src-Regex (`^/media/profile/...`) verfehlte
   → `src` gestrippt → unsichtbar. Fix: Resolver liefert relativen `file_path`. Commit `a33d3282`
   (+ verschaerfter Round-Trip-Test mit `mediaBaseURL`).
3. **Editor zeigt geladene Bilder nicht** — NodeView nutzte nur `preview_url` (Blob); geladene
   Bilder (nur `media_asset_id`) blieben leer; keine id→URL-Aufloesung. Fix: oeffentlicher Resolver
   `GET /api/v1/media/story-images/:id` (liefert Datei; konsistent mit oeffentlichem /media-Serving,
   da `<img>` keinen Bearer traegt) + NodeView nutzt ihn via `resolveApiUrl`. Commit `5f8d8976`
   (+ Handler-/Repo-Tests).

Zusaetzlich: **Backend-Container war stale** (Build vor den 70-03..70-06-Commits → 404 auf den
Upload-Endpoint). Per `docker compose up -d --build team4sv30-backend` neu gebaut.

**Szenario 1 (Round-Trip D-21) vom Nutzer bestaetigt** ("passt"): Bild einfuegen → Breite/Ausrichtung
→ Save → Reload → Bild bleibt im Editor und im Lesemodus.

**Noch offen (Nutzer-UAT):** Szenario 2 (Cleanup-on-Save D-22), 3 (IDOR 422 D-23), 4 (Public-Profil
D-24), 5 (Sanitizing D-20/D-23), 6 (Upload-Fehler-Atomizitaet D-06/D-07), 7 (/me/profile Lesemodus D-12).

## UAT-Abnahme (2026-06-03) — VERIFIZIERT (Nutzer: "kannst abhaken")

4 Bugs gefunden + gefixt (alle live, mit Regressionstests):
1. Editor-Ausrichtung rechts/mitte — `text-align` statt `margin:auto` auf vollbreitem Wrapper. `4b40cf37`
2. Read/Public `<img>` ohne `src` — Resolver liefert relativen `file_path` (bluemonday-Regex). `a33d3282`
3. Editor zeigt geladene Bilder nicht — oeffentlicher Resolver `GET /api/v1/media/story-images/:id`. `5f8d8976`
4. Resize skalierte nicht ueber native Breite — `.storyImage { width:100% }` (fuellt %-Container). `3fdd6fcb`
Zusaetzlich Backend-Container neu gebaut (war stale → 404 auf Upload-Endpoint).

Szenarien-Status:
- 1 Round-Trip (D-21): ✅ Nutzer bestaetigt
- 2 Cleanup-on-Save (D-22): ✅ DB-Zeile + Datei physisch entfernt (verifiziert)
- 3 IDOR 422 (D-23): ✅ Unit-Test (TestUpdateOwnProfileIDOR)
- 4 Public-Profil (D-24): ✅ GET /api/v1/members/{slug} liefert 2 imgs mit relativem src + width% + align
- 5 Sanitizing (D-20/D-23): ✅ Unit-Tests (BlocksExternalSrc/BlocksScript/BlocksStyleBeyondWidth)
- 6 Upload-Atomizitaet (D-06/D-07): Unit-Test-Abdeckung akzeptiert (storyImageUpload Rollback)
- 7 /me/profile Lesemodus (D-12): ✅ member_story_html mit korrektem img-src verifiziert

Echtdaten-Beleg (member 16): media_assets 158/159 (owner_member_id=16), Dateien auf Platte,
member_story_html mit `<img src="/media/profile/16/story/.../original.jpg" style="width:N%" class="story-img-align-center">`.

## Self-Check: PASSED (automatisierter Scope)
Backend-Suite gruen, Phase-70-Frontend-Tests gruen, Migration in DB bestaetigt, Route registriert.
Browser-UAT (D-12/D-21/D-22/D-23/D-24, D-06/D-07) bleibt als manueller Gate offen.
