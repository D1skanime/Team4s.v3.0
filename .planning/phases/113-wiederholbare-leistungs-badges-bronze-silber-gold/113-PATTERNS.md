# Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 7 (2 neu, 5 modifiziert) + 1 Do-not-touch
**Analogs found:** 7 / 7 (alle mit exaktem Präzedenzfall aus Phase 112)

Diese Phase ist reine Komposition bestehender, produktiver Bausteine (Phase 110/112). Für
**jede** neue Datei existiert ein 1:1 kopierbarer Analog im selben Repository. Es gibt keinen
neuen Stack, keine neue Fläche, keinen neuen Buchungspfad — nur read-time Aggregation + Emission
synthetischer `PublicMemberBadge{ID:0}` und eine neue Frontend-Präsentationsgruppe.

## File Classification

| Neue/Modifizierte Datei | Rolle | Datenfluss | Nächster Analog | Match |
|-------------------------|-------|------------|-----------------|-------|
| `backend/internal/repository/member_profile_contribution_badges_repository.go` (NEU) | repository | batch / read-time aggregation | `backend/internal/repository/member_profile_role_volume_repository.go` | exact |
| `backend/internal/repository/member_profile_contribution_badges_repository_test.go` (NEU) | test | unit (Schwellen) | `member_profile_repository_postgres_test.go:228-242` (`TestHighestRoleVolumeTier`) | exact |
| `backend/internal/repository/member_profile_repository.go` (MOD, ≤5 Zeilen) | repository | request-response callsite | eigene Datei `:535-539` (`loadRoleVolumeBadges`-Callsite) | exact |
| `frontend/src/components/profile/memberBadgeLabels.ts` (MOD) | config / presentation-catalog | transform (lookup-map) | eigene Datei `:71-90` (`point_milestone_*` + Gruppen-Labels/Order) | exact |
| `frontend/src/components/profile/MemberBadgeChain.tsx` (MOD ODER unverändert) | component | render | eigene Datei `buildMemberBadgeGroups:67-93` | exact — nimmt Gruppe ohne Umbau auf |
| `frontend/src/components/profile/memberBadgeLabels.test.ts` (MOD) | test | unit (Vitest) | eigene Datei (bestehend) | exact — additiv erweitern |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` (MOD) | test | unit (Vitest) | eigene Datei (bestehend) | exact — additiv erweitern |
| `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx` (DO NOT TOUCH) | component | — | — | Anti-Pattern: derived Badges dürfen hier NICHT erscheinen |

**Optional** (Wave-0-Gap, Integrationstest): entweder als weiterer Test in der neuen Test-Datei
oder in `member_profile_repository_postgres_test.go` (MOD), Analog `TestLoadPublicBadgesPostgresRoleVolume:186-226`.

---

## Pattern Assignments

### `member_profile_contribution_badges_repository.go` (repository, read-time aggregation) — NEU

**Analog:** `backend/internal/repository/member_profile_role_volume_repository.go` (komplette Datei, 69 Zeilen)

Dieses Split-File ist das Herz der Phase. Es enthält **drei** Schwellenfunktionen + **drei**
Aggregations-Reads + **eine** Sammelfunktion `loadContributionBadges`, die alle drei Familien als
`[]PublicMemberBadge{ID:0}` zurückgibt. Struktur, Fehlerbehandlung, Package und Empfänger-Typ
werden 1:1 aus dem role-volume-Blueprint übernommen.

**Package + Imports** (`member_profile_role_volume_repository.go:1-8`):
```go
package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)
```

**Reine Schwellenfunktion — pro Familie eine** (Blueprint `:15-28` `highestRoleVolumeTier`).
Absteigend, höchste Stufe zuerst, `""` = keine Stufe. Tier-Tokens intern-englisch
(bronze/silver/gold), konsistent mit `role_volume_*`/`productive_*`. Schwellen aus CONTEXT:
```go
// Familie 1 — Projekte: 1 / 5 / 15
func highestContribProjectsTier(count int) string {
	switch {
	case count >= 15:
		return "gold"
	case count >= 5:
		return "silver"
	case count >= 1:
		return "bronze"
	default:
		return ""
	}
}
// Familie 2 (Chronist) + Familie 3 (Bildarchivar): identische Struktur, Schwellen 150 / 50 / 10.
```

**Aggregations-Read + ID:0-Emission** (Blueprint `:36-69` `loadRoleVolumeBadges`). Jede Familie
folgt exakt diesem Muster: `r.db.Query` → `rows.Scan(&count)` → `if tier != "" { append }`.
`BadgeCategory` = `"contribution"` (siehe Frontend-Gruppe). Beispiel Familie 3:
```go
func (r *MemberProfileRepository) loadContributionBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	items := make([]models.PublicMemberBadge, 0)

	// --- Familie 3 (Bildarchivar): COUNT(*) über release_version_media, Autor-Seam, net soft-delete ---
	var archivistCount int
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media rvm
		WHERE rvm.deleted_at IS NULL
		  AND rvm.uploaded_by_user_id IN (
		      SELECT au.legacy_user_id
		      FROM member_claims mc
		      JOIN app_users au ON au.id = mc.app_user_id
		      WHERE mc.member_id = $1
		        AND mc.claim_status = 'verified'
		        AND au.legacy_user_id IS NOT NULL
		  )
	`, memberID).Scan(&archivistCount); err != nil {
		return nil, fmt.Errorf("load archivist badge count for member %d: %w", memberID, err)
	}
	if tier := highestContribArchivistTier(archivistCount); tier != "" {
		items = append(items, models.PublicMemberBadge{
			ID:            0,
			BadgeCode:     "contribution_archivist_" + tier,
			BadgeCategory: "contribution",
		})
	}
	// ... Familie 1 + Familie 2 analog ...
	return items, nil
}
```

**Autor→Member-Seam (Pflicht Familie 3, optional Familie 2)** — kopieren aus
`member_profile_repository.go:1379-1386` (Query `media_rows` in `loadLatestContributions`):
```sql
WHERE rvm.uploaded_by_user_id IN (
    SELECT au.legacy_user_id
    FROM member_claims mc
    JOIN app_users au ON au.id = mc.app_user_id
    WHERE mc.member_id = $1
      AND mc.claim_status = 'verified'
      AND au.legacy_user_id IS NOT NULL
)
```
WICHTIG (Anti-Pattern D-04): Die `review_statuses='approved'` + `visibilities='public'`-Joins aus
`loadLatestContributions` (`member_profile_repository.go:1371-1372`) **NICHT** übernehmen — Familie 3
zählt review-/visibility-unabhängig, nur `deleted_at IS NULL`.

**Familie 2 (Chronist) — sichere Kernquelle** (`member_id` direkt, kein Seam nötig):
```sql
SELECT COUNT(*) FROM release_version_notes
WHERE member_id = $1 AND status = 'published' AND deleted_at IS NULL
```
Optional additiv (via Autor-Seam oben): `anime_fansub_project_notes` + `fansub_group_notes`
(`created_by_user_id → users`), gleiche Gates. Offene Politik A2/A3 (siehe „Offene Entscheidungen").

**Familie 1 (Coverage) — anspruchsvollste Query.** Baut auf der bereits produktiven
Projekt-Release-Mengen-Definition auf (`member_profile_repository.go:1661-1666`,
`total_release_version_count`-Subquery, „Projekt = (anime_id, fansub_group_id)"):
```sql
SELECT COUNT(DISTINCT rv.id)
FROM release_versions rv
JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
JOIN fansub_releases fr ON fr.id = rv.release_id
JOIN episodes ep ON ep.id = fr.episode_id
WHERE ep.anime_id = :anime_id AND rvg.fansub_group_id = :fansub_group_id
```
Coverage-Check gegen `release_role_credit_lifecycles WHERE member_id=$1 AND lifecycle_status='awarded'`
(Netto = „awarded", reversed ausgeschlossen). Empfohlene Query-Form: RESEARCH.md „Recommended
Familie-1 Query-Shape" (`113-RESEARCH.md:204-229`). LANDMINE A1: „Release-Menge des Projekts" =
nur Versionen mit ≥1 awarded Credit von irgendwem (nicht literal jede `release_version`) — siehe
„Offene Entscheidungen".

---

### `member_profile_repository.go` (repository, Callsite) — MOD, ≤5 Zeilen

**Analog:** eigene Datei, `GetPublicMemberProfile:535-539` (der Phase-112-`loadRoleVolumeBadges`-Anschluss).

Neuer Aufruf direkt **nach** dem role-volume-Append, identische Fehler-/Append-Form:
```go
volumeBadges, loadErr := r.loadRoleVolumeBadges(ctx, row.memberID)   // Zeile 535-539 (Bestand)
if loadErr != nil {
	return nil, loadErr
}
profile.PublicBadges = append(profile.PublicBadges, volumeBadges...)

// NEU (Phase 113) — exakt dasselbe Muster:
contributionBadges, loadErr := r.loadContributionBadges(ctx, row.memberID)
if loadErr != nil {
	return nil, loadErr
}
profile.PublicBadges = append(profile.PublicBadges, contributionBadges...)
```
Constraint (Pitfall 5): `member_profile_repository.go` ist bereits **1881 Zeilen** (weit über
450). Nur dieser ≤5-Zeilen-Callsite-Diff darf hier landen; alle Familien-Reads/Schwellen gehören
ins neue Split-File.

---

### `memberBadgeLabels.ts` (config / presentation-catalog) — MOD

**Analog:** eigene Datei, `point_milestone_*`-Block `:71-79` + Gruppen-Definitionen `:82-90`.

**Gruppen-Typ + Label + Order erweitern** (`:34`, `:83-90`) — neuer Key `contributions`:
```ts
export type MemberBadgeGroup = 'roles' | 'progress' | 'contributions' | 'membership' | 'special'

export const MEMBER_BADGE_GROUP_LABELS: Record<MemberBadgeGroup, string> = {
  roles: 'Rollen',
  progress: 'Fortschritt',
  contributions: 'Beiträge',        // NEU (UI-SPEC Copywriting Contract)
  membership: 'Mitgliedschaft',
  special: 'Besondere Auszeichnungen',
}

// UI-SPEC: zwischen progress und membership
export const MEMBER_BADGE_GROUP_ORDER: MemberBadgeGroup[] =
  ['roles', 'progress', 'contributions', 'membership', 'special']
```

**9 Presentation-Einträge** — exakt das `point_milestone_*`-Muster (`:71-79`): statische
Map-Einträge, `group: 'contributions'`, **bewusst NICHT** in `PUBLIC_MEMBER_BADGE_CATALOG`
aufgenommen (earned-only, kein Locked-Chip). Codes/Labels/Icons/Palette sind im UI-SPEC
(`113-UI-SPEC.md:141-151`) verbindlich festgelegt:
```ts
// group: 'contributions', KEIN roleCode (roleCode-Merge ist roles-only)
contribution_projects_bronze:  { label: 'Mitgetragene Projekte · Bronze', variant: 'muted',   Icon: FolderCheck, palette: 'bronze', group: 'contributions' },
contribution_projects_silver:  { label: 'Mitgetragene Projekte · Silber', variant: 'neutral', Icon: FolderCheck, palette: 'silver', group: 'contributions' },
contribution_projects_gold:    { label: 'Mitgetragene Projekte · Gold',   variant: 'warning', Icon: FolderCheck, palette: 'gold',   group: 'contributions' },
contribution_chronicle_bronze: { label: 'Chronist · Bronze', variant: 'muted',   Icon: ScrollText, palette: 'bronze', group: 'contributions' },
contribution_chronicle_silver: { label: 'Chronist · Silber', variant: 'neutral', Icon: ScrollText, palette: 'silver', group: 'contributions' },
contribution_chronicle_gold:   { label: 'Chronist · Gold',   variant: 'warning', Icon: ScrollText, palette: 'gold',   group: 'contributions' },
contribution_archivist_bronze: { label: 'Bildarchivar · Bronze', variant: 'muted',   Icon: Images, palette: 'bronze', group: 'contributions' },
contribution_archivist_silver: { label: 'Bildarchivar · Silber', variant: 'neutral', Icon: Images, palette: 'silver', group: 'contributions' },
contribution_archivist_gold:   { label: 'Bildarchivar · Gold',   variant: 'warning', Icon: Images, palette: 'gold',   group: 'contributions' },
```
- **Neue Icon-Imports** in den `lucide-react`-Block (`:1-25`): `FolderCheck`, `ScrollText`, `Images`.
- **Palette-Tokens** `bronze`/`silver`/`gold` existieren bereits im `MemberBadgePalette`-Typ (`:30`)
  und als `data-palette`-CSS-Regeln — nichts Neues.
- Palette/Variant-Zuordnung pro Tier verbindlich aus UI-SPEC `:103-111` (muted/neutral/warning).
- **KEIN** dynamischer Resolver wie `resolveRoleVolumePresentation` nötig: diese 9 Codes stehen
  statisch in der Map (wie `point_milestone_*`), `getMemberBadgePresentation` (`:180-193`) findet
  sie direkt über den bestehenden Fallback-Pfad. Nur wenn der Planner Codes dynamisch parsen will,
  wäre `resolveRoleVolumePresentation:155-178` das Vorbild — für 9 feste Codes overengineered.

---

### `MemberBadgeChain.tsx` (component, render) — voraussichtlich UNVERÄNDERT

**Analog:** eigene Datei, `buildMemberBadgeGroups:67-93` + Render-Loop `:121-157`.

`buildMemberBadgeGroups` iteriert `MEMBER_BADGE_GROUP_ORDER` und filtert leere Gruppen
(`.filter((group) => group.rows.length > 0)`, `:92`). Die neue `contributions`-Gruppe wird damit
**ohne Code-Änderung** aufgenommen — sie erscheint nur, wenn ≥1 Familie erreicht ist (UI-SPEC
„Gruppe leer = Gruppe verborgen"). Der earned-only-Merge läuft über `catalogWithEarnedBadges:44-62`
(Codes nicht im Katalog → nur wenn earned). Der `roles`-Sonderpfad (roleCode-Merge, `:75-86`)
greift für `contributions` **nicht** (kein `roleCode` gesetzt → pro Badge eine Zeile, UI-SPEC
„pro Familie genau EIN Chip"). Diese Datei nur anfassen, falls ein Test eine Signaturänderung
erzwingt — Default: reiner Konsument.

---

### Frontend-Tests (unit, Vitest) — MOD

**Analoga:** `memberBadgeLabels.test.ts` + `MemberBadgeChain.test.tsx` (beide bestehend, additiv erweitern).

- `memberBadgeLabels.test.ts`: 9 neue Codes assert-en (Label/Icon/palette/group `contributions`),
  Gruppen-Label `'Beiträge'` + Order-Position, und **Negativassertion**: die 9 Codes sind NICHT in
  `PUBLIC_MEMBER_BADGE_CATALOG` (Muster wie bestehende `point_milestone_*`-Assertion).
- `MemberBadgeChain.test.tsx`: `buildMemberBadgeGroups` mit earned `contribution_*`-Badges → Gruppe
  `contributions` erscheint mit je EINER Zeile pro Familie; ohne earned → Gruppe fehlt (leer-Filter).
- Kommando: `cd frontend && npx vitest run src/components/profile/` (RESEARCH Validation Architecture).

---

### `member_profile_contribution_badges_repository_test.go` (test, unit) — NEU

**Analog:** `member_profile_repository_postgres_test.go:228-242` (`TestHighestRoleVolumeTier`).

DB-freie Grenzwert-Tests pro Familie — Struktur 1:1 kopieren, Schwellen anpassen:
```go
func TestHighestContribProjectsTier(t *testing.T) {
	require.Equal(t, "", highestContribProjectsTier(0))
	require.Equal(t, "bronze", highestContribProjectsTier(1))
	require.Equal(t, "bronze", highestContribProjectsTier(4))
	require.Equal(t, "silver", highestContribProjectsTier(5))
	require.Equal(t, "silver", highestContribProjectsTier(14))
	require.Equal(t, "gold", highestContribProjectsTier(15))
}
// Chronist / Bildarchivar: Grenzwerte 9/10, 49/50, 149/150.
```
Kommando: `cd backend && go test ./internal/repository/... -run "TestHighestContrib" -v`.

**Optionaler Integrationstest** (Wave-0-Gap, läuft SKIP ohne `TEAM4S_PHASE106_TEST_DSN`) — Analog
`TestLoadPublicBadgesPostgresRoleVolume:186-226`: award N → Stufe sichtbar; reverse unter Schwelle
→ Stufe verschwindet (D-01 Live-Downgrade); Coverage-Vollständigkeit (D-02); note published/deleted
(D-03); media count/soft-delete (D-04). Hilfsfunktionen `containsPublicBadge`, `postgresAwardInput`,
`insertRoleEntryLifecycleRow` sind im bestehenden Postgres-Testfile wiederverwendbar.

---

## Shared Patterns

### Read-time synthetisches Badge (ID:0, nie persistiert) — GAM-04 / D-05
**Source:** `member_profile_role_volume_repository.go:56-62`
**Apply to:** alle drei Familien im neuen Split-File.
```go
items = append(items, models.PublicMemberBadge{
	ID:            0,               // 0 = nie in member_badges geschrieben, jeder Read neu berechnet
	BadgeCode:     "contribution_" + family + "_" + tier,
	BadgeCategory: "contribution",
})
```
Anti-Pattern: **kein** `UpsertMemberBadge`, **kein** INSERT in `member_badges`. Live-Downgrade
(D-01) ergibt sich automatisch, weil jeder Read frisch aggregiert.

### Netto-/Storno-Semantik über Ledger — D-01
**Source:** `member_profile_role_volume_repository.go:40` (`lifecycle_status='awarded'`)
**Apply to:** Familie 1 (Ledger). „awarded" ist bereits der Netto-Zustand; reversed-Zeilen fallen raus.
Nicht selbst über `point_ledger_entries` reversal-summieren.

### Autor→Member-Seam (verified member_claims) — Familie 3 Pflicht, Familie 2 optional
**Source:** `member_profile_repository.go:1379-1386`
**Apply to:** `release_version_media` (Pflicht) und die beiden Seam-Notiztabellen. Behandelt
`legacy_user_id IS NULL` + `claim_status='verified'` korrekt. Bewusst dokumentierte Asymmetrie
(Pitfall 3): historische Member ohne verifizierten App-User-Link zählen bei Seam-Quellen nicht mit.

### Split-File-Konvention (450-Zeilen-Limit) — CLAUDE.md
**Source:** Phase-112-Präzedenz `member_profile_role_volume_repository.go` + Callsite `:535-539`
**Apply to:** gesamte neue Backend-Logik. Extension-Methoden auf `*MemberProfileRepository` im
Split-File; Callsite in der 1881-Zeilen-Datei ≤5 Zeilen.

### Earned-only Presentation ohne Katalog-Lock — D-05
**Source:** `memberBadgeLabels.ts:71-79` (`point_milestone_*`) + `MemberBadgeChain.tsx:44-62`
(`catalogWithEarnedBadges`)
**Apply to:** die 9 neuen Codes. In `MEMBER_BADGE_PRESENTATIONS`, **nicht** in
`PUBLIC_MEMBER_BADGE_CATALOG` → erscheinen nur wenn earned, nie als graues Schloss-Chip.

### Globale UI-Primitives (CLAUDE.md-Pflicht)
**Source:** `MemberBadgeChain.tsx:3` (`import { Card, SectionHeader } from '@/components/ui'`)
**Apply to:** UI bleibt innerhalb der bestehenden `Card`/`SectionHeader`-Primitives. UI-SPEC bestätigt:
kein neues natives Control (`<select>/<input>/<button>`), nur Anzeige-Chips. Kein Verstoß-Risiko,
solange keine neue Fläche gebaut wird.

---

## Anti-Patterns (Do NOT do)

| Anti-Pattern | Quelle/Grund | Stattdessen |
|--------------|--------------|-------------|
| Derived Badges in `AchievementBadgesCard.tsx` (Toggle-UI) einblenden | `AchievementBadgesCard.tsx:31-71` ist die persistierte `member_badges`-Fläche mit Sichtbarkeits-Toggle | Nur in öffentlicher `MemberBadgeChain` (`members/[slug]/page.tsx:142-146`); `/me` bleibt unangetastet |
| Familie 3 mit `review_statuses`/`visibilities`-Join zählen | `member_profile_repository.go:1371-1372` (loadLatestContributions) — D-04 verlangt visibility-unabhängig | Nur `deleted_at IS NULL` + Autor-Seam |
| Persistente Row / `member_badges`-INSERT für derived Badge | GAM-04 / D-05, bricht Live-Downgrade | Immer `ID:0`, read-time |
| Neue Familien-Logik in `member_profile_repository.go` (1881 Z.) anhängen | Pitfall 5 / 450-Zeilen-Limit | Neues Split-File; Callsite ≤5 Zeilen |
| Familie 1 literal „jede release_version des Projekts" | Pitfall 1 — macht Familie 1 durch Alt-Releases fast immer leer | Nur Versionen mit ≥1 awarded Credit (A1, bestätigen lassen) |
| `roleCode` an die 9 Presentation-Einträge setzen | roleCode-Merge ist roles-only (`MemberBadgeChain.tsx:75-86`) | Kein `roleCode` → pro Familie eine Zeile |

---

## Offene Entscheidungen (Planner MUSS bestätigen — aus RESEARCH Assumptions Log)

| # | Frage | Empfehlung Research | Auswirkung |
|---|-------|---------------------|------------|
| A1 | Familie-1 „Release-Menge eines Projekts": literal alle `release_version` vs. nur ledger-erfasste (≥1 awarded Credit) | Nur ledger-erfasste (robust gegen Alt-Daten) — **CONTEXT D-02 hat das bereits bestätigt** | HOCH — falsche Wahl macht Familie 1 fast immer leer |
| A2 | Chronist-Tabellenmenge: nur `release_version_notes` oder additiv `anime_fansub_project_notes` + `fansub_group_notes` (Seam) | `release_version_notes` Pflicht-Kern, Seam-Tabellen additiv | MITTEL — verändert erreichte Stufe |
| A3 | Chronist zählt interne (`visibility='internal'`) veröffentlichte Notizen mit? | visibility-unabhängig (`status='published' AND deleted_at IS NULL`) | MITTEL — Politik-Entscheidung |

CONTEXT D-02/D-03 lösen A1 (ledger-erfasst) und A3 (`status='published' AND deleted_at IS NULL`,
alle drei Notiz-Flächen) bereits auf — der Planner sollte diese Entscheidungen aus CONTEXT
zitieren, nicht neu treffen.

---

## No Analog Found

Keine. Für jede neue/modifizierte Datei existiert ein exakter Präzedenzfall aus Phase 110/112 im
selben Repository. RESEARCH.md muss als Pattern-Quelle nirgends einspringen.

---

## Metadata

**Analog search scope:**
- `backend/internal/repository/` (role_volume-Blueprint, member_profile-Callsite/Seams, Postgres-Test)
- `frontend/src/components/profile/` (memberBadgeLabels, MemberBadgeChain, AchievementBadgesCard, Tests)
- `frontend/src/app/members/[slug]/` + `frontend/src/app/me/profile/` (Render- vs. Toggle-Seam)

**Files scanned:** 8 gelesen (role_volume repo, member_profile repo × 3 Sektionen, memberBadgeLabels,
MemberBadgeChain, AchievementBadgesCard, postgres-test, members/[slug]/page) + Glob/Grep-Discovery.

**Pattern extraction date:** 2026-07-28
</content>
</invoke>
