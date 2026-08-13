# Phase 112: Member-Punkt-Meilenstein-Badges - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 9 (2 new backend/frontend + 7 modified/extended)
**Analogs found:** 9 / 9 (all net-new surfaces have an exact in-repo analog)

> Planning note — supersedes RESEARCH.md Pitfall 1: The 112-RESEARCH.md was written while
> Phase 110 was mid-execution and assumed the on-disk `MemberBadgeChain.tsx` / `memberBadgeLabels.ts`
> were still the flat pre-110 versions. **Verified during this mapping: Plans 110-02/110-03/110-04
> have landed.** The working tree now contains `group`/`roleCode` fields, `buildMemberBadgeGroups`,
> `MemberBadgeGroup`, `loadTotalPoints`, `TotalPoints`, and the live `role_entry_*` UNION. The
> pre-flight check RESEARCH.md demanded is therefore already satisfied — the analogs below are the
> real, current files, not target interfaces. (Line-count confirm at plan time still advised.)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/internal/repository/member_profile_role_volume_repository.go` (NEW) | repository | request-response / transform (COUNT+GROUP BY projection) | `backend/internal/repository/member_profile_repository.go` `loadPublicBadges` role-entry UNION (lines 597-616) + split-file convention `member_profile_story_image_repository.go` | exact |
| `backend/internal/repository/member_profile_repository.go` (MODIFY: 1-line call site) | repository | request-response | existing `loadTotalPoints` call site (line 535) / `loadPublicBadges` call site (line 531) | exact (in-file) |
| `backend/internal/repository/member_profile_repository_postgres_test.go` (MODIFY / new test fn) | test | integration (Postgres) | `TestLoadPublicBadgesPostgresRoleEntryReversedHidden` (lines 131-164) + `insertRoleEntryLifecycleRow` helper (68-88) | exact |
| `frontend/src/components/profile/memberBadgeLabels.ts` (MODIFY: 6 static entries + palette + dynamic resolver + `deriveMilestoneBadge`) | utility (catalog/presentation) | transform (lookup/derivation) | same file, existing `MEMBER_BADGE_PRESENTATIONS` + `getMemberBadgePresentation` (lines 45-109) | exact (in-file) |
| `frontend/src/components/profile/MemberBadgeChain.tsx` (MODIFY: `.roleLabel` prefix only) | component | request-response (render) | same file, existing `'roles'`-group row render (lines 118-142) + `buildMemberBadgeGroups` (59-85) | exact (in-file) |
| `frontend/src/components/profile/MemberBadgeChain.module.css` (MODIFY: 3 palette rules + `.roleLabel`) | config (CSS) | — | existing `[data-palette="…"]` rules (84-107) + `.groupTitle` (60-68) | exact (in-file) |
| `frontend/src/app/members/[slug]/page.tsx` (MODIFY: merge milestone into `earnedBadges`) | route (Server Component) | request-response (SSR) | same file, existing `publicBadges` assembly (line 90) + `<MemberBadgeChain earnedBadges=…>` (138-139) | exact (in-file) |
| `frontend/src/components/profile/memberBadgeLabels.test.ts` (NEW) | test | unit (Vitest) | `frontend/src/components/profile/deriveKnownFor.test.ts` (pure-fn unit test in same dir) | role-match |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` (MODIFY: merge + prefix cases) | test | unit (Vitest + RTL) | same file, existing `buildMemberBadgeGroups` / injectable-presentation test harness (lines 1-45) | exact (in-file) |

## Pattern Assignments

### `member_profile_role_volume_repository.go` (repository, transform) — NEW FILE

**Analog A (split-file convention):** `backend/internal/repository/member_profile_story_image_repository.go` (101 lines)
**Analog B (query/scan shape + synthetic PublicMemberBadge):** `member_profile_repository.go` lines 597-618

Why a new file: `member_profile_repository.go` is already 1875 lines (4× the 450 limit — pre-existing violation). Do NOT add the query inline (RESEARCH Pitfall 3). Mirror the story-image split-file: same `package repository`, extension method on `*MemberProfileRepository`, sharing the pool via `r.db`.

**File header / package / imports pattern** (`member_profile_story_image_repository.go` lines 1-11):
```go
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"team4s.v3/backend/internal/models"
)
```
(For the role-volume file `errors`/`pgx` are only needed if you add a QueryRow no-rows path; the COUNT-GROUP-BY read uses `Query` and needs only `context`, `fmt`, `models`.)

**Query + row-scan + synthetic-badge-emit pattern to copy** (`member_profile_repository.go` lines 597-616 — the live role-entry UNION, the exact shape to mirror for the COUNT variant):
```go
	roleRows, err := r.db.Query(ctx, `
		SELECT DISTINCT role_code
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		ORDER BY role_code
	`, memberID)
	if err != nil {
		return items, fmt.Errorf("load role-entry badges for member %d: %w", memberID, err)
	}
	defer roleRows.Close()
	for roleRows.Next() {
		var roleCode string
		if err := roleRows.Scan(&roleCode); err != nil {
			return nil, fmt.Errorf("scan role-entry badge row for member %d: %w", memberID, err)
		}
		items = append(items, models.PublicMemberBadge{ID: 0, BadgeCode: "role_entry_" + roleCode, BadgeCategory: "role_entry"})
	}
	if err := roleRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role-entry badges for member %d: %w", memberID, err)
	}
```
Phase 112 delta vs. this analog: change the SQL to `SELECT role_code, COUNT(*) ... GROUP BY role_code`, scan `(roleCode string, count int)`, gate emission on `highestRoleVolumeTier(count) != ""`, and emit `BadgeCode: "role_volume_"+roleCode+"_"+tier`, `BadgeCategory: "role_volume"`. `ID: 0` and the never-persisted / recomputed-each-read contract carry over verbatim (this is what satisfies GAM-04 + D-02 live-projection).

**Tier helper** (net-new pure function, colocate in same file — mirrors the "highest reached step" shape RESEARCH Don't-Hand-Roll mandates be written once): switch on `count >= 510 → "platinum"`, `>= 320 → "gold"`, `>= 108 → "silver"`, `>= 12 → "bronze"`, else `""`. Use tier tokens `bronze/silver/gold/platinum` (English-internal), matching the existing `productive_bronze/silver/gold` code precedent and the UI-SPEC tier table (note `platinum`, not `platin`, for the code token — the German `Platin` label is resolved client-side).

**Model reused unchanged** (`backend/internal/models/member_profile.go` lines 187-191):
```go
type PublicMemberBadge struct {
	ID            int64  `json:"id"`
	BadgeCode     string `json:"badge_code"`
	BadgeCategory string `json:"badge_category"`
}
```
No model change needed — Typ 3 rides the existing `PublicBadges []PublicMemberBadge` slice (`json:"public_badges"`, line 259). No new DTO field, no new SSR prop (RESEARCH: "append into public_badges").

---

### `member_profile_repository.go` (repository, 1-line call-site MODIFY)

**Analog:** the `loadTotalPoints` call site, lines 531-538:
```go
	profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.TotalPoints, loadErr = r.loadTotalPoints(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
```
Phase 112 delta: after the `loadPublicBadges` assignment, append the role-volume result into the same slice, e.g.:
```go
	volumeBadges, loadErr := r.loadRoleVolumeBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PublicBadges = append(profile.PublicBadges, volumeBadges...)
```
Keep the exact `if loadErr != nil { return nil, loadErr }` idiom. This is the only edit to the 1875-line file — a `git diff --stat` showing more than a few lines here is the Pitfall-3 warning sign.

---

### `member_profile_repository_postgres_test.go` (test, integration MODIFY)

**Analog:** `TestLoadPublicBadgesPostgresRoleEntryReversedHidden` (lines 131-164) + `insertRoleEntryLifecycleRow` helper (68-88) + `containsPublicBadge` (90-97).

**Reusable seed helper (already exists, use as-is)** (lines 68-88): `insertRoleEntryLifecycleRow(t, pool, memberID, roleCode, generation, lifecycleStatus, awardEntryID, reversalEntryID)` inserts against seeded `(release_version_id=30, fansub_group_id=20)`. Note the `UNIQUE(release_version_id, fansub_group_id, member_id, role_code, generation)` constraint — for a COUNT test that needs N credits you must vary `generation` (or seed additional release/group rows), NOT insert N identical rows.

**Live-projection (award → reverse → hidden) pattern to copy** (lines 144-163):
```go
	reversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{ … })
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		UPDATE release_role_credit_lifecycles
		SET lifecycle_status = 'reversed', reversal_entry_id = $1
		WHERE id = $2
	`, reversal.ID, lifecycleID)
	require.NoError(t, err)
	badgesAfterReversal, err := repo.loadPublicBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterReversal, "role_entry_translator", "role_entry"), …)
```
Phase 112 delta (RESEARCH Test Map + Pitfall 2): assert against `role_volume_<role>_bronze` at count 12, then reverse one to drop to 11 and assert it disappears. **Do NOT rely on ambient seed data reaching Gold/Platin** — the tier-boundary logic (11/12, 107/108, 319/320, 509/510) must be exercised as a direct Go unit test on `highestRoleVolumeTier` (`go test -run TestHighestRoleVolumeTier`), independent of the Postgres integration test. Follow the `TestLoadPublicBadgesPostgres*` naming convention. `openMemberProfileBadgeLifecyclePostgres(t)` (line ~59) applies the `0137_phase108_contribution_sources.up.sql` migration to the disposable schema.

---

### `memberBadgeLabels.ts` (utility, transform MODIFY — largest frontend surface)

**Analog:** the whole existing file (109 lines) is the template. Three additions, all in-file precedent:

**1. Static Typ-2 entries — copy the existing entry shape** (lines 45-63, `MEMBER_BADGE_PRESENTATIONS`):
```typescript
export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown, palette: 'gold', group: 'membership' },
  first_contribution: { label: 'Erste Mitwirkung', variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'progress' },
  productive_gold: { label: 'Produktiv · 50+ Anime', variant: 'warning', Icon: Star, palette: 'gold', group: 'progress' },
  role_entry_translator: { label: 'Erste Übersetzung', variant: 'info', Icon: Languages, palette: 'indigo', group: 'roles', roleCode: 'translator' },
}
```
Add the 6 `point_milestone_*` entries (UI-SPEC table lines 126-133) with `group: 'progress'`. **Static map ONLY — do NOT add them to `PUBLIC_MEMBER_BADGE_CATALOG`** (UI-SPEC "Kein Locked-Zustand für Typ 2", D-03): they must surface via the runtime earned-badge path, not as locked catalog chips. Note the correct-umlaut labels (`Erster Beitrag`, `Aktiver Mitwirkender`, `Erfahrener Mitwirkender`, `Engagierter Mitwirkender`, `Veteran`, `Archiv-Legende`). New icon imports to add to the line 1-19 block: `Flag, Flame, Award, Medal, Trophy, Gem`.

**2. Palette type extension** (line 22): `export type MemberBadgePalette = 'gold' | 'indigo' | 'orange' | 'mint' | 'red'` → add `| 'bronze' | 'silver' | 'platinum'`.

**3. Dynamic resolver branch — extend the existing fallback** (lines 99-109):
```typescript
export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
  return (
    MEMBER_BADGE_PRESENTATIONS[badgeCode] ?? {
      label: badgeCode,
      variant: 'neutral',
      Icon: Sparkles,
      palette: 'mint',
      group: 'special',
    }
  )
}
```
Phase 112 delta: add a parsing branch BEFORE the static-map lookup — `if (badgeCode.startsWith('role_volume_')) return resolveRoleVolumePresentation(badgeCode)`. `resolveRoleVolumePresentation` splits the trailing tier token (`bronze|silver|gold|platinum`), maps the middle segment via `FANSUB_GROUP_ROLE_OPTIONS` (import from `@/types/fansub`, lines 436-449 — do NOT build a new role-label map, RESEARCH Don't-Hand-Roll), returns `{ label: '{TierLabel} · {threshold}+', variant, Icon, palette, group: 'roles', roleCode: <parsedRoleCode> }`. **`roleCode` MUST be the parsed role code, not the full badge code** — that is the merge key for `buildMemberBadgeGroups`. Fall back to the raw `role_code` string as label if no `FANSUB_GROUP_ROLE_OPTIONS` match (defensive, mirrors existing fallback; RESEARCH Open Question 2). Tier→German label map: `{bronze:'Bronze', silver:'Silber', gold:'Gold', platinum:'Platin'}`; thresholds `{bronze:12, silver:108, gold:320, platinum:510}`; the `·` separator (U+00B7) matches existing `'Produktiv · 10+ Anime'`.

**4. `deriveMilestoneBadge` (net-new pure helper), colocate here** (RESEARCH lines 262-284):
```typescript
export function deriveMilestoneBadge(totalPoints: number): PublicMemberBadge | null {
  const hit = POINT_MILESTONES.find((m) => totalPoints >= m.threshold) // descending-sorted
  return hit ? { id: 0, badge_code: hit.badge_code, badge_category: 'progress' } : null
}
```
Same "highest reached step" shape as the Go `highestRoleVolumeTier` — write it once, keep the comparison style identical (RESEARCH Don't-Hand-Roll). Returns `null` below 1 point → no progress row (D-03; empty groups already hidden by `buildMemberBadgeGroups`).

---

### `MemberBadgeChain.tsx` (component, render MODIFY — minimal)

**Analog:** the existing `'roles'`-group merge in `buildMemberBadgeGroups` (lines 66-81) and the row render (lines 118-142). **No structural change to grouping/merge logic** — it is already generic (this is why 112 needs no rebuild).

**Row-merge key already handles Typ 3** (lines 67-78):
```typescript
    if (groupKey === 'roles') {
      const rowsByKey = new Map<string, MemberBadgeGroupRow>()
      for (const item of itemsInGroup) {
        const rowKey = getPresentation(item.badge_code).roleCode ?? item.badge_code
        const existingRow = rowsByKey.get(rowKey)
        if (existingRow) { existingRow.items.push(item) }
        else { rowsByKey.set(rowKey, { key: rowKey, items: [item] }) }
      }
      rows = Array.from(rowsByKey.values())
    }
```
Because `resolveRoleVolumePresentation` returns the parsed `roleCode`, a `role_volume_translator_gold` badge lands in the same row as `role_entry_translator` automatically — zero change here.

**Single additive change — `.roleLabel` prefix** in the row render (lines 118-142): render one `<span className={styles.roleLabel}>{roleName}:</span>` as the first child of each `'roles'`-group `<li className={styles.badgeRow}>`, before `row.items.map(...)`. Resolve `roleName` from the row's `roleCode` (i.e. `row.key` for the roles group) via `FANSUB_GROUP_ROLE_OPTIONS`, fallback to the raw code. Non-`roles` groups render unchanged (no prefix). Existing chip render to preserve verbatim (lines 126-138):
```tsx
<span
  key={item.badge_code}
  className={isEarned ? styles.badgeStep : styles.badgeStepLocked}
  data-palette={presentation.palette}
  data-earned={isEarned ? 'true' : 'false'}
>
  <span className={styles.badgeItem}>
    <span className={styles.badgeIcon} …>{isEarned ? <Icon size={16} … /> : <Lock size={16} … />}</span>
    <span>{item.label}</span>
  </span>
</span>
```
Reuse `Card`/`SectionHeader` from `@/components/ui` unchanged (CLAUDE.md global-primitives mandate; no new native controls — pure display).

---

### `MemberBadgeChain.module.css` (config, MODIFY)

**Analog A (palette rules):** lines 84-107 — copy the `[data-palette="…"]` rule shape exactly:
```css
.badgeStep[data-palette="gold"],
.badgeStepLocked[data-palette="gold"] {
  --badge-accent: var(--color-warning);
}
```
Add three new pairs beneath (UI-SPEC lines 90-99):
- `bronze` → `--badge-accent: color-mix(in srgb, var(--color-warning) 55%, var(--text-secondary) 45%);`
- `silver` → `--badge-accent: var(--text-secondary);`
- `platinum` → `--badge-accent: color-mix(in srgb, var(--color-primary) 45%, var(--text-secondary) 55%);`
(`gold` reused as-is.) No new hex literals — all via existing tokens + `color-mix`, matching the `orange`/`red` precedent (lines 94-106).

**Analog B (`.roleLabel`):** copy `.groupTitle` values (lines 60-68) into a new inline class:
```css
.roleLabel {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-secondary);
  white-space: nowrap;
}
```
New class only because it sits inline in the flex `.badgeRow` (gap already 8px, line 73) rather than as a block heading. No new spacing/type tokens.

---

### `members/[slug]/page.tsx` (route, SSR MODIFY)

**Analog:** existing badge assembly (line 90) + component call (lines 138-139):
```tsx
const publicBadges = profile.public_badges ?? []
// …
<MemberBadgeChain
  earnedBadges={publicBadges}
```
Phase 112 delta (RESEARCH lines 279-281): derive the milestone from the already-threaded `total_points` and merge into the array — keeps `MemberBadgeChain` domain-agnostic (it never learns about `total_points`):
```tsx
const milestoneBadge = deriveMilestoneBadge(profile.total_points ?? 0)
const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges
// … earnedBadges={earnedBadges}
```
`total_points` already flows on `PublicMemberProfileData` (backend `TotalPoints`, `json:"total_points"`) — no new fetch, no new prop.

---

### `memberBadgeLabels.test.ts` (test, unit NEW)

**Analog:** `frontend/src/components/profile/deriveKnownFor.test.ts` (pure-function Vitest unit test in the same directory — closest structural analog for testing a pure helper without jsdom/RTL). Cover `deriveMilestoneBadge` boundaries (0→null, 1, 49, 50, 199, 200, 2500, 2501) and `resolveRoleVolumePresentation` (tier parse, roleCode extraction, unknown-role fallback). Command: `cd frontend && npm run test -- memberBadgeLabels`.

---

### `MemberBadgeChain.test.tsx` (test, unit MODIFY)

**Analog:** the existing file's injectable-presentation harness (lines 1-45) — `fakePresentation({ group, roleCode })` and the dynamic `loadMemberBadgeChain()` import. Add a case feeding a synthetic `role_entry_translator` + `role_volume_translator_gold` pair and asserting `buildMemberBadgeGroups` returns ONE `roles` row with both items, plus a `.roleLabel` prefix render assertion. Command: `cd frontend && npm run test -- MemberBadgeChain`.

## Shared Patterns

### Live-projection / never-persisted derivation (GAM-04, D-02)
**Source:** `member_profile_repository.go` lines 592-596 (comment) + 597-618 (role-entry UNION); `deriveMilestoneBadge` (frontend).
**Apply to:** Both new badge families. Compute fresh on every `GetPublicMemberProfile` read (Typ 3) / every SSR render (Typ 2). `ID: 0`, never write to `member_badges`, no cache. A reversed credit / storno is invisible on the very next read by construction — the entire security + integrity story (RESEARCH Security Domain) rests on reusing this pattern, not adding cache invalidation.

### Go error-wrapping idiom
**Source:** `member_profile_story_image_repository.go` + `member_profile_repository.go` throughout.
**Apply to:** the new repository file. `fmt.Errorf("<verb> for member %d: %w", memberID, err)` on every Query/Scan/Err step; `if err != nil { return nil, ... }`. For a QueryRow no-rows case use `errors.Is(err, pgx.ErrNoRows)` → return zero value, not error (see `loadTotalPoints` lines 633-635).

### 450-line-limit split-file convention
**Source:** `member_profile_story_image_repository.go` (extension methods on `*MemberProfileRepository`, same package, `r.db`).
**Apply to:** Typ 3 backend read → new file, never inline into the 1875-line `member_profile_repository.go`. Line-count check `memberBadgeLabels.ts` at plan-verification (adding 6 entries + resolver + `deriveMilestoneBadge` to today's 109 lines stays well under 450, but confirm).

### German-with-umlauts user-facing strings
**Source:** `memberBadgeLabels.ts` labels, `FANSUB_GROUP_ROLE_OPTIONS` (`Übersetzung`, `Qualitätsprüfung`, `Gruppenleitung`).
**Apply to:** all new labels (`Erster Beitrag`, `Archiv-Legende`, tier labels `Silber`/`Platin`, prefix `{Rollenname}:`). Backend emits only machine-readable `badge_code`s (English tier tokens) — no German strings cross the Go/client boundary; labels resolve client-side.

### Global UI primitives mandate (CLAUDE.md)
**Source:** `MemberBadgeChain.tsx` lines 3 (`import { Card, SectionHeader } from '@/components/ui'`).
**Apply to:** all rendering. Phase 112 adds zero interactive controls — keep reusing `Card`/`SectionHeader` unchanged, no hand-rolled `<select>/<input>/<button>`, stay within the existing `.badgeStep`/`.badgeRow` chip markup. The closest-analog rule must NOT override this.

## No Analog Found

None. Every net-new surface has an exact or role-match in-repo analog. The only genuinely net-new code is (a) `highestRoleVolumeTier` and (b) `deriveMilestoneBadge` — both are the same trivial "highest reached step" pure function, and RESEARCH Don't-Hand-Roll mandates one consistent shape for both rather than treating either as a novel pattern.

## Metadata

**Analog search scope:** `backend/internal/repository/` (member_profile split-files, postgres test), `backend/internal/models/member_profile.go`, `frontend/src/components/profile/` (MemberBadgeChain, memberBadgeLabels, tests), `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/types/fansub.ts`.
**Files scanned:** ~10 (all directly verified by targeted read/grep).
**Pattern extraction date:** 2026-07-28
