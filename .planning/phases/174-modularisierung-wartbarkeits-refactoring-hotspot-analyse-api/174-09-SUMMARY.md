---
phase: 174
plan: 09
subsystem: frontend/admin-fansubs-create
tags: [characterization-test, d-20, d-25]
requires: []
provides: ["frontend/src/app/admin/fansubs/create/page.test.tsx (7 stabile Charakterisierungstests)"]
key-files:
  created: [frontend/src/app/admin/fansubs/create/page.test.tsx]
decisions: [D-25]
completed: 2026-10-05
---

# 174-09 Summary: Charakterisierungstest Fansub-Anlegeseite (reduziert nach D-25)

## Ergebnis

`frontend/src/app/admin/fansubs/create/page.test.tsx` mit **7 Tests, alle grün gegen den unveränderten
`page.tsx`** (Laufzeit ~1,7 s), eslint ohne Befund. Kein neuer Export in `page.tsx` (D-03/Punkt 6 der
Planhärtung eingehalten).

Abgedeckt (indirekt über Rendern):
- `slugify` – Slug-Ableitung inkl. Umlaut-/Sonderzeichen-Behandlung
- `isValidSlug` – Format-Fehlertext bei manuell ungültigem Slug
- `isAbsoluteURL` – Validierung der Community-Link-URLs
- `toOptional`/`parseYear`/`formToCreatePayload` – Payload-Form beim Anlegen
- `errMessage` – ApiError-Status/-Text unverändert inkl. Umlaut
- `mapGroupToForm`/`mapGroupMedia`/`legacyLinksFromGroup`/`mapGroupLinks`/`emptyForm`/`createEmptyLink` – Übernahme der Server-Antwort nach dem Anlegen
- `save` (Erfolg) – Create-API-Aufruf + Erfolgstext

## Abweichung vom Plan (Nutzerentscheidung D-25, 2026-10-05)

Der Executor hatte 13 Tests geschrieben. Einzelläufe mit Zeitlimit ergaben: 7 grün, 3 rot gegen den
unveränderten Code (Alias-Sortierung, Erstanzeige, Validierungsfehler), 3 hängend in Endlosschleife mit
100 % CPU (Alias hinzufügen, Alias entfernen, zweites Speichern/Patch+Link-Sync). Ein
Charakterisierungstest, der gegen unveränderten Code nicht grün ist, sichert nichts ab.

Nutzerentscheidung: Klick-Abläufe eines Admins werden **live abgenommen**, nicht per neuer
Klick-Simulation. Die 6 instabilen Tests wurden entfernt und als Live-UAT-Punkte in
`174-UAT-CHECKLIST.md` übernommen. Die Hilfsdatei `page.minimal.test.tsx` (Duplikat) wurde gelöscht.

## Auswirkung auf Folgepläne

- 174-14 nutzt diese 7 Tests weiterhin als automatisches Regressions-Gate (unverändert grün nach dem Split).
- Die Interaktionspfade (Aliase, zweites Speichern, Validierung, Erstanzeige) sind durch die Live-UAT
  nach Welle 3 abzunehmen, nicht automatisiert.

## Self-Check: PASSED
- `npx vitest run src/app/admin/fansubs/create/page.test.tsx` → 7 passed
- `npx eslint …/page.test.tsx` → 0 Probleme
- `page.tsx` unverändert (`git diff --stat -- frontend/src/app/admin/fansubs/create/page.tsx` leer)
