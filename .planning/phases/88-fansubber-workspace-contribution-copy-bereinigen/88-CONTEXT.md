# Phase 88: Fansubber-Workspace & Contribution-Copy bereinigen - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 88 bereinigt die member-nahen Fansubber-/Contributor-Flächen so, dass sie menschlich verständlich, claim-neutral, mobil/desktop-tauglich und näher am globalen Team4s-UI-System sind.

**In scope:**
- `/me/contributions`
- `/me/profile`
- `/me/releases/[versionId]/workspace`
- `Meine Gruppen` / `/manage/groups` / `/admin/my-groups`
- Member-Workspace-nahe Media-/Note-Edit/Delete-Schnitte, sofern sie ohne neue Domain-Seams und ohne Admin/Public-Ausweitung möglich sind.

**Out of scope:**
- Öffentliche Member-Seiten wie `/members/[slug]`.
- Öffentliche Anime-/Gruppen-Credit-Blöcke.
- Admin-Fansub-Review in `/admin/fansubs/[id]/edit`.
- Neue Claim-, Contribution-, Release- oder Media-Tabellen.
- Neue API-Verträge ohne ausdrückliche Contract-Mitführung.

</domain>

<decisions>
## Implementation Decisions

### Copy-Grenze
- **D-01:** Normale Besitzsprache bleibt dort erlaubt, wo sie natürlich ist: `Mein Profil`, `Meine Gruppen`. Bei Anime-/Release-nahen Credits wird nicht künstlich von `Claim`, `beanspruchen`, `Credit-Claim`, `Contribution` oder `mein Beitrag` gesprochen.
- **D-02:** User-Sprache soll einfach bleiben. Erlaubte Richtung: `Das bin ich`, `Das stimmt nicht`, `Ich war bei dieser Gruppe dabei`, `Hinweis senden`.
- **D-03:** Für Anime-/Release-Nähe bevorzugt die UI `Projekt` statt Anime-Credit- oder Beitragsbesitz. Zielcopy: `Ich war in diesem Projekt dabei`.
- **D-04:** Die UI darf nicht so tun, als wäre ein Hinweis sofort bewiesen. Geeignete Richtung: `Du sagst: Ich war in diesem Projekt dabei. Team4s lässt das prüfen.`
- **D-05:** Zu viel Prüf-/Review-/UAT-Sprache in Runtime-UI vermeiden. `Prüffall` ist als Hauptsprache zu bürokratisch und soll durch menschlichere Formulierungen ersetzt werden, wo es passt.

### Betroffene Flächen
- **D-06:** Phase 88 bleibt auf Member-Flächen beschränkt: `/me/contributions`, `/me/profile`, `/me/releases/[versionId]/workspace`, `Meine Gruppen`.
- **D-07:** Öffentliche Credits und Admin-Review-Copy werden bewusst nicht in Phase 88 umgesetzt. Sie werden als spätere Arbeit dokumentiert, damit diese Phase klein und prüfbar bleibt.

### UI und Responsiveness
- **D-08:** UI-Änderungen sollen vorhandene globale Primitives aus `frontend/src/components/ui` verwenden oder kleine bestehende Varianten erweitern, bevor lokale Sonder-Controls entstehen.
- **D-09:** Mobile/desktop Tauglichkeit ist Teil der Phase: keine horizontalen Ausreißer bei 375px, Aktionszeilen müssen umbrechen, Modals/Panel bleiben per Keyboard und Touch bedienbar.
- **D-10:** Lokale Copy-/Button-/Layout-Sonderfälle dürfen bereinigt werden, aber Phase 88 ist kein großer visueller Relaunch.

### UAT-Regeln
- **D-11:** UAT bleibt mittel und fokussiert, nicht aufgeblasen.
- **D-12:** Live-/Browser-UAT muss prüfen: mobile + desktop Layout, keine falsche Claim-/Credit-Sprache, Links führen zu richtigen Workspaces, Auth-Refresh-Fall funktioniert, Modal/Keyboard-Bedienung, leere Zustände und disabled states.
- **D-13:** Der Auth-Refresh-Fall ist Pflicht, weil Phase 88 protected Member-UI berührt: fehlender/abgelaufener Access Token plus gültige Refresh Session darf nicht als ausgeloggt behandelt werden.

### Backlog-Schnitt
- **D-14:** In Phase 88 umzusetzen:
  - Contribution-UI weiter auf globale `components/ui`-Primitives ziehen.
  - `/me/profile` Content-/Activity-Bereich entschlacken.
  - Member-Profil UI-Politur plus `params.id` Bug.
  - Contributor-owned Media/Note edit/delete nur soweit es Member-Workspace betrifft.
- **D-15:** Als deferred dokumentieren:
  - Public Kollaboration.
  - Öffentliche Credits-UI in Anime/Gruppen.
  - `admin/fansubs/[id]/edit` Split.
  - Phase-78 Medien-Review-Warnings.

### the agent's Discretion
- Konkrete deutsche Button-/Hilfstexte, solange D-01 bis D-05 eingehalten werden und die Texte nicht bürokratischer werden als nötig.
- Ob eine lokale UI-Bereinigung in einer Fläche über bestehende Komponenten oder eine kleine globale Primitive-Erweiterung erfolgt, solange `docs/frontend/ui-system.md` beachtet wird.
- Exakte Testaufteilung zwischen Komponenten-, Page- und UAT-nahen Tests.

### Folded Todos
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` - in scope als Contribution-UI/Global-UI-Primitives-Arbeit.
- `2026-05-28-profile-hub-content-activity-redesign.md` - in scope für `/me/profile` Content-/Activity-Entschlackung.
- `2026-06-03-member-profil-ui-und-params-bug.md` - in scope für Member-Profil-UI-Politur und `params.id`-Korrektur.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` - in scope nur, soweit es Member-Workspace-nahe Media-/Note-Bedienung betrifft.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Rules
- `AGENTS.md` - Team4s domain, auth, UI, validation, and output rules.
- `docs/engineering/implementation-contract.md` - search-first, reuse, no parallel seams.
- `docs/frontend/ui-system.md` - global UI primitives and token rules.
- `docs/agent-guidelines-ui.md` - UI implementation and semantic-control rules.
- `docs/frontend/auth-api-client.md` - protected browser UI must use token-free auth state and central API helpers.
- `docs/api/api-contracts.md` - contract alignment for endpoint/helper/DTO changes.
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release/media/claim/contribution ownership rules.

### Prior Phase Context
- `.planning/phases/85-me-contributions-ui-flow-cleanup/85-CONTEXT.md` - prior decisions for `/me/contributions`, Claim separation, modal a11y, and global UI cleanup.
- `.planning/phases/86-daten-getriebene-capability-registry/86-CONTEXT.md` - capability registry boundary and role/capability implications.
- `.planning/phases/87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui/87-CONTEXT.md` - queued capability UI/enforcement scope that Phase 88 must not duplicate.

### Member Surfaces
- `frontend/src/app/me/contributions/page.tsx` - contribution workspace composition, auth gate, filtering, modals.
- `frontend/src/components/contributions/ContributionInbox.tsx` - open contribution/member actions.
- `frontend/src/components/contributions/ContributionSummary.tsx` - summary/filter chip pattern.
- `frontend/src/components/contributions/MyContributionsSection.tsx` - confirmed/visible contribution display.
- `frontend/src/components/contributions/MyProposalsSection.tsx` - user-submitted proposal display.
- `frontend/src/components/contributions/ContributionCard.tsx` - repeated contribution item.
- `frontend/src/components/contributions/VisibilityDropdown.tsx` - visibility mutation UI.
- `frontend/src/components/contributions/ReportModal.tsx` - suggestion/member-input modal.
- `frontend/src/components/contributions/ProposalForm.tsx` - project participation proposal flow.
- `frontend/src/components/contributions/RejectReasonModal.tsx` - rejection/dispute flow.
- `frontend/src/components/contributions/contributions.module.css` - local contribution layout.

### Profile and Release Workspace
- `frontend/src/app/me/profile/page.tsx` - member profile hub, claim status, recent contribution/activity areas.
- `frontend/src/app/me/profile/components/MemberClaimSection.tsx` - identity claim flow; keep separate from Anime/Project participation.
- `frontend/src/app/me/profile/components/ClaimStatusCard.tsx` - claim/indexing status copy.
- `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` - profile activity/credit display.
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` - member release workspace reached from `Meine Gruppen`.

### Meine Gruppen
- `frontend/src/app/admin/my-groups/page.tsx` - member-visible group list also re-exported by `/manage/groups`.
- `frontend/src/app/admin/my-groups/[id]/page.tsx` - member-visible group detail and release workspace links.
- `frontend/src/app/manage/groups/page.tsx` - route alias for the group list.

### Global UI and API Seams
- `frontend/src/components/ui` - global Button/Card/Badge/Table/Modal/Drawer/Form primitives.
- `frontend/src/lib/api.ts` - central API helpers; no ad hoc protected `fetch` in touched member UI.
- `frontend/src/types/contributions.ts` - contribution/member proposal DTOs.
- `frontend/src/types/profile.ts` - member profile and claim DTOs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageHeader`, `SectionHeader`, `Card`, `Button`, `Badge`, `Table`, `Toolbar`, `Modal`, `Drawer`, `FormField`, `Input`, `Select`, `Textarea`, `YearPicker` in `frontend/src/components/ui` are the first-choice primitives for touched UI.
- `useAuthSession()` and `frontend/src/lib/api.ts` are the protected browser boundary. Touched pages must gate on `hasAccessToken || hasRefreshToken`.
- The Phase-85 contribution components already started moving toward global UI and neutral wording; Phase 88 should extend rather than redo that work.

### Established Patterns
- Frontend API calls should stay in `frontend/src/lib/api.ts`.
- Route-local styling uses CSS modules, but generic controls should come from global UI primitives.
- German user-facing strings must use correct umlauts.
- Member claim identity and Anime/Project participation are separate flows.

### Integration Points
- AppShell currently links signed-in members to `/me/contributions` as `Beitragsprüfung`; Phase 88 may adjust this label if the new copy direction makes it too bureaucratic.
- `/me/releases/[versionId]/workspace` still contains links/copy pointing back to `Meine Beiträge`; this is a likely Phase-88 copy target.
- `/me/profile` still has Claim/member-profile copy and recent contributions/activity areas that may read too internal or too credit-claim-heavy.

</code_context>

<specifics>
## Specific Ideas

- Prefer copy like `Ich war in diesem Projekt dabei`, `Das bin ich`, `Das stimmt nicht`, `Hinweis senden`.
- Avoid normal UI copy like `Claim`, `beanspruchen`, `Credit-Claim`, `Contribution`, and broad `mein Beitrag` when the context is Anime-/Release-nah.
- Keep `Mein Profil` and `Meine Gruppen`; those are normal navigation labels and not the problem.
- Keep UAT to 6 focused checks from D-12 instead of many claim-rule permutations.

</specifics>

<deferred>
## Deferred Ideas

- `2026-06-07-kollaboration-public-handling-neu-loesen.md` - public collaboration handling belongs to a public surface phase.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` - public Anime/group Credits-UI remains outside the member-only Phase 88 scope.
- `2026-06-06-fansub-edit-page-split-450-limit.md` - admin fansub workspace split belongs to an admin workspace/refactor phase.
- `2026-06-06-phase78-media-review-code-review-warnings.md` - Phase-78 media review warnings belong to the admin fansub review/media phase.

</deferred>

---

*Phase: 88-fansubber-workspace-contribution-copy-bereinigen*
*Context gathered: 2026-06-18*
