# PMQA-05 Live UAT Checklist — Öffentliches Mitgliedsprofil

Milestone-abschließende, gebündelte Live-Freigabe (CONTEXT.md D-09) für das öffentliche
Mitgliedsprofil `/members/{slug}`. Dieses Dokument ist das Profil-x-Layout-x-A11y-Raster, das
der menschliche Checkpoint (Task 3 dieses Plans) Punkt für Punkt durchgeht.

**Automatisierte Basislinie (Task 1, bereits grün):**
- `collect-member-profile-evidence.mjs --mode budget-check` — 0 Breaches, beide Profile
  (`.planning/phases/134-fixture-backed-verification-rollout/evidence/budget-check-sheppert.json`,
  `evidence/budget-check-csubs-leader.json`).
- `verify-profile-image-delivery.mjs` — alle 5 URL-Klassen, alle 4 Pflichtbreiten, Alpha,
  Cache-Hit, Original-Fallback: bestanden.
- 6 Full-Page-Screenshots + 6 Keyboard-Fokus-Traces (`capture-phase134-uat-evidence.mjs`) —
  alle 6 Kombinationen `keyboardPass: true`, 0 fehlende Fokus-Indikatoren.

Jeder Abschnitt unten listet nur, was NICHT vollautomatisiert geprüft werden kann (echter
400%-Browser-Zoom, gefühltes Ladeverhalten, visuelle Plausibilität am Bildschirm) — nicht,
was Task 1 bereits automatisiert bewiesen hat.

---

## Profil: sheppert (sparse — Gedenkprofil, 0 aktuelle Projekte, 1 historische Mitgliedschaft)

### Mobile (390x844)

Referenz-Screenshot: `evidence/screenshots/sheppert-390x844.png`
Keyboard-Trace: `evidence/sheppert-390x844-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

### Intermediate (768x1024)

Referenz-Screenshot: `evidence/screenshots/sheppert-768x1024.png`
Keyboard-Trace: `evidence/sheppert-768x1024-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

### Widescreen (1440x900)

Referenz-Screenshot: `evidence/screenshots/sheppert-1440x900.png`
Keyboard-Trace: `evidence/sheppert-1440x900-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

---

## Profil: csubs-leader (dense — aktives Profil, 10 bestätigte Projekte, 2 Mitgliedschaften)

### Mobile (390x844)

Referenz-Screenshot: `evidence/screenshots/csubs-leader-390x844.png`
Keyboard-Trace: `evidence/csubs-leader-390x844-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

### Intermediate (768x1024)

Referenz-Screenshot: `evidence/screenshots/csubs-leader-768x1024.png`
Keyboard-Trace: `evidence/csubs-leader-768x1024-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

### Widescreen (1440x900)

Referenz-Screenshot: `evidence/screenshots/csubs-leader-1440x900.png`
Keyboard-Trace: `evidence/csubs-leader-1440x900-keyboard.json`

- [ ] Kein sichtbarer horizontaler Scrollbalken / kein abgeschnittenes Bedienelement auf den ersten Blick.
- [ ] Das echte geseedete Story-Bild wird korrekt angezeigt (kein defektes Bild-Icon, kein Platzhalter).
- [ ] Bei 400% Browser-Zoom bleibt aller Text lesbar; kein Bedienelement wird unerreichbar.
- [ ] Ladeverhalten fühlt sich subjektiv schnell an; kein sichtbares Layout-Springen (Jank).
- [ ] Tab-Reihenfolge ergibt beim Live-Beobachten visuell Sinn (Abgleich gegen den Keyboard-Trace oben).

---

## Bekannte, dokumentierte Einschränkung (außerhalb des Umfangs dieses Plans)

Ein separater Tablet-Band-Hang (Viewport-Breite 600–765px) im verschachtelten
Badge-Karussell-Container-Query-Layout (Phase-133-Architektur) besteht weiterhin und
betrifft KEINEN der drei oben geforderten Viewports (390x844, 768x1024, 1440x900). Der
390x844-Mobile-Hang wurde in dieser Plan-Session behoben (Commit `23958eb7`). Der
Tablet-Band-Hang benötigt eine eigene Entscheidung/einen eigenen Plan und wird hier nicht
blockierend behandelt.

## Sign-off

Endgültige Freigabe ist laut CONTEXT.md D-09 ausschließlich die des Nutzers, nicht
automatisierbar — sie wird über den Checkpoint (Task 3 dieses Plans) eingeholt.

- [x] sheppert approved
- [x] csubs-leader approved
