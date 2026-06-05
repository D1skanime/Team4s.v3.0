'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Info } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '@/components/ui'
import {
  ApiError,
  getAdminFansubAnime,
  listGroupMembers,
  listPendingMemberClaims,
} from '@/lib/api'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'
import type { HistFansubGroupMember } from '@/types/fansub'
import type { AdminFansubAnimeEntry } from '@/types/admin'

import { PublicPreviewPanel } from './PublicPreviewPanel'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

// Minimale Props-Schnittstelle für die Felder, die ReadinessTab tatsächlich nutzt.
// Ermöglicht Test-Fixtures ohne exakten FansubStatus/FansubGroupType-Cast.
interface ReadinessGroupProps {
  logo_url?: string | null
  banner_url?: string | null
  status?: string | null
  country?: string | null
  founded_year?: number | null
  dissolved_year?: number | null
  can_edit_group?: boolean
  can_edit_notes?: boolean
  [key: string]: unknown
}

interface ReadinessTabProps {
  fansubId: number
  group: ReadinessGroupProps
}

function useTabNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (tab: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', tab)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
}

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

interface ReadinessItem {
  key: string
  label: string
  satisfied: boolean
  targetTab: string
  hint: string
}

interface InfoItem {
  key: string
  label: string
  targetTab: string
  hint: string
}

export function ReadinessTab({ fansubId, group }: ReadinessTabProps) {
  const navigateToTab = useTabNavigation()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [openClaimCount, setOpenClaimCount] = useState(0)
  const [animeCount, setAnimeCount] = useState(0)
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [projects, setProjects] = useState<AdminFansubAnimeEntry[]>([])

  const loadCounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [membersResp, claimsResp, animeResp] = await Promise.all([
        listGroupMembers(fansubId),
        listPendingMemberClaims(fansubId),
        getAdminFansubAnime(fansubId),
      ])
      setMemberCount(membersResp.data.length)
      setOpenClaimCount(claimsResp.length)
      setAnimeCount(animeResp.data.length)
      setMembers(membersResp.data)
      setProjects(animeResp.data)
    } catch (err) {
      setError(
        formatApiError(
          err,
          'Pflegezustand konnte nicht vollständig geladen werden. Bitte lade die Seite neu; die Vorschau bleibt verfügbar.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  // Capability-Gating: kein Inhalt bei fehlenden Rechten
  const canEdit = Boolean(group.can_edit_group) || Boolean(group.can_edit_notes)
  if (!canEdit) return null

  // Bewertbare Readiness-Kriterien (7 Einträge)
  const readinessItems: ReadinessItem[] = [
    {
      key: 'logo',
      label: 'Logo vorhanden',
      satisfied: Boolean(group.logo_url),
      targetTab: 'media',
      hint: 'Im Medien-Tab ergänzen',
    },
    {
      key: 'banner',
      label: 'Banner vorhanden',
      satisfied: Boolean(group.banner_url),
      targetTab: 'media',
      hint: 'Im Medien-Tab ergänzen',
    },
    {
      key: 'description',
      label: 'Kurzbeschreibung vorhanden',
      satisfied: Boolean(buildFansubFactSummary(group as unknown as FansubGroup)),
      targetTab: 'basic',
      hint: 'In Grunddaten ergänzen',
    },
    {
      key: 'members',
      label: 'Mitglieder eingetragen/geprüft',
      satisfied: memberCount > 0,
      targetTab: 'mitglieder',
      hint: 'Mitglieder prüfen',
    },
    {
      key: 'contributions',
      label: 'Externe Mitwirkende geprüft',
      satisfied: animeCount > 0,
      targetTab: 'releases',
      hint: 'In Anime & Veröffentlichungen prüfen',
    },
    {
      key: 'media',
      label: 'Medien korrekt kategorisiert',
      satisfied: animeCount > 0,
      targetTab: 'media',
      hint: 'Im Medien-Tab prüfen',
    },
    {
      key: 'preview',
      label: 'Öffentliche Vorschau verfügbar',
      satisfied: true,
      targetTab: 'basic',
      hint: 'Vorschau unten',
    },
  ]

  // Informative Prüf-Hinweis-Einträge (D-06 — kein satisfied/unsatisfied-Urteil, variant=info)
  const infoItems: InfoItem[] = [
    {
      key: 'story',
      // BEGRÜNDUNG: FansubGroup-DTO enthält kein has_notes-Feld (Lock K — kein neuer Endpunkt).
      // Gruppengeschichte als neutraler informativer Prüf-Hinweis mit Badge variant=info.
      label: 'Gruppengeschichte prüfen',
      targetTab: 'notes',
      hint: 'In der Gruppengeschichte ergänzen',
    },
    {
      key: 'claims',
      label: `Offene Claims: ${openClaimCount}`,
      targetTab: 'claims',
      hint: 'Claims einsehen',
    },
    {
      key: 'contributions-open',
      label: `Offene Vorschläge: ${animeCount > 0 ? '(pro Projekt verfügbar)' : '0'}`,
      targetTab: 'vorschlaege',
      hint: 'Vorschläge einsehen',
    },
  ]

  const allSatisfied = readinessItems.every((item) => item.satisfied)

  return (
    <div className={styles.readinessTabRoot}>
      <SectionHeader
        title="Veröffentlichung & Pflegezustand"
        description="So sieht die öffentliche Fansub-Seite für anonyme Besucher aus. Die Checkliste zeigt, was noch zu pflegen ist – sie blockiert nichts und schaltet nichts frei."
      />

      <Card variant="section">
        <Badge variant="info">
          Hinweis: Die öffentliche Seite ist bereits live. Diese Übersicht ist ein Leitfaden, kein Freigabe-Schalter.
        </Badge>
      </Card>

      <Card variant="section">
        <h3>Bereitschaft</h3>

        {loading ? (
          <LoadingState
            title="Pflegezustand wird geladen"
            description="Team4s lädt die Bereitschafts-Kriterien."
          />
        ) : error ? (
          <ErrorState
            title="Pflegezustand konnte nicht vollständig geladen werden"
            description={error}
            action={
              <Button variant="secondary" size="sm" onClick={() => void loadCounts()}>
                Erneut laden
              </Button>
            }
          />
        ) : allSatisfied ? (
          <EmptyState
            title="Alles gepflegt"
            description="Alle Bereitschafts-Kriterien sind erfüllt. Offene Posten unten sind rein informativ."
          />
        ) : null}

        {!loading && !error && (
          <div className={styles.readinessList}>
            {readinessItems.map((item) => (
              <div key={item.key} className={styles.readinessItem}>
                <Badge
                  variant={item.satisfied ? 'success' : 'warning'}
                  aria-label={item.satisfied ? 'Status: erfüllt' : 'Status: fehlt'}
                >
                  {item.satisfied ? (
                    <>
                      <Check size={12} aria-hidden="true" /> erfüllt
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} aria-hidden="true" /> fehlt
                    </>
                  )}
                </Badge>
                <span className={styles.readinessItemLabel}>{item.label}</span>
                {!item.satisfied ? (
                  <Button
                    variant="subtle"
                    size="sm"
                    rightIcon={<ArrowRight size={13} aria-hidden="true" />}
                    onClick={() => navigateToTab(item.targetTab)}
                  >
                    {item.hint}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <hr className={styles.readinessSectionDivider} />

      <Card variant="section">
        <h3>Offene Posten (zur Kenntnisnahme)</h3>
        <div className={styles.readinessList}>
          {infoItems.map((item) => (
            <div key={item.key} className={styles.readinessItem}>
              <Badge variant="info" aria-label="Information">
                <Info size={12} aria-hidden="true" /> {item.label}
              </Badge>
              <Button
                variant="subtle"
                size="sm"
                rightIcon={<ArrowRight size={13} aria-hidden="true" />}
                onClick={() => navigateToTab(item.targetTab)}
              >
                {item.hint}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <PublicPreviewPanel
        group={group as unknown as FansubGroup}
        members={members}
        projects={projects}
        leaderTimeline={[]}
      />
    </div>
  )
}
