import {
  Badge,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  getMemberBadgePresentation,
  type MemberBadgeVariant,
} from '@/components/profile/memberBadgeLabels'
import { labelForRole, orderForContext } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type { OwnDashboardCategoryProgress, OwnDashboardData, OwnDashboardRoleVolumeEntry } from '@/types/dashboard'

export interface CategoryProgressTableProps {
  data: OwnDashboardData
}

// D-04: feste Anzeigereihenfolge der drei Contribution-Familien (Phase 113) -- die vom
// Backend gelieferte category_progress-Array-Reihenfolge wird bewusst NICHT vertraut, sondern
// hier deterministisch erzwungen (UI-SPEC Section 3: Bildarchivpflege, Chronikpflege, dok. Projekte).
const CATEGORY_FAMILY_ORDER: OwnDashboardCategoryProgress['family'][] = [
  'contribution_archivist',
  'contribution_chronicle',
  'contribution_projects',
]

// Reine Praesentations-Labels (KEINE Schwellenwerte) fuer die "Kategorie"-Zelle der drei
// Contribution-Familien -- analog zur bereits bestehenden, ebenfalls privaten
// ROLE_VOLUME_TIER_LABELS-Konvention in memberBadgeLabels.ts. Alle Zahlen/Schwellen kommen
// ausschliesslich aus data.category_progress (next_threshold) bzw. data.points_progress.
// "points" ist hier nur fuer Typ-Vollstaendigkeit gelistet (Phase 150 D-08 erweitert
// OwnDashboardCategoryProgress['family'] um "points") -- diese Tabelle rendert die
// Punkte-Zeile weiterhin ueber die eigene, separate buildPointsRow-Zeile unten
// (CATEGORY_FAMILY_ORDER enthaelt "points" bewusst NICHT), seit Phase 150 (D-12 #2)
// gespeist aus data.points_progress statt einem lokal abgeleiteten Meilenstein.
const CATEGORY_FAMILY_LABELS: Record<OwnDashboardCategoryProgress['family'], string> = {
  contribution_archivist: 'Bildarchivpflege',
  contribution_chronicle: 'Chronikpflege',
  contribution_projects: 'Dokumentierte Projekte',
  points: 'Punkte-Meilenstein',
}

// Reine Tier-Namens-Labels (keine Zahlen) fuer die "noch X bis {Label}"-Zelle der drei
// Contribution-Familien -- die Tier-REIHENFOLGE (bronze -> silver -> gold) spiegelt nur die
// bereits im Backend/Badge-Katalog etablierten *_bronze/*_silver/*_gold-Codes, nie einen
// neuen Zahlenwert.
const CONTRIBUTION_TIER_ORDER = ['bronze', 'silver', 'gold'] as const
type ContributionTier = (typeof CONTRIBUTION_TIER_ORDER)[number]
const CONTRIBUTION_TIER_LABELS: Record<ContributionTier, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
}

// Claude's Discretion: UI-SPEC definiert keine Copy fuer "Tier noch nicht erreicht" (nur
// "noch X bis Y" und "Höchste Stufe erreicht" sind verbindlich) -- neutraler Platzhalter fuer
// den (seltenen) Fall, dass eine Zeile Aktivitaet ausserhalb dieser Familie zeigt, aber diese
// spezielle Familie/Rolle/Punktestand noch unterhalb der ersten Stufe liegt.
const NO_TIER_LABEL = 'Ohne Auszeichnung'

interface ProgressRowBadge {
  label: string
  variant: MemberBadgeVariant
}

interface ProgressRow {
  key: string
  categoryLabel: string
  badge: ProgressRowBadge
  progressText: string
}

function formatProgressText(
  nextThreshold: number | null,
  currentCount: number,
  nextLabel: string | null,
): string {
  if (nextThreshold === null || nextLabel === null) return 'Höchste Stufe erreicht'
  return `noch ${nextThreshold - currentCount} bis ${nextLabel}`
}

function buildPointsRow(row: OwnDashboardCategoryProgress): ProgressRow {
  const presentation = row.current_tier ? getMemberBadgePresentation(row.current_tier) : null
  const nextLabel = row.next_tier ? getMemberBadgePresentation(row.next_tier).label : null

  return {
    key: 'points-milestone',
    categoryLabel: 'Punkte-Meilenstein',
    badge: presentation
      ? { label: presentation.label, variant: presentation.variant }
      : { label: NO_TIER_LABEL, variant: 'muted' },
    progressText: formatProgressText(row.next_threshold, row.current_count, nextLabel),
  }
}

// D-29: resolveRoleVolumePresentation() liefert seit Task 3 nur noch das nackte Tier-Label
// (z. B. "Bronze", ohne "· <Zahl>+"-Suffix) -- die Zahl kommt hier aus entry.current_threshold
// (Plan 150-02s Companion-Feld), damit der gerenderte String byte-identisch bleibt.
function buildRoleVolumeRow(entry: OwnDashboardRoleVolumeEntry, roles: readonly RoleDefinitionOption[]): ProgressRow {
  const badgeCode = entry.current_tier ? `role_volume_${entry.role_code}_${entry.current_tier}` : null
  const presentation = badgeCode ? getMemberBadgePresentation(badgeCode) : null
  const nextLabel = entry.next_tier
    ? getMemberBadgePresentation(`role_volume_${entry.role_code}_${entry.next_tier}`).label
    : null

  return {
    key: `role-volume-${entry.role_code}`,
    categoryLabel: `${labelForRole(roles, entry.role_code)} · Rollen-Volumen`,
    badge: presentation
      ? {
          label: entry.current_threshold != null
            ? `${presentation.label} · ${entry.current_threshold}+`
            : presentation.label,
          variant: presentation.variant,
        }
      : { label: NO_TIER_LABEL, variant: 'muted' },
    progressText: formatProgressText(entry.next_threshold, entry.count, nextLabel),
  }
}

function buildCategoryRow(row: OwnDashboardCategoryProgress): ProgressRow {
  const badgeCode = row.current_tier ? `${row.family}_${row.current_tier}` : null
  const presentation = badgeCode ? getMemberBadgePresentation(badgeCode) : null

  const currentIndex = row.current_tier
    ? CONTRIBUTION_TIER_ORDER.indexOf(row.current_tier as ContributionTier)
    : -1
  const nextTier = CONTRIBUTION_TIER_ORDER[currentIndex + 1]
  const nextLabel = row.next_threshold === null ? null : nextTier ? CONTRIBUTION_TIER_LABELS[nextTier] : null

  return {
    key: `category-${row.family}`,
    categoryLabel: CATEGORY_FAMILY_LABELS[row.family],
    badge: presentation
      ? { label: presentation.label, variant: presentation.variant }
      : { label: NO_TIER_LABEL, variant: 'muted' },
    progressText: formatProgressText(row.next_threshold, row.current_count, nextLabel),
  }
}

function buildProgressRows(data: OwnDashboardData, roles: readonly RoleDefinitionOption[]): ProgressRow[] {
  const rows: ProgressRow[] = [buildPointsRow(data.points_progress)]

  const counts = new Map(data.role_volume.map((entry) => [entry.role_code, entry]))
  for (const role of orderForContext(roles, 'anime_contribution')) {
    const entry = counts.get(role.code)
    if (entry) rows.push(buildRoleVolumeRow(entry, roles))
    counts.delete(role.code)
  }
  for (const entry of counts.values()) {
    rows.push(buildRoleVolumeRow(entry, roles))
  }

  for (const family of CATEGORY_FAMILY_ORDER) {
    const row = data.category_progress.find((item) => item.family === family)
    if (row) rows.push(buildCategoryRow(row))
  }

  return rows
}

/**
 * "Fortschritt je Kategorie" (D-04): merged die Punkte-Meilenstein-/Rollen-Volumen-Zeilen
 * mit den server-gelieferten category_progress-Zeilen (Phase 113). Seit Phase 150 (D-12)
 * liest jede Zeile Tier/Schwelle/Rest ausschliesslich aus dem jeweiligen Response-Feld
 * (data.points_progress, data.role_volume[], data.category_progress[]) -- diese Tabelle
 * definiert selbst NIEMALS einen neuen Schwellenwert.
 */
export function CategoryProgressTable({ data }: CategoryProgressTableProps) {
  const { roles } = useRoleCatalog('anime_contribution')
  const hasActivity =
    data.total_points > 0 ||
    data.role_volume.length > 0 ||
    data.category_progress.some((row) => row.current_tier !== '')

  const rows = hasActivity ? buildProgressRows(data, roles) : []

  return (
    <section>
      <SectionHeader title="Fortschritt je Kategorie" />
      <Table variant="compact">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Kategorie</TableHeaderCell>
            <TableHeaderCell>Aktuelle Stufe</TableHeaderCell>
            <TableHeaderCell>Fortschritt</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyState
              colSpan={3}
              title="Noch kein Fortschritt"
              description="Sobald du an einem Projekt mitwirkst, siehst du hier deinen Fortschritt je Kategorie."
            />
          ) : (
            rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.categoryLabel}</TableCell>
                <TableCell>
                  <Badge variant={row.badge.variant}>{row.badge.label}</Badge>
                </TableCell>
                <TableCell>{row.progressText}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  )
}
