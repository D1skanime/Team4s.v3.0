---
phase: quick-260918-fmq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/fansubs/FansubGroupPicker.module.css]
autonomous: true
requirements: [GAP-13]

must_haves:
  truths:
    - "Inaktive Fansub-Gruppen-Chips auf /anime/4 sind lesbar (Text hebt sich sichtbar vom Chip-Hintergrund ab)"
    - "Aktiver Chip-Zustand (aria-pressed=true) sieht unveraendert aus (Akzentfarbe gefuellt)"
    - "Bestehende FansubGroupPicker-Tests laufen weiterhin gruen, ohne Anpassung"
  artifacts:
    - path: "frontend/src/components/fansubs/FansubGroupPicker.module.css"
      provides: "Lokale Glass-Tokens (--glass-surface, --glass-surface-hover, --glass-border) fuer inaktive Chips + eyebrowLabel-Fix"
      contains: "--glass-surface"
  key_links:
    - from: "frontend/src/components/fansubs/FansubGroupPicker.module.css .chip"
      to: "--glass-surface / --glass-border (lokal auf .wrapper)"
      via: "background/border Deklaration"
      pattern: "background:\\s*var\\(--glass-surface\\)"
---

<objective>
GAP-13 beheben: Inaktive Fansub-Gruppen-Chips im `FansubGroupPicker` sind aktuell weiss auf weiss
(hell auf `var(--surface-card)`) und dadurch auf `/anime/[id]` unlesbar. Der Picker rendert innerhalb
der dunklen `.episodesSection` ueber dem Anime-Coverbild — analog zu `EpisodeGlassCard.module.css`
braucht er eigene, feature-lokale Glass-Tokens fuer Hintergrund und Rand statt der globalen
Light-Card-Tokens.

Purpose: Admin kann auf der Anime-Detailseite die verfuegbaren Fansub-Gruppen tatsaechlich lesen
und auswaehlen (nicht nur den bereits aktiven Chip erkennen).
Output: Angepasste `FansubGroupPicker.module.css` mit glasigen, aber lesbaren inaktiven Chips;
verifiziert per Unit-Test-Lauf + Playwright-Screenshot im Frontend-Container.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/fansubs/FansubGroupPicker.module.css
@frontend/src/components/fansubs/FansubGroupPicker.tsx
@frontend/src/components/fansubs/FansubGroupPicker.test.tsx
@frontend/src/components/fansubs/EpisodeGlassCard.module.css

<interfaces>
<!-- Sibling glass-token pattern to reuse (EpisodeGlassCard.module.css, .card selector): -->
```css
.card {
  --glass-surface: rgba(255, 255, 255, 0.06);
  --glass-surface-strong: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-border-strong: rgba(255, 255, 255, 0.22);
  --glass-text: rgba(255, 255, 255, 0.92);
  --glass-text-muted: rgba(255, 255, 255, 0.60);
  ...
  background: var(--glass-surface);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
}
```

<!-- Current FansubGroupPicker.module.css (full file, 59 lines) -->
```css
/*
 * Feature-lokale Glass-Tokens (UI-SPEC "Eigenstaendig getroffene Design-Entscheidungen" 1/2):
 * dieser Picker rendert innerhalb der dunklen .episodesSection (siehe FansubVersionBrowser),
 * darum dieselben Werte wie EpisodeGlassCard.module.css statt der globalen Light-Card-Tokens.
 */
.wrapper {
  --glass-text: rgba(255, 255, 255, 0.92);
  --glass-text-muted: rgba(255, 255, 255, 0.60);

  margin-bottom: var(--space-5);
}

.eyebrowLabel {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--glass-text-muted);
}

.chipRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.chip {
  border-radius: var(--radius-md);
  min-height: var(--control-height-sm);
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  color: var(--glass-text);
  font-size: 14px;
  font-weight: 400;
  max-width: min(100%, 260px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.chip[aria-pressed='true'] {
  background: var(--accent-dark);
  border: 2px solid var(--accent-dark);
  color: #ffffff;
  font-weight: 600;
}

.logo {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}
```

Confirmed via `FansubGroupPicker.test.tsx`: no test asserts CSS class content, computed styles, or
color values — only DOM structure (`role="group"`, `aria-pressed`, button count, image attrs, click
handlers). No test changes required for this CSS-only fix.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Glass-Tokens fuer inaktive Chips ergaenzen und eyebrowLabel-Kontrast erhoehen</name>
  <files>frontend/src/components/fansubs/FansubGroupPicker.module.css</files>
  <action>
Nur diese eine Datei aendern. Aenderungen im Detail:

1. Kommentarblock (Zeilen 1-5) leicht ergaenzen: kurzer Zusatzsatz, dass jetzt auch
   Surface/Border-Glass-Tokens lokal definiert sind (analog zu EpisodeGlassCard.module.css),
   nicht nur Text-Tokens. Knapp halten (keine Romane).

2. In `.wrapper` zwei neue lokale Custom Properties ergaenzen (unterhalb der bestehenden
   `--glass-text`/`--glass-text-muted`): `--glass-surface: rgba(255, 255, 255, 0.16);` und
   `--glass-surface-hover: rgba(255, 255, 255, 0.20);` und `--glass-border: rgba(255, 255, 255, 0.28);`.
   Diese Werte liegen bewusst auf der kraeftigeren Seite der in der Aufgabenbeschreibung genannten
   Ranges (0.16 statt 0.12 fuer Surface, 0.28 fuer Border), da der reale Hintergrund ein
   Anime-Coverbild ist und nicht garantiert dunkel/gleichmaessig.

3. `.chip` (inaktiver Basis-Zustand) anpassen:
   - `background: var(--surface-card)` ersetzen durch `background: var(--glass-surface)`.
   - `border: 1px solid var(--border-subtle)` ersetzen durch `border: 1px solid var(--glass-border)`.
   - `color: var(--glass-text)` bleibt unveraendert (Wert war schon korrekt, nur der Hintergrund war
     das Problem).
   - Neu ergaenzen: `backdrop-filter: blur(8px) saturate(1.1);` und
     `-webkit-backdrop-filter: blur(8px) saturate(1.1);` (bewusst leichter als
     EpisodeGlassCard's 14px-Blur, da hier nur wenige Chips gleichzeitig gerendert werden statt
     potenziell Dutzende Karten — kurzer Kommentar analog zum D-45-Kommentar in
     EpisodeGlassCard.module.css ist optional, nicht zwingend).

4. Neuen Hover-Zustand ergaenzen, der NICHT den aktiven (`aria-pressed='true'`) Chip beeinflusst:
   `.chip:hover:not([aria-pressed='true']) { background: var(--glass-surface-hover); }`
   Diese Regel unter der `.chip`-Basis-Regel einfuegen (vor `.chip[aria-pressed='true']` oder danach,
   Reihenfolge ist wegen `:not(...)` irrelevant fuer Spezifitaets-Konflikte mit dem aktiven Zustand).

5. `.chip[aria-pressed='true']` NICHT veraendern — bleibt exakt wie es ist (gefuellter Akzent-Chip,
   GAP-07-Loesung).

6. `.eyebrowLabel`: `color: var(--glass-text-muted)` ersetzen durch `color: var(--glass-text)`.
   Zusaetzlich `text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);` ergaenzen, um Lesbarkeit ueber dem
   Hintergrundbild zusaetzlich abzusichern (kann ohne exaktes Referenzbild nicht final
   kontrastberechnet werden, daher vorsorglich mit Schatten).

7. `.logo` unveraendert lassen.

Keine neuen globalen CSS-Variablen. Keine anderen Dateien anfassen. Keine Aenderung an
FansubGroupPicker.tsx oder FansubGroupPicker.test.tsx.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx" 2>&1 | tail -30</automated>
  </verify>
  <done>
Datei enthaelt `--glass-surface`, `--glass-surface-hover`, `--glass-border` lokal auf `.wrapper`;
`.chip` (inaktiv) nutzt diese Tokens statt `--surface-card`/`--border-subtle` und hat einen
`backdrop-filter`; `.chip:hover:not([aria-pressed='true'])` existiert; `.chip[aria-pressed='true']`
ist byte-identisch zum vorherigen Stand; `.eyebrowLabel` nutzt `--glass-text` statt
`--glass-text-muted`. Bestehender Vitest-Testlauf fuer die Datei ist gruen (6/6 Tests).
  </done>
</task>

<task type="auto">
  <name>Task 2: Lint/Test-Lauf, Container-Neustart und visuelle Verifikation per Playwright-Screenshot</name>
  <files>frontend/src/components/fansubs/FansubGroupPicker.module.css</files>
  <action>
1. Lint fuer die betroffenen Dateien im Frontend-Container ausfuehren (scoped, nicht das ganze
   Projekt, um Kontext zu sparen):
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/FansubGroupPicker.tsx"`
   (CSS-Module-Dateien werden vom bestehenden ESLint-Setup nicht separat gelintet — kein
   CSS-Lint-Kommando in package.json vorhanden; das ist erwartet, kein Fehler.)

2. Vitest fuer die Testdatei erneut laufen lassen (Bestaetigung nach ggf. weiteren Edits aus Task 1):
   `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx"`
   Muss weiterhin alle Tests gruen zeigen, ohne dass die Testdatei angefasst wurde.

3. Frontend-Container neu starten, damit der Next.js-Dev-Server die CSS-Aenderung uebernimmt:
   `docker restart team4sv30-frontend`
   Danach kurz warten bis der Server wieder erreichbar ist (Health-Check via
   `curl -sf http://127.0.0.1:3000/anime/4 -o /dev/null -w "%{http_code}\n"`, in einer kurzen
   Retry-Schleife von max. ~10 Versuchen mit 2s Abstand, kein langes sleep vorab).

4. Playwright ist bereits im Frontend-Container installiert (`node_modules/playwright` +
   `/root/.cache/ms-playwright/chromium-*`) — nichts neu installieren. Ein temporaeres
   CommonJS-Skript NUR unter `/tmp` im Container ablegen (NICHT im Repo/`/app`, damit
   `files_modified` sauber bleibt), das:
   - mit `playwright` (`require('playwright')`) Chromium headless startet,
   - `http://127.0.0.1:3000/anime/4` aufruft,
   - auf das `role="group"` Element mit `aria-label="Fansub-Gruppe"` wartet,
   - einen Screenshot NUR dieses Elements (`elementHandle.screenshot(...)`) nach
     `/tmp/gap13-fansub-chips.png` schreibt.
   Kommando: `docker compose exec -T team4sv30-frontend sh -c "cd /app && node /tmp/gap13-screenshot.cjs"`

5. Screenshot aus dem Container auf den Host kopieren, damit er mit dem Read-Tool inspiziert werden
   kann: `docker cp team4sv30-frontend:/tmp/gap13-fansub-chips.png /tmp/gap13-fansub-chips.png`

6. Screenshot mit dem Read-Tool oeffnen und visuell pruefen: Gruppennamen (z. B. "AnimeOwnage",
   "Project Messiah" — je nachdem was fuer Anime-ID 4 tatsaechlich hinterlegt ist) muessen lesbar
   sein (heller Text auf sichtbar abgesetztem, halbtransparentem Chip-Hintergrund), der aktive Chip
   (falls vorhanden) bleibt in Akzentfarbe gefuellt.

7. Kontrast-Naeherung berechnen und im SUMMARY.md dokumentieren: Textfarbe `rgba(255,255,255,0.92)`
   gegen den reinen Overlay-Hintergrund `rgba(255,255,255,0.16)` (Chip-Glasfarbe ohne
   darunterliegendes Bild) — relative Luminanz beider Farben berechnen und WCAG-Kontrastverhaeltnis
   angeben. Explizit vermerken, dass dies eine Naeherung ohne das tatsaechliche Hintergrundbild ist
   und der reale Kontrast je nach Bildbereich variiert, aber durch den semi-opaken hellen Hintergrund
   + Blur in jedem Fall deutlich hoeher liegt als vorher (0% Deckkraft-Unterschied, reines Weiss auf
   Weiss).

8. Temporaere Dateien im Container aufraeumen (optional, da Container-`/tmp` ohnehin nicht
   persistiert): `docker compose exec -T team4sv30-frontend sh -c "rm -f /tmp/gap13-screenshot.cjs /tmp/gap13-fansub-chips.png"`.
   Host-Kopie unter `/tmp/gap13-fansub-chips.png` kann fuer die Session bestehen bleiben (kein
   Repo-Pfad, keine Artefakt-Pflicht).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx" | tail -10</automated>
  </verify>
  <done>
Lint zeigt keine neuen Fehler fuer FansubGroupPicker.tsx; Vitest-Lauf fuer
FansubGroupPicker.test.tsx bleibt gruen; Frontend-Container wurde neu gestartet und ist erreichbar;
Playwright-Screenshot von `/anime/4` (Fansub-Gruppen-Bereich) zeigt lesbare Gruppennamen auf
sichtbar abgesetztem, glasigem Chip-Hintergrund statt weiss-auf-weiss; berechnetes
Kontrastverhaeltnis (Text vs. Overlay-Farbe, Naeherung) ist im SUMMARY.md dokumentiert.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| n/a | Reines CSS-Styling ohne neue Eingabepfade, Netzwerkaufrufe oder Datenverarbeitung; kein neuer Trust-Boundary-Uebergang. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|--------------|------------------|
| T-quick-260918-01 | Information Disclosure | FansubGroupPicker.module.css | accept | Reine visuelle Styling-Aenderung, keine Daten-, Auth- oder Logikaenderung; kein Angriffsflaechen-Zuwachs. |
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx"` — alle 6 bestehenden Tests gruen, keine Testdatei-Aenderung.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/FansubGroupPicker.tsx"` — keine neuen Lint-Fehler.
3. Playwright-Screenshot von `/anime/4` (Fansub-Gruppen-Chip-Bereich) zeigt lesbare Gruppennamen; per Read-Tool visuell bestaetigt.
4. `.chip[aria-pressed='true']`-Regel in der Diff ist unveraendert (git diff pruefen: kein Hunk beruehrt diese Regel).
5. Nur `frontend/src/components/fansubs/FansubGroupPicker.module.css` im `git diff --stat` gelistet.
</verification>

<success_criteria>
- Inaktive Fansub-Gruppen-Chips auf `/anime/4` sind lesbar (heller, aber sichtbar abgesetzter
  glasiger Hintergrund statt `var(--surface-card)`-Weiss).
- Aktiver Chip-Zustand ist visuell und im Code unveraendert.
- `eyebrowLabel` ("Fansub-Gruppe") ist kraeftiger/lesbarer ueber dem Hintergrundbild.
- Bestehende Tests bleiben gruen ohne Anpassung.
- Nur die eine CSS-Datei wurde veraendert; keine neuen globalen Variablen; kein Push, Commit nur
  gezielt auf diese Datei.
</success_criteria>

<output>
Create `.planning/quick/260918-fmq-gap-13-inaktive-fansub-gruppen-chips-auf/260918-fmq-SUMMARY.md` when done
</output>
