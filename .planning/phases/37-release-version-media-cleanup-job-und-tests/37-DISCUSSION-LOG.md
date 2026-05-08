# Phase 37: Release-Version Media — Cleanup Job und Tests — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 37-release-version-media-cleanup-job-und-tests
**Areas discussed:** Blocker-Behebung (kein offener Gray-Area-Dialog)

---

## Kontext der Session

Der Nutzer bat um discuss-phase mit dem expliziten Ziel, die 3 Blocker zu beheben, die der Plan-Checker für Phase 37 identifiziert hatte:

| Plan | Blocker |
|------|---------|
| 37-01/37-02 | Falsches XML-Schema: `<acceptance_criteria>` statt `<verify><automated>` + `<done>` |
| 37-02 | Phantom-Pfad `backend/internal/services/release_version_media_upload.go` (existiert nicht) |
| 37-03 | Falscher Test-Runner: `npm test -- --runInBand` statt `npx vitest run` |

Da die Pläne bereits 4 Artefakte ohne User-Context enthielten, wurde kein interaktiver Gray-Area-Dialog geführt. Der Discuss-Phase-Schritt erfasste stattdessen den benötigten Implementierungskontext für das Replanning.

---

## Entscheidungen (automatisch aus Codebase-Scout + Phase-35/36-Kontext)

| Bereich | Entscheidung | Quelle |
|---------|--------------|--------|
| Cleanup-Job-Trigger | time.Ticker in main.go | Claude-Discretion (kein vorhandenes Muster) |
| Stale-Schwellenwert | 30 Minuten hardcoded | Claude-Discretion |
| Cleanup-Intervall | 10 Minuten | Claude-Discretion |
| Backend-Test-Muster | Mock-Repository (wie media_upload_test.go) | Codebase-Scout |
| Frontend-Test-Runner | npx vitest run | Codebase-Scout (Blocker-Fix) |
| Service-Pfad | Kein release_version_media_upload.go | Phase-35-Verifikation (Blocker-Fix) |

## Claude's Discretion

- Cleanup-Job-Architektur (Ticker vs. Service-Struct)
- Stale-Schwellenwerte
- Goroutine-Shutdown-Semantik

## Deferred Ideas

- Logo-Upload-PNG-zu-JPG-Konvertierungs-Bug → eigene Bugfix-Quick-Task
- Handler-Datei-Split (701 Zeilen > 450-Zeilen-Limit) → Gap-Closure nach Phase 37
