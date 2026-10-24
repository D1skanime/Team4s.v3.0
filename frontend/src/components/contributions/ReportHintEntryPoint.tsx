'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui'
import { getMyMemberships, getOwnProfile } from '@/lib/api'
import { isEligibleForContributions } from '@/lib/contributionsEligibility'
import { useAuthSession } from '@/lib/useAuthSession'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { MembershipEntry } from '@/types/contributions'

import { contributionRoleDefinitions } from './contributionRoles'
import { ProposalForm } from './ProposalForm'

/**
 * Zweiter, kontextueller Einstiegspunkt in dasselbe "Hinweis senden"-Formular, direkt auf der
 * oeffentlichen Projekt- bzw. Release-Seite verankert -- Zielgruppe und Projekt sind aus dem
 * Seiten-Context bereits bekannt und werden ueber ProposalForm's `prefill`-Prop (Plan 191-17)
 * vorausgewaehlt, der Wizard startet deshalb direkt bei Schritt "Rolle" (D-12, 191-UI-SPEC.md
 * Component Contract D).
 *
 * Sichtbarkeits-Gate (D-12 D2, strikt): diese Komponente rendert ausschliesslich fuer
 * angemeldete Nutzer, die dieselbe Berechtigung wie der bestehende "Hinweis
 * senden"-Knopf auf /me/contributions erfuellen (Mitgliedsprofil UND echte
 * Projekt-Zuordnung, `isEligibleForContributions` -- Plan 191-17's extrahierte,
 * einzige Quelle dieser Regel, hier bewusst NICHT erneut lokal dupliziert). Fuer jeden
 * anderen Fall (nicht angemeldet, kein Mitgliedsprofil, keine Projekt-Zuordnung, oder ein
 * Netzwerk-/Serverfehler beim Pruefen -- T-191-25) rendert die Komponente `null`: kein
 * disabled-Zustand, kein Tooltip, kein Platzhalter fuer den normalen, nicht berechtigten
 * Seitenbesucher.
 *
 * Datenbeschaffung bewusst zweistufig: die (billige, fuer jeden Seitenaufruf noetige)
 * Eligibility-Pruefung laeuft eagerly beim Mount, weil sie die Sichtbarkeits-Entscheidung
 * selbst trifft. Die (teurere, nur fuer tatsaechliche Klicks noetige) eigene
 * Gruppenmitgliedschaftsliste (`getMyMemberships`) wird dagegen lazy erst beim ersten Klick
 * auf "Fehler melden" geladen -- die grosse Mehrheit der Seitenbesucher, die diesen Knopf
 * gar nicht anklickt, verursacht dadurch keinen zusaetzlichen Netzwerk-Aufruf.
 */
export interface ReportHintEntryPointProps {
  fansubGroupId: number
  fansubGroupName: string
  animeId: number
  animeTitle: string
  /**
   * D-30 (Plan 191-35): optionale Release-Vorauswahl + lesbares Label, wenn dieser Einstieg
   * von einer konkreten Release-Seite kommt (siehe ReleaseDetailHero.tsx). Beide Felder
   * bleiben optional -- der unveraenderte Projektseiten-Aufrufer (HeroSection.tsx, dort gibt
   * es keine Release im Kontext) uebergibt sie gar nicht und kompiliert ohne Anpassung weiter.
   */
  relatedReleaseVersionId?: number
  relatedReleaseLabel?: string
}

type EligibilityState = 'pending' | 'ineligible' | 'eligible'

export function ReportHintEntryPoint({
  fansubGroupId,
  fansubGroupName,
  animeId,
  animeTitle,
  relatedReleaseVersionId,
  relatedReleaseLabel,
}: ReportHintEntryPointProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken

  const [eligibility, setEligibility] = useState<EligibilityState>('pending')
  const [ownGroups, setOwnGroups] = useState<MembershipEntry[] | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { roles } = useRoleCatalog('anime_contribution')
  const roleDefinitions = useMemo(() => contributionRoleDefinitions(roles), [roles])

  useEffect(() => {
    // Solange die Auth-Initialisierung noch laeuft, ist weder "angemeldet" noch "nicht
    // angemeldet" verlaesslich bekannt -- in diesem Zwischenzustand wird noch gar keine
    // Profil-Abfrage gestartet, um keinen unnoetigen Request fuer jeden Seitenaufruf
    // auszuloesen, bevor der Auth-Zustand ueberhaupt feststeht.
    if (!isClientInitialized) return
    if (!hasAuthSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEligibility('ineligible')
      return
    }

    let cancelled = false

    getOwnProfile()
      .then((response) => {
        if (cancelled) return
        setEligibility(isEligibleForContributions(response.data) ? 'eligible' : 'ineligible')
      })
      .catch(() => {
        // T-191-25: ein Netzwerk-/Server-Fehler beim Pruefen darf fuer einen beilaeufigen
        // Seitenbesucher niemals als Beweis eines gated Features sichtbar werden --
        // derselbe "null statt Fehlertext"-Zustand wie bei echter Nicht-Berechtigung.
        if (!cancelled) setEligibility('ineligible')
      })

    return () => {
      cancelled = true
    }
  }, [isClientInitialized, hasAuthSession])

  async function handleOpen() {
    if (ownGroups === null) {
      try {
        const response = await getMyMemberships()
        setOwnGroups(response.data)
      } catch {
        setOwnGroups([])
      }
    }
    setIsOpen(true)
  }

  if (eligibility !== 'eligible') return null

  return (
    <>
      <Button type="button" variant="text" size="sm" onClick={() => void handleOpen()}>
        Fehler melden
      </Button>
      {isOpen ? (
        <ProposalForm
          // ProposalForm zeigt seine Erfolgsansicht ("Hinweis gesendet") selbst ueber internen
          // submittedSummary-State -- schliesst der Aufrufer hier zusaetzlich bei onSuccess,
          // verschwindet das Formular, bevor der Nutzer die Erfolgsansicht je sieht. onSuccess
          // bleibt deshalb ein No-op; nur ein aktiver Klick auf "Fertig" (onClose) unmountet
          // das Formular (D-17, Plan 191-20).
          onSuccess={() => {}}
          onClose={() => setIsOpen(false)}
          ownGroups={ownGroups ?? []}
          roleDefinitions={roleDefinitions}
          prefill={{
            fansubGroupId,
            fansubGroupName,
            animeId,
            animeTitle,
            relatedReleaseVersionId,
            relatedReleaseLabel,
          }}
        />
      ) : null}
    </>
  )
}
