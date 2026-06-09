---
phase: quick
plan: 260609-wev
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css
autonomous: true
requirements: [DESIGN-SYSTEM-COMPLIANCE]

must_haves:
  truths:
    - "Keine nativen <button>, <input>, <select> in ReleaseVersionNotesTab.tsx — alle ersetzt durch @/components/ui-Primitives"
    - "ESLint no-restricted-syntax-Warnungen für diese Datei sind verschwunden"
    - "ReleaseVersionNotesTab.test.tsx bleibt grün (alle 6 Tests bestehen)"
    - "Ladestate zeigt LoadingState-Primitive, Leerstaat zeigt EmptyState-Primitive"
    - "Fehler-Banner zeigt ErrorState-Primitive, Erfolg-Banner zeigt Badge (variant=success) oder minimale lokale Lösung falls kein passendes Primitive"
    - "Save-Button ist Button variant=success aus @/components/ui"
    - "Save-Bar am Ende verwendet ActionBar-Primitive"
    - "Titel-Input ist Input aus @/components/ui, eingebettet in FormField mit label='Titel (optional)'"
    - "Sichtbarkeit- und Status-Selects sind Select aus @/components/ui, eingebettet in FormField"
    - "roleChip ist Badge variant=neutral aus @/components/ui"
    - "Alle nicht mehr referenzierten CSS-Klassen in ReleaseVersionNotesTab.module.css sind entfernt"
    - "Funktionalität komplett erhalten: Laden, Dirty-Tracking, Bulk-Save, Zeichen-Warnung, ROLE_HELP_TEXTS, details/summary-Aufklapper"
  artifacts:
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx"
      provides: "Migrierter Notizen-Tab ohne native Formular-Elemente"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css"
      provides: "Aufgeräumte CSS-Datei ohne verwaiste Klassen"
  key_links:
    - from: "ReleaseVersionNotesTab.tsx"
      to: "@/components/ui"
      via: "Named imports: Button, Select, Input, FormField, Badge, LoadingState, EmptyState, ErrorState, ActionBar"
---

<objective>
ReleaseVersionNotesTab.tsx auf das globale Design-System aus @/components/ui migrieren.

Purpose: Die Datei verstößt gegen die CLAUDE.md-Pflicht, ausschließlich globale UI-Primitives zu verwenden. Alle nativen <button>, <input>, <select> sowie handgebaute State/Notice-Divs müssen ersetzt werden.
Output: Konformes ReleaseVersionNotesTab.tsx ohne ESLint no-restricted-syntax-Warnungen, bereinigte CSS-Datei, grüne Tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md

<interfaces>
<!-- Verfügbare Primitives aus @/components/ui — keine codebase-Exploration nötig. -->

Button (variant: 'primary'|'secondary'|'ghost'|'subtle'|'danger'|'success', size: 'sm'|'md'|'lg', loading?: boolean, fullWidth?: boolean, leftIcon?, rightIcon?)
  → Ersetzt natives <button> im saveBar-Bereich.

Input (extends InputHTMLAttributes, invalid?: boolean)
  → Ersetzt natives <input type="text"> für den Titel im Erweiterte-Felder-Bereich.

Select (extends SelectHTMLAttributes, invalid?: boolean)
  → Ersetzt native <select> für Sichtbarkeit und Status im Erweiterte-Felder-Bereich.

FormField (label?: string, htmlFor?: string, hint?: string, error?: string, required?: boolean, disabled?: boolean, children)
  → Wrapper für Input/Select, übernimmt Label-Rendering. Ersetze die bestehenden <label className={styles.fieldGroup}>-Wrapper durch FormField.

Badge (variant: 'neutral'|'success'|'warning'|'danger'|'info'|'muted')
  → Ersetzt roleChip <span>. Nutze variant='neutral' (neutral = dezenter Chip-Look).

LoadingState (title?: string, description?: string)
  → Ersetzt stateBox+stateText für den isLoading-Zweig.
  Nutze title='Notizen werden geladen', description ohne description-Prop (leer lassen oder kurzen Satz).

EmptyState (title: string, description?: string, action?: ReactNode, variant?: 'default'|'withAction'|'compact')
  → Ersetzt stateBox+stateText für den memberRoles.length === 0-Zweig.
  title='Keine Rollen zugeordnet', description='Notizen können erst hinzugefügt werden, wenn Mitglieder im Release zugeordnet sind.'

ErrorState (title: string, description: string, action?: ReactNode)
  → Ersetzt editorNotice + editorNoticeError für errorMessage.
  title='Fehler', description={errorMessage}.
  ACHTUNG: ErrorState ist ein stateCard-Block (groß) — für das Fehler-Banner im Fließtext ist es semantisch vertretbar; falls es optisch zu dominant wirkt, kann eine minimale lokale Lösung bleiben (siehe Entscheidungshinweis unten).

ActionBar (leading?: ReactNode, trailing?: ReactNode)
  → Ersetzt das saveBar-<div>. Nutze trailing={<Button ...>} um den Button rechtsbündig zu platzieren.

Erfolgsmeldung (successMessage): Kein passendes kompaktes Primitive vorhanden.
  → Minimale lokale Lösung behalten: <div className={styles.editorNoticeSuccess}> ODER Badge variant='success' als Inline-Chip.
  → Empfehlung: Badge variant='success' für Inline-Erfolgshinweis verwenden, da kompakter.
  → Entscheide dich beim Implementieren basierend auf was besser aussieht; dokumentiere die Wahl.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Native Formular-Elemente und State-UI durch @/components/ui-Primitives ersetzen</name>
  <files>
    frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx
  </files>
  <action>
Migriere ReleaseVersionNotesTab.tsx vollständig auf @/components/ui-Primitives. Alle Änderungen in einer einzigen kohärenten Bearbeitung:

IMPORTS: Füge oben einen Block hinzu:
  import { ActionBar, Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState, Select } from '@/components/ui'
Entferne die bisherigen CSS-Klassen-Referenzen für ersetzte Elemente aus dem styles-Objekt (die verbleibenden lokalen Klassen bleiben).

1. LOADING-STATE (Zeile ~247-253):
   Ersetze die <section className={styles.stateBox}><p>Lade Notizen...</p></section>
   durch <LoadingState title="Notizen werden geladen" />
   (kein description-Prop nötig).

2. EMPTY-STATE (Zeile ~255-264):
   Ersetze die <section className={styles.stateBox}><p>Für diese Release-Version...</p></section>
   durch <EmptyState title="Keine Rollen zugeordnet" description="Notizen können erst hinzugefügt werden, wenn Mitglieder im Release zugeordnet sind." />

3. ERROR-NOTICE (Zeile ~283-287):
   Ersetze den errorMessage-Zweig:
     <div className={`${styles.editorNotice} ${styles.editorNoticeError}`}>...</div>
   durch <ErrorState title="Fehler" description={errorMessage} />

4. SUCCESS-NOTICE (Zeile ~289-293):
   Ersetze den successMessage-Zweig:
     <div className={`${styles.editorNotice} ${styles.editorNoticeSuccess}`}>...</div>
   durch <Badge variant="success">{successMessage}</Badge>

5. SAVE-BAR (Zeile ~305-314):
   Ersetze <div className={styles.saveBar}><button ...></div>
   durch:
     <ActionBar trailing={
       <Button
         variant="success"
         type="button"
         loading={isSaving}
         onClick={() => void handleSave()}
       >
         {isSaving ? 'Wird gespeichert…' : 'Alle Notizen speichern'}
       </Button>
     } />
   Button mit loading={isSaving} statt disabled={isSaving} — das loading-Prop rendert Spinner + disabled intern.

6. ROLE-CHIP in RoleNoteField (Zeile ~371):
   Ersetze <span className={styles.roleChip}>{memberRole.roleName}</span>
   durch <Badge variant="neutral">{memberRole.roleName}</Badge>

7. TITEL-INPUT in den Erweiterten Feldern (Zeile ~396-404):
   Ersetze den <label className={styles.fieldGroup}><span>Titel</span><input .../></label>-Block
   durch:
     <FormField label="Titel (optional)">
       <Input
         type="text"
         value={state?.title ?? ''}
         onChange={(e) => onUpdate(key, 'title', e.target.value)}
       />
     </FormField>

8. SICHTBARKEIT-SELECT (Zeile ~407-417):
   Ersetze <label className={styles.fieldGroup}><span>Sichtbarkeit</span><select .../></label>
   durch:
     <FormField label="Sichtbarkeit">
       <Select
         value={state?.visibility ?? 'internal'}
         onChange={(e) => onUpdate(key, 'visibility', e.target.value as 'public' | 'internal')}
       >
         <option value="internal">intern</option>
         <option value="public">öffentlich</option>
       </Select>
     </FormField>

9. STATUS-SELECT (Zeile ~419-431):
   Ersetze <label className={styles.fieldGroup}><span>Status</span><select .../></label>
   durch:
     <FormField label="Status">
       <Select
         value={state?.status ?? 'draft'}
         onChange={(e) => onUpdate(key, 'status', e.target.value as NoteFormState['status'])}
       >
         <option value="draft">Entwurf</option>
         <option value="published">Veröffentlicht</option>
         <option value="archived">Archiviert</option>
         <option value="deleted">Gelöscht</option>
       </Select>
     </FormField>

WICHTIG — Nicht ändern:
- Die äußere <section className={styles.notesTab}> Wrapper-Struktur
- Die MemberCard-Struktur mit memberCardHeader, memberCardBody (Card-Primitive würde inkompatible Semantik bringen, da section-Tag; lokale memberCard-Div-Struktur ist in Ordnung)
- Alle Logik-Funktionen: buildKey, buildInitialState, handleSave, updateField, ensureRichTextValue, isRichTextEmpty, createEmptyRichTextDoc, ROLE_HELP_TEXTS, CHAR_WARN_LIMIT
- RichTextEditor-Aufruf unverändert
- charFooter / charHint / charHintWarning Spans unverändert
- details/summary-Aufklapper-Struktur unverändert (nur der Inhalt wird auf Primitives umgestellt)
- editorNotice-Div mit dem normalen Hinweistext (Zeile ~276-281) unverändert belassen — das ist eine Info-Notice, kein Error; kein passendes kompaktes Primitive vorhanden
- Deutschen UI-Text: alle Strings mit korrekten Umlauten (ä, ö, ü, ß), keine ASCII-Ersetzungen

NACH DER ÄNDERUNG: Prüfe mit einem mentalen Scan der finalen TSX-Datei, dass keine nativen <button>, <input>, <select> außerhalb von @/components/ui-Definitionen verbleiben.
  </action>
  <verify>
    <automated>cd frontend && npx vitest run src/app/admin/episode-versions --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>Alle 6 Tests in ReleaseVersionNotesTab.test.tsx bestehen. Keine nativen button/input/select mehr in ReleaseVersionNotesTab.tsx (außer in importierten Primitives).</done>
</task>

<task type="auto">
  <name>Task 2: ReleaseVersionNotesTab.module.css aufräumen und ESLint-Gate prüfen</name>
  <files>
    frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css
  </files>
  <action>
Nach der Primitive-Migration in Task 1 sind folgende CSS-Klassen in ReleaseVersionNotesTab.module.css verwaist (nicht mehr referenziert im TSX):

ENTFERNEN (komplett aus der CSS-Datei löschen):
- .stateBox und .stateText (ersetzt durch LoadingState/EmptyState)
- .saveButton und .saveButton:disabled und das @media-Block-Stück für .saveButton (ersetzt durch Button-Primitive)
- .saveBar (ersetzt durch ActionBar — aber prüfe ob saveBar noch referenziert wird; falls ActionBar den Wrapper komplett übernimmt, entfernen)
- .roleChip (ersetzt durch Badge)
- .input, .select und .input:focus, .select:focus (ersetzt durch Input/Select-Primitives)
- .fieldGroup und .fieldLabel (ersetzt durch FormField)
- .editorNoticeError und .editorNoticeSuccess (ersetzt durch ErrorState/Badge)

BEHALTEN (weiterhin in TSX verwendet):
- .notesTab (Haupt-Wrapper)
- .editorNotice und .editorNoticeText (Info-Notice bleibt lokal)
- .memberCard, .memberCardHeader, .memberCardHeaderText, .memberCardTitle, .memberCardMeta, .memberCardBody (MemberCard-Struktur bleibt lokal)
- .roleCard, .roleCardHeader, .roleCardHeading, .roleLabelEyebrow, .roleLabelTitle (RoleCard-Struktur bleibt lokal)
- .roleHelpText (Hilfetext bleibt)
- .charFooter, .charHint, .charHintWarning (Zeichenzähler bleibt)
- .advancedDetails, .advancedSummary, .advancedFields, .advancedGrid (Aufklapper bleibt)
- @media-Regeln die noch verwendete Klassen referenzieren

WICHTIG: Nur Klassen entfernen die wirklich nicht mehr im TSX referenziert werden. Im Zweifel grep-prüfen:
  grep -n "saveButton\|stateBox\|stateText\|roleChip\|fieldGroup\|fieldLabel\|editorNoticeError\|editorNoticeSuccess\|\.input\|\.select" frontend/src/app/admin/episode-versions/\[versionId\]/edit/ReleaseVersionNotesTab.tsx
  → sollte 0 Treffer für die zu entfernenden Klassen liefern.

Danach ESLint-Prüfung auf die Zieldatei:
  cd frontend && npx eslint src/app/admin/episode-versions/\[versionId\]/edit/ReleaseVersionNotesTab.tsx --max-warnings=0 2>&1 | tail -20
Die no-restricted-syntax-Warnungen für native select/input müssen verschwunden sein.
  </action>
  <verify>
    <automated>cd frontend && grep -c "saveButton\|\.stateBox\|\.roleChip\|\.fieldGroup\|\.fieldLabel" src/app/admin/episode-versions/\[versionId\]/edit/ReleaseVersionNotesTab.module.css || echo "0 verwaiste Klassen verbleiben"</automated>
  </verify>
  <done>
    - Alle verwaisten CSS-Klassen aus dem Modul entfernt
    - `npx eslint ... --max-warnings=0` auf ReleaseVersionNotesTab.tsx läuft ohne no-restricted-syntax-Fehler durch
    - Alle 6 Vitest-Tests bleiben grün (nochmals ausführen nach CSS-Änderung)
    - Commit mit gezielten Pfaden: git add frontend/src/app/admin/episode-versions/\[versionId\]/edit/ReleaseVersionNotesTab.tsx frontend/src/app/admin/episode-versions/\[versionId\]/edit/ReleaseVersionNotesTab.module.css
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Beschreibung |
|----------|-------------|
| Admin-UI → keine | Reine UI-Migration, keine neuen Datenpfade |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-wev-01 | Tampering | npm-Imports (@/components/ui) | accept | Lokale Pakete im Monorepo, kein externer Registrypfad |
</threat_model>

<verification>
1. `cd frontend && npx vitest run src/app/admin/episode-versions --reporter=verbose` → alle 6 Tests grün
2. `cd frontend && npx eslint "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx" --max-warnings=0` → keine Warnungen
3. Manuell: http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=notizen aufrufen — Tab lädt, Notizen-Editor sichtbar, Speichern-Button vorhanden
4. Kein `git add -A` — nur gezielt die zwei geänderten Dateien committen
</verification>

<success_criteria>
- Kein natives `<button>`, `<input>`, `<select>` in ReleaseVersionNotesTab.tsx außerhalb der ui/-Primitives selbst
- ESLint no-restricted-syntax: 0 Warnungen für diese Datei
- 6/6 Vitest-Tests bestehen
- Entfernte CSS-Klassen: mindestens saveButton, stateBox, stateText, roleChip, input, select, fieldGroup, fieldLabel, editorNoticeError, editorNoticeSuccess
- Funktionalität unverändert: Laden, Dirty-Tracking, Bulk-Save, Zeichen-Warnung (2000), Rollen-Hilfetexte, details/summary-Aufklapper
</success_criteria>

<output>
Create `.planning/quick/260609-wev-releaseversionnotestab-auf-globales-ui-s/260609-wev-SUMMARY.md` when done
</output>
