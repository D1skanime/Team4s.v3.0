import Link from 'next/link'

import { MemberSearchCard } from '@/components/archive/MemberSearchCard'
import { getFansubs, searchArchive } from '@/lib/api'
import type { FansubGroup } from '@/types/fansub'

import styles from './page.module.css'

// Diese Seite ist immer live — kein SSG-Caching (force-dynamic, D-15).
export const dynamic = 'force-dynamic'

// Rollenoptionen für den Filter-Dropdown (D-17: Deutsch mit korrekten Umlauten)
const ROLE_OPTIONS = [
  { value: 'translator', label: 'Übersetzung' },
  { value: 'editor', label: 'Editing' },
  { value: 'timer', label: 'Timing' },
  { value: 'typesetter', label: 'Typesetting' },
  { value: 'encoder', label: 'Encoding' },
  { value: 'raw_provider', label: 'Raw Provider' },
  { value: 'quality_checker', label: 'Qualitätskontrolle' },
  { value: 'project_lead', label: 'Projektleitung' },
  { value: 'designer', label: 'Design' },
  { value: 'admin', label: 'Administration' },
  { value: 'other', label: 'Sonstiges' },
]

interface ArchivePageProps {
  searchParams:
    | Promise<{
        rolle?: string
        gruppe?: string
        von?: string
        bis?: string
        page?: string
      }>
    | {
        rolle?: string
        gruppe?: string
        von?: string
        bis?: string
        page?: string
      }
    | undefined
}

interface ResolvedArchiveParams {
  rolle?: string
  gruppe?: string
  von?: string
  bis?: string
  page?: string
}

export default async function ArchivPage({ searchParams }: ArchivePageProps) {
  const resolved = ((await searchParams) ?? {}) as ResolvedArchiveParams

  const currentPage = Math.max(1, Number(resolved.page ?? '1') || 1)
  const hasFilters = !!(resolved.rolle || resolved.gruppe || resolved.von || resolved.bis)

  // Archiv-Suchergebnis holen — kein revalidate (force-dynamic)
  let result: Awaited<ReturnType<typeof searchArchive>> | null = null
  let fetchError: string | null = null

  try {
    result = await searchArchive({
      rolle: resolved.rolle,
      gruppe: resolved.gruppe,
      von: resolved.von,
      bis: resolved.bis,
      page: currentPage,
    })
  } catch {
    fetchError = 'Archiv konnte nicht geladen werden'
  }

  // Fansub-Gruppen für Gruppen-Filter-Dropdown — kein revalidate (force-dynamic)
  let fansubs: FansubGroup[] = []
  try {
    const fansubResponse = await getFansubs()
    fansubs = fansubResponse.data ?? []
  } catch {
    // Gruppen-Dropdown bleibt leer — kein fataler Fehler
  }

  const totalPages = result ? Math.ceil(result.total / 20) : 0

  return (
    <main className={styles.archivPage} aria-label="Archiv — Fansub-Mitwirkende entdecken">
      <header className={styles.archivHeader}>
        <h1>Archiv — Fansub-Mitwirkende entdecken</h1>
        <p>Durchsuche historische Beiträge von Fansub-Mitgliedern nach Rolle, Zeitraum und Gruppe.</p>
      </header>

      {/* Filter-Formular: URL-State via GET-Parameter (barrierefreiheitsfreundlich, kein JS nötig) */}
      <section className={styles.archivFilters}>
        <form role="search" action="/archiv" method="GET">
          <div className={styles.archivFilterRow}>
            {/* Rolle-Filter */}
            <div className={styles.filterGroup}>
              <label htmlFor="rolle">Rolle</label>
              <select id="rolle" name="rolle" defaultValue={resolved.rolle ?? ''}>
                <option value="">Alle Rollen</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gruppe-Filter (befüllt aus GET /api/v1/fansubs, D-14) */}
            <div className={styles.filterGroup}>
              <label htmlFor="gruppe">Gruppe</label>
              <select id="gruppe" name="gruppe" defaultValue={resolved.gruppe ?? ''}>
                <option value="">Alle Gruppen</option>
                {fansubs.map((fg) => (
                  <option key={fg.id} value={String(fg.id)}>
                    {fg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zeitraum von */}
            <div className={styles.filterGroup}>
              <label htmlFor="von">Von</label>
              <input
                type="number"
                id="von"
                name="von"
                min="1990"
                max="2099"
                placeholder="Jahr (z. B. 2010)"
                defaultValue={resolved.von ?? ''}
              />
            </div>

            {/* Zeitraum bis */}
            <div className={styles.filterGroup}>
              <label htmlFor="bis">Bis</label>
              <input
                type="number"
                id="bis"
                name="bis"
                min="1990"
                max="2099"
                placeholder="Jahr (z. B. 2010)"
                defaultValue={resolved.bis ?? ''}
              />
            </div>

            {/* Aktionen */}
            <div className={styles.filterActions}>
              <button type="submit" className={styles.filterSubmitBtn}>
                Archiv durchsuchen
              </button>
              <Link href="/archiv" className={styles.filterResetLink}>
                Filter zurücksetzen
              </Link>
            </div>
          </div>
        </form>
      </section>

      {/* Ergebnis-Bereich */}
      <section aria-label="Suchergebnisse">
        {fetchError ? (
          <div className={styles.archivErrorState} role="alert">
            <h2>Archiv konnte nicht geladen werden</h2>
            <p>Bitte Seite neu laden oder später erneut versuchen.</p>
          </div>
        ) : result && result.data.length === 0 ? (
          <div className={styles.archivEmptyState}>
            {hasFilters ? (
              <>
                <h2>Keine Mitglieder gefunden</h2>
                <p>
                  Für die gewählten Filter wurden keine öffentlichen Beiträge gefunden.
                  Passe die Filter an oder setze sie zurück.
                </p>
                <Link href="/archiv" className={styles.filterResetLink}>
                  Filter zurücksetzen
                </Link>
              </>
            ) : (
              <>
                <h2>Noch keine Einträge</h2>
                <p>Noch keine öffentlichen Beiträge im Archiv.</p>
              </>
            )}
          </div>
        ) : result && result.data.length > 0 ? (
          <>
            <div className={styles.archivGrid}>
              {result.data.map((member) => (
                <MemberSearchCard
                  key={member.id}
                  id={member.id}
                  nickname={member.nickname}
                  displayName={member.display_name}
                  slug={member.slug}
                  avatarPath={member.avatar_path}
                  isVerified={member.is_verified}
                  topRoles={member.top_roles}
                  groups={member.groups}
                />
              ))}
            </div>

            {/* Pagination: nur anzeigen wenn mehr als 1 Seite (D-16) */}
            {totalPages > 1 && (
              <nav className={styles.archivPagination} aria-label="Seitennavigation">
                {currentPage > 1 && (
                  <Link
                    href={buildArchivUrl(resolved, currentPage - 1)}
                    className={styles.paginationLink}
                  >
                    Zurück
                  </Link>
                )}
                <span className={styles.paginationInfo}>
                  Seite {currentPage} von {totalPages}
                </span>
                {currentPage < totalPages && (
                  <Link
                    href={buildArchivUrl(resolved, currentPage + 1)}
                    className={styles.paginationLink}
                  >
                    Weiter
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : null}
      </section>
    </main>
  )
}

/** Baut die Archiv-URL mit allen aktiven Filtern und einer neuen Seite. */
function buildArchivUrl(params: ResolvedArchiveParams, page: number): string {
  const q = new URLSearchParams()
  if (params.rolle) q.set('rolle', params.rolle)
  if (params.gruppe) q.set('gruppe', params.gruppe)
  if (params.von) q.set('von', params.von)
  if (params.bis) q.set('bis', params.bis)
  if (page > 1) q.set('page', String(page))
  const qs = q.toString()
  return `/archiv${qs ? `?${qs}` : ''}`
}
