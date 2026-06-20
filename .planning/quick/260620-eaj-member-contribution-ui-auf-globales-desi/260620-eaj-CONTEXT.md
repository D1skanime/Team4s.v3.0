# Quick Task 260620-eaj: Member-Contribution-UI auf globales Design-System + Copy verschlanken - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Task Boundary

Die member-facing Contribution-UI unter `/me/contributions` und ihre Komponenten auf das globale Design-System (`@/components/ui`) umstellen und die übermäßige, erklärende „Hinweis/Prüf/Claim"-Copy drastisch verschlanken. Ziel: ruhiges, intuitives UX statt Text-Overload und Eigenbau-Markup. Keine funktionalen Flows entfernen — nur Markup → Primitives und Copy kürzen.
</domain>

<decisions>
## Implementation Decisions

### Scope (Flächen)
- **Nur `/me/contributions` + dessen Contribution-Komponenten.** /me/profile und /me/releases/[versionId]/workspace sind NICHT in Scope dieses Quick-Tasks.
- Dateien: `frontend/src/app/me/contributions/page.tsx` und `frontend/src/components/contributions/*` (ContributionInbox, ContributionCard, ContributionSummary, MyContributionsSection, MyProposalsSection, ProposalForm, ReportModal, ReportFormFehler, ReportFormStory, VisibilityDropdown, RejectReasonModal, reportTargets).

### Copy-Härte
- **Aggressiv kürzen.** Erklärende Sätze raus; nur knappe Überschriften, Labels und Button-Texte behalten. Beispiele für Kandidaten zum Streichen/Kürzen:
  - „Sende Hinweise zu Projekten und Gruppen, bei denen du dabei warst. Team4s lässt sie prüfen, bevor daraus ein bestätigter Eintrag wird."
  - „Diese Punkte brauchen deine Aufmerksamkeit – bestätige Zuordnungen, kläre Widersprüche oder entscheide über die Sichtbarkeit."
  - „Soll diese bestätigte Mitwirkung öffentlich im Profil erscheinen?"
  - „Team4s lädt offene und bestätigte Projektdaten." (Loading-Description)
- Juristisch/Prüf-lastiger Ton vermeiden. Funktionale Klarheit erhalten (Buttons bleiben verständlich), aber ohne erklärende Absätze.

### Primitives-Tiefe
- **Volle Migration jetzt.** Alle Contribution-Komponenten vollständig auf `@/components/ui`-Primitives umbauen (Card, Button, Badge, FormField, Input, Textarea, Select, Modal, Tabs, SectionHeader, EmptyState, LoadingState, ErrorState, PageHeader …). Handgebautes Markup für Primitiv-Typen, die `@/components/ui` anbietet, ersetzen. Reine Layout-Container (div mit Fl/Grid) sind ok, wenn kein passender Primitive existiert.

### Claude's Discretion
- Konkrete Ersatz-Copy (Wortlaut der gekürzten Labels) — im Sinne „knapp, neutral, korrekte Umlaute".
- Welche Layout-divs bleiben dürfen vs. durch Card/Stack-Primitive ersetzt werden.
</decisions>

<specifics>
## Specific Ideas

- CLAUDE.md macht `@/components/ui`-Primitives zur Pflicht; native `<select>/<input>/<textarea>/<button>` bzw. Eigen-Markup für vorhandene Primitiv-Typen sind verboten. Referenz/Showcase: Route `/dev/ui-system`.
- Deutsche UI-Strings mit korrekten Umlauten (ä/ö/ü/ß), keine ASCII-Ersetzungen.
- Produktionsdateien ≤ 450 Zeilen — bei Bedarf splitten.
- Bestehende Tests (ContributionCard.test, ContributionInbox.test, ProposalForm.test, ReportModal.test, reportTargets.test) müssen grün bleiben bzw. an Copy-/Markup-Änderungen angepasst werden.
</specifics>

<canonical_refs>
## Canonical References

- `frontend/src/components/ui/` — Primitive-Definitionen
- Route `/dev/ui-system` — Showcase der Primitives
- CLAUDE.md Abschnitte „Sprachqualität" und „Frontend-UI (globales Design-System)"
</canonical_refs>
