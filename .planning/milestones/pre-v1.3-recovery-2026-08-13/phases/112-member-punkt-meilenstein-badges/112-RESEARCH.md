# Phase 112: Member-Punkt-Meilenstein-Badges - Research

**Researched:** 2026-07-27
**Domain:** Derived/live-projected member gamification badges (Next.js App Router SSR frontend + Go/Postgres backend), extending an existing extensible badge-section architecture
**Confidence:** HIGH (backend data model, existing code seams, D-20 test-data caveat all verified by direct code/CONTEXT reads) / MEDIUM (exact UI row-label composition for Typ 3, left as Open Question)

## Summary

Phase 112 adds two derived badge families to `MemberBadgeChain` (public member profile,
`/members/[slug]`): **Typ 2** (point milestones, purely a frontend derivation from
`profile.total_points`, which is already threaded end-to-end) and **Typ 3** (per-role volume
tiers Bronze/Silber/Gold/Platin, which requires a small new backend read because no existing
query counts — as opposed to merely detecting the *existence* of — awarded
`release_role_credit_lifecycles` rows per role).

**Critical planning fact discovered in this session:** Phase 110 (the direct dependency) is
**not yet complete** in the working tree. Only Plan 110-01 (ranking page + nav) is committed.
Plan 110-02's backend changes (`total_points`, live `role_entry_*` badge UNION) exist as
**uncommitted, in-progress working-tree edits** (Task 1/RED committed at `9d08a840`, Task
2/GREEN present but uncommitted). Plans 110-03 (frontend total_points + role-entry catalog) and
110-04 (category-grouped `Auszeichnungen` container + `buildMemberBadgeGroups` generic row
merge) have **not been started** — the live `MemberBadgeChain.tsx`/`memberBadgeLabels.ts` on
disk are still the pre-Phase-110 flat-list, 9-entry-catalog versions. Phase 112 cannot be
executed against the current frontend shape; it depends on 110-03/110-04 landing first exactly
as specified in their PLAN.md files (which this research treats as the authoritative target
interfaces, since they are already fully designed, RED-tested, and merely un-executed).

**Second critical planning fact:** Phase 108 explicitly declared **no historical backfill**
(D-20/D-21/D-22 in `108-CONTEXT.md`) — `release_role_credit_lifecycles` only fills from the
moment the canonical release-crew flow runs, going forward. The Typ-3 thresholds (Bronze 12 /
Silber 108 / Gold 320 / Platin 510) are calibrated against real historical Cookie-Subs volume,
but the disposable test database will **not** naturally contain that volume. This is not a
Phase 112 defect — it is a live-UAT and test-data planning consideration that must be documented
in the plan's verification section, not discovered as a surprise during UAT.

**Primary recommendation:** Typ 2 = pure frontend derivation, zero backend changes (data
already flows). Typ 3 = one small new backend read appended to `loadPublicBadges`'s existing
live-UNION pattern (mirrors the already-designed `role_entry_*` derivation exactly), synthesized
as additional `PublicMemberBadge` entries with codes like `role_volume_translator_gold`,
so `buildMemberBadgeGroups`'s generic `roleCode`-based row merge (already designed in 110-04,
zero rework needed) picks them up automatically.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 Punkt-Meilenstein-Badges (Schwellen = Stufen)**
Automatische Badges aus der Netto-Gesamtpunktzahl (`member_point_totals`). Die Punktschwellen
sind selbst die Stufen — kein zusätzliches Bronze/Silber/Gold:

| Punkte | Badge |
|---|---|
| 1 | Erster Beitrag |
| 50 | Aktiver Mitwirkender |
| 200 | Erfahrener Mitwirkender |
| 500 | Engagierter Mitwirkender |
| 1 000 | Veteran |
| 2 500 | Archiv-Legende |

Eindeutig, keine zweite Bedingung: 200 Punkte → „Erfahrener Mitwirkender".

**D-02 Live-Projektion (wie Typ 1)**
Rein abgeleitet aus der aktuellen Gesamtsumme; keine Punkte fürs Haben eines Badges. Storno unter
eine Schwelle stuft das Badge zurück.

**D-03 Anzeige Typ 2**
Nur der höchste erreichte Meilenstein als aktueller Rang (Einzahl) — keine Kette aller
erreichten Stufen. Anzeigeort: Gruppe „Fortschritt".

**D-04 Typ 3 — Rollen-Volumen-Auszeichnungen**
Basis: Anzahl Release-Version-Credits pro Rolle (nicht Episoden). Datenquelle: dieselben
`release_role_work`-Buchungen wie die Punkte, gefiltert nach Rolle und gezählt (netto, storniert
zählt nicht). Keine zusätzlichen Punkte — eine Quelle, zwei Sichten.

| Stufe | Release-Credits in der Rolle |
|---|---|
| Bronze | 12 |
| Silber | 108 |
| Gold | 320 |
| Platin | 510 |

Live-Projektion (Rückstufung bei Storno). Gilt für jede punktfähige Rolle, keine hartcodierte
Rollenliste. Anzeige: „Rollen"-Gruppe, pro Rolle eine Zeile, Typ-1-Einstieg + Typ-3-Volumenstufe
zusammengeführt (z. B. „Übersetzung: Erste Übersetzung · Gold · 320+").

### Claude's Discretion
- Exakte Badge-Codes/Labels/Icons/Palette im Stil des vorhandenen Katalogs
  (`memberBadgeLabels.ts`); Bronze/Silber/Gold/Platin-Farbgebung.
- Ob die Meilenstein-/Volumen-Ableitung im Frontend erfolgt oder ein schmaler Backend-Read sie
  mitliefert (für Typ 3 wird eine rollen-gefilterte Zählung gebraucht) — solange D-01…D-04
  gelten. **Resolved by this research: Typ 2 = frontend, Typ 3 = backend (see Architecture
  Patterns below).**
- Badge-Bilder: vorerst Platzhalter/Dummy (Lucide-Icons), tauschbar ohne Logikänderung.

### Deferred Ideas (OUT OF SCOPE)
- Weitere Badge-Kategorien über Typ 1–3 hinaus (Events/Saison, Moderation/Review, Einsortierung
  bestehender Katalog-Badges) — vom Nutzer später definiert. **Note: Phase 113
  ("Wiederholbare Leistungs-Badges Bronze/Silber/Gold") already has a CONTEXT.md gathered for
  exactly three of these follow-on families (vollständig mitgetragene Projekte, Chronist,
  Bildarchivar) and explicitly states it must match the derived-badge rendering pattern Phase
  112 establishes — keep Phase 112's Typ-2/Typ-3 code generic enough that 113 can reuse it
  without rework.**
- Echte Episoden-Granularität für Typ 3 (statt Release-Versionen).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAM-04 | Historische Fansub-Leistung und bestätigte Plattformbeiträge bleiben über stabile Kategorien unterscheidbar; Profilpflege erzeugt keine Punkte und vorhandene `member_badges` bleiben eine getrennte, abgeleitete Projektion. | Both Typ 2 and Typ 3 are implemented as **read-time computed, never-persisted** entries appended to `PublicMemberBadge[]` — the same architectural pattern already used and verified for Typ 1's `role_entry_*` (see Architecture Patterns). No write path to `member_badges` is introduced, keeping badges a strictly derived projection. |

## Project Constraints (from CLAUDE.md)

- **Globale UI-Primitives Pflicht:** Any new UI must use `@/components/ui` (`Card`,
  `SectionHeader`, etc. — already used by `MemberBadgeChain.tsx`). No hand-rolled
  `<select>/<input>/<textarea>/<button>`. Phase 112 needs no new interactive controls (pure
  display), so this mostly means: keep reusing `Card`/`SectionHeader` unchanged, do not invent
  new badge-chip markup outside the existing `.badgeStep`/`.badgeRow` CSS classes from 110-04.
- **Umlaute:** All new German labels (`Erster Beitrag`, `Übersetzung`, `Qualitätsprüfung`, etc.)
  must use correct umlauts — no ASCII substitutes. Applies to `memberBadgeLabels.ts` string
  literals and any Go string literals surfaced to the client (none expected here — Typ 3 backend
  only emits machine-readable `badge_code`s, not label strings; labels resolve client-side).
- **450-Zeilen-Limit:** `backend/internal/repository/member_profile_repository.go` is **already
  1875 lines** — far over the limit (pre-existing violation, not introduced by this phase). Do
  **not** add the Typ-3 query inline into this file. Follow the established project pattern
  (`member_profile_story_image_repository.go`, 101 lines, same package, extension methods on
  `*MemberProfileRepository`) and add a new file, e.g.
  `backend/internal/repository/member_profile_role_volume_repository.go`, containing only the
  new query/method, called from the one-line call site inside `loadPublicBadges`.
  `frontend/src/components/profile/memberBadgeLabels.ts` (66 lines today, will grow via 110-03's
  8 role entries + 110-04's group/roleCode fields + this phase's ~6 milestone entries + dynamic
  resolver code) should stay comfortably under 450 but is worth a line-count check at
  plan-verification time.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Typ 2 milestone selection (highest reached threshold from `total_points`) | Frontend (Browser/SSR render) | — | `total_points` is already a plain scalar on the SSR-fetched `PublicMemberProfileData`; deriving "highest threshold ≤ value" from a 6-entry constant array needs no DB round trip and matches the "kein neues Backend-Read wenn Daten schon da sind" principle already applied throughout Phase 109/110. |
| Typ 3 per-role credit counting (`COUNT(*) ... GROUP BY role_code`) | API/Backend | — | The raw per-role award count does not exist anywhere yet (only a `DISTINCT role_code EXISTS` check exists for Typ 1). Computing it in the browser would require shipping either the full ledger or a new list-typed field to the client and re-deriving grouping/tiering there — a bigger, less consistent contract change than extending the existing live-badge-UNION read that already emits synthetic `PublicMemberBadge` rows. |
| Tier resolution (12/108/320/510 → Bronze/Silber/Gold/Platin, highest only) | API/Backend (for Typ 3, colocated with the count) | Frontend (for Typ 2, colocated with the milestone lookup) | Same "highest-threshold-reached" logic shape in both cases; implemented once server-side (Typ 3, next to the COUNT) and once client-side (Typ 2, next to `total_points`) rather than shipping raw counts to the client and duplicating threshold logic in two places for the same phase. |
| Badge label/icon/palette resolution incl. dynamic role-code and tier parsing | Frontend (`memberBadgeLabels.ts`) | — | Consistent with the existing `getMemberBadgePresentation` seam; all label/icon/copy decisions already live here for Typ 1's 8 hardcoded roles, and role labels for arbitrary role codes are already available via `FANSUB_GROUP_ROLE_OPTIONS` (`frontend/src/types/fansub.ts`). |
| Category-grouped rendering + per-role row merge | Frontend (`MemberBadgeChain.tsx`, `buildMemberBadgeGroups`) | — | Already built generically in Plan 110-04 (not yet executed) specifically so Phase 112 needs zero component changes — only new catalog/presentation data. |

## Standard Stack

No new libraries. This phase is pure extension of existing Go (`pgx/v5`) and Next.js/React/
lucide-react code. No `npm install` / `go get` / package-manager changes are expected.

## Package Legitimacy Audit

Not applicable — this phase introduces zero new third-party packages (verified: no new imports
beyond existing `lucide-react` icon additions, same as Plans 110-03/110-04 which only add more
icon names to an existing import line).

## Architecture Patterns

### Current end-to-end data flow (public profile, verified in this session)

```
GET /members/[slug]  (Next.js Server Component, frontend/src/app/members/[slug]/page.tsx)
  -> getPublicMemberProfile(slug)  (frontend/src/lib/api.ts, SSR fetch)
  -> profile: PublicMemberProfileData  (frontend/src/types/profile.ts)
       .total_points          <-- Typ 2 source (NOT YET on this TS type; added by 110-03 Task 1)
       .public_badges[]       <-- Typ 1 (role_entry_*) + Typ 3 (this phase) synthetic entries land here
  -> <MemberBadgeChain earnedBadges={profile.public_badges} />   (line ~138 of page.tsx)
       catalog defaults to PUBLIC_MEMBER_BADGE_CATALOG (memberBadgeLabels.ts)
       buildMemberBadgeGroups(visibleCatalog, getMemberBadgePresentation)   <-- 110-04, not yet built
       groups rendered: Rollen / Fortschritt / Mitgliedschaft / Besondere Auszeichnungen
```

Backend mirror (`backend/internal/repository/member_profile_repository.go`,
`GetPublicMemberProfile` -> `loadPublicBadges` / `loadTotalPoints`, currently **uncommitted WIP**
matching Plan 110-02 exactly):

```go
// loadTotalPoints (already written, uncommitted) — Typ 2's only backend dependency, already done
SELECT COALESCE(total_points, 0) FROM member_point_totals WHERE member_id = $1
// -> profile.TotalPoints int64 `json:"total_points"`

// loadPublicBadges's live UNION (already written, uncommitted) — the exact pattern to copy for Typ 3
SELECT DISTINCT role_code
FROM release_role_credit_lifecycles
WHERE member_id = $1 AND lifecycle_status = 'awarded'
ORDER BY role_code
// -> appends PublicMemberBadge{BadgeCode: "role_entry_"+roleCode, BadgeCategory: "role_entry"}
```

### Recommended Typ 3 backend addition (new file, new query, same live-UNION pattern)

**New file:** `backend/internal/repository/member_profile_role_volume_repository.go` (mirrors
the existing `member_profile_story_image_repository.go` split-file convention — same package,
extension method on `*MemberProfileRepository`, keeps the 1875-line main file from growing
further).

```go
package repository

// loadRoleVolumeBadges (Typ 3, Phase 112): counts AWARDED release_role_credit_lifecycles rows
// per role_code and emits only the highest-reached tier as a synthetic, never-persisted badge —
// same "computed at read time, invisible the instant it drops below threshold" contract as
// loadPublicBadges' role_entry_* UNION (Plan 110-02).
func (r *MemberProfileRepository) loadRoleVolumeBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role_code, COUNT(*) AS credit_count
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		GROUP BY role_code
		ORDER BY role_code
	`, memberID)
	// ... same error-wrapping idiom as loadPublicBadges/loadTotalPoints

	items := make([]models.PublicMemberBadge, 0)
	for rows.Next() {
		var roleCode string
		var count int
		// scan...
		if tier := highestRoleVolumeTier(count); tier != "" { // 12/108/320/510 -> bronze/silver/gold/platin
			items = append(items, models.PublicMemberBadge{
				ID: 0, BadgeCode: "role_volume_" + roleCode + "_" + tier, BadgeCategory: "role_volume",
			})
		}
	}
	return items, nil
}

func highestRoleVolumeTier(count int) string {
	switch {
	case count >= 510:
		return "platin"
	case count >= 320:
		return "gold"
	case count >= 108:
		return "silver" // or "silber" -- pick ONE convention and keep it consistent with the German UI label lookup
	case count >= 12:
		return "bronze"
	default:
		return ""
	}
}
```

Call site: one new 4-line block inside `loadPublicBadges` (or inside `GetPublicMemberProfile`
right after the existing `loadPublicBadges` call), appending
`r.loadRoleVolumeBadges(ctx, memberID)`'s result to the same `items`/`profile.PublicBadges`
slice — identical wiring shape to the existing `loadTotalPoints` call site
(`member_profile_repository.go` line ~535, in the uncommitted diff).

**Why append into `public_badges` rather than a new DTO field:** `buildMemberBadgeGroups`
(Plan 110-04, not yet built but already fully specified) buckets the `roles` group by
`presentation.roleCode ?? item.badge_code` over exactly the `PublicMemberBadge[]` array that
already flows through `earnedBadges`. Reusing this array means **zero new props**, **zero new
SSR page wiring**, and automatic row-merging with the Typ-1 `role_entry_<role>` badge —
purely a data addition, exactly as Plan 110-04's objective explicitly promised
("Phase 112's Typ-3 volume badge requires only a new memberBadgeLabels.ts entry sharing an
existing roleCode — zero component rebuild").

### Recommended Typ 2 frontend addition (pure derivation, no backend, no new prop)

Add a small pure helper co-located with `memberBadgeLabels.ts` (or inline in the profile page),
e.g.:

```typescript
// Typ 2 (D-01/D-02/D-03): highest reached point-total milestone, or null if total_points < 1
const POINT_MILESTONES: { threshold: number; badge_code: string }[] = [
  { threshold: 2500, badge_code: 'point_milestone_archive_legend' },
  { threshold: 1000, badge_code: 'point_milestone_veteran' },
  { threshold: 500, badge_code: 'point_milestone_engaged' },
  { threshold: 200, badge_code: 'point_milestone_experienced' },
  { threshold: 50, badge_code: 'point_milestone_active' },
  { threshold: 1, badge_code: 'point_milestone_first' },
]

export function deriveMilestoneBadge(totalPoints: number): PublicMemberBadge | null {
  const hit = POINT_MILESTONES.find((m) => totalPoints >= m.threshold)
  return hit ? { id: 0, badge_code: hit.badge_code, badge_category: 'progress' } : null
}
```

Wired at the same call site in `frontend/src/app/members/[slug]/page.tsx` where `publicBadges`
is currently assembled (line ~90): merge the derived entry into the array passed to
`MemberBadgeChain`, e.g. `const earnedBadges = [...publicBadges, ...(milestoneBadge ? [milestoneBadge] : [])]`.
This keeps `MemberBadgeChain` itself domain-agnostic (per 110-03's "kein neues Badge-UI
erfinden" precedent — it never learns about `total_points` directly) and keeps the derivation a
pure, independently unit-testable function.

**Empty-group behavior for a 0-point member:** `deriveMilestoneBadge` returns `null`, so no
`progress`-group item is added; Plan 110-04's `buildMemberBadgeGroups` already hides any group
with zero rows. No "locked" placeholder is needed or implied by D-03 ("nur der höchste erreichte
Meilenstein... keine Kette") — this is the simplest reading and requires no new locked-state UI.

### Dynamic presentation resolver (both Typ 2 and Typ 3 need this — the static `Record` lookup is not enough)

`MEMBER_BADGE_PRESENTATIONS` today (and after 110-03/110-04) is a **static** `Record<string, ...>`
keyed by exact badge codes (9 existing + 8 `role_entry_*`). Typ 2's 6 codes can be added
statically (fixed, known set — same treatment as the existing 9). **Typ 3 cannot** — its badge
codes are dynamically composed (`role_volume_<any-role-code>_<tier>`) because D-04 explicitly
forbids a hardcoded role list, and — verified in this session — the role-crediting service
(`applyDiff` in `backend/internal/services/release_crew_service.go`) does **not** restrict
`role_code` to the 8 "point-eligible" roles at the database/service level; it credits whatever
`role_code` appears in a confirmed `anime_contribution_roles` row (`fansub_lead`, `designer`,
`techadmin`, `gfxler` included, in principle). The observed "8 roles" set is empirical (those are
the roles editors currently assign work to), not enforced.

Recommended pattern: extend `getMemberBadgePresentation` with a **parsing branch before the
static-map fallback**:

```typescript
export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
  if (badgeCode.startsWith('role_volume_')) {
    return resolveRoleVolumePresentation(badgeCode) // parses role code + tier, returns
                                                       // { label: 'Übersetzung · Gold · 320+',
                                                       //   group: 'roles', roleCode: <parsed>,
                                                       //   palette: <tier-based>, Icon: <tier-based> }
  }
  return (
    MEMBER_BADGE_PRESENTATIONS[badgeCode] ?? { label: badgeCode, variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'special' }
  )
}
```

`resolveRoleVolumePresentation` needs: (a) the tier suffix (`bronze|silver|gold|platin`) split
off the end, (b) the remaining middle segment mapped through `FANSUB_GROUP_ROLE_OPTIONS`
(`frontend/src/types/fansub.ts`, already has all 12 role codes with correct German labels — no
new role-label map needed) to get the German role name, (c) a tier→German-label map
(`{bronze:'Bronze', silver:'Silber', gold:'Gold', platin:'Platin'}`), (d) the numeric threshold
for the "+N" suffix in the label (reuse the same 12/108/320/510 constants). `roleCode` on the
returned presentation must be the **parsed role code**, not the full badge code, so
`buildMemberBadgeGroups`'s `presentation.roleCode ?? item.badge_code` bucket key matches the
sibling `role_entry_<role>` presentation's `roleCode` and the two merge into one row.

**Palette note:** `MemberBadgePalette` today is `'gold' | 'indigo' | 'orange' | 'mint' | 'red'`
— it has no `'bronze'`/`'silver'`/`'platin'` values, and the existing `productive_bronze/silver/
gold` catalog entries already reuse `mint`/`neutral`/`warning`+`gold` loosely rather than true
metal colors (verified in `memberBadgeLabels.ts`). Treat exact tier-color mapping as Claude's
Discretion per CONTEXT; either reuse the existing palette loosely (precedent) or extend
`MemberBadgePalette` with `'bronze' | 'silver' | 'platinum'` if the UI-SPEC step wants literal
metal colors — either is consistent with prior art, no CSS architecture change required beyond
adding CSS custom-property values for any new palette keys (see `.badgeStep`'s `--badge-accent`
pattern in `MemberBadgeChain.module.css`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Highest threshold reached" tier logic | A bespoke sorted-array-with-manual-loop per badge family | One small shared helper shape (find first threshold in a descending-sorted array where `value >= threshold`), written once per tier and reused identically for Typ 2 (frontend) and Typ 3 (backend) — do not invent two different comparison styles | Both are the exact same "pick highest reached step" problem; divergent implementations risk off-by-one inconsistency between the two badge families users will compare side by side |
| Category-grouped, row-merging badge rendering | A new `RoleBadgeGroup.tsx` / bespoke grid component for Typ 3 | `buildMemberBadgeGroups` + `MemberBadgeChain`'s existing rendering (Plan 110-04) | This exact scenario (a future badge family joining an existing role's row) is the explicit reason 110-04 built a generic `roleCode`-keyed merge instead of a flat list — reusing it is not optional convenience, it is the designed extension point |
| Role German labels for arbitrary role codes | A new role-code-to-label map duplicating role names | `FANSUB_GROUP_ROLE_OPTIONS` (`frontend/src/types/fansub.ts`, 12 entries, already correct-umlaut German labels) | Single source of truth for role labels already exists and covers every role code the crediting service can produce, including the 4 non-point-eligible ones (harmless if never looked up for Typ 3 since those never reach threshold in current usage) |

**Key insight:** Every piece of this phase — the live-projection contract, the read-time UNION
pattern, the generic category/row-merge container — was **already designed and is already
committed-or-drafted** by Phases 109/110. Phase 112's actual net-new surface area is small: one
new backend query file (~40-60 lines), one new frontend tier-resolution helper (~20 lines), one
dynamic presentation-parsing branch (~30-40 lines), and catalog/label additions. Resist the urge
to re-architect any of the surrounding container/merge logic — it was purpose-built for exactly
this phase.

## Common Pitfalls

### Pitfall 1: Planning against the on-disk `MemberBadgeChain.tsx`/`memberBadgeLabels.ts` as if it already has groups
**What goes wrong:** A plan written by reading only the current file contents (89-line flat
list, 9-entry catalog, no `group`/`roleCode` fields) would either try to re-invent the grouping
container Plan 110-04 already fully designed, or silently produce a flat, ungrouped Typ-2/Typ-3
addition that ignores D-04's "eine Zeile je Rolle" requirement.
**Why it happens:** Phase 110 is mid-execution (Plan 2 of 4 per `.planning/STATE.md`); the
target shape only exists inside `110-03-PLAN.md`/`110-04-PLAN.md`'s `<interfaces>` blocks, not
in the working tree yet.
**How to avoid:** Treat `110-03-PLAN.md` and `110-04-PLAN.md` (specifically their `<interfaces>`
sections, which contain full verified current-and-target file shapes) as the authoritative
target state for planning purposes, and add an explicit Phase 112 plan dependency /
pre-flight check confirming 110-02/03/04 have landed (SUMMARY.md files exist, `group`/`roleCode`
fields present in `memberBadgeLabels.ts`, `buildMemberBadgeGroups` exported from
`MemberBadgeChain.tsx`) before Phase 112's tasks begin.
**Warning signs:** `grep -c "group:" frontend/src/components/profile/memberBadgeLabels.ts`
returns 0, or `buildMemberBadgeGroups` is not exported from `MemberBadgeChain.tsx`.

### Pitfall 2: Typ-3 threshold verification against disposable test data with no historical backfill
**What goes wrong:** A live-UAT step that expects to see a Gold/Platin role-volume badge on a
seeded test member will fail to find one, because Phase 108 explicitly excluded backfill (D-20)
— `release_role_credit_lifecycles` only accumulates from the canonical release-crew flow going
forward, and the disposable seed data is very unlikely to contain 320+ awarded credits in a
single role for any one member.
**Why it happens:** The Bronze/Silber/Gold/Platin thresholds were calibrated against *real*
historical Cookie-Subs volume (per CONTEXT: "an realen Fansub-Volumina geeicht, Referenz
Cookie-Subs"; 108-CONTEXT's own worked example cites "220 Naruto-Releases" for one member), a
volume the disposable test system was never asked to reproduce.
**How to avoid:** Document this explicitly in the plan's verification section: unit/integration
tests should exercise the tier-boundary logic directly against synthetic counts (12, 108, 320,
510, and one-below-each), not rely on the ambient seed data reaching Gold/Platin naturally. Live
UAT should either seed enough `release_role_credit_lifecycles` rows via the canonical flow to
cross at least the Bronze threshold, or explicitly accept "Bronze-only observable in current
test data" as a documented, honest UAT limitation (consistent with how Phase 99's UAT notes
already handle similarly data-starved scenarios).
**Warning signs:** A UAT checklist item asking to "confirm Platin renders live" against the
current disposable database without first seeding ≥510 role credits.

### Pitfall 3: Re-growing an already-over-limit file
**What goes wrong:** Adding the Typ-3 SQL query directly inline into `loadPublicBadges` (or
anywhere else in `member_profile_repository.go`) pushes an already-1875-line file (4x the
450-line CLAUDE.md limit) even further past the guardrail, and is exactly the kind of
"just one more inline query" growth that produced the current violation.
**Why it happens:** `loadPublicBadges`'s live-UNION pattern is easy to extend in-place by
copy-pasting the `role_entry_*` block — the path of least resistance is also the wrong one here.
**How to avoid:** New file, new method, one-line call site — see Architecture Patterns above.
**Warning signs:** `git diff --stat` for a Phase 112 plan showing +40 lines to
`member_profile_repository.go` instead of a new file.

### Pitfall 4: Static catalog entries for Typ 3 role-volume badges
**What goes wrong:** Trying to pre-register all `role_volume_<role>_<tier>` combinations as
static `MEMBER_BADGE_PRESENTATIONS`/`PUBLIC_MEMBER_BADGE_CATALOG` entries (the way Typ 1's 8
fixed roles are registered) would require enumerating every role code up front — directly
violating D-04's "keine hartcodierte Rollenliste", and would be incomplete the moment a new role
code is ever assigned (verified: the crediting service does not restrict role codes to a fixed
set).
**Why it happens:** The existing 9+8-entry static `Record` pattern is the only precedent visible
in the file, making it the "obvious" thing to extend by analogy.
**How to avoid:** Use the parsing-branch resolver described in Architecture Patterns; rely on
`MemberBadgeChain.tsx`'s existing `catalogWithEarnedBadges` fallback (already present, unchanged
since before Phase 110) to surface any earned-but-not-statically-catalogued badge automatically
— this fallback already exists specifically for exactly this kind of dynamic badge code.
**Warning signs:** A plan task that says "add all locked role-volume placeholders to the
catalog" — Typ 3 has no locked/placeholder concept per D-04 (only the highest earned tier is
ever shown; a role with 0 credits never gets a Typ-3 entry at all, same principle as Typ 1's "no
credit, no entry" rule).

## Code Examples

### Verified current call chain (SSR page -> MemberBadgeChain), read directly from source

```tsx
// frontend/src/app/members/[slug]/page.tsx, lines 90 and 137-139 (verified, current)
const publicBadges = profile.public_badges ?? []
// ...
<section className={styles.section} aria-label="Auszeichnungen">
  <MemberBadgeChain
    earnedBadges={publicBadges}
```

### Verified current (pre-110-03) badge presentation fallback that Typ 3 relies on

```tsx
// frontend/src/components/profile/memberBadgeLabels.ts, lines 57-66 (verified, current)
export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
  return (
    MEMBER_BADGE_PRESENTATIONS[badgeCode] ?? {
      label: badgeCode,
      variant: 'neutral',
      Icon: Sparkles,
      palette: 'mint',
    }
  )
}
```

### Verified current role label source (reusable for Typ 3, no new map needed)

```typescript
// frontend/src/types/fansub.ts, lines 436-449 (verified, current)
export const FANSUB_GROUP_ROLE_OPTIONS: FansubGroupRoleOption[] = [
  { code: 'fansub_lead', label: 'Gruppenleitung', ... },
  { code: 'project_lead', label: 'Projektleitung', ... },
  { code: 'translator', label: 'Übersetzung', ... },
  { code: 'timer', label: 'Timing', ... },
  { code: 'typesetter', label: 'Typesetting / FX', ... },
  { code: 'editor', label: 'Editing', ... },
  { code: 'encoder', label: 'Encoding', ... },
  { code: 'raw_provider', label: 'Raw-Bereitstellung', ... },
  { code: 'quality_checker', label: 'Qualitätsprüfung', ... },
  { code: 'designer', label: 'Design', ... },
  { code: 'techadmin', label: 'Technische Administration', ... },
  { code: 'gfxler', label: 'Grafik', ... },
]
```

### Verified schema for the counting query (Typ 3 backend read)

```sql
-- database/migrations/0137_phase108_contribution_sources.up.sql (verified, current)
CREATE TABLE release_role_credit_lifecycles (
    id BIGSERIAL PRIMARY KEY,
    release_version_id BIGINT NOT NULL,
    fansub_group_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    role_code TEXT NOT NULL CHECK (btrim(role_code) <> ''),
    generation INTEGER NOT NULL CHECK (generation > 0),
    lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('pending', 'awarded', 'reversed')),
    award_entry_id BIGINT NULL UNIQUE REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    reversal_entry_id BIGINT NULL UNIQUE REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    -- UNIQUE (release_version_id, fansub_group_id, member_id, role_code, generation)
    -- shape CHECK: awarded requires award_entry_id NOT NULL AND reversal_entry_id NULL
);
```
`COUNT(*) ... WHERE member_id=$1 AND lifecycle_status='awarded' GROUP BY role_code` correctly
counts distinct release-version credits per role: the `generation` column plus the "skip if
already awarded" guard in `release_crew_service.go`'s `applyDiff` (verified, lines ~280-320)
guarantee no double-counting when a member is removed and re-added to the same role on the same
release (the old generation's row flips to `reversed`, a new generation's row becomes `awarded`
— only the current one is ever counted).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact tier-suffix string convention (`bronze/silver/gold/platin` vs. `bronze/silber/gold/platin`) for badge codes is unspecified by CONTEXT.md — recommended English-internal/German-external split (code uses English tier tokens, label text is German) mirrors no exact precedent in the codebase (existing `productive_bronze/silver/gold` codes are already English-internal) | Architecture Patterns, Typ 3 backend addition | Low — purely a naming convention choice; German-only tokens (`platin` not `platinum`) also works, but consistency with the existing `productive_*` precedent (English tokens) is the safer default and is what this research recommends | 
| A2 | Palette mapping for Bronze/Silver/Gold/Platin reuses the existing loose `MemberBadgePalette` enum rather than introducing true metal-toned palette values | Architecture Patterns, Palette note | Low-Medium — cosmetic only; if the user expects visually distinct bronze/silver/platinum colors (not just gold vs. everything-else), the UI-SPEC step should extend `MemberBadgePalette` and add corresponding CSS custom properties, which is a small, isolated change |
| A3 | The row label composition for a merged Typ-1+Typ-3 role row (CONTEXT's own example: "Übersetzung: Erste Übersetzung · Gold · 320+") is achievable by rendering two separate badge-item chips inside one merged `<li>` row (per 110-04's generic merge, which merges *items*, not label *strings*) — whether a role-name prefix header is also needed on the row is left open | Architecture Patterns / Open Questions | Medium — if the UI-SPEC/planner decides the row needs an explicit "Übersetzung:" prefix label that 110-04's markup does not currently render anywhere, that is a small additive change to 110-04's row markup (not a Phase 112 blocker, but worth resolving explicitly in planning rather than being discovered during UI-SPEC review) |

## Open Questions (RESOLVED)

> **RESOLVED (2026-07-28):** Beide Fragen sind downstream entschieden und in die Pläne übernommen —
> OQ1 durch die UI-SPEC-Entscheidung (jede Rollen-Zeile erhält ein `{Rollenname}:`-Präfix, umgesetzt
> in 112-03 Task 1); OQ2 durch den Resolver-Fallback auf den rohen `role_code` (112-02 Task 2 +
> PATTERNS.md). Keine offene Blockade für die Ausführung.

1. **Does the merged Rollen-row need an explicit role-name prefix?**
   - What we know: 110-04's `buildMemberBadgeGroups` merges Typ-1 and Typ-3 badges for the same
     role into one `<li>` row containing multiple badge-item `<span>`s side by side. Today's
     Typ-1 badge label already says the role implicitly ("Erste Übersetzung"); a Typ-3-only
     label recommended in this research ("Übersetzung · Gold · 320+") is self-descriptive on its
     own.
   - What's unclear: whether the CONTEXT's illustrative text "Übersetzung: Erste Übersetzung ·
     Gold · 320+" implies a literal row-level "Übersetzung:" prefix element that doesn't exist in
     110-04's current row markup, or whether two self-descriptive chips in one row already
     satisfies the intent.
   - Recommendation: default to no new row-prefix markup (each badge chip is already
     self-descriptive per this research's label design); treat as a UI-SPEC-stage decision if the
     rendered result looks ambiguous during Task/UAT review.

2. **Should a member with Typ-3 credits in a role but zero role-code-vs-label match (unlikely
   edge case) fall back gracefully?**
   - What we know: `FANSUB_GROUP_ROLE_OPTIONS` covers all 12 known role codes; the
     role-crediting path is not restricted to those 12 at the DB level (free-text `role_code`
     with only a non-empty CHECK).
   - What's unclear: whether any role code outside the known 12 could realistically reach a
     credited/awarded state through the current UI (the admin release-crew editor almost
     certainly constrains input to `FANSUB_GROUP_ROLE_OPTIONS`'s codes already).
   - Recommendation: the dynamic resolver should fall back to the raw `role_code` string as the
     label if no match is found in `FANSUB_GROUP_ROLE_OPTIONS` (same defensive pattern already
     used by `getMemberBadgePresentation`'s existing fallback) rather than throwing or hiding the
     badge.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Frontend Framework | Vitest 3 (`npm run test` = `vitest run`), React Testing Library |
| Backend Framework | Go `testing` + `testify`, Postgres-backed integration tests (disposable schema-per-test harness, see `openMemberPointTotalsPostgres(t)` / `openPointLedgerPostgres(t)` helpers) |
| Config file | `frontend/vitest.config.ts`; backend uses standard `go test` |
| Quick run command | `cd frontend && npm run test -- MemberBadgeChain` / `cd backend && go test ./internal/repository/... -run TestLoadPublicBadges` |
| Full suite command | `cd frontend && npm run test` / `cd backend && go test ./...` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAM-04 (Typ 2 tier resolution) | `deriveMilestoneBadge` returns correct highest-threshold badge code for boundary values (0, 1, 49, 50, 199, 200, 2500, 2501) and `null` below 1 | unit | `cd frontend && npm run test -- memberBadgeLabels` (or a new co-located test file) | ❌ Wave 0 |
| GAM-04 (Typ 2 live projection) | Reversal dropping `total_points` below a threshold removes the previous milestone badge on next render | unit (pure function re-evaluation, no new component test needed since `deriveMilestoneBadge` is pure) | same as above | ❌ Wave 0 |
| GAM-04 (Typ 3 tier resolution) | `highestRoleVolumeTier`/equivalent Go helper returns correct tier at 11/12/107/108/319/320/509/510 boundaries, `""`/no-badge below 12 | unit | `cd backend && go test ./internal/repository/... -run TestHighestRoleVolumeTier` (or wherever the helper lands) | ❌ Wave 0 |
| GAM-04 (Typ 3 live projection, netto count) | Postgres-backed test: award 12 role_code credits (reaching Bronze), reverse one (dropping to 11, badge disappears), re-award (Bronze reappears) — mirrors the existing `TestLoadPublicBadgesPostgresRoleEntryReversedHidden` pattern from Plan 110-02 | integration | `cd backend && go test ./internal/repository/... -run TestLoadPublicBadgesPostgresRoleVolume` | ❌ Wave 0 |
| GAM-04 (Typ 1+3 row merge) | `buildMemberBadgeGroups` given a synthetic `role_entry_translator` + `role_volume_translator_gold` pair returns one `roles`-group row containing both items | unit | `cd frontend && npm run test -- MemberBadgeChain` | ❌ Wave 0 (depends on 110-04's `buildMemberBadgeGroups` existing first) |

### Sampling Rate
- **Per task commit:** targeted `npm run test -- <file>` / `go test ./internal/repository/... -run <Test>`
- **Per wave merge:** `cd frontend && npm run test` and `cd backend && go test ./...`
- **Phase gate:** Full suite green before `/gsd:verify-work`; additionally confirm
  `go build ./...` (backend) and `npm run typecheck` (frontend) are clean, per the exact pattern
  used by Plans 110-02/110-03.

### Wave 0 Gaps
- [ ] Confirm Plans 110-02/110-03/110-04 have landed (SUMMARY.md files present, or their
      changes otherwise verified in the working tree) before Phase 112's Wave 0 begins — this is
      a phase-level pre-flight check, not a missing test file, but blocks everything else.
- [ ] New backend test file or test additions for the Typ-3 tier-boundary + live-projection cases
      (likely appended to `member_profile_repository_postgres_test.go`, following its existing
      `TestLoadPublicBadgesPostgres*` naming convention).
- [ ] New/extended frontend test coverage for `deriveMilestoneBadge` and the dynamic
      `role_volume_*` presentation resolver, plus `buildMemberBadgeGroups`'s same-role Typ-1+Typ-3
      merge case (the synthetic-badge test case pattern already exists in 110-04's Task 1 RED
      tests — reuse that style).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public, unauthenticated read endpoint — unchanged from Phase 110's existing threat disposition |
| V3 Session Management | no | — |
| V4 Access Control | no | Both new badge families are computed from the same already-public `GetPublicMemberProfile` read; no new access-control boundary introduced |
| V5 Input Validation | no | No new user input surface — `memberID` path parameter validation is pre-existing and unchanged |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale/cached badge state after a role-credit reversal | Tampering (state integrity) | Same mitigation already established and tested for Typ 1 (Plan 110-02, T-110-04): compute both new derivations fresh on every `GetPublicMemberProfile` call, never cache, never write to `member_badges` — a reversed credit is invisible on the very next read by construction, not by explicit cache-invalidation code |
| Over-disclosure of raw per-role credit counts | Information Disclosure | Accept — the exact numeric threshold (e.g. "320+") is disclosed only as a rounded tier label in the recommended design, not the raw count; if the UI-SPEC stage decides to show the *exact* count instead of "Gold · 320+", that is a low-severity disclosure of already-computable-from-public-data information (the same `release_role_credit_lifecycles` data, aggregated differently, already partially observable via the Typ-1 role_entry_* existence check) |

## Sources

### Primary (HIGH confidence — direct code/CONTEXT reads in this session)
- `.planning/phases/112-member-punkt-meilenstein-badges/112-CONTEXT.md` — locked decisions D-01…D-04
- `.planning/phases/110-member-badges-ranglisten-ui-und-e2e-abnahme/110-CONTEXT.md`,
  `110-02-PLAN.md`, `110-03-PLAN.md`, `110-04-PLAN.md`, `110-01-SUMMARY.md` — target interfaces
  and confirmed execution status (only Plan 1 complete)
- `.planning/phases/109-ranglisten-und-punkteprojektionen/109-CONTEXT.md` — `member_point_totals`
  persistence/read-only contract
- `.planning/phases/108-bestehende-beitragsquellen-anbinden/108-CONTEXT.md` — D-20/D-21/D-22 no-
  backfill decision (critical UAT-planning fact)
- `.planning/phases/113-wiederholbare-leistungs-badges-bronze-silber-gold/113-CONTEXT.md` —
  confirms Phase 112's derived-badge pattern is an explicit reuse target for a follow-on phase
- `.planning/REQUIREMENTS.md` — GAM-04 text and phase-tracker status
- `backend/internal/models/member_profile.go`, `backend/internal/repository/
  member_profile_repository.go` (including uncommitted working-tree diff, verified via `git
  diff`), `member_profile_story_image_repository.go`, `member_profile_repository_postgres_test.go`
- `backend/internal/services/release_crew_service.go` — role-crediting logic, generation/award/
  reversal semantics
- `database/migrations/0137_phase108_contribution_sources.up.sql` — `release_role_credit_
  lifecycles` schema
- `frontend/src/components/profile/MemberBadgeChain.tsx`, `memberBadgeLabels.ts` (current,
  pre-110-03/04 state, verified by direct read)
- `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/types/fansub.ts`
  (`FANSUB_GROUP_ROLE_OPTIONS`)
- `.planning/STATE.md` — confirms Phase 110 execution position ("Plan: 2 of 4")
- `backend/internal/services/badge_service.go` — confirms the OLD persisted-recompute badge
  engine (`productive_bronze/silver/gold`, `computeProductiveTiers`) as the anti-pattern to avoid

### Secondary (MEDIUM confidence)
- None — all findings in this phase were directly verifiable against the codebase or CONTEXT
  documents already gathered by the user; no external library research was required.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure extension of verified existing patterns
- Architecture: HIGH for Typ 2 (data already flows, trivial derivation) / HIGH for Typ 3's data
  source and query shape (verified against real schema + service code) / MEDIUM for the exact
  UI row-label composition (left as Open Question 1, genuinely underspecified in CONTEXT.md)
- Pitfalls: HIGH — all four pitfalls are grounded in directly-observed current repo state
  (uncommitted Phase 110 work, 1875-line file, D-20 no-backfill decision, existing static-catalog
  precedent), not speculation

**Research date:** 2026-07-27
**Valid until:** Short — this research is tightly coupled to Phase 110's in-progress execution
state (uncommitted diffs, un-executed plans). Re-verify the "Pitfall 1" pre-flight check
(110-02/03/04 landed) at the start of Phase 112 planning/execution even if that happens only a
few days after this research, since Phase 110 may complete or change shape in the interim.
