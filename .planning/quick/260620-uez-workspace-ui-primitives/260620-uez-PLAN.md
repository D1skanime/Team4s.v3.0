---
phase: quick-260620-uez
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
autonomous: true
requirements:
  - UI-PRIMITIVES-MIGRATION
must_haves:
  truths:
    - "Die beiden Tab-Content-Wrapper nutzen das Card-Primitive statt handgebauter <section className={styles.panel}>"
    - "Alle verwaisten CSS-Klassen (.header, .eyebrow, .title, .subtitle, .tabs, .tab, .tabActive, .panel samt zugehöriger Media-Query-Blöcke) sind aus workspace.module.css entfernt"
    - "Funktionale Flows bleiben exakt unverändert: ReleaseVersionMediaSection, ReleaseVersionNotesTab, memberIdFilter, Capabilities-Gating, Tab-IDs, defaultTabId-Logik"
    - "tsc und vitest grün (Heading 'Naruto', Text 'Episode 01 · Team 4S · v1', testid media-section/notes-tab, Tab 'Notizen')"
    - "Breadcrumb-Markup und .breadcrumb-CSS bleiben unverändert (kein Breadcrumb-Primitive vorhanden)"
    - "Beibehaltene Klassen .page, .shell, .breadcrumb, .badgeRow sind weiterhin korrekt referenziert"
  artifacts:
    - path: "frontend/src/app/me/releases/[versionId]/workspace/page.tsx"
      provides: "Workspace-Seite mit Card-Primitive statt styles.panel"
      contains: "Card"
    - path: "frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css"
      provides: "Bereinigtes CSS-Modul ohne verwaiste Klassen"
  key_links:
    - from: "page.tsx Tab-Content"
      to: "Card (from @/components/ui)"
      via: "import { Card } from '@/components/ui'"
      pattern: "<Card>"
---

<objective>
Die Route /me/releases/[versionId]/workspace auf das globale Design-System umstellen:
die beiden handgebauten `<section className={styles.panel}>` durch das `Card`-Primitive
ersetzen und alle dadurch verwaisten CSS-Klassen aus workspace.module.css entfernen.

Purpose: Konformität mit dem Pflicht-Constraint "alle UI nutzen @/components/ui-Primitives".
Output: page.tsx ohne Eigenbau-Panel-Markup; workspace.module.css ohne tote Klassen.
</objective>

<execution_context>
@/home/admin/.claude/get-shit-done/workflows/execute-plan.md
@/home/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260620-uez-workspace-ui-primitives/260620-uez-PLAN.md

<!-- Relevante Interfaces für den Executor -->
<interfaces>
<!-- Card-Primitive aus frontend/src/components/ui/Card.tsx -->
<!-- Rendert selbst ein <section>-Element — kein zusätzliches <section> wrapper nötig -->
type CardVariant = 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat' | 'nested' | 'nestedFlat'

interface CardProps extends HTMLAttributes<div> {
  variant?: CardVariant   // 'default' passt hier (weißer Hintergrund, leichter Schatten)
  title?: string
  description?: string
  header?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

// Export: import { Card } from '@/components/ui'

<!-- Aktuelle styles.panel-Definition (wird entfernt): -->
/*
.panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(56, 70, 96, 0.08);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(33, 45, 72, 0.08);
}
@media (max-width: 720px) { .panel { padding: 12px; } }
*/
<!-- Das Card 'default'-Variant liefert äquivalente Optik über ui.module.css -->

<!-- Beibehaltene Klassen (NICHT entfernen): .page, .shell, .breadcrumb, .badgeRow -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: section.panel → Card-Primitive in page.tsx ersetzen</name>
  <files>frontend/src/app/me/releases/[versionId]/workspace/page.tsx</files>
  <action>
    1. Import erweitern: `Card` zu dem bestehenden Import aus `@/components/ui` hinzufügen.
       Bestehende Zeile 7: `import { Badge, Button, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'`
       → ersetzen durch: `import { Badge, Button, Card, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'`

    2. Zeile 136 (Media-Tab-Content): `<section className={styles.panel}>` → `<Card>` ersetzen,
       schließendes `</section>` → `</Card>`.

    3. Zeile 152 (Notes-Tab-Content): identisch — `<section className={styles.panel}>` → `<Card>`,
       `</section>` → `</Card>`.

    Kein `variant`-Prop nötig — Card 'default' liefert weißen Hintergrund + leichten Schatten,
    das ist äquivalent zur entfernten .panel-Optik.

    NICHT verändern: alle anderen JSX-Strukturen, Props, Logik-Variablen, Strings,
    insbesondere "Naruto", "Episode 01 · Team 4S · v1", Tab-IDs, defaultTabId, memberIdFilter,
    Capabilities-Gating, Breadcrumb-Markup.

    Nach der Änderung: `styles.panel` wird nirgends mehr im JSX referenziert.
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    page.tsx importiert Card aus @/components/ui; beide Tab-Content-Wrapper sind Card-Elemente;
    kein styles.panel mehr im JSX; tsc meldet keine neuen Fehler.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verwaiste CSS-Klassen aus workspace.module.css entfernen</name>
  <files>frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css</files>
  <action>
    Verwaiste Klassen entfernen — diese werden nach Task 1 nirgends mehr im Verzeichnis referenziert:

    Zu entfernende Blöcke (vollständig, inkl. Media-Query-Teile):
    - `.header { … }` (Zeilen 29–39)
    - `.eyebrow { … }` (Zeilen 41–47)
    - `.title { … }` (Zeilen 49–53)
    - `.subtitle { … }` (Zeilen 55–59)
    - `.tabs { … }` (Zeilen 68–77)
    - `.tab, .tabActive { … }` (Zeilen 79–96)
    - `.panel { … }` (Zeilen 98–106)
    - Im Media-Query-Block (@media max-width: 720px): die Teile `.header { display: grid; }`,
      `.tabs { width: 100%; }`, `.tab, .tabActive { flex: 1; }`, `.panel { padding: 12px; }` entfernen.

    Beibehaltene Klassen (NICHT entfernen): `.page`, `.shell`, `.breadcrumb`, `.breadcrumb a`, `.badgeRow`.
    Der Media-Query-Block selbst bleibt bestehen mit nur noch `.page { … }` und `.badgeRow { … }`.

    Vor dem Entfernen sicherstellen (grep im Verzeichnis bereits durch Orchestrator bestätigt):
    die oben genannten Klassen werden ausschließlich in workspace.module.css definiert und
    nicht im JSX von page.tsx referenziert (nach Task 1 gilt das auch für .panel).

    Ergebnis-CSS-Modul enthält nur noch:
    - .page (inkl. Media-Query-Teil)
    - .shell
    - .breadcrumb + .breadcrumb a
    - .badgeRow (inkl. Media-Query-Teil)
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx vitest run src/app/me/releases/\\[versionId\\]/workspace/page.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <done>
    workspace.module.css enthält keine der entfernten Klassen mehr; vitest-Suite grün
    (alle Tests in page.test.tsx bestehen: Heading Naruto, Episode-Text, media-section-testid, Notizen-Tab).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| keine neuen | Reine UI-Refaktorierung ohne neue Datenpfade oder externe Integrationen |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-uez-01 | Tampering | CSS-Klassen-Entfernung | accept | Klassen-Entfernung ist rein kosmetisch; grep-Verifikation vor Entfernung durch Orchestrator bereits durchgeführt |
</threat_model>

<verification>
Nach Abschluss beider Tasks:

1. tsc --noEmit: keine neuen Fehler
2. vitest page.test.tsx: alle Tests grün (Heading "Naruto", Text "Episode 01 · Team 4S · v1", testid media-section, Tab "Notizen")
3. grep -n "styles\.panel" frontend/src/app/me/releases/\[versionId\]/workspace/page.tsx → 0 Treffer
4. workspace.module.css enthält kein .header, .eyebrow, .title, .subtitle, .tabs, .tab, .tabActive, .panel mehr
</verification>

<success_criteria>
- Card-Primitive ersetzt beide handgebauten section.panel-Wrapper in page.tsx
- workspace.module.css enthält nur noch .page, .shell, .breadcrumb/.breadcrumb a, .badgeRow
- Funktionale Flows exakt unverändert (keine Prop-/Verhaltensänderung)
- tsc + vitest grün
</success_criteria>

<output>
Create `.planning/quick/260620-uez-workspace-ui-primitives/260620-uez-01-SUMMARY.md` when done
</output>
