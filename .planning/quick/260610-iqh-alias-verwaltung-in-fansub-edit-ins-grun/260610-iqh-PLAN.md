---
phase: quick-260610-iqh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Der Alias-Block (Eingabe + Hinzufügen-Button + Badge-Liste) ist innerhalb der Grunddaten-Karte sichtbar, direkt nach dem Auflösungsjahr-Feld"
    - "Die separate Aliase-Card im Supplement-Grid ist entfernt"
    - "Aliases hinzufügen und entfernen funktioniert wie zuvor"
    - "Der Alias-Block nimmt die volle Breite des 12-Spalten-Grunddaten-Grids ein"
  artifacts:
    - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css"
      provides: "Neue Klasse fansubEditBasicFieldFull (grid-column: 1 / -1)"
    - path: "frontend/src/app/admin/fansubs/[id]/edit/page.tsx"
      provides: "Alias-Block als Grid-Item innerhalb fansubEditBasicGrid, alte Alias-Card entfernt"
  key_links:
    - from: "fansubEditBasicGrid (page.tsx)"
      to: "fansubEditBasicFieldFull (FansubEdit.module.css)"
      via: "className styles.fansubEditBasicFieldFull"
      pattern: "fansubEditBasicFieldFull"
---

<objective>
Alias-Verwaltung aus der separaten "Aliase"-Karte im Supplement-Grid in die Grunddaten-Karte verschieben. Der vollständige Alias-Block (Input + Hinzufügen-Button + Badge-Liste mit Entfernen) wird als neues Grid-Item mit voller Breite am Ende des fansubEditBasicGrid eingefügt, direkt nach dem Auflösungsjahr-Feld. Die alte Alias-Card im Supplement-Grid wird entfernt. Keine Backend- oder State-Änderungen.

Purpose: Alias-Verwaltung ist ein Grunddaten-Feld und gehört visuell zur Grunddaten-Karte, nicht in einen separaten Bereich darunter.
Output: Grunddaten-Karte enthält den Alias-Block; Supplement-Grid enthält nur noch Branding und Community-Links.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: CSS — Klasse fansubEditBasicFieldFull hinzufügen und verwaiste Alias-Card-Regeln entfernen</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css</files>
  <action>
Füge direkt nach der Klasse `.fansubEditBasicFieldWide` (Zeile ~1022) folgende neue Klasse ein:

```
.fansubEditBasicFieldFull {
  grid-column: 1 / -1;
}
```

Entferne danach die verwaisten Regeln für `.fansubEditAliasCard`, sobald die Card in Task 2 aus dem JSX entfernt ist. Konkret sind das die zwei Blöcke, die `.fansubEditAliasCard` nennen (Zeilen ~958-961 und ~969-972 in FansubEdit.module.css). Prüfe vorher mit Grep, dass `.fansubEditAliasCard` nach Task 2 nirgends mehr im JSX vorkommt, bevor du die CSS-Regel entfernst.

NICHT entfernen: `.fansubEditAliasBody`, `.fansubEditAliasControls`, `.fansubEditAliasBadgeBox`, `.fansubEditAliasBadgeRow`, `.fansubEditAliasBadgeItem` — diese Styles werden vom Alias-Block im Grunddaten-Grid weiterhin genutzt.
  </action>
  <verify>
    <automated>grep -n "fansubEditBasicFieldFull" frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css</automated>
  </verify>
  <done>Klasse fansubEditBasicFieldFull existiert in der CSS-Datei; fansubEditAliasCard taucht in der CSS-Datei nicht mehr auf (sofern JSX in Task 2 ebenfalls bereinigt).</done>
</task>

<task type="auto">
  <name>Task 2: JSX — Alias-Block ins Grunddaten-Grid verschieben, alte Card entfernen</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/page.tsx</files>
  <action>
Schritt A — Alias-Block ins fansubEditBasicGrid einfügen:
Füge direkt nach dem schließenden `</div>` des Auflösungsjahr-Felds (Zeile ~2490, vor `</div>` das fansubEditBasicGrid schließt und vor `</Card>`) folgendes neues Grid-Item ein:

```jsx
<div
  className={`${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldFull}`}
>
  <FormField
    label="Aliase"
    htmlFor="fansub-group-alias-input"
    error={aliasError || undefined}
  >
    <div className={styles.fansubEditAliasControls}>
      <Input
        id="fansub-group-alias-input"
        value={aliasInput}
        invalid={Boolean(aliasError)}
        onChange={(e) => {
          setAliasInput(e.target.value);
          setAliasError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void addAlias();
          }
        }}
        placeholder="Alias hinzufügen"
      />
      <Button
        type="button"
        variant="secondary"
        leftIcon={<Plus size={14} />}
        onClick={() => void addAlias()}
        disabled={aliasBusy}
      >
        Hinzufügen
      </Button>
    </div>
  </FormField>
  <div className={styles.fansubEditAliasBadgeBox}>
    <div className={styles.fansubEditAliasBadgeRow}>
      {aliases.map((alias) => (
        <span key={alias.id} className={styles.fansubEditAliasBadgeItem}>
          <Badge variant="muted">{alias.alias}</Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Alias ${alias.alias} entfernen`}
            onClick={() => void removeAlias(alias)}
            disabled={aliasBusy}
            leftIcon={<X size={14} />}
          />
        </span>
      ))}
    </div>
  </div>
</div>
```

Schritt B — Alte Alias-Card aus dem Supplement-Grid entfernen:
Entferne den kompletten `<Card variant="section" className={styles.fansubEditAliasCard} title="Aliase">...</Card>`-Block (Zeilen ~2535-2599) inklusive des schließenden `</Card>`-Tags vollständig aus dem JSX.

Hinweise:
- Das Label lautet "Aliase" (mit korrektem deutschen Umlaut), nicht "Alias".
- Die Klasse `fansubEditBasicField` auf dem Wrapper-Div sorgt für den Label-Stil (uppercase, klein) passend zu den anderen Grunddaten-Feldern.
- Kein Import hinzufügen — FormField, Input, Button, Badge, Plus, X sind bereits importiert.
- Keine State- oder Handler-Änderungen.
  </action>
  <verify>
    <automated>grep -n "fansubEditAliasCard" frontend/src/app/admin/fansubs/[id]/edit/page.tsx</automated>
  </verify>
  <done>fansubEditAliasCard kommt nicht mehr in page.tsx vor; fansubEditBasicFieldFull erscheint mindestens einmal; ESLint läuft ohne neue Fehler durch (npm run lint --prefix frontend 2>&1 | tail -5).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Alias-Block wurde ins Grunddaten-Grid verschoben. Neue CSS-Klasse fansubEditBasicFieldFull nimmt volle Grid-Breite ein. Die separate Alias-Card ist entfernt.</what-built>
  <how-to-verify>
    1. Dev-Server läuft auf http://localhost:3000 (hot reload).
    2. Öffne http://localhost:3000/admin/fansubs/1/edit und wechsle zum Tab "Grunddaten".
    3. Prüfe: Der Alias-Block ("Aliase" mit Umlaut als Label) erscheint innerhalb der Grunddaten-Karte, direkt unter den Jahresfeldern, in voller Breite.
    4. Prüfe: Im Bereich darunter (Supplement-Grid) ist keine separate "Aliase"-Karte mehr sichtbar.
    5. Füge einen neuen Alias ein (Eingabe + "Hinzufügen"-Button oder Enter) — Badge erscheint.
    6. Entferne einen Alias über das X-Icon — Badge verschwindet.
    7. Seite responsiv bei schmalem Viewport (< 640px): AliasControls-Grid wechselt auf einspaltiges Layout (Input über Button).
  </how-to-verify>
  <resume-signal>Tippe "approved" wenn alles korrekt, oder beschreibe das Problem.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Beschreibung |
|----------|-------------|
| Browser → Admin-UI | Nur UI-Restrukturierung, keine neuen Eingabepfade |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-iqh-01 | Tampering | Alias-State (aliasInput, aliases) | accept | Kein neuer State-Pfad; bestehende Handler unverändert |
</threat_model>

<verification>
- `grep -n "fansubEditAliasCard" frontend/src/app/admin/fansubs/[id]/edit/page.tsx` → keine Treffer
- `grep -n "fansubEditBasicFieldFull" frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` → mindestens 1 Treffer
- `grep -n "fansubEditBasicFieldFull" frontend/src/app/admin/fansubs/[id]/edit/page.tsx` → mindestens 1 Treffer
- TypeScript-Kompilierung ohne neue Fehler (next build oder tsc --noEmit)
</verification>

<success_criteria>
- Alias-Block (Eingabe, Hinzufügen, Badge-Liste) ist in der Grunddaten-Karte sichtbar, direkt nach Auflösungsjahr
- Separater "Aliase"-Kartenbereich im Supplement-Grid ist entfernt
- Volle Grid-Breite via fansubEditBasicFieldFull
- Add/Remove-Funktionalität funktioniert unverändert
- Kein verwaister CSS-Selektor für fansubEditAliasCard
- Alle UI-Primitives aus @/components/ui (FormField, Input, Button, Badge) — keine neuen nativen Elemente
- Label "Aliase" mit korrektem Umlaut
</success_criteria>

<output>
Create `.planning/quick/260610-iqh-alias-verwaltung-in-fansub-edit-ins-grun/260610-iqh-SUMMARY.md` when done
</output>
