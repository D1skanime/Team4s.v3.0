---
phase: quick
plan: 260609-x3q
status: complete
subsystem: frontend/admin/episode-versions
tags: [navigation, episode-version-editor, fansub-link, ui]
dependency_graph:
  requires: []
  provides: [navigation-zurück-fansubgruppe]
  affects: [EpisodeVersionEditorPage]
tech_stack:
  added: []
  patterns: [Button-Primitive mit href, dezenter Subtitle-Link via CSS-Modul]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
decisions:
  - "Button-Primitive (secondary + href) statt nacktem Link-Element in der Action-Bar — CLAUDE.md-Regel: lokale Datei-Konsistenz rechtfertigt kein Abweichen vom globalen Design-System"
metrics:
  duration: "~10 Minuten"
  completed: "2026-06-09"
  tasks_completed: 2
  files_changed: 3
---

# Quick Task 260609-x3q: Navigation zur Fansubgruppe im Episode-Version-Editor

## One-Liner

Zwei conditional Links auf `/admin/fansubs/{id}/edit` im Episode-Version-Editor: Button-Primitive in der Action-Bar und dezenter Text-Link in der Header-Subtitle.

## Was wurde gebaut

**fansubGroupHref-Variable** — direkt nach `animeHref` abgeleitet: `segmentGroupId != null ? /admin/fansubs/${segmentGroupId}/edit : null`.

**Action-Bar-Link** — `Button href={fansubGroupHref} variant="secondary"` mit Label "Zur Fansubgruppe", nur wenn `fansubGroupHref != null`. Verwendet `Button`-Primitive aus `@/components/ui` (CLAUDE.md-Pflicht: globales Design-System).

**Header-Subtitle-Link** — `groupName` wird als `<Link href={fansubGroupHref} className={styles.subtitleGroupLink}>` gerendert. `segmentVersion` bleibt Plaintext daneben. Erscheint nur wenn `groupName` und `fansubGroupHref` gesetzt.

**CSS `.subtitleGroupLink`** — `color: inherit` (greift `#6b6b70` der `.subtitle`-Klasse auf), dezentes `text-decoration-color: rgba(107, 107, 112, 0.4)` mit Hover-Verstärkung.

**2 neue Tests** — Action-Bar-Link-Assertion (`getAllByRole("link", { name: "Zur Fansubgruppe" })`) und Subtitle-Link-Assertion (`getByRole("link", { name: "SubGroup" })`), beide prüfen `href="/admin/fansubs/10/edit"`.

## Testergebnis

```
Test Files  5 passed (5)
Tests       113 passed (113)
```

Alle Tests grün. ESLint: 0 neue Warnungen (10 pre-existing native-input-Warnungen in der Datei, scope-extern).

## Deviations from Plan

### Orchestrator-Override (CLAUDE.md-Konformität)

**Action-Bar: Button-Primitive statt `<Link className={styles.secondaryButton}>`**

- **Grund:** CLAUDE.md schreibt vor: „Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen vom globalen Design-System." Der Plan schlug `<Link className={styles.secondaryButton}>` vor — der Orchestrator hat diesen Override bereits vor der Ausführung angewiesen.
- **Fix:** `<Button href={fansubGroupHref} variant="secondary">` — rendert ein natives `<a>`-Element mit globalen Design-System-Styles; im Test als `role="link"` korrekt erkannt.
- **Kein Test-Umbau nötig:** Der `Button` mit `href` rendert direkt `<a>` (ohne `next/link`), daher funktioniert `getAllByRole("link", ...)` im jsdom-Test ohne Änderungen am Mock.

## Known Stubs

Keine — beide Links sind vollständig verdrahtet.

## Self-Check: PASSED

- EpisodeVersionEditorPage.tsx: vorhanden, 3 Änderungen (Import, fansubGroupHref, Subtitle, Action-Bar)
- EpisodeVersionEditor.module.css: .subtitleGroupLink-Klasse vorhanden
- page.test.tsx: 2 neue Tests vorhanden
- Commit 7b45f40b: vorhanden
