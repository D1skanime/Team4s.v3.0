---
phase: quick-260924-cgg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx
  - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
autonomous: true
requirements: [QUICK-260924-CGG-01, QUICK-260924-CGG-02]

must_haves:
  truths:
    - "GAP-04: FansubAliasSection rendert kein eigenes <form>-Element mehr; innerhalb des äußeren Gruppen-Formulars (FansubDetailsTab.tsx, <form onSubmit={save}>) tritt kein 'In HTML, <form> cannot be a descendant of <form>'-Hydration-Fehler mehr auf."
    - "Enter im Alias-Eingabefeld legt weiterhin einen neuen Alias an (handleCreate wird ausgelöst), OHNE das äußere Gruppen-Formular abzusenden (kein ungewolltes Speichern der Gruppe)."
    - "Klick auf 'Alias hinzufügen' legt weiterhin einen Alias an und löst ebenfalls nicht das äußere Formular aus."
    - "Alle anderen in Phase 167 neu entstandenen/geänderten Frontend-Dateien enthalten kein verschachteltes <form>; vorbestehende Altlasten außerhalb Phase 167 werden nur dokumentiert, nicht verändert."
    - "167-UAT.md enthält einen neuen GAP-04-Eintrag mit status: resolved, LF-Zeilenenden, ohne die bestehenden GAP-01..03-Einträge zu verändern."
    - "Bestehendes Alias-CRUD-Verhalten (anlegen, umhängen, löschen, Fehleranzeige, Bestätigungsdialoge) bleibt funktional identisch; alle bestehenden Tests in FansubAliasSection.test.tsx und FansubDetailsTab.test.tsx bleiben grün."
  artifacts:
    - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx"
      provides: "Neuer-Alias-Bereich als <div> statt <form>, Button type=\"button\" mit onClick, Input mit onKeyDown-Enter-Handling (preventDefault/stopPropagation)"
    - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx"
      provides: "Neue Tests: kein <form>-Element im Render-Output; Enter im Eingabefeld löst handleCreate aus ohne das äußere Formular abzusenden; Klick auf den Button löst ebenfalls nicht das äußere Formular aus"
    - path: ".planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md"
      provides: "GAP-04-Eintrag mit status: resolved, referenziert diesen Quick-Plan"
  key_links:
    - from: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx (Input onKeyDown)"
      to: "handleCreate()"
      via: "Enter-Taste, event.preventDefault() + event.stopPropagation() verhindern Bubbling zum äußeren <form onSubmit={save}> in FansubDetailsTab.tsx"
      pattern: "onKeyDown"
    - from: "frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx (Button)"
      to: "handleCreate()"
      via: "onClick statt type=\"submit\"/onSubmit"
      pattern: "onClick={() => void handleCreate"
---

<objective>
GAP-04 aus dem Live-UAT des Auftraggebers beheben: `FansubAliasSection.tsx` rendert aktuell ein
eigenes `<form onSubmit={handleCreate}>` (Zeile ~177) als Kind des äußeren
`<form onSubmit={save}>` aus `FansubDetailsTab.tsx` (Zeile ~73/111) auf
`/admin/fansubs/{id}/edit`. Verschachtelte `<form>`-Elemente sind in HTML ungültig und lösen laut
Next.js-Konsole einen Hydration-Fehler aus ("In HTML, `<form>` cannot be a descendant of
`<form>`. This will cause a hydration error.").

Purpose: Den inneren `<form>` durch ein neutrales Element ersetzen, ohne das bestehende
Alias-Anlegen-Verhalten (Button-Klick UND Enter-im-Eingabefeld) zu verändern und ohne dass ein
Enter im Alias-Feld jemals versehentlich das äußere Gruppen-Formular absendet. Zusätzlich
per Grep sicherstellen, dass kein weiterer in Phase 167 neu entstandener Abschnitt dasselbe
Muster enthält.

Output: `FansubAliasSection.tsx` ohne verschachteltes `<form>`, neue/erweiterte Tests, die das
belegen, und ein abgeschlossener GAP-04-Eintrag in
`.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

<interfaces>
Current frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx (relevant excerpt,
line numbers approximate):

```
import { useCallback, useEffect, useState, type FormEvent } from "react";
...
async function handleCreate(event: FormEvent) {
  event.preventDefault();
  const alias = newAliasText.trim();
  if (!alias) return;
  setCreating(true);
  setNewAliasError(null);
  try {
    await createFansubAlias(fansubID, { alias });
    setNewAliasText("");
    await loadAliases();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      setNewAliasError("Dieses Kürzel gehört bereits zu einer anderen Gruppe.");
    } else {
      setNewAliasError(
        error instanceof ApiError && error.message ? error.message : "Alias konnte nicht angelegt werden.",
      );
    }
  } finally {
    setCreating(false);
  }
}

const newAliasForm = (
  <form onSubmit={handleCreate}>
    <FormField label="Neuer Alias" htmlFor="fansub-alias-new" error={newAliasError ?? undefined}>
      <Input
        id="fansub-alias-new"
        value={newAliasText}
        maxLength={120}
        disabled={!canManage}
        placeholder="z. B. BDnP"
        onChange={(event) => setNewAliasText(event.target.value)}
      />
    </FormField>
    <Button
      type="submit"
      variant="primary"
      size="sm"
      leftIcon={<Plus size={14} />}
      disabled={!canManage || creating || !newAliasText.trim()}
      loading={creating}
    >
      Alias hinzufügen
    </Button>
  </form>
);
```

`Input` (frontend/src/components/ui/Input.tsx) extends `InputHTMLAttributes<HTMLInputElement>`,
so `onKeyDown` passes through natively — no new prop needs adding to the primitive.

The outer form in frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx:
```
<form className={styles.fansubEditForm} onSubmit={save}>
  ...
  <FansubAliasSection fansubID={fansubID} isPlatformAdmin={isPlatformAdmin}
    hasAuthSession={hasAuthSession} onToast={onToast} />
  ...
</form>
```
This file does NOT need any code change for GAP-04 — it stays exactly as-is. It is listed in
`files_modified` context only because the grep sweep (Task 2) must re-confirm it is the (already
correct, unchanged) outer form and not itself a source of a *different* nested-form bug.

Existing test helper in FansubAliasSection.test.tsx:
```
function renderSection() {
  return render(
    <FansubAliasSection fansubID={10} isPlatformAdmin hasAuthSession onToast={() => {}} />,
  );
}
```
This helper renders the component standalone (no wrapping `<form>`) — the existing 8 test cases
in this file use it and must keep passing unchanged after the refactor.
</interfaces>

Phase-167 frontend files (from `167-01..08-PLAN.md` and quick-task `260924-b7s`
`files_modified`, confirmed via `grep -rln "<form" frontend/src --include="*.tsx"` at planning
time — only these two contain `<form>`, no other phase-167 file does):
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` (the nested form, fixed here)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` (the pre-existing, correct
  outer form — unchanged)

Other phase-167 frontend files that do NOT contain `<form>` (verified at planning time, re-verify
in Task 2): `FansubGroupOriginHint.tsx`, `EpisodeImportMappingRow.tsx`,
`episodeImportMapping.ts`, `EpisodeImportFolderSelector.tsx`, `ChangeEntryTranslator.ts`.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Verschachteltes <form> in FansubAliasSection.tsx entfernen (GAP-04)</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx, frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx</files>
  <behavior>
    - Test 1 ("kein form-Element"): `renderSection()` (bestehender Helper) — `container.querySelector("form")`
      ist `null`. Die Komponente rendert nie ein eigenes `<form>`-Element, unabhängig vom Ladezustand.
    - Test 2 ("Enter legt Alias an, ohne das äußere Formular abzusenden"): Rendern innerhalb eines
      äußeren `<form onSubmit={outerSubmitSpy}>...</form>`-Wrappers (Spy via `vi.fn()`, der
      `event.preventDefault()` aufruft, damit ein tatsächlicher Submit den Test nicht crasht, falls der
      Fix fehlschlägt). Im Alias-Eingabefeld (`placeholder="z. B. BDnP"`) Text eingeben, dann
      `fireEvent.keyDown(input, { key: "Enter" })` auslösen. Erwartung: `createFansubAlias` wird mit
      `(10, { alias: <eingegebener Text> })` aufgerufen; `outerSubmitSpy` wird NIE aufgerufen.
    - Test 3 ("Button-Klick löst weiterhin an, ohne das äußere Formular abzusenden"): gleicher äußerer
      `<form>`-Wrapper mit Spy, Klick auf den Button „Alias hinzufügen" (wie im bestehenden
      Anlegen-Test). Erwartung: `createFansubAlias` wird aufgerufen; `outerSubmitSpy` wird NIE
      aufgerufen (Regressionsschutz für den type="submit" → type="button"-Wechsel).
  </behavior>
  <action>
    In frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx (siehe <interfaces>-Block
    für den exakten aktuellen Code):

    1. Im React-Import `type FormEvent` entfernen (wird nach dem Refactor nicht mehr gebraucht — es gibt
       keine andere Verwendung in dieser Datei).
    2. `handleCreate` von `async function handleCreate(event: FormEvent)` zu
       `async function handleCreate()` ändern; die Zeile `event.preventDefault();` am Anfang entfernen
       (das Verhindern des Absendens passiert jetzt an den Aufrufstellen, nicht mehr im Handler selbst).
       Der restliche Funktionskörper (Trim, `createFansubAlias`-Aufruf, Fehlerbehandlung inkl. 409-Fall,
       `finally`) bleibt unverändert.
    3. Das umschließende `<form onSubmit={handleCreate}>` von `newAliasForm` durch `<div>` ersetzen
       (öffnendes und schließendes Tag), ohne sonst etwas an der inneren Struktur (`FormField`, `Input`,
       `Button`) zu verändern.
    4. Auf dem `Button` innerhalb von `newAliasForm`: `type="submit"` zu `type="button"` ändern und
       `onClick={() => void handleCreate()}` ergänzen. Alle anderen Props (`variant`, `size`, `leftIcon`,
       `disabled`, `loading`) unverändert lassen.
    5. Auf dem `Input` innerhalb von `newAliasForm`: einen `onKeyDown`-Handler ergänzen, der bei
       `event.key === "Enter"` `event.preventDefault()` UND `event.stopPropagation()` aufruft (damit das
       Enter-Event niemals zum äußeren `<form onSubmit={save}>` aus FansubDetailsTab.tsx durchsickert)
       und danach — nur wenn `!creating && newAliasText.trim()` (identische Guard-Bedingung wie das
       `disabled`-Attribut des Buttons) — `void handleCreate()` aufruft.
    6. `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` NICHT verändern — der äußere
       `<form onSubmit={save}>` bleibt exakt wie er ist (siehe <interfaces>-Block).

    In FansubAliasSection.test.tsx: die drei Verhaltensfälle aus dem <behavior>-Block als neue
    `describe("FansubAliasSection — GAP-04: kein verschachteltes Formular", ...)`-Sektion ergänzen. Für
    Test 2 und 3 einen lokalen Render-Helper nutzen, der `<FansubAliasSection .../>` in
    `<form onSubmit={outerSubmit}>...</form>` einbettet (nicht den bestehenden `renderSection()`-Helper
    verändern — der bleibt für die 8 bestehenden Tests wie er ist). Alle 8 bestehenden Testfälle in
    dieser Datei dürfen unverändert grün bleiben (Verhalten von Anlegen/Löschen/Umhängen ist identisch,
    nur der Auslösemechanismus für „Anlegen" hat sich geändert).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx'"</automated>
  </verify>
  <done>FansubAliasSection.tsx enthält kein <form>-Element mehr; alle 8 bestehenden plus 3 neuen Testfälle in FansubAliasSection.test.tsx sind grün; Enter im Alias-Feld UND Klick auf "Alias hinzufügen" legen weiterhin einen Alias an, ohne je ein äußeres Formular abzusenden.</done>
</task>

<task type="auto">
  <name>Task 2: Grep-Sweep, 167-UAT.md-Eintrag, Frontend-Verifikation und Container-Neustart</name>
  <files>.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</files>
  <action>
    1. Grep-Sweep: `grep -rn "<form" frontend/src --include="*.tsx" | sort` erneut ausführen und mit der
       Phase-167-Dateiliste im <context>-Block abgleichen. Bestätige, dass außer
       `FansubAliasSection.tsx` (jetzt gefixt) und `FansubDetailsTab.tsx` (unveränderter, korrekter
       äußerer Form) kein weiteres in Phase 167 neu entstandenes/geändertes Frontend-File ein `<form>`
       enthält. Falls doch ein weiteres Phase-167-File ein verschachteltes `<form>` enthält: mit dem
       gleichen Muster aus Task 1 (nicht-form-Element + `type="button"`/`onClick` + `onKeyDown`-Enter
       ohne Bubbling) fixen, zu `files_modified` in der Summary ergänzen und im UAT-Eintrag unten
       mit aufführen. Falls ein `<form>`-in-`<form>`-Fund außerhalb von Phase 167 liegt (ältere
       Altlast): NICHT verändern, nur im Abschluss-Report kurz dokumentieren.

    2. `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` bearbeiten: im
       `## Gaps`-Abschnitt nach dem bestehenden GAP-03-Eintrag einen neuen Eintrag GAP-04 im exakt
       gleichen Schema (truth/status/reason/severity/root_cause/artifacts/missing/resolution wie
       GAP-01..03) ergänzen, mit LF-Zeilenenden (Datei nicht mit einem Tool bearbeiten, das CRLF
       einführt — mit dem Edit-Tool arbeiten und bei Unsicherheit `file 167-UAT.md` bzw.
       `cat -A 167-UAT.md | grep -c '\^M\$'` gegen 0 prüfen). Inhalte:
       - `truth`: "GAP-04: Der Alias-Bereich der Fansub-Gruppen-Bearbeitung (FansubAliasSection.tsx)
         rendert kein eigenes <form> mehr innerhalb des äußeren Gruppen-Formulars
         (FansubDetailsTab.tsx, `<form onSubmit={save}>`); Enter im Alias-Eingabefeld legt weiterhin
         einen Alias an, ohne das äußere Formular abzusenden."
       - `status: resolved`
       - `reason`: "Live-UAT Auftraggeber, /admin/fansubs/32/edit, 2026-09-24 (Next.js-Konsole: 'In HTML,
         <form> cannot be a descendant of <form>. This will cause a hydration error.')"
       - `severity: major`
       - `root_cause`: kurz beschreiben, dass `newAliasForm` in FansubAliasSection.tsx (Zeile ~177) ein
         eigenes `<form onSubmit={handleCreate}>` rendert, das als Kind von FansubDetailsTab.tsx'
         `<form onSubmit={save}>` (Zeile ~73/111) gerendert wird — ungültiges verschachteltes HTML.
       - `artifacts`: Pfad `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` mit Hinweis
         auf das entfernte verschachtelte `<form>`.
       - `missing`: das innere `<form>` durch ein neutrales Element ersetzen, Enter-Verhalten via
         `onKeyDown` + `preventDefault`/`stopPropagation` statt `onSubmit` erhalten, Grep-Sweep über die
         übrigen Phase-167-Dateien.
       - `resolution`: Verweis auf diesen Quick-Plan
         (`.planning/quick/260924-cgg-gap-04-verschachteltes-form-element-im-a/260924-cgg-SUMMARY.md`)
         und kurze Beschreibung des Fixes (div statt form, Button type="button" mit onClick, Input
         onKeyDown Enter → handleCreate mit preventDefault/stopPropagation).
       Die `## Summary`-Zählung (total/passed/issues/...) am Kopf der Datei NICHT verändern — GAP-04
       stammt aus einer Konsolenbeobachtung, nicht aus einem der drei nummerierten UAT-Testfälle; die
       bestehenden GAP-01..03-Einträge unverändert lassen.

    3. Frontend-Tests, Typecheck und Lint jeweils im Container ausführen (nicht auf dem Host):
       `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"`,
       `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"`,
       `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"`. Jede NEUE
       Fehlermeldung in einer von diesem Plan berührten Datei ist ein Blocker; vorbestehende,
       unabhängige Fehler an anderer Stelle im Abschluss-Report explizit benennen, nicht stillschweigend
       ignorieren.

    4. Container-Startzeit VOR dem Neustart festhalten:
       `docker inspect -f '{{.State.StartedAt}}' team4sv30-frontend`. Danach
       `docker restart team4sv30-frontend` ausführen, dann erneut
       `docker inspect -f '{{.State.StartedAt}}' team4sv30-frontend` (muss echt neuer sein als vorher)
       sowie `docker compose ps team4sv30-frontend` (Status "Up") zur Bestätigung. Beide Zeitstempel im
       Abschluss-Report nennen.

    5. Keine Datenbankänderung (team4s_v2 unangetastet), kein `git push`, `git stash` ist VERBOTEN,
       gearbeitet wird direkt auf `main` (kein Branch, kein Worktree).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck && npm run lint" && grep -c "GAP-04" /home/d1sk/team4s/.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</automated>
  </verify>
  <done>Grep-Sweep bestätigt (dokumentiert im Report), dass kein weiteres Phase-167-File ein verschachteltes <form> enthält (oder gefundene Fälle wurden gefixt); 167-UAT.md enthält GAP-04 mit status: resolved und LF-Zeilenenden, GAP-01..03 unverändert; npm run test/typecheck/lint laufen im Container ohne neue Fehler; team4sv30-frontend wurde neu gestartet mit bestätigt neuerer Startzeit; keine DB-Änderung, kein Push, kein Stash.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin-Browser -> `/admin/fansubs/{id}/edit` | Bereits authentifizierte, admin-only Oberfläche (unverändert durch diesen Plan); die Änderung ist reines Markup-/Event-Handling ohne neue Netzwerkgrenze. |
| Formular-Submit-Pfad | Zwei DOM-Formulare dürfen nie kollabieren: Enter im Alias-Feld darf ausschließlich `handleCreate` auslösen, niemals `save` (Gruppen-Speichern) des äußeren Formulars. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICK260924-CGG-01 | Tampering (ungewolltes Absenden des äußeren Formulars) | FansubAliasSection.tsx Input onKeyDown | mitigate | `event.preventDefault()` + `event.stopPropagation()` auf Enter verhindern jegliches Bubbling zum äußeren `<form onSubmit={save}>`; durch Task 1 Test 2 automatisiert bewiesen (Spy wird nie aufgerufen). |
| T-QUICK260924-CGG-02 | Denial of Service / Repudiation (Hydration-Fehler bricht React-Rendering inkonsistent) | Verschachteltes `<form>` in `<form>` | mitigate | Inneres `<form>` vollständig entfernt (durch `<div>` ersetzt) -- kein ungültiges verschachteltes HTML mehr, kein Hydration-Mismatch möglich. |

Keine npm/pip/cargo-Installationen Teil dieses Plans; das Package Legitimacy Gate greift nicht.
</threat_model>

<verification>
1. Task 1's automatisierter Vitest-Lauf beweist: kein `<form>`-Element im Render-Output, Enter im Alias-Feld triggert `handleCreate` ohne das äußere Formular abzusenden, Button-Klick ebenso.
2. Task 2's Grep-Sweep bestätigt keine weiteren verschachtelten `<form>`-Fälle in Phase-167-Dateien (oder dokumentiert/fixt gefundene Fälle).
3. Task 2's vollständiger Frontend-Testlauf (test/typecheck/lint) im Container zeigt keine neuen Fehler.
4. 167-UAT.md enthält GAP-04 als status: resolved.
5. team4sv30-frontend läuft nach `docker restart` mit einer bestätigt neueren Startzeit.
</verification>

<success_criteria>
- [ ] `/admin/fansubs/{id}/edit` zeigt in der Next.js-Konsole keinen "`<form>` cannot be a descendant of `<form>`"-Hydration-Fehler mehr.
- [ ] Enter im Alias-Eingabefeld legt einen Alias an; das äußere Gruppen-Formular wird dabei NIE abgesendet.
- [ ] Klick auf "Alias hinzufügen" funktioniert unverändert.
- [ ] Alle bestehenden Tests in FansubAliasSection.test.tsx und FansubDetailsTab.test.tsx bleiben grün, plus 3 neue GAP-04-Testfälle.
- [ ] Kein anderes in Phase 167 neu entstandenes Frontend-File enthält ein verschachteltes `<form>` (per Grep-Sweep bestätigt oder gefixt); ältere Altlasten außerhalb Phase 167 sind nur dokumentiert.
- [ ] Alle neuen/geänderten Strings verwenden echte deutsche Umlaute.
- [ ] Nur globale UI-Primitives aus `@/components/ui` verwendet, kein natives `<select>/<input>/<textarea>/<button>` neu eingeführt.
- [ ] FansubAliasSection.tsx bleibt unter 450 Zeilen.
- [ ] 167-UAT.md's GAP-04 ist status: resolved, LF-Zeilenenden, referenziert diesen Plan; GAP-01..03 unverändert.
- [ ] team4sv30-frontend neu gestartet mit bestätigt neuerer Startzeit; team4s_v2 unangetastet; kein git push; kein git stash verwendet.
</success_criteria>

<output>
Create `.planning/quick/260924-cgg-gap-04-verschachteltes-form-element-im-a/260924-cgg-SUMMARY.md` when done
</output>
