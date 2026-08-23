---
phase: quick-wrz
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: []
files_modified:
  - frontend/src/components/ui/EmptyState.tsx
  - frontend/src/components/ui/ui.module.css
  - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
  - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx
  - frontend/src/app/admin/users/tabs/GroupSection.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx

must_haves:
  truths:
    - "Bei userId=4 (data.roles.length === 0, der live gemessene Fall) zeigt der 'Rollen & Rechte'-Tab fuer die globalen Rollen keinen Icon-Block und keine eigene Card mehr, sondern eine einzeilige Textzeile; die IdP-Herkunft und Nur-Lesbarkeit bleiben im Text erhalten (kein Informationsverlust)."
    - "Die vormals eigenstaendige 'Aktive Rollen'-Ueberschrift + Erklaerabsatz-Sektion in UserGlobalRolesTab.tsx existiert nicht mehr als separater ~190px-Block; wenn Rollen vorhanden sind, bleibt der IdP-/Nur-lesbar-Hinweis ueber eine kompakte Zeile plus natives title-Attribut erhalten."
    - "GroupSection.tsx umschliesst seinen Inhalt nicht mehr mit der Card-Primitive (kein Rahmen/Schatten/Card-Innenabstand); Gruppentitel, 'Gruppe bearbeiten'-Button, Rollen-Sektion und Accordion bleiben inhaltlich und funktional unveraendert, inkl. des data-group-section-Attributs."
    - "Alle drei betroffenen Leerzustaende (Keine globalen Rollen / Keine Gruppenmitgliedschaften / Keine Rechte in dieser Gruppe) nutzen die neue EmptyState variant=\"inline\" statt Icon+Card-Chrome, mit unveraendertem sichtbarem Kerntext."
    - "Der bestehende UAT-138-A-Fix (grid-template-columns: minmax(0, 1fr) auf .card und .accordionRoot in ui.module.css, commit dc4f5726) bleibt byte-fuer-byte unveraendert; die neuen Markup-Aenderungen fuehren keine neue display:grid-Regel ohne grid-template-columns ein, die dieselbe Ueberlauf-Falle reproduzieren koennte."
    - "docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic' zeigt ausschliesslich die 5 vorab bekannten roten Testdateien (FansubAppMembersSection.test.tsx, fansubs/[id]/edit/page.test.tsx, useGroupMembersTab.test.ts, UserContributionsTab.test.tsx, ResponsiveImage.config.test.ts) als Fehlschlaege, keine neuen."
  artifacts:
    - path: "frontend/src/components/ui/EmptyState.tsx"
      provides: "EmptyStateVariant 'inline' -- einzeilige, icon-lose, card-chrome-lose Darstellung fuer bestehende Leerzustaende"
      contains: "'inline'"
    - path: "frontend/src/components/ui/ui.module.css"
      provides: ".stateInline-Regel ohne display:grid, ohne border/background/box-shadow, ohne Block-Padding"
      contains: ".stateInline"
    - path: "frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx"
      provides: "Kompakte, kopflose Darstellung der globalen Rollen (kein separater 'Aktive Rollen'-Block mehr)"
      contains: "variant=\"inline\""
    - path: "frontend/src/app/admin/users/tabs/GroupSection.tsx"
      provides: "Chrome-freier Gruppen-Abschnitt ohne <Card>-Wrapper"
  key_links:
    - from: "frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx"
      to: "frontend/src/components/ui/EmptyState.tsx"
      via: "EmptyState variant=\"inline\" import aus @/components/ui"
      pattern: "variant=\"inline\""
    - from: "frontend/src/app/admin/users/tabs/GroupSection.tsx"
      to: "frontend/src/components/ui/EmptyState.tsx"
      via: "EmptyState variant=\"inline\" statt <Card>-Wrapper"
      pattern: "variant=\"inline\""
    - from: "frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx"
      to: "frontend/src/components/ui/EmptyState.tsx"
      via: "EmptyState variant=\"inline\" fuer 'Keine Gruppenmitgliedschaften.'"
      pattern: "variant=\"inline\""
---

<objective>
Fix UAT-138-G: auf `/admin/users/4?tab=roles-rights` vergehen bei 1280x900 aktuell 851px, bevor die
erste echte Rechtezeile erscheint -- bei 900px Fensterhoehe sieht ein Admin auf dem ersten Bildschirm
kein einziges Recht. Verletzt D-05 ("kompakte Listen ... progressive Details" statt "reine
Statistik-Kacheln ohne administrativen Nutzen") aus `138-CONTEXT.md`.

Drei konkrete, im Benutzer-Rechte-Bereich lokalisierte Ursachen werden behoben, ohne Informationsverlust:

1. Die Karte "Keine globalen Rollen" (EmptyState, ~144px: Icon-Block + Card-Chrome + Titel + Absatz)
   wird auf eine einzeilige Information reduziert -- dafuer bekommt die globale `EmptyState`-Primitive
   selbst eine echte chrome-freie `inline`-Variante (nicht ein lokales Duplikat-Markup), die aber in
   diesem Quick-Task NUR auf die drei hier konkret genannten Leerzustaende angewendet wird (nicht auf
   alle 79 bestehenden `EmptyState`-Nutzstellen -- das waere Scope-Creep).
2. Der ~190px hohe Block "Globale Rollen" -> "Aktive Rollen" -> Erklaerabsatz (IdP-Sync/Nur-Lesbarkeit)
   wird auf eine kompakte Zeile eingedampft; die IdP-Herkunft/Nur-Lesbar-Information bleibt ueber ein
   natives `title`-Attribut bzw. einen kurzen Inline-Satz erhalten (keine neue Tooltip-Komponente).
3. Die Card-Chrome (Rahmen, Schatten, Innenabstand) um jede Gruppen-Sektion (`GroupSection.tsx`) traegt
   keine Information und wird entfernt (kein `<Card>`-Wrapper mehr); Ueberschrift + Rollen + Tabellen
   bleiben unveraendert sichtbar.

Purpose: Die erste echte Rechtezeile soll deutlich oberhalb der Falz erscheinen (Richtwert <= 400px),
ohne Informationsverlust, ohne Aenderung an Rechtelogik/Resolver/Provenienz/Flows, und ohne den
kanonischen Benutzer-in-Gruppe-Editor (UADM-01) als Mutationsweg zu veraendern.

Output: Erweiterte `EmptyState`-Primitive mit `variant="inline"`; kompaktierte
`UserGlobalRolesTab.tsx`; chrome-freie `GroupSection.tsx`; aktualisierte/erweiterte Tests; eine
SUMMARY.md mit einer klar als Engineering-Schaetzung gekennzeichneten neuen Hoehenangabe (keine
Live-Messung) sowie einer Quellcode-Bestaetigung, dass der UAT-138-A-394px-Fix intakt bleibt.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md
@.planning/quick/260823-u1j-fix-uat-138-a-horizontaler-seitenueberla/260823-u1j-SUMMARY.md

frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx
frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
frontend/src/app/admin/users/tabs/GroupSection.tsx
frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
frontend/src/components/ui/EmptyState.tsx
frontend/src/components/ui/Card.tsx
frontend/src/components/ui/SectionHeader.tsx
frontend/src/components/ui/classNames.ts
</context>

<interfaces>
<!-- Exact current code the executor needs -- no codebase exploration required. -->

Current `EmptyState.tsx` (full file, to be extended, not replaced):

```typescript
type EmptyStateVariant = 'default' | 'withAction' | 'compact'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: EmptyStateVariant
}

export function EmptyState({ title, description, action, variant = 'default' }: EmptyStateProps) {
  return (
    <div className={classNames(styles.stateCard, styles.stateNeutral, variant === 'compact' && styles.stateCompact)}>
      <div className={styles.stateIcon} aria-hidden="true">
        <Inbox size={20} strokeWidth={2} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      {description ? <p className={styles.stateDescription}>{description}</p> : null}
      {variant === 'withAction' || action ? action : null}
    </div>
  )
}
```

Relevant existing CSS rules (`frontend/src/components/ui/ui.module.css`) -- for reference, DO NOT
modify any of these, only ADD a new `.stateInline` rule near them:

```css
.stateCard {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 248, 252, 0.98) 100%);
  display: grid;
  gap: 10px;
  text-align: left;
  align-content: start;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 1px 3px rgba(33, 45, 72, 0.05);
}

.stateCompact {
  padding: 16px;
  gap: 8px;
}
```

Design tokens already available (`frontend/src/styles/globals.css`), reuse these -- do NOT invent
new CSS variables:

```css
--space-2: 8px;
--text-soft: #625c56;
```

Current `Card.tsx` render (confirms `Card` spreads `...props`, including `style`/`data-*` attributes,
directly onto the returned `<section>` -- relevant when GroupSection.tsx drops `<Card>` in favor of a
plain `<section>` with the exact same attributes):

```typescript
return (
  <section
    {...props}
    className={classNames(styles.card, /* variant classes */, className)}
  >
    {cardHeader ? <div className={styles.cardHeader}>{cardHeader}</div> : null}
    {children}
    {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
  </section>
)
```

Current `GroupSection.tsx` return block (the exact block Task 3 replaces):

```tsx
return (
  <Card variant="section" style={{ marginBottom: 'var(--space-4)' }} data-group-section>
    <SectionHeader
      level={3}
      title={membership.fansub_group_name}
      actions={<Button variant="ghost" size="sm" onClick={...}>Gruppe bearbeiten</Button>}
    />
    <GroupRolesSection ... />
    {accordionItems.length === 0 ? (
      <EmptyState title="Keine Rechte in dieser Gruppe." description="" />
    ) : (
      <Accordion items={accordionItems} mode="multi" openIds={openCategoryIds} onOpenChange={onOpenCategoryIdsChange} />
    )}
  </Card>
)
```

Current `UserGlobalRolesTab.tsx` render (the exact block Task 2 replaces) -- note `RolesTable` is a
module-private helper function in the SAME file, not exported:

```tsx
function RolesTable({ roles }: RolesTableProps) {
  if (roles.length === 0) {
    return (
      <EmptyState
        title="Keine globalen Rollen"
        description="Diesem Benutzer sind keine globalen Rollen zugewiesen."
      />
    )
  }
  return (
    <Table variant="default">
      <TableHead><TableRow><TableHeaderCell>Rolle</TableHeaderCell><TableHeaderCell>Quelle</TableHeaderCell></TableRow></TableHead>
      <TableBody>{/* Badge role + Badge "aus IdP" per row, unchanged */}</TableBody>
    </Table>
  )
}

export function UserGlobalRolesTab({ userId }: Props) {
  // ... data loading unchanged ...
  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Aktive Rollen"
        description="Diese Rollen werden automatisch aus dem Identity Provider (Keycloak) synchronisiert und sind hier nur lesbar."
      />
      <RolesTable roles={data.roles} />
    </div>
  )
}
```

Current `UserGroupRightsTab.tsx` top-level empty-state branch (the exact line Task 3 changes):

```tsx
} else if (!data || data.memberships.length === 0) {
  content = (
    <div style={{ padding: 'var(--space-4)' }}>
      <EmptyState title="Keine Gruppenmitgliedschaften." description="" />
    </div>
  )
}
```

<!-- Height-Rechenhilfe: bereits vom Planner aus ui.module.css extrahierte Werte, als Ausgangspunkt
     fuer die in Task 3 geforderte SUMMARY-Schaetzung. Der Executor MUSS diese Werte gegen die
     tatsaechlich gerenderten Strings/Breiten verifizieren/verfeinern, nicht blind uebernehmen. -->

Alte Bloecke (userId=4-Fall, roles.length === 0):
- `.stateCard` (alter EmptyState "Keine globalen Rollen"): padding 20px*2=40 + grid-gap 10px*2=20 +
  `.stateIcon` 38px + Titelzeile (~19px) + Beschreibungszeile (~25px) ~= 144px (deckt sich mit der
  im Auftrag genannten Live-Schaetzung).
- "Aktive Rollen"-Block (SectionHeader title=1rem/line-height 1.15 + margin-top 6px +
  `.sectionDescription` 0.92rem/line-height 1.5, laut Auftrag live ~190px inkl. Umbruch der langen
  Erklaerung bei der tatsaechlichen Containerbreite).
- Summe der beiden bisher IMMER hintereinander gerenderten Bloecke: ~334px.
- Erste `GroupSection`-Card-Chrome: `.card`-Border 1px*2=2px + `.card`-Padding 18px*2=36px = ~38px
  (nur die dekorative Chrome, nicht der Inhalt/die Gaps dazwischen).

Neue Bloecke (nach diesem Plan, gleicher Fall):
- `.stateInline` (neu, EmptyState "Keine globalen Rollen"): padding `var(--space-2)` (8px) oben+unten
  =16px + eine Textzeile (~0.9rem * line-height 1.5 ~= 20px) ~= 36px -- ersetzt die alten 334px
  vollstaendig (kein separater "Aktive Rollen"-Block mehr im leeren Fall).
- Card-Chrome-Ersparnis erste GroupSection: ~38px (Chrome entfaellt, Struktur-Gaps bleiben ueber ein
  eigenes `gap` auf dem Ersatz-`<section>` erhalten).

Rechenmethode fuer die SUMMARY (Subtraktion vom EINEN vertrauenswuerdigen Live-Messwert 851px, statt
den gesamten Stack von Grund auf neu zu schaetzen -- Seitenkopf/Tabs-Leiste oberhalb des Tab-Inhalts
bleiben durch diesen Plan unveraendert und muessen daher nicht separat neu vermessen werden):

```
neue_hoehe ~= 851px
            - (334px altes "Aktive Rollen"+EmptyState-Duo)
            + (36px neue .stateInline-Zeile)
            - (38px Card-Chrome erste GroupSection)
            ~= 851 - 334 + 36 - 38 = 515px
```

Dieser Planner-Vorwert (~515px) liegt ueber dem Richtwert von 400px. Das ist zulaessig zu berichten
(der Richtwert ist ein "Richtwert", kein hartes Gate fuer diesen Task) -- die SUMMARY muss den
tatsaechlich nachgerechneten Wert ehrlich nennen, ihn explizit als "Engineering-Schaetzung, keine
Live-Messung" kennzeichnen, ggf. vom Planner-Vorwert abweichen (z. B. wenn die tatsaechliche
Containerbreite die Beschreibungszeilen anders umbrechen laesst), und einen Live-UAT-Spotcheck bei
1280x900 ueber den SSH-Tunnel (`http://127.0.0.1:3300/admin/users/4?tab=roles-rights`) als
naechsten empfohlenen Schritt nennen. Kein Nacharbeiten dieses Quick-Tasks ist noetig, nur weil der
geschaetzte Wert ueber 400px liegt -- die drei benannten Ursachen wurden vollstaendig behoben.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: EmptyState um echte einzeilige, chrome-freie `inline`-Variante erweitern</name>
  <files>frontend/src/components/ui/EmptyState.tsx, frontend/src/components/ui/ui.module.css</files>
  <action>
  In `EmptyState.tsx`: `EmptyStateVariant` um `'inline'` erweitern (`'default' | 'withAction' | 'compact' | 'inline'`).
  Im Funktionskoerper: wenn `variant === 'inline'`, einen komplett eigenen, minimalen Rueckgabezweig
  VOR der bestehenden Standard-Rueckgabe einfuegen, der weder `styles.stateCard` noch `styles.stateIcon`
  noch ein `<h3>` verwendet -- stattdessen genau ein `<p className={styles.stateInline}>` mit `title`
  und (falls vorhanden) `description`, zu einem einzigen fliessenden Satz kombiniert, getrennt durch
  einen Gedankenstrich (` – `): `{title}{description ? \` – ${description}\` : null}`. Kein Icon, kein
  Card-Rahmen, keine separate description-Zeile, kein `action`-Rendering im inline-Zweig (inline ist
  ausschliesslich fuer reine Informationszeilen gedacht). Die bestehenden `default`/`withAction`/`compact`-
  Zweige bleiben byte-fuer-byte unveraendert (kein Regressionsrisiko fuer die 79 bestehenden Nutzstellen).

  In `ui.module.css`: direkt nach der bestehenden `.stateCompact`-Regel (um Zeile 1084) eine neue
  `.stateInline`-Regel ergaenzen, die AUSSCHLIESSLICH globale Tokens verwendet und explizit KEIN
  `display: grid`/`display: flex`, KEIN `border`, KEIN `background`, KEIN `box-shadow` enthaelt (sonst
  waere die "chrome-frei"-Anforderung nicht erfuellt):

  ```css
  .stateInline {
    margin: 0;
    padding: var(--space-2) 0;
    color: var(--text-soft);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  ```

  Keine andere Regel in der Datei aendern. Kein neues CSS-Custom-Property erfinden -- `--space-2` und
  `--text-soft` existieren bereits in `frontend/src/styles/globals.css`.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'</automated>
  </verify>
  <done>`EmptyStateVariant` enthaelt `'inline'`; der `inline`-Zweig rendert genau ein `<p className={styles.stateInline}>` ohne Icon/Card-Chrome; `.stateInline` in `ui.module.css` enthaelt weder `display:` noch `border`/`background`/`box-shadow`; die bestehende `src/components/ui`-Testsuite zeigt keine neuen Fehlschlaege gegenueber dem vorher dokumentierten Stand (1 vorab bekannter, unabhaengiger `ResponsiveImage.config.test.ts`-Fehlschlag bleibt zulaessig).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: "Aktive Rollen"-Block in UserGlobalRolesTab.tsx eindampfen (D-05, Ursache 1+2)</name>
  <files>frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx, frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx</files>
  <behavior>
    - Test A (neu, roles.length === 0 -- der live gemessene userId=4-Fall): rendert genau eine
      kombinierte Textzeile, die sowohl "Keine globalen Rollen" als auch einen Hinweis auf
      "aus Keycloak synchronisiert" enthaelt; KEIN separates Element mit dem Text "Aktive Rollen"
      existiert mehr im Baum.
    - Test B/C (bestehend, roles.length > 0): bleiben unveraendert gruen -- "Plattform-Admin"-Badge,
      kein "Was darf diese Rolle?"-Link/Button, "aus IdP"-Badge pro Zeile weiterhin vorhanden.
  </behavior>
  <action>
  In `UserGlobalRolesTab.tsx`: das `<SectionHeader title="Aktive Rollen" description="..." />`-Element
  komplett aus dem Rueckgabewert von `UserGlobalRolesTab` entfernen (der `<div style={{ padding:
  'var(--space-4)' }}>`-Wrapper bleibt bestehen, enthaelt danach nur noch `<RolesTable roles={data.roles} />`).

  In `RolesTable`:
  - `roles.length === 0`-Zweig: `EmptyState` auf `variant="inline"` umstellen und die `description`
    so anpassen, dass die IdP-Herkunft/Nur-Lesbarkeit-Information in der EINEN Zeile erhalten bleibt
    (kein Informationsverlust per D-13/Auftrag): `title="Keine globalen Rollen"`,
    `description="Aus Keycloak synchronisiert, hier nur lesbar."` (korrekte Umlaute, kein ASCII-Ersatz).
  - `roles.length > 0`-Zweig: direkt vor dem bestehenden `<Table>` eine einzelne kompakte Zeile
    einfuegen, die die IdP-Herkunft weiterhin sichtbar macht, aber nicht mehr als eigener
    SectionHeader-Block: ein natives `<p>` mit kurzem sichtbaren Text und dem vollstaendigen
    urspruenglichen Satz als natives `title`-Attribut (siehe Auftrag: "kurzer Hilfetext oder natives
    title-Attribut" -- keine neue Tooltip-Komponente erfinden, im Design-System existiert keine):

    ```tsx
    <p
      style={{ margin: '0 0 var(--space-2)', color: 'var(--text-soft)', fontSize: '0.85rem' }}
      title="Diese Rollen werden automatisch aus dem Identity Provider (Keycloak) synchronisiert und sind hier nur lesbar."
    >
      Aktive Rollen — automatisch aus Keycloak synchronisiert, nur lesbar.
    </p>
    ```

  Keine Aenderung an der Datenlade-Logik (`loadData`, `useEffect`, Loading-/Error-States) oder an der
  `Table`/`Badge`-Struktur innerhalb `RolesTable` fuer den nicht-leeren Fall.

  In `UserGlobalRolesTab.test.tsx`: die zwei bestehenden Tests ("global role never links",
  "renders read-only IdP-synced roles...") unveraendert lassen -- sie pruefen nur Text, das durch
  diese Aenderung unveraendert bleibt (`'Plattform-Admin'`, `/aus IdP/i`), keine SectionHeader-
  spezifischen Assertions. Einen NEUEN Test in derselben `describe('UserGlobalRolesTab')`-Gruppe
  hinzufuegen, der `getAdminUserGlobalRoles` mit `{ roles: [], assignable_roles: [] }` mockt und
  prueft: (a) `screen.getByText(/Keine globalen Rollen/)` existiert, (b) `screen.getByText(/aus
  Keycloak synchronisiert/i)` existiert (Information bleibt erhalten), (c)
  `screen.queryByText('Aktive Rollen')` ist `null` (der alte Ueberschriften-Block ist weg).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx --reporter=basic'</automated>
  </verify>
  <done>Kein `<SectionHeader title="Aktive Rollen" .../>` mehr in `UserGlobalRolesTab.tsx`; der leere Fall zeigt eine einzeilige `EmptyState variant="inline"` mit erhaltener IdP-Information; der nicht-leere Fall zeigt eine kompakte einzeilige Hinweiszeile mit vollstaendigem Kontext im `title`-Attribut; alle drei Tests (2 bestehende + 1 neuer) in `UserGlobalRolesTab.test.tsx` sind gruen.</done>
</task>

<task type="auto">
  <name>Task 3: Card-Chrome in GroupSection.tsx entfernen, verbleibende Leerzustaende kompaktieren, volle Suite verifizieren</name>
  <files>frontend/src/app/admin/users/tabs/GroupSection.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <action>
  In `GroupSection.tsx`: `Card` aus dem `@/components/ui`-Import entfernen (nach dieser Aenderung
  ungenutzt). Den `<Card variant="section" style={{ marginBottom: 'var(--space-4)' }}
  data-group-section>...</Card>`-Wrapper durch ein einfaches `<section>`-Element mit EXAKT denselben
  Attributen ersetzen (kein Rahmen/Hintergrund/Schatten/Card-Padding mehr; Struktur-Abstand zwischen
  den drei Kindern -- SectionHeader, GroupRolesSection, Accordion/EmptyState -- bewusst als eigenes
  `gap` nachgebildet, damit die vertikale Rhythmik erhalten bleibt):

  ```tsx
  <section
    style={{ marginBottom: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}
    data-group-section
  >
  ```

  Das `data-group-section`-Attribut MUSS erhalten bleiben (wird in `UserGroupRightsTab.test.tsx` per
  `.closest('[data-group-section]')` referenziert). Die innere `<EmptyState title="Keine Rechte in
  dieser Gruppe." description="" />` (Zweig `accordionItems.length === 0`) im selben Zug auf
  `variant="inline"` umstellen -- konsistent mit den beiden anderen in diesem Plan behandelten
  Leerzustaenden, gleicher Datei, kein zusaetzlicher Datei-Scope.

  In `UserGroupRightsTab.tsx`: die oberste `<EmptyState title="Keine Gruppenmitgliedschaften."
  description="" />` (Zweig `!data || data.memberships.length === 0`) auf `variant="inline"`
  umstellen. Den Titel-String EXAKT unveraendert lassen (`"Keine Gruppenmitgliedschaften."`), damit
  die bestehende Testassertion unveraendert gruen bleibt.

  In `UserGroupRightsTab.test.tsx`: keine Aenderung noetig, sofern der exakte String
  `'Keine Gruppenmitgliedschaften.'` erhalten bleibt (Test "zeigt bei null Gruppenmitgliedschaften
  den Top-Level-EmptyState" prueft nur diesen Text, keine Card-Struktur). Nach Aenderung dieser Datei
  UND von `GroupSection.tsx` die volle Datei trotzdem einmal ausfuehren (siehe `<verify>`), um
  sicherzustellen, dass `.closest('[data-group-section]')` in "rendert zwei unabhaengige
  Gruppensektionen..." weiterhin ein Element findet -- falls nicht, das `data-group-section`-Attribut
  auf dem neuen `<section>` korrigieren, NICHT den Test anpassen.

  Anschliessend die vollstaendige, im Auftrag vorgegebene Verifikation im Container (nicht auf dem
  Host) ausfuehren und mit dem VORHER bekannten roten Stand vergleichen: die 5 benannten Dateien
  (`FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`,
  `useGroupMembersTab.test.ts`, `UserContributionsTab.test.tsx`, `ResponsiveImage.config.test.ts`)
  bleiben rot und werden NICHT repariert; jeder andere neue Fehlschlag muss vor Abschluss dieses
  Tasks behoben werden (Markup-Erwartung im betroffenen Test anpassen, sofern die Information
  weiterhin vorhanden ist -- niemals eine Assertion einfach loeschen, um "gruen" zu erzwingen).

  Statische (nicht Live-Browser-) Ueberlauf-Bestaetigung: pruefen, dass weder die neue
  `.stateInline`-Regel noch das neue `<section style={{ display: 'grid', gap: ... }}>` eine
  `display: grid`-Ebene mit ungebremster impliziter Spaltenbreite einfuehrt -- `.stateInline` hat
  ueberhaupt kein `display: grid`; das neue `<section>` hat genau EINE implizite Spalte mit
  ausschliesslich block-Level-Kindern (SectionHeader/GroupRolesSection/Accordion), exakt dieselbe
  Kind-Form, die `.card` vorher schon hatte (und die durch den UAT-138-A-Fix bereits mit
  `grid-template-columns: minmax(0, 1fr)` auf `.card`/`.accordionRoot` abgesichert ist -- dieser Fix
  wird durch diesen Plan nicht beruehrt). In SUMMARY.md explizit festhalten, dass diese Pruefung
  per Quellcode-Lesen (nicht per Live-Browser-Lauf) erfolgte, analog zum Vorgehen in
  `260823-u1j-SUMMARY.md`.

  Abschliessend in SUMMARY.md die neue geschaetzte Hoehe bis zur ersten echten Rechtezeile
  dokumentieren (Subtraktionsmethode aus dem `<interfaces>`-Block dieses Plans, mit den tatsaechlich
  im Code vorgefundenen/verifizierten Werten statt der Planner-Vorwerte, falls diese abweichen),
  klar als "Engineering-Schaetzung, keine Live-Messung" kennzeichnen, ehrlich gegen den 400px-
  Richtwert vergleichen (auch wenn der Wert darueber liegt), und einen Live-UAT-Spotcheck bei
  1280x900 ueber `http://127.0.0.1:3300/admin/users/4?tab=roles-rights` als naechsten empfohlenen
  Schritt nennen.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'</automated>
  </verify>
  <done>Kein `<Card>`-Element mehr in `GroupSection.tsx` (Import entfernt); `data-group-section` bleibt auf dem Ersatz-`<section>` erhalten; alle drei benannten Leerzustaende nutzen `variant="inline"` mit unveraendertem Kerntext; `docker compose exec ... npx vitest run src/app/admin` zeigt ausschliesslich die 5 vorab bekannten roten Dateien als Fehlschlaege; SUMMARY.md enthaelt die als Schaetzung gekennzeichnete neue Hoehenangabe, die Quellcode-Bestaetigung des intakten UAT-138-A-Fixes, und die Empfehlung eines Live-UAT-Spotchecks.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | Reine Darstellungs-/Dichte-Aenderung an bereits platform-admin-gated Admin-UI-Komponenten (Layout/Markup/CSS); keine neue Eingabe-, Auth- oder Datenverarbeitungsflaeche. Rechtelogik, Resolver, Provenienz und Mutationswege (UADM-01) bleiben unangetastet. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick-wrz-01 | N/A | EmptyState.tsx `inline`-Variante, ui.module.css `.stateInline`, GroupSection.tsx `<section>` statt `<Card>` | accept | Reiner Layout-/Markup-Wechsel ohne neue Daten-, Auth- oder Trust-Boundary-Flaeche; Risiko ist reines Regressionsrisiko, abgedeckt durch die drei Task-Verify-Kommandos plus die volle `src/app/admin`-Suite in Task 3. |
| T-quick-wrz-02 | Information Disclosure | UserGlobalRolesTab.tsx kompakte IdP-Hinweiszeile / native `title`-Attribute | accept | Reine Text-Umformulierung bereits vorhandener, nicht-sensitiver Erklaertexte (IdP-Sync/Nur-Lesbarkeit); keine neuen Felder, keine neuen Berechtigungen offengelegt. |
| T-quick-wrz-SC | Tampering | npm/pip/cargo installs | n/a | Dieser Plan installiert keine neuen Packages; kein Package-Legitimacy-Gate erforderlich. |
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'` -- keine neuen Fehlschlaege gegenueber dem vorab dokumentierten Stand.
2. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx --reporter=basic'` -- alle 3 Tests gruen.
3. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'` -- ausschliesslich die 5 vorab bekannten roten Dateien als Fehlschlaege.
4. `grep -n "grid-template-columns: minmax(0, 1fr)" frontend/src/components/ui/ui.module.css` zeigt weiterhin genau die zwei bestehenden Treffer auf `.card` und `.accordionRoot` (UAT-138-A-Fix unangetastet).
5. Manueller/optionaler Spotcheck (empfohlen, nicht Teil dieser Session): `/admin/users/4?tab=roles-rights` bei 1280x900 ueber `http://127.0.0.1:3300` -- erste echte Rechtezeile deutlich oberhalb der Falz, kein horizontaler Seitenueberlauf bei 394px.
</verification>

<success_criteria>
- `EmptyState` bietet eine echte einzeilige, icon-lose, card-chrome-lose `inline`-Variante; die
  bestehenden Varianten und alle 79 anderen Nutzstellen bleiben unveraendert.
- "Keine globalen Rollen", "Keine Gruppenmitgliedschaften.", "Keine Rechte in dieser Gruppe." nutzen
  alle `variant="inline"`, mit vollstaendig erhaltener Information.
- Der separate "Aktive Rollen"-Ueberschrift+Erklaerabsatz-Block existiert nicht mehr; die
  IdP-Herkunft/Nur-Lesbarkeit-Information ist weiterhin auffindbar (kompakte Zeile + natives
  `title`-Attribut bzw. kombinierter EmptyState-Satz).
- `GroupSection.tsx` verwendet keine `<Card>`-Komponente mehr; `data-group-section` bleibt erhalten.
- Rechtelogik, Resolver-Daten, Provenienz, Aktionen, Flows und der kanonische
  Benutzer-in-Gruppe-Editor (UADM-01) sind unveraendert.
- Der UAT-138-A-394px-Fix (`grid-template-columns: minmax(0, 1fr)` auf `.card`/`.accordionRoot`)
  ist unveraendert; keine neue Markup-Struktur reproduziert dieselbe Ueberlauf-Falle (per
  Quellcode-Audit bestaetigt, nicht per Live-Browser-Lauf).
- Alle user-facing Strings verwenden korrekte Umlaute (kein ASCII-Ersatz).
- Kein production file ueberschreitet 450 Zeilen.
- `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'` zeigt ausschliesslich die 5 vorab bekannten roten Dateien als Fehlschlaege.
- SUMMARY.md dokumentiert die neue geschaetzte Hoehe (klar als Engineering-Schaetzung gekennzeichnet,
  ehrlich mit dem 400px-Richtwert verglichen) und empfiehlt einen Live-UAT-Spotcheck bei 1280x900
  ueber den SSH-Tunnel.
</success_criteria>

<output>
Create `.planning/quick/260823-wrz-informationsdichte-im-benutzer-rechte-ta/260823-wrz-SUMMARY.md` when done
</output>
