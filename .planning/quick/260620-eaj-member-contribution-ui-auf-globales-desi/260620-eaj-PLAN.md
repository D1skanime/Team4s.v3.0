---
phase: quick-260620-eaj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/me/contributions/page.tsx
  - frontend/src/components/contributions/ContributionInbox.tsx
  - frontend/src/components/contributions/ContributionSummary.tsx
  - frontend/src/components/contributions/MyContributionsSection.tsx
  - frontend/src/components/contributions/MyProposalsSection.tsx
autonomous: true
requirements: [eaj-scope]

must_haves:
  truths:
    - "page.tsx PageHeader description enthält keinen erklärenden Absatz mehr (nur noch knapper Titel)"
    - "LoadingState description ist kürzer und erklärt nicht mehr den Team4s-Prüfprozess"
    - "ContributionInbox SectionHeader description ist entfernt oder auf max. 10 Wörter gekürzt"
    - "VisibilityPendingItem enthält keine erklärende <p> mehr (fragt nicht mehr nach ob öffentlich erscheinen)"
    - "MyContributionsSection SectionHeader description ist knapp"
    - "MyProposalsSection proposalIntro-div ist entfernt oder auf einen Satz reduziert"
    - "Alle in Task 1 geänderten Dateien haben korrekte Umlaute"
    - "npx tsc --noEmit läuft ohne Fehler"
    - "ContributionInbox.test + ContributionSummary.test + ContributionCard.test bleiben grün"
  artifacts:
    - path: frontend/src/app/me/contributions/page.tsx
      provides: Contributions page without verbose PageHeader description
    - path: frontend/src/components/contributions/ContributionInbox.tsx
      provides: ContributionInbox without explaining VisibilityPending paragraph
    - path: frontend/src/components/contributions/ContributionSummary.tsx
      provides: ContributionSummary with trimmed description
    - path: frontend/src/components/contributions/MyContributionsSection.tsx
      provides: MyContributionsSection with short description
    - path: frontend/src/components/contributions/MyProposalsSection.tsx
      provides: MyProposalsSection without proposalIntro block and self-publish verbose text
  key_links:
    - from: frontend/src/app/me/contributions/page.tsx
      to: frontend/src/components/contributions/ContributionInbox.tsx
      via: Component import
      pattern: "ContributionInbox"
---

<objective>
Copy-Verschlankung in page.tsx, ContributionInbox, ContributionSummary, MyContributionsSection und MyProposalsSection.

Purpose: Erklärende Absätze und Hinweissätze entfernen. Nur Titel, Labels und Aktionen behalten.
Output: 5 überarbeitete Dateien mit gekürzter Copy ohne funktionale Änderungen.
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260620-eaj-member-contribution-ui-auf-globales-desi/260620-eaj-CONTEXT.md

Entscheidungen:
- D-Copy: Erklärende Sätze raus, nur Labels/Aktionen behalten.
- D-Primitives: Volle Migration jetzt — alle Primitives aus @/components/ui nutzen. Handgebaute Buttons/Inputs/Selects/Textareas/Cards/Badges durch Primitives ersetzen. Layout-divs (Flex/Grid) dürfen bleiben wenn kein Primitive passt.
- D-Umlaut: Korrekte Umlaute ä/ö/ü/ß in allen user-facing Strings.
- D-Lines: Dateien ≤ 450 Zeilen.

Bestehende Tests dürfen angepasst werden, müssen aber grün bleiben.
Keine funktionalen Flows entfernen — nur Copy kürzen und Markup auf Primitives migrieren.
</context>

<tasks>

<task type="auto">
  <name>Task 1: page.tsx + ContributionInbox + ContributionSummary — Copy kürzen</name>
  <files>
    frontend/src/app/me/contributions/page.tsx
    frontend/src/components/contributions/ContributionInbox.tsx
    frontend/src/components/contributions/ContributionSummary.tsx
  </files>
  <action>
    **page.tsx:**
    - `LoadingState`: description von "Team4s lädt offene und bestätigte Projektdaten." auf null oder "" setzen (oder einen 3-Wort-Text wie "Wird geladen …"). Title "Projekt-Hinweise werden geladen" ist ok.
    - `PageHeader` description: langen Erklärungssatz "Sende Hinweise zu Projekten und Gruppen, bei denen du dabei warst. Team4s lässt sie prüfen, bevor daraus ein bestätigter Eintrag wird." entfernen (description-Prop weglassen oder leer setzen).
    - Button aria-label "Projekt-Hinweis senden öffnen" → "Hinweis senden" (kürzer, identisch mit sichtbarem Label).
    - Alle anderen Funktionen/Imports/State unberührt lassen.

    **ContributionInbox.tsx:**
    - `SectionHeader` description "Diese Punkte brauchen deine Aufmerksamkeit – bestätige Zuordnungen, kläre Widersprüche oder entscheide über die Sichtbarkeit." → entfernen (description-Prop weglassen).
    - `VisibilityPendingItem`: `<p className={styles.reviewNote}>` mit "Soll diese bestätigte Mitwirkung öffentlich im Profil erscheinen?" → entfernen. Die VisibilityDropdown bleibt an ihrer Stelle.
    - EmptyState description "Es gibt gerade nichts zu klären. Neue Zuordnungen oder Rückmeldungen erscheinen hier." → kürzen auf "Keine Aufgaben ausstehend." oder ähnlich knapp.

    **ContributionSummary.tsx:**
    - `SectionHeader` description "Tippe auf einen Wert, um die Listen darunter zu filtern. Erneutes Tippen hebt den Filter auf." → entfernen (description-Prop weglassen). Der Titel "Überblick & Filter" ist selbsterklärend genug.
    - Keine anderen Änderungen — `Button`, `Card`, `SectionHeader` sind bereits Primitives.
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | tail -5 && npx vitest run src/components/contributions/ContributionInbox.test.tsx src/components/contributions/ContributionSummary.test.tsx src/components/contributions/ContributionCard.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <done>
    page.tsx: PageHeader hat keine description mehr. LoadingState description ist leer/kurz.
    ContributionInbox: SectionHeader ohne description, VisibilityPendingItem ohne erklärenden Satz.
    ContributionSummary: SectionHeader ohne description.
    TSC fehlerfrei. Betroffene Tests grün.
  </done>
</task>

<task type="auto">
  <name>Task 2: MyContributionsSection + MyProposalsSection — Copy kürzen, verbose Text entfernen</name>
  <files>
    frontend/src/components/contributions/MyContributionsSection.tsx
    frontend/src/components/contributions/MyProposalsSection.tsx
  </files>
  <action>
    **MyContributionsSection.tsx:**
    - `SectionHeader` description "Von einer Gruppe bestätigte Rollen, die in deinem öffentlichen Profil erscheinen können." → entfernen (description-Prop weglassen).
    - EmptyState description "Hinweise erscheinen erst hier, nachdem eine Gruppe sie bestätigt hat." → kürzen auf "Noch keine bestätigten Rollen." (title nimmt den Rest).
    - Dateigröße ≤ 450 Zeilen (aktuell 50 — kein Split nötig).

    **MyProposalsSection.tsx:**
    - `SectionHeader` description "Hinweise, die an eine Fansubgruppe gesendet wurden." → entfernen (description-Prop weglassen). Titel "Eingereichte Hinweise (N)" ist klar genug.
    - `<div className={styles.proposalIntro}>` Block mit "Du sagst, wo du bei einem Projekt oder einer Gruppe dabei warst. Die zuständige Gruppe prüft den Hinweis und entscheidet, ob daraus ein bestätigter Eintrag wird." → komplett entfernen.
    - `<div className={styles.warningPanel}>` (canCreateProposal false) Text "Du brauchst zuerst eine verifizierte Mitgliedschaft in einer Fansubgruppe, bevor du Hinweise senden kannst. Prüfe dein Profil oder bitte deine Gruppe, deine Mitgliedschaft zu bestätigen." → kürzen auf "Verifizierte Gruppenmitgliedschaft erforderlich." (das div mit className styles.warningPanel bleibt als Layout-Container bestehen).
    - In `renderProposalCard`: `<span className={styles.metaText}>Dieser Hinweis wurde durch einen Gruppenleader bestätigt.</span>` (status=confirmed) → entfernen. Der StatusBadge "Bestätigt" reicht.
    - In `renderProposalCard` selfPublish-Bestätigungs-Span: "Dieser Eintrag wird als unverifizierter historischer Hinweis öffentlich sichtbar." → kürzen auf "Unverifizierter historischer Eintrag — wird öffentlich sichtbar."
    - Alle Buttons, Cards, Badges, SectionHeader, EmptyState, ErrorState Importe bleiben; Button-Label "Hinweis senden" und "Historisch öffentlich schalten" und "Jetzt öffentlich schalten" und "Abbrechen" bleiben unverändert.
    - Dateigröße ≤ 450 Zeilen (aktuell 205 — kein Split nötig).
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | tail -5 && npx vitest run src/components/contributions/ 2>&1 | tail -25</automated>
  </verify>
  <done>
    MyContributionsSection: SectionHeader ohne description, EmptyState mit kurzem Text.
    MyProposalsSection: proposalIntro-div entfernt, warningPanel gekürzt, confirmed-Metaspan entfernt.
    TSC fehlerfrei. Alle Contribution-Tests grün.
  </done>
</task>

</tasks>

<verification>
Nach beiden Tasks:
- npx tsc --noEmit läuft ohne Fehler
- npx vitest run src/components/contributions/ — alle Tests grün
- Keine neuen native &lt;select&gt;/&lt;input&gt;/&lt;textarea&gt;/&lt;button&gt; in den geänderten Dateien eingeführt
- Alle user-facing Strings haben korrekte Umlaute (ä/ö/ü/ß)
- Dateien ≤ 450 Zeilen
</verification>

<success_criteria>
- page.tsx: PageHeader ohne erklärenden Satz, LoadingState ohne Team4s-Prozess-Beschreibung
- ContributionInbox: kein "brauchen deine Aufmerksamkeit"-Text, kein "Soll diese bestätigte Mitwirkung öffentlich"-Text
- ContributionSummary: SectionHeader ohne Erklärungs-description
- MyContributionsSection: SectionHeader ohne description
- MyProposalsSection: kein proposalIntro-Block, warningPanel einzeilig, kein confirmed-Metaspan
- TSC fehlerfrei, alle Contribution-Tests grün
</success_criteria>

<output>
Create `.planning/quick/260620-eaj-member-contribution-ui-auf-globales-desi/260620-eaj-01-SUMMARY.md` when done
</output>
