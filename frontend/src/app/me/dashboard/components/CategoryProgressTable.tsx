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
  POINT_MILESTONES,
  getMemberBadgePresentation,
  resolveNextPointMilestone,
  resolveNextRoleVolumeThreshold,
  type MemberBadgeVariant,
} from '@/components/profile/memberBadgeLabels'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { OwnDashboardCategoryProgress, OwnDashboardData, OwnDashboardRoleVolumeEntry } from '@/types/dashboard'

export interface CategoryProgressTableProps {
  data: OwnDashboardData
}

// D-04: feste Anzeigereihenfolge der drei Contribution-Familien (Phase 113) -- die vom
// Backend gelieferte category_progress-Array-Reihenfolge wird bewusst NICHT vertraut, sondern
// hier deterministisch erzwungen (UI-SPEC Section 3: Bildarchivar, Chronist, dok. Projekte).
const CATEGORY_FAMILY_ORDER: OwnDashboardCategoryProgress['family'][] = [
  'contribution_archivist',
  'contribution_chronicle',
  'contribution_projects',
]

// Reine Praesentations-Labels (KEINE Schwellenwerte) fuer die "Kategorie"-Zelle der drei
// Contribution-Familien -- analog zur bereits bestehenden, ebenfalls privaten
// ROLE_VOLUME_TIER_LABELS-Konvention in memberBadgeLabels.ts. Alle Zahlen/Schwellen kommen
// ausschliesslich aus data.category_progress (next_threshold) bzw. den 116-01-Helfern.
const CATEGORY_FAMILY_LABELS: Record<OwnDashboardCategoryProgress['family'], string> = {
  contribution_archivist: 'Bildarchivar',
  contribution_chronicle: 'Chronist',
  contribution_projects: 'Dokumentierte Projekte',
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

function resolveRoleLabel(roleCode: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === roleCode)?.label ?? roleCode
}

function formatProgressText(
  nextThreshold: number | null,
  currentCount: number,
  nextLabel: string | null,
): string {
  if (nextThreshold === null || nextLabel === null) return 'Höchste Stufe erreicht'
  return `noch ${nextThreshold - currentCount} bis ${nextLabel}`
}

function buildPointsRow(totalPoints: number): ProgressRow {
  const resolved = resolveNextPointMilestone(totalPoints)
  const nextMilestone = POINT_MILESTONES.find((milestone) => milestone.threshold === resolved.nextThreshold)
  const nextLabel = nextMilestone ? getMemberBadgePresentation(nextMilestone.badge_code).label : null
  const presentation = resolved.currentBadge ? getMemberBadgePresentation(resolved.currentBadge.badge_code) : null

  return {
    key: 'points-milestone',
    categoryLabel: 'Punkte-Meilenstein',
    badge: presentation
      ? { label: presentation.label, variant: presentation.variant }
      : { label: NO_TIER_LABEL, variant: 'muted' },
    progressText: formatProgressText(resolved.nextThreshold, totalPoints, nextLabel),
  }
}

function buildRoleVolumeRow(entry: OwnDashboardRoleVolumeEntry): ProgressRow {
  const resolved = resolveNextRoleVolumeThreshold(entry.count)
  const badgeCode = resolved.currentTier ? `role_volume_${entry.role_code}_${resolved.currentTier}` : null
  const presentation = badgeCode ? getMemberBadgePresentation(badgeCode) : null

  return {
    key: `role-volume-${entry.role_code}`,
    categoryLabel: `${resolveRoleLabel(entry.role_code)} · Rollen-Volumen`,
    badge: presentation
      ? { label: presentation.label, variant: presentation.variant }
      : { label: NO_TIER_LABEL, variant: 'muted' },
    progressText: formatProgressText(resolved.nextThreshold, entry.count, resolved.nextTierLabel),
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

function buildProgressRows(data: OwnDashboardData): ProgressRow[] {
  const rows: ProgressRow[] = [buildPointsRow(data.total_points)]

  for (const entry of data.role_volume) {
    rows.push(buildRoleVolumeRow(entry))
  }

  for (const family of CATEGORY_FAMILY_ORDER) {
    const row = data.category_progress.find((item) => item.family === family)
    if (row) rows.push(buildCategoryRow(row))
  }

  return rows
}

/**
 * "Fortschritt je Kategorie" (D-04): merged Punkte-Meilenstein-/Rollen-Volumen-Zeilen
 * (client-berechnet via die Plan-116-01-Helfer) mit den server-gelieferten
 * category_progress-Zeilen (Phase 113). Definiert selbst NIEMALS einen neuen
 * Schwellenwert -- jede Zahl kommt aus data oder einem 116-01-Helfer.
 */
export function CategoryProgressTable({ data }: CategoryProgressTableProps) {
  const hasActivity =
    data.total_points > 0 ||
    data.role_volume.length > 0 ||
    data.category_progress.some((row) => row.current_tier !== '')

  const rows = hasActivity ? buildProgressRows(data) : []

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
