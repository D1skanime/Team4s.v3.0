# Phase 157: Projekt-Memberseite visuell auf Referenzdesign umbauen — Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 15 (11 frontend components + 4 CSS/hook/type/backend files touched across A–I; some files serve 2 workstreams)
**Analogs found:** 15 / 15 (all files being modified are their own best analog — this is a redesign-in-place phase, not a new-component-from-scratch phase, except Workstream E which is genuinely new)

**Scope note:** Almost every file in this phase already exists and is being edited in place, not created from a foreign analog. So for most rows the "closest analog" IS the current file itself — the pattern to copy is "keep the existing data-fetch/props contract, replace only the JSX/CSS inside it." The one genuinely new file (E, `ProjectMemberNoteEntry`) needs an external analog, found below.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` | component | request-response (props-driven, no own fetch) | itself (in-place restructure) + `frontend/src/components/profile/MemberProfileHero.tsx` for actions-row layout | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx` | component | transform (counts → display) | itself + `frontend/src/components/ui/HeroMetrics.tsx` (label/value dl pattern) + `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` (single-card stat bar composition) | role-match |
| `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx` | component | event-driven (scroll/click → active state) | itself (existing scroll mechanic) + `frontend/src/components/ui/Tabs.tsx` (active-state styling convention, NOT to be swapped in wholesale — see note) | role-match |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx` | component | CRUD-read / cursor-pagination | itself (`useProjectMemberCollection` wiring unchanged) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` (**deleted**, replaced) | component (adapter) | transform | `frontend/src/components/public/PublicNoteCard.tsx` (props interface reference only — do not modify) | n/a (being removed) |
| **`ProjectMemberNoteEntry.tsx`** (new file, Workstream E) | component | transform (list-item render) | `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx` (compact list-row-with-Link pattern) + `PublicNoteCard.tsx` (clamp/toggle logic to port, not import) | role-match (compose from two analogs) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx` | component | CRUD-read / cursor-pagination | itself (fetch/viewer wiring unchanged) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberMediaCard.tsx` | component | transform | itself (header-icon addition only) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx` | component | CRUD-read / cursor-pagination | itself + `frontend/src/components/ui/EmptyState.tsx` (for the 0-releases branch) | exact (self) + role-match (EmptyState) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css` | style | n/a | itself (trim to page-shell-only rules: page/container/breadcrumb/section headings/pager) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css` | style | n/a | itself (extend with timeline rules or split into new `ProjectMemberNoteEntry.module.css`) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css` | style | n/a | itself (drop "Alle N angezeigt" styling reliance, header-icon spacing) | exact (self) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css` | style | n/a | itself + `frontend/src/components/ui/ui.module.css` `.stateCard`/`.stateIcon`/`.stateCompact` (EmptyState styling reference) | role-match |
| `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` | hook | event-driven / cursor-pagination | itself — **must not be re-implemented**, only consumed for the pager label copy | exact (self, read-only) |
| `frontend/src/types/projectMember.ts` | model (DTO types) | transform | itself (add `episodes: number` to `ProjectMemberCounts`) | exact (self) |
| `backend/internal/repository/project_member_public_repository.go` | repository | CRUD (read, aggregate/count) | itself (`countNotes`/`countMedia` as the literal template for the new `countEpisodes`) | exact (self) |
| `backend/internal/repository/project_member_visibility.go` | repository (shared predicates) | n/a (constants only) | itself — reuse `projectMemberPublicNotePredicate`, `projectMemberPublicMediaPredicate`, `projectMemberUserIDsCTE` verbatim, no new predicate | exact (self) |
| `backend/internal/handlers/project_member_public_handler.go` | handler (route) | request-response | itself (no code change expected — `Counts` struct is JSON-marshaled directly, see below) | exact (self) |
| `shared/contracts/openapi.yaml` (`ProjectMemberCounts` schema) | config (API contract) | n/a | itself (add `episodes` property + required entry) | exact (self) |
| `frontend/scripts/shot-projectmember.mjs` | utility (live-UAT script) | file-I/O (screenshot capture) | itself (extend `facts` evaluate() block with before/after metric diffs) | exact (self) |
| Frontend tests: `ProjectMemberNotesSection.test.tsx`, `ProjectMemberReleasesSection.test.tsx`, `ProjectMemberMediaGallery.test.tsx`, `page.test.tsx` | test | request-response (RTL render + mocked API) | themselves (adjust assertions/selectors for new markup, keep vi.mock/fixture style) | exact (self) |
| Backend test: `project_member_public_repository_test.go` (`TestProjectMemberRepo_CountsReusePredicates`) | test | n/a | itself for predicate-reuse assertion, **but see Teststil warning below** — do not extend this file's source-substring style for new logic | exact (self) — **style flagged, do not imitate for new assertions** |
| Backend test: `project_member_public_handler_test.go` (`recordingProjectMemberLoader` + httptest tests) | test | request-response | itself (`TestProjectMemberOwnerPreviewResolvesRelationBeforeDetail` etc.) — this is the COMPLIANT half of the file; extend `recordingProjectMemberLoader.GetSummary` to return `Episodes` and assert via `recorder.Body`/JSON decode | exact (self), compliant style |

---

## Pattern Assignments

### A — `ProjectMemberHero.tsx` (component, request-response)

**Analog:** itself, plus `frontend/src/components/profile/MemberProfileHero.tsx` for the actions-row idiom.

**Current structure to preserve** (`frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx:38-87`): avatar span → `heroBody` div → name row (`h1` + verified chip) → context line → role chips → `heroActions` div with two `Button`s. Only the internal flex layout changes (avatar goes to a horizontal flex row instead of stacked-implicit via CSS `flex-direction: column` default already present, name/metadata to the right), and the "Zurück zum Projekt" button variant changes from `ghost` to `secondary` per CONTEXT.md Workstream A:

```tsx
// Current (frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx:76-83)
<div className={styles.heroActions}>
  <Button href={`/members/${memberSlug}`} variant="secondary" size="sm">
    Vollständiges Memberprofil
  </Button>
  <Button href={projectPath} variant="ghost" size="sm">
    Zurück zum Projekt
  </Button>
</div>
```
Target per CONTEXT.md: primary dark button with a people icon left, secondary button right, both in one row (`heroActions` already a flex row in CSS — reuse it, just change the second `Button`'s `variant` and add a `leftIcon`).

**Icon-in-button pattern to copy** (`frontend/src/components/profile/MemberProfileHero.tsx:214-222`):
```tsx
<Button
  className={styles.heroActionButton}
  href={publicProfileHref}
  variant="secondary"
  leftIcon={<Eye size={16} />}
>
  Öffentliches Profil ansehen
</Button>
```
Use the same `leftIcon={<Users size={16} />}` idiom on the "Vollständiges Memberprofil" button (lucide-react `Users` already imported project-wide, see Shared Patterns).

**CSS to adapt** (`ProjectMemberPage.module.css:44-114`): `.hero` is already `display:flex; gap:20px; align-items:flex-start` (avatar left, body right) — this already matches the reference layout structurally; the redesign work here is primarily avatar sizing/visual polish and turning `.heroActions` buttons into an explicit row (already `display:flex; gap:10px`), NOT a layout rewrite. Confirm no `flex-direction:column` default is being fought — none exists at desktop; only the `@media (max-width:640px) { .hero { flex-direction:column } }` stacks it, which matches the "stack on narrow screens" requirement already.

**Do not touch:** `useRoleCatalog`, `presentationForRole`, `getMemberInitials` — role-chip color/order logic is data-correct and out of scope.

---

### B — `ProjectMemberSummary.tsx` (component, transform)

**Analog 1 (structure to replace):** itself — current 4-separate-card grid (`ProjectMemberSummary.tsx:12-24` + `ProjectMemberPage.module.css:117-140`).

**Analog 2 (single-card multi-metric idiom):** `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx:71-101` — wraps `HeroMetrics` in one container div; shows the "compose one card housing several stat entries" idiom already used elsewhere in the codebase:
```tsx
<div className={styles.projectStats}>
  <HeroMetrics ariaLabel="Projektkennzahlen" items={[...]} />
</div>
```
**Analog 3 (label/value primitive, NOT a full match):** `frontend/src/components/ui/HeroMetrics.tsx` — a `<dl>` of `{label, value}` pairs, styled via `frontend/src/components/ui/ui.module.css:241-275` (`.heroMetrics`/`.heroMetricItem`). **Gap:** `HeroMetrics` has no icon-chip slot and no vertical divider between items — the reference design needs both (round icon chip + number + label, separated by thin vertical rules). Since CONTEXT.md already mandates new CSS in **its own module** (not `ProjectMemberPage.module.css`), the pragmatic path is: keep the semantic `<dl>` idiom from `HeroMetrics` (accessible label/value pairing) but hand-roll the markup directly in `ProjectMemberSummary.tsx` with a new `ProjectMemberSummary.module.css` (icon chip + divider), rather than trying to force icons into the shared primitive (out of scope for this phase; `HeroMetrics` is used in 6 other places and mutating it is a global-component change the phase should avoid per CLAUDE.md's UI-primitive rule — the rule mandates *using* `@/components/ui` primitives for standalone controls, not that every bespoke stat strip must literally be `HeroMetrics` when its shape doesn't fit).

**Order/label/pluralization rewrite** (`ProjectMemberSummary.tsx:5-10`):
```tsx
const SUMMARY_CARDS: { key: keyof ProjectMemberCounts; label: string }[] = [
  { key: 'roles', label: 'Rollen' },
  { key: 'releases', label: 'Releases' },
  { key: 'notes', label: 'Textbeiträge' },
  { key: 'media', label: 'Bilder & Medien' },
]
```
must become order `roles, notes, media, releases` with singular/plural functions, e.g. following the existing pluralization idiom already used for pager copy (see Workstream F) — no dedicated pluralize helper exists yet in this folder, so a small local function following the same inline-ternary style as `formatDate` in `ProjectMemberNoteCard.tsx:4-10` is appropriate (self-contained, no new util module needed for one phase-local rule).

**Icons:** `lucide-react` is already a project dependency (imported 100+ times across `frontend/src`); no icons for roles/notes/media/releases are pre-imported in this folder, so pick fresh: e.g. `Users`, `FileText`, `Image`, `Package` (all exist in lucide-react's icon set; `FileText`, `Image`, `Users` are already used elsewhere in the codebase, confirming availability/naming).

---

### C — `ProjectMemberStickyNav.tsx` (component, event-driven)

**Analog:** itself — `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx:14-40`. The existing `scrollToSection` + `prefers-reduced-motion` check (lines 15-22) **must be kept verbatim**; only add active-state tracking.

**Active-state visual reference (do not copy Tabs.tsx wholesale — port only the styling idea):** `frontend/src/components/ui/Tabs.tsx:70` uses `classNames(styles.tabButton, item.id === active.id && styles.tabButtonActive)` — mirror this conditional-class idiom in `ProjectMemberStickyNav` for `stickyNavItem`/`stickyNavItemActive`, driven by local `IntersectionObserver` state rather than `Tabs`' internal click-only state (CONTEXT.md requires scrollspy via `IntersectionObserver` with last-clicked as fallback — `Tabs` component itself has no IntersectionObserver support and is a fully separate tab-panel-swapping primitive, not reusable here; only its *class-toggling convention* is the transferable pattern).

**CSS active-state reference:** `frontend/src/components/ui/ui.module.css:1258` `.tabButtonActive` shows the filled/tinted-vs-outlined convention to replicate using existing tokens (`--accent-primary`-tinted background, visible border) inside a new rule in `ProjectMemberPage.module.css` (or split into its own module since `.stickyNav*` rules already live there at lines 143-177 — extending in place is acceptable per the 450-line ceiling, current file is 271 lines).

**No horizontal clipping on 390px:** current CSS `stickyNav { overflow-x:auto }` (`ProjectMemberPage.module.css:150`) is exactly the clipping culprit named in the audit — replace with `flex-wrap: wrap` (or a `grid` fallback) at narrow widths; no existing analog for this specific fix elsewhere in the fansub component tree, this is a local CSS-only change.

---

### D — Beitragszusammenfassung + `episodes` count (component + backend, transform / CRUD)

**Backend — repository analog (copy this shape exactly):** `backend/internal/repository/project_member_public_repository.go:189-221` (`countNotes`, `countMedia`):
```go
func (r *ProjectMemberPublicRepository) countNotes(ctx context.Context, animeID, groupID, memberID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_notes rvn
		JOIN release_versions rv ON rv.id = rvn.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rvn.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
		  AND `+projectMemberPublicNotePredicate+`
	`, memberID, animeID, groupID).Scan(&n)
	return n, err
}

func (r *ProjectMemberPublicRepository) countMedia(ctx context.Context, animeID, groupID, memberID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		WITH `+projectMemberUserIDsCTE+`
		SELECT COUNT(*)
		FROM release_version_media rvm
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE rvm.uploaded_by_user_id IN (SELECT uid FROM member_users)
		  AND e.anime_id = $2 AND rvm.fansub_group_id = $3
		  AND `+projectMemberPublicMediaPredicate+`
	`, memberID, animeID, groupID).Scan(&n)
	return n, err
}
```
CONTEXT.md's spec is: `episodes` = COUNT(DISTINCT episode) across the UNION of (episodes with ≥1 public note) and (episodes with ≥1 public media). The bundled-query requirement means this must NOT be a third separate `countReleases`-style round trip; it should be one additional `QueryRow` (or folded into `GetSummary`'s existing sequential calls at `project_member_public_repository.go:177-185`) built as:
```sql
SELECT COUNT(DISTINCT episode_id) FROM (
  SELECT e.id AS episode_id
  FROM release_version_notes rvn
  JOIN release_versions rv ON rv.id = rvn.release_version_id
  JOIN fansub_releases fr ON fr.id = rv.release_id
  JOIN episodes e ON e.id = fr.episode_id
  JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
  WHERE rvn.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
    AND <projectMemberPublicNotePredicate>
  UNION
  SELECT e.id AS episode_id
  WITH member_users AS (...)   -- projectMemberUserIDsCTE must be hoisted to a leading WITH, not inline in a UNION branch
  FROM release_version_media rvm ...
) episodes
```
Note the SQL wiring nuance: `projectMemberUserIDsCTE` is a `WITH` clause and can only appear once, before the outer `SELECT`, not inside a `UNION` sub-select — the new query must hoist it above both branches, unlike `countMedia`'s standalone usage. This is the one place where copying the analog verbatim needs a structural adjustment, not literal copy-paste.

**Where to insert the call:** `project_member_public_repository.go:177-185` sequential count block:
```go
if s.Counts.Notes, err = r.countNotes(ctx, animeID, groupID, memberID); err != nil {
	return nil, err
}
if s.Counts.Media, err = r.countMedia(ctx, animeID, groupID, memberID); err != nil {
	return nil, err
}
if s.Counts.Releases, err = r.countReleases(ctx, animeID, groupID, memberID); err != nil {
	return nil, err
}
```
Add a fourth `if s.Counts.Episodes, err = r.countEpisodes(...); err != nil { return nil, err }` in the same style.

**DTO/contract parity (3 files, all additive, same field name/order):**
1. Go struct `backend/internal/repository/project_member_public_repository.go:25-30`:
   ```go
   type ProjectMemberCounts struct {
   	Roles    int `json:"roles"`
   	Notes    int `json:"notes"`
   	Media    int `json:"media"`
   	Releases int `json:"releases"`
   }
   ```
   add `Episodes int \`json:"episodes"\`` — the handler (`project_member_public_handler.go:97-111`, `GetSummary`) needs **no code change**, since it does `c.JSON(http.StatusOK, summary)` directly on the repository struct (no separate DTO-mapping layer exists for counts, unlike media which does map through `projectMemberMediaResponse`).
2. `shared/contracts/openapi.yaml:15368-15376`:
   ```yaml
   ProjectMemberCounts:
     type: object
     description: Summary-Kennzahlen der Projekt-Member-Seite (nur oeffentlich sichtbare Inhalte, Phase 122)
     required: [roles, notes, media, releases]
     properties:
       roles: {type: integer, format: int32}
       notes: {type: integer, format: int32}
       media: {type: integer, format: int32}
       releases: {type: integer, format: int32}
   ```
   add `episodes: {type: integer, format: int32}` and add `episodes` to `required`.
3. `frontend/src/types/projectMember.ts:4-9`:
   ```ts
   export interface ProjectMemberCounts {
     roles: number
     notes: number
     media: number
     releases: number
   }
   ```
   add `episodes: number`.

**Frontend summary-band component:** genuinely new (no dedicated component exists for it today) — closest structural analog is the existing `sectionIntro` paragraph idiom (`ProjectMemberNotesSection.tsx:56-58`, `pageStyles.sectionIntro`) combined with a tinted-band container: no existing "tinted rounded band with small icon + composed sentence" component exists in this folder, so this is new UI built from scratch using only global tokens (`--surface-sunken`/accent-tinted background per CLAUDE.md's token constraint) — put it directly in `ProjectMemberPage.tsx` between `ProjectMemberStickyNav` and the sections, or as a tiny new component if it exceeds a few lines (keep the 450-line ceiling in mind, though this component will be short).

**Text assembly rule (from CONTEXT.md):** role names joined with `, ` from `summary.role_labels`; episode clause omitted entirely if `episodes === 0` (not "0 Folgen"). No existing helper conditionally omits a clause like this in the codebase's projectMember folder — build inline, following the terse-ternary style already used in `ProjectMemberNoteCard.tsx:22` (`const versionSuffix = note.release_version_label ? \` · ${note.release_version_label}\` : ''`).

---

### E — Notiz-Timeline / `ProjectMemberNoteEntry` (component, transform) — Kern der Phase

**Hard constraint:** `frontend/src/components/public/PublicNoteCard.tsx` must not be modified. Its props interface (`PublicNoteCardProps`, lines 23-48) is the DATA reference only — the new component must accept the same underlying `ProjectMemberNote` fields but render its own markup.

**Structural analog for "compact linked row" (Link wraps content, no card padding-heavy chrome):** `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx:39-61` — shows the established idiom of a list-row component that:
- takes `{ release, projectPath }`-shaped props (mirror as `{ note, projectPath, showRoleChip }`)
- computes `href` once: `` `${projectPath}/releases/${release.release_version_id}` ``
- formats date locally with a small inline function (`formatDate`, lines 11-18, identical inline date formatter already exists in `ProjectMemberNoteCard.tsx:4-10` — reuse this exact function, don't reinvent)
- renders a single flat row, not a padded "card"

**Clamp/toggle logic to port (NOT import — `PublicNoteCard` itself must stay untouched, but its algorithm is fair to copy):** `frontend/src/components/public/PublicNoteCard.tsx:74-79, 131-141`:
```tsx
const [expanded, setExpanded] = useState(false)
const hasRichBody = bodyHtml != null && bodyHtml.trim() !== ''
const plainText = bodyText && bodyText.trim() !== '' ? bodyText : stripHtml(bodyHtml ?? '')
const expandable = plainText.length > clampThreshold
const bodyClass = `${styles.body}${expandable && !expanded ? ` ${styles.bodyClamped}` : ''}`
...
{expandable ? (
  <button type="button" className={styles.toggle} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
    {expanded ? lessLabel : moreLabel}
  </button>
) : null}
```
Also copy `stripHtml` (`PublicNoteCard.tsx:50-52`) verbatim as a local helper (it's a 2-line pure function, no need to export/share it — duplicating a 2-line pure helper across two components in the same domain is consistent with this codebase's existing duplication tolerance, see CLAUDE.md "Observed Tradeoffs").

**Whole-row-as-link pattern:** neither analog does this exactly (`PublicNoteCard` uses a `footer` sub-link; `ProjectMemberReleaseCard` uses a trailing `rowLink`) — CONTEXT.md wants the *entire* entry to be the link target with a trailing chevron. Closest idiom for "whole block is a Link, chevron indicates navigability" in the codebase: check `frontend/src/components/ui/AdjacentNavigation.tsx` and `DisclosureIndicator.tsx` for a chevron-affordance primitive before hand-rolling one — `DisclosureIndicator` exists precisely for this "expand/next" chevron affordance and should be checked first (`@/components/ui` primitive-first rule applies to icon-affordance elements too, not just form controls).

**Role-chip conditional logic (Auftragspunkt 6):** only render a role chip in the meta line when `summary.role_labels.length > 1 AND note.role_label` is distinguishable from the aggregate set. No existing analog computes this exact "single vs multi role" branch in the note-rendering path; the closest sibling logic is the Hero's role-chip iteration (`ProjectMemberHero.tsx:32-37`, mapping `role_labels` through `useRoleCatalog`) — reuse `useRoleCatalog('anime_contribution')` + `presentationForRole` for color/order consistency if the chip is shown, mirroring `ProjectMemberHero.tsx:31,69` and `ProjectMemberReleaseCard.tsx:31,49` (`data-color-key={presentationForRole(roles, role.code).colorKey}`).

**Timeline visual (vertical line + dot):** no existing analog in this codebase (`ProjectMemberReleasesSection.module.css`'s `.list`/`.row` is a bordered-box list, not a dot-timeline). This is new CSS; use only global tokens (`--color-border` for the line, `--accent-primary`/`--role-accent` for the dot) per the "no new tokens" constraint. Put it in a new `ProjectMemberNoteEntry.module.css` (per CONTEXT.md's explicit instruction to use a fresh CSS module, not append to `ProjectMemberNotesSection.module.css`'s existing 30 lines or `ProjectMemberPage.module.css`'s 271).

**Section wiring change:** `ProjectMemberNotesSection.tsx:9,64` swaps the import/usage from `ProjectMemberNoteCard` to the new `ProjectMemberNoteEntry`, and `styles.notesGrid` (2-column grid, `ProjectMemberNotesSection.module.css:4-14`) must become a single-column timeline list — grid-column semantics don't fit a vertical timeline, so this CSS class's `grid-template-columns` rule is removed/replaced, not extended.

---

### F — Pager (component, transform, label-only change)

**Analog:** itself, in three near-identical pager blocks — `ProjectMemberNotesSection.tsx:68-84`, `ProjectMemberMediaGallery.tsx:83-99`, `ProjectMemberReleasesSection.tsx:68-84`. All three share the exact same JSX shape:
```tsx
<div className={pageStyles.pager}>
  <span className={pageStyles.pagerInfo}>
    {canShowMore ? `${shown.length} von ${count} angezeigt` : `Alle ${count} angezeigt`}
  </span>
  <div className={pageStyles.pagerButtons}>
    {canShowLess ? (
      <Button type="button" variant="ghost" size="sm" onClick={showLess}>Weniger anzeigen</Button>
    ) : null}
    {canShowMore ? (
      <Button type="button" variant="secondary" size="sm" onClick={showMore} disabled={loading}>
        Weitere Beiträge laden  {/* or "Weitere Bilder laden" / "Weitere laden" */}
      </Button>
    ) : null}
  </div>
</div>
```
Only the Notes section's pager button label changes per CONTEXT.md (F is scoped to Texte & Notizen: "Weitere {n} Beiträge anzeigen"). `n = Math.min(PAGE_LIMIT, count - shown.length)` computed from values already in scope (`PAGE_LIMIT = 10` at `ProjectMemberNotesSection.tsx:15`, `shown.length` and `count` already destructured/passed). Singular handling (`n === 1` → "Weiteren 1 Beitrag anzeigen") needs a tiny inline branch, same terse style as the `versionSuffix` ternary referenced in Workstream D.

**`useProjectMemberCollection.ts` is confirmed read-only for this workstream** — it already exposes everything needed (`shown.length`, `canShowMore`, `showMore`) without any hook change; CONTEXT.md's explicit "nicht anfassen" is corroborated by inspection: no internal state the label computation needs is hidden inside the hook.

**"Alle N angezeigt" removal for Media/Releases (G/H):** when `!canShowMore`, the `pagerInfo` span currently still renders `Alle ${count} angezeigt` unconditionally in all three sections. G and H want this string gone specifically in Media/Releases when there's nothing further to show — this is a one-line conditional change per section (`{canShowMore ? ... : null}` instead of the current always-render ternary), not a shared-component change since Notes keeps this text ("bleibt zulässig, wo er Information trägt" — CONTEXT.md).

---

### G — Medien (component, CRUD-read, mostly cosmetic)

**Analog:** itself — `ProjectMemberMediaGallery.tsx` header block (`:69-75`) gets an icon (`Image` from lucide-react, already imported elsewhere in the codebase confirming availability) prepended to the `h2`, following the same "icon + h2 + count span" idiom that should now match Notes/Releases sections identically (all three currently share `pageStyles.sectionHead`/`sectionTitle`/`sectionCount` classes — keep that shared class usage, only add an icon inside `sectionTitle` or as a sibling span).

**Untouched per CONTEXT.md:** `ProjectMemberMediaViewer.tsx` (lightbox), `useProjectMemberCollection` wiring, `ProjectMemberMediaCard.tsx`'s data logic (`CATEGORY_LABELS` mapping) — only the gallery's outer header/pager JSX and `ProjectMemberMediaGallery.module.css` grid-column counts may need adjustment for the "2 columns mobile, 2-3 desktop" requirement (currently `repeat(2,1fr)` → `repeat(3,1fr)` at 560px → `repeat(4,1fr)` at 900px, already close to spec; verify against reference rather than assume a rewrite is needed).

---

### H — Releases-Empty-State (component, transform)

**Primary analog — use this, don't hand-roll:** `frontend/src/components/ui/EmptyState.tsx:16-36`:
```tsx
export function EmptyState({ title, description, action, variant = 'default' }: EmptyStateProps) {
  ...
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
CONTEXT.md explicitly says "Prüfen, ob das vorhandene `EmptyState`-Primitive … passt — bevorzugt verwenden statt Eigenbau." It fits: `variant="compact"` + `title="Noch keine öffentlichen Release-Einträge."` gets close to spec. **Gap:** the reference wants a dashed border (`EmptyState`'s `.stateCard` uses a solid border per `ui.module.css:1071+`, need to check exact styling) and a package icon instead of the fixed `Inbox` icon (icon is hardcoded inside `EmptyState`, not a prop) — if the dashed border and custom icon are hard requirements, this may need either (a) a small CSS override via `className`-style escape hatch if `EmptyStateProps` supports one (it does not currently expose `className`), or (b) local `ReleasesEmptyState` styling that reuses only the box philosophy, not the literal component. Flag this as a decision point for the planner: prefer extending `EmptyStateProps` with an optional `icon`/`className` prop (small, additive, benefits future callers) over duplicating the whole empty-state box locally, consistent with the "closest-analog can't be overridden by local-file consistency" rule from CLAUDE.md — the global primitive should win.

**Trigger condition:** `counts.releases === 0` — already available as `props.summary.counts.releases` at the `ProjectMemberReleasesSection` call site (`ProjectMemberPage.tsx:87-93` passes `count={counts.releases}`); branch inside `ProjectMemberReleasesSection.tsx` on `count === 0` to render the empty state instead of the `<ul>` + pager.

---

### I — Responsive, Tests, Live-UAT

**Frontend test pattern (compliant, keep exactly this shape):** `ProjectMemberNotesSection.test.tsx`, `ProjectMemberMediaGallery.test.tsx`, `ProjectMemberReleasesSection.test.tsx` all follow:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getProjectMemberX = vi.fn()
vi.mock('@/lib/api', () => ({ getProjectMemberX: (...args) => getProjectMemberX(...args) }))
```
This is genuine RTL execution against real component code with a mocked network boundary — fully compliant with the project's Teststil rule (executes real code, checks rendered output/roles, not source-substring matching). **Keep this exact structure** when adapting assertions for the new markup (e.g. `screen.getAllByRole('article')` in the Notes test will need to change if the new timeline entries use a different semantic element/role — check what role `ProjectMemberNoteEntry` renders and update the selector, don't paper over it with `container.querySelector`).

**`page.test.tsx` pattern (compliant):** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` renders via `renderToStaticMarkup` and asserts on raw HTML substrings (`expect(html).toContain(...)`) — this is a legitimate, different-but-compliant pattern (it executes the real component tree via React's own renderer, it just asserts via string containment on the *output* of real execution, not by reading the `.tsx` source file — this is NOT the banned pattern, since the banned pattern is specifically reading a file's own source and grepping it without ever calling the code). Update the `counts` fixture (`page.test.tsx:43`, `counts: { roles: 2, notes: 5, media: 8, releases: 3 }`) to include `episodes` once the type changes, and add assertions for new hero/hero-button markup as needed.

**Backend test pattern — two different qualities in the same files, choose carefully:**
- `project_member_public_repository_test.go` (`TestProjectMemberRepo_CountsReusePredicates` etc., lines 20-117) is **entirely** the banned os.ReadFile+strings.Contains pattern. Per CLAUDE.md's Teststil section, this is explicitly named legacy ("Altlast … kein Vorbild zum Weiterkopieren") and the closest-analog rule is explicitly barred from justifying its reuse. **Do not add a new source-substring test for `countEpisodes`.** Since there's no live-Postgres harness for this repository (confirmed by the file's own header comment, lines 3-10), the pragmatic compliant options are: (a) skip a dedicated repository-level unit test and rely on the Live-UAT DB-verification already documented in CONTEXT.md (the "13 Folgen" reproduction math is itself the empirical proof), or (b) if a test is required, put the real assertion at the handler layer instead (see next bullet), where an httptest-executed fake CAN prove the JSON field flows through.
- `project_member_public_handler_test.go`'s `recordingProjectMemberLoader` + httptest tests (compliant half, lines 21-97, 113-175) are the right template: extend `recordingProjectMemberLoader.GetSummary` (currently `return &repository.ProjectMemberSummary{}, nil` at line 40) to return a `Counts.Episodes` value, then add a small new test using `projectMemberRequestContext()` (line 191) + `handler.GetSummary(c)` + `require.Contains(t, recorder.Body.String(), "\"episodes\":")` or a full `json.Unmarshal` into `repository.ProjectMemberSummary` and asserting the field — this genuinely executes `GetSummary` and inspects the real response body, matching the Teststil mandate exactly. Reference compliant example from elsewhere in the codebase for the fake-repo + httptest + JSON-body-assertion idiom in full: `backend/internal/handlers/admin_content_anime_theme_segment_origin_test.go:50-75` (`fakeSegmentOriginThemeRepo`, `httptest.NewRecorder()`, `recorder.Code`/`recorder.Body.String()` assertions).

**Live-UAT script:** `frontend/scripts/shot-projectmember.mjs` — keep the reverse-proxy-to-127.0.0.1:3300 mechanism (lines 25-46) and the two-viewport loop (lines 49-52, mobile 390×1200 / desktop 1440×1000) exactly as-is; extend the `page.evaluate()` fact-gathering block (lines 73-103) with new before/after metrics per CONTEXT.md's ask (e.g., presence-count of "Alle N angezeigt" strings in Media/Releases sections, presence of the "13 Folgen" summary band text, absence of per-note role headers). The script already outputs structured JSON per viewport (lines 105-111) — append fields to the same `facts` object rather than introducing a second output format.

---

## Shared Patterns

### Global UI primitives (mandatory, `@/components/ui`)
**Source:** `frontend/src/components/ui/index.ts` (barrel export of `Button`, `Card`, `EmptyState`, `Tabs`, `HeroMetrics`, `Badge`, `DisclosureIndicator`, etc.)
**Apply to:** every new/modified visual element in this phase. Concretely: `Button` for all interactive controls (already used throughout `projectMember/*`, e.g. `ProjectMemberHero.tsx:77-82`), `EmptyState` for Workstream H, check `DisclosureIndicator` before hand-building the Workstream E chevron affordance. No native `<button>`/`<select>`/`<input>` is acceptable per CLAUDE.md's Frontend-UI rule — the existing `ProjectMemberStickyNav.tsx:27` native `<button>` is grandfathered (predates the rule / is a bare unstyled nav trigger, not a styled control primitive) but any NEW interactive element must go through `Button`.

### Role-color presentation
**Source:** `frontend/src/lib/roleCatalog.ts` (`presentationForRole`, `boundedColorKey`) + `frontend/src/providers/RoleCatalogProvider.tsx` (`useRoleCatalog`)
**Apply to:** `ProjectMemberHero.tsx` role chips, `ProjectMemberReleaseCard.tsx` role tags, and the new optional role chip in `ProjectMemberNoteEntry.tsx` (Workstream E). Pattern:
```tsx
const { roles } = useRoleCatalog('anime_contribution')
const presented = roles.find((r) => r.code === value || r.label_de === value)
...
data-role-code={role.code}
data-color-key={presentationForRole(roles, role.code).colorKey}
```

### Section header shape (icon + title + count)
**Source:** `ProjectMemberPage.module.css:184-200` (`.sectionHead`/`.sectionTitle`/`.sectionCount`), used identically in `ProjectMemberNotesSection.tsx:50-55`, `ProjectMemberMediaGallery.tsx:70-75`, `ProjectMemberReleasesSection.tsx:49-54`.
**Apply to:** all three detail sections when adding header icons (Workstream D/G/H) — keep using the same three shared classes, just add an icon element as a sibling of `sectionTitle`'s text, so the three sections stay visually consistent without duplicating CSS.

### Cursor-pagination + weniger/mehr
**Source:** `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` (entire file — `shown`, `loading`, `error`, `canShowMore`, `canShowLess`, `showMore`, `showLess`)
**Apply to:** Notes/Media/Releases sections — **read-only reuse**, no modification, per explicit CONTEXT.md instruction for Workstream F.

### Inline date formatting
**Source:** duplicated identically in `ProjectMemberNoteCard.tsx:4-10` and `ProjectMemberReleaseCard.tsx:11-18`:
```tsx
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}
```
**Apply to:** `ProjectMemberNoteEntry.tsx` (Workstream E) — copy this exact function (third near-duplicate in the same folder is acceptable given the existing precedent; do not create a shared util for this phase).

### Backend visibility predicates (must reuse, never re-derive)
**Source:** `backend/internal/repository/project_member_visibility.go` (`projectMemberPublicNotePredicate`, `projectMemberPublicMediaPredicate`, `projectMemberUserIDsCTE`)
**Apply to:** the new `countEpisodes` query (Workstream D) — these constants are the single source of truth for "what counts as public"; the file's own header comment (lines 3-10) states this is deliberate so Summary counts never disagree with what the list endpoints actually return. Any deviation would reintroduce the exact bug class this file was created to prevent.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `ProjectMemberNoteEntry.tsx` (new) | component | transform | Genuinely new component; composed from two analogs (`ProjectMemberReleaseCard.tsx` row/Link shape + `PublicNoteCard.tsx` clamp/toggle algorithm) rather than one direct analog — see Workstream E above for the composition. |
| Beitragszusammenfassung band (new sub-tree, likely inline in `ProjectMemberPage.tsx` or a tiny new component) | component | transform | No existing "tinted band with icon + composed sentence" component exists anywhere in `frontend/src/components/fansubs/`; build from global tokens only, no analog to copy beyond the general "conditional clause omission" ternary style noted in Workstream D. |

---

## Metadata

**Analog search scope:** `frontend/src/components/fansubs/projectMember/`, `frontend/src/components/public/`, `frontend/src/components/ui/`, `frontend/src/components/profile/`, `frontend/src/app/anime/[id]/group/[groupId]/`, `backend/internal/repository/`, `backend/internal/handlers/`, `shared/contracts/openapi.yaml`, `frontend/scripts/`.
**Files read in full:** `ProjectMemberHero.tsx`, `ProjectMemberSummary.tsx`, `ProjectMemberStickyNav.tsx`, `ProjectMemberNotesSection.tsx`, `ProjectMemberNoteCard.tsx`, `ProjectMemberMediaGallery.tsx`, `ProjectMemberMediaCard.tsx`, `ProjectMemberReleasesSection.tsx`, `ProjectMemberReleaseCard.tsx`, `ProjectMemberPage.tsx`, `ProjectMemberPage.module.css`, `ProjectMemberNotesSection.module.css`, `ProjectMemberMediaGallery.module.css`, `ProjectMemberReleasesSection.module.css`, `useProjectMemberCollection.ts`, `frontend/src/types/projectMember.ts`, `PublicNoteCard.tsx`, `HeroMetrics.tsx`, `Tabs.tsx`, `EmptyState.tsx`, `Button.tsx`, `ProjectStats.tsx`, `MemberProfileHero.tsx`, `project_member_public_repository.go` (partial, lines 1-230), `project_member_visibility.go`, `project_member_public_handler.go`, relevant `openapi.yaml` schema block, `ProjectMemberNotesSection.test.tsx`, `ProjectMemberReleasesSection.test.tsx`, `ProjectMemberMediaGallery.test.tsx`, `page.test.tsx`, `project_member_public_handler_test.go` (partial), `project_member_public_repository_test.go` (partial), `shot-projectmember.mjs`, `admin_content_anime_theme_segment_origin_test.go` (partial, compliant-test-style reference).
**Pattern extraction date:** 2026-09-12
