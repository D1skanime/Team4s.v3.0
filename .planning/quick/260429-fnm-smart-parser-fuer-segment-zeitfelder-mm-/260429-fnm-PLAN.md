---
phase: quick-260429-fnm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
autonomous: true
requirements: [FNM-01]
must_haves:
  truths:
    - "Eingabe '90' wird auf 00:01:30 normalisiert"
    - "Eingabe '1:30' wird als MM:SS interpretiert und auf 00:01:30 normalisiert"
    - "Eingabe '25:29' wird auf 00:25:29 normalisiert"
    - "Eingabe '1:1:20' wird als HH:MM:SS auf 01:01:20 normalisiert"
    - "Eingabe '1m30' und '1m30s' werden auf 00:01:30 normalisiert"
    - "Bestehendes HH:MM:SS wie '00:01:30' bleibt unveraendert"
    - "formatTimeInput gibt immer dreistelliges HH:MM:SS aus"
  artifacts:
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx"
      provides: "parseFlexibleTimeInput mit Kurzform-Unterstuetzung + formatTimeInput immer HH:MM:SS"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"
      provides: "Automatisierte Tests fuer alle neuen Eingabeformate"
  key_links:
    - from: "SegmentEditPanel.tsx onBlur"
      to: "parseFlexibleTimeInput"
      via: "import aus SegmenteTab.helpers"
      pattern: "parseFlexibleTimeInput"
    - from: "parseFlexibleTimeInput Rueckgabe (Sekunden)"
      to: "formatTimeInput"
      via: "onBlur-Handler in SegmentEditPanel"
      pattern: "formatTimeInput\\(parsed\\)"
---

<objective>
Smart-Parser fuer Segment-Zeitfelder: zweiteilige Eingaben wie `1:30` als MM:SS interpretieren, Kurzformen `1m30` / `1m30s` unterstuetzen und normalisierte Ausgabe immer als `HH:MM:SS`.

Purpose: Admins koennen Segment-Zeiten schnell tippen ohne vollstaendiges HH:MM:SS zu wissen; das Feld normalisiert beim Verlassen (onBlur) automatisch.
Output: Geaenderter Parser und Formatter in SegmenteTab.helpers.tsx, neue Tests in SegmenteTab.test.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Relevante Quelldateien:
- frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx  (parseFlexibleTimeInput Zeile 70-85, formatTimeInput Zeile 87-94)
- frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx     (onBlur-Nutzung Zeilen 177-200)
- frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx     (Testreferenzen)

<interfaces>
<!-- Aktuelle Signaturen aus SegmenteTab.helpers.tsx -->
```typescript
// Gibt Sekunden zurueck oder null bei ungueltiger Eingabe
export function parseFlexibleTimeInput(value: string): number | null

// Gibt "M:SS" bei hours=0, sonst "H:MM:SS" zurueck — WIRD GEAENDERT auf immer "HH:MM:SS"
export function formatTimeInput(totalSeconds: number): string
```

Aktuelles Verhalten von parseFlexibleTimeInput:
- Plain number "90" → 90 (korrekt, Sekunden)
- "1:30" → 90 (bereits MM:SS — korrekt)
- "1:1:20" → 4280 (korrekt HH:MM:SS)
- "1m30" → null (FEHLT — muss ergaenzt werden)

Aktuelles Verhalten von formatTimeInput:
- 90 → "1:30" (FALSCH: muss "00:01:30" sein)
- 3600 → "1:00:00" (FALSCH: muss "01:00:00" sein)
- 4280 → "1:11:20" (FALSCH: muss "01:11:20" sein)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Parser und Formatter korrigieren</name>
  <files>
    frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
    frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
  </files>
  <behavior>
    - parseFlexibleTimeInput("90") === 90
    - parseFlexibleTimeInput("1:30") === 90 (MM:SS)
    - parseFlexibleTimeInput("25:29") === 1529 (MM:SS)
    - parseFlexibleTimeInput("1:1:20") === 3680 (HH:MM:SS)
    - parseFlexibleTimeInput("1m30") === 90
    - parseFlexibleTimeInput("1m30s") === 90
    - parseFlexibleTimeInput("2m") === 120
    - parseFlexibleTimeInput("00:01:30") === 90 (bestehend, rueckwaertskompatibel)
    - parseFlexibleTimeInput("") === null
    - parseFlexibleTimeInput("abc") === null
    - formatTimeInput(90) === "00:01:30"
    - formatTimeInput(0) === "00:00:00"
    - formatTimeInput(3661) === "01:01:01"
    - formatTimeInput(1529) === "00:25:29"
  </behavior>
  <action>
    Schritt 1 — Tests schreiben (RED):
    In SegmenteTab.test.tsx einen neuen describe-Block `parseFlexibleTimeInput` und `formatTimeInput`
    hinzufuegen. Die Helfer aus `SegmenteTab.helpers.tsx` importieren (NICHT aus segmenteTabUtils.ts —
    der vorhandene Test dort importiert andere Helfer).

    Import-Zeile ergaenzen:
    ```typescript
    import { parseFlexibleTimeInput, formatTimeInput } from './SegmenteTab.helpers'
    ```

    Alle Faelle aus dem <behavior>-Block als einzelne `it`-Tests schreiben.

    Schritt 2 — Implementierung aendern (GREEN):

    In `SegmenteTab.helpers.tsx`:

    **parseFlexibleTimeInput** — Kurzform `NmSSs` / `Nm` ergaenzen:
    Vor dem Colon-Split eine neue Regex-Pruefung einbauen:
    ```typescript
    // Kurzform: 1m30s, 1m30, 2m
    const minuteForm = /^(\d+)m(\d*)s?$/.exec(normalized)
    if (minuteForm) {
      const mins = Number.parseInt(minuteForm[1] ?? '0', 10)
      const secs = minuteForm[2] ? Number.parseInt(minuteForm[2], 10) : 0
      return Number.isFinite(mins) && Number.isFinite(secs) ? mins * 60 + secs : null
    }
    ```
    Diese Pruefung nach der plain-number-Pruefung und vor dem split(':') einfuegen.

    **formatTimeInput** — immer HH:MM:SS ausgeben:
    Die letzte return-Zeile aendern:
    ```typescript
    // Vorher:
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    return `${minutes}:${String(seconds).padStart(2, '0')}`

    // Nachher (immer dreistellig):
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    ```
    Das bedeutet: das `if (hours > 0)` wird entfernt und nur eine einzige return-Zeile bleibt.

    Schritt 3 — Sicherstellen dass kein anderer Code bricht:
    `formatTimeInput` wird auch in SegmenteTab.helpers.tsx selbst in `formatDuration` genutzt
    (via `formatTimeInput(parsed)`). Das ist unproblematisch — der Ausgabe-String wird nur
    angezeigt und an den Backend geschickt, der ohnehin HH:MM:SS erwartet.
    Die Inline-Anzeige in SegmentEditPanel.tsx (Laufzeit-Label) zeigt dann z. B. "00:24:00"
    statt "24:00" — das ist korrekt und konsequenter.
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/frontend && npx vitest run --reporter=verbose src/app/admin/episode-versions/\\[versionId\\]/edit/SegmenteTab.test.tsx 2>&1 | tail -40</automated>
  </verify>
  <done>
    Alle Tests in SegmenteTab.test.tsx gruener Zustand.
    parseFlexibleTimeInput("1:30") === 90.
    formatTimeInput(90) === "00:01:30".
    parseFlexibleTimeInput("1m30s") === 90.
  </done>
</task>

</tasks>

<verification>
Nach Task 1:
- `npx vitest run` zeigt alle Tests gruen
- Manuell im Browser: Segment-Zeitfeld "1:30" eingeben, Tab-Taste druecken → Feld zeigt "00:01:30"
- Feld "90" eingeben, blur → zeigt "00:01:30"
- Feld "1m30s" eingeben, blur → zeigt "00:01:30"
- Feld "00:01:30" eingeben, blur → bleibt "00:01:30" (unveraendert)
</verification>

<success_criteria>
- parseFlexibleTimeInput kennt alle 5 Eingabeformen (Sekunden, MM:SS, HH:MM:SS, Xm, XmYs)
- formatTimeInput gibt immer HH:MM:SS aus (kein M:SS mehr)
- Alle neuen Testfaelle gruen
- Keine bestehenden Tests gebrochen
- Frontend baut ohne TypeScript-Fehler
</success_criteria>

<output>
Nach Abschluss SUMMARY erstellen unter:
.planning/quick/260429-fnm-smart-parser-fuer-segment-zeitfelder-mm-/260429-fnm-SUMMARY.md
</output>
