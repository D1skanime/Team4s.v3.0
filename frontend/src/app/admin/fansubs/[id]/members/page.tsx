'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import {
  ApiError,
  createFansubMember,
  deleteFansubMember,
  getFansubByID,
  getFansubMembers,
  getRuntimeAuthToken,
  updateFansubMember,
} from '@/lib/api'
import { FansubGroup, FansubMember } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import episodeStyles from '../../../anime/components/EpisodeManager/EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

function parseOptionalYear(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN
  return parsed
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

export default function AdminFansubMembersPage() {
  const params = useParams<{ id: string }>()
  const fansubID = useMemo(() => Number.parseInt((params.id || '').trim(), 10), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [group, setGroup] = useState<FansubGroup | null>(null)
  const [members, setMembers] = useState<FansubMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [handle, setHandle] = useState('')
  const [role, setRole] = useState('')
  const [sinceYear, setSinceYear] = useState('')
  const [untilYear, setUntilYear] = useState('')
  const [notes, setNotes] = useState('')

  const [editMemberID, setEditMemberID] = useState<number | null>(null)
  const [editHandle, setEditHandle] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editSinceYear, setEditSinceYear] = useState('')
  const [editUntilYear, setEditUntilYear] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function reload() {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      setErrorMessage('Ungueltige Fansub-ID.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [groupResponse, membersResponse] = await Promise.all([getFansubByID(fansubID), getFansubMembers(fansubID)])
      setGroup(groupResponse.data)
      setMembers(membersResponse.data)
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reload().catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fansubID])

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const since = parseOptionalYear(sinceYear)
    const until = parseOptionalYear(untilYear)
    if (Number.isNaN(since) || Number.isNaN(until)) {
      setErrorMessage('Jahresfelder muessen positive Zahlen sein.')
      return
    }
    if (since && until && until < since) {
      setErrorMessage('until_year muss groesser oder gleich since_year sein.')
      return
    }

    setIsSubmitting(true)
    try {
      await createFansubMember(
        fansubID,
        {
          handle: handle.trim(),
          role: role.trim(),
          since_year: since,
          until_year: until,
          notes: normalizeOptional(notes),
        },
        authToken,
      )
      setHandle('')
      setRole('')
      setSinceYear('')
      setUntilYear('')
      setNotes('')
      setSuccessMessage('Mitglied erstellt.')
      await reload()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function beginEdit(item: FansubMember) {
    setEditMemberID(item.id)
    setEditHandle(item.handle)
    setEditRole(item.role)
    setEditSinceYear(item.since_year ? String(item.since_year) : '')
    setEditUntilYear(item.until_year ? String(item.until_year) : '')
    setEditNotes(item.notes || '')
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!editMemberID) {
      setErrorMessage('Kein Mitglied ausgewaehlt.')
      return
    }

    const since = parseOptionalYear(editSinceYear)
    const until = parseOptionalYear(editUntilYear)
    if (Number.isNaN(since) || Number.isNaN(until)) {
      setErrorMessage('Jahresfelder muessen positive Zahlen sein.')
      return
    }
    if (since && until && until < since) {
      setErrorMessage('until_year muss groesser oder gleich since_year sein.')
      return
    }

    setIsSubmitting(true)
    try {
      await updateFansubMember(
        fansubID,
        editMemberID,
        {
          handle: editHandle.trim(),
          role: editRole.trim(),
          since_year: since,
          until_year: until,
          notes: normalizeOptional(editNotes),
        },
        authToken,
      )
      setSuccessMessage('Mitglied aktualisiert.')
      await reload()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onDelete(item: FansubMember) {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const ok = window.confirm(`Mitglied "${item.handle}" loeschen?`)
    if (!ok) return
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      await deleteFansubMember(fansubID, item.id, authToken)
      setSuccessMessage('Mitglied geloescht.')
      await reload()
    } catch (error) {
      setErrorMessage(formatError(error))
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin/fansubs">Fansubs</Link>
        {group ? (
          <>
            <span> | </span>
            <Link href={`/admin/fansubs/${group.id}/edit`}>Gruppe editieren</Link>
          </>
        ) : null}
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansub Mitglieder</h1>
        <p className={styles.subtitle}>{group ? group.name : ''}</p>
      </header>

      <section className={styles.panel}>
        {isLoading ? <p className={styles.hint}>Lade...</p> : null}
        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        {!isLoading ? (
          <>
            <h2>Mitgliederliste</h2>
            {members.length === 0 ? <p className={styles.hint}>Noch keine Mitglieder vorhanden.</p> : null}
            {members.length > 0 ? (
              <div className={styles.episodeTable}>
                <div className={styles.episodeTableHeader}>
                  <span className={styles.episodeHeaderCell}>Handle</span>
                  <span className={styles.episodeHeaderCell}>Rolle</span>
                  <span className={styles.episodeHeaderCell}>Zeitraum</span>
                  <span className={styles.episodeHeaderCell}>Notes</span>
                  <span className={styles.episodeHeaderCell}>Aktionen</span>
                </div>
                {members.map((item) => (
                  <div key={item.id} className={styles.episodeTableRow}>
                    <span className={styles.episodeTitleCell}>{item.handle}</span>
                    <span className={styles.episodeIDCell}>{item.role}</span>
                    <span className={styles.episodeIDCell}>
                      {(item.since_year || 'n/a').toString()} - {(item.until_year || 'heute').toString()}
                    </span>
                    <span className={styles.episodeTitleCell}>{item.notes || '-'}</span>
                    <div className={styles.episodeActionsCell}>
                      <button type="button" className={styles.episodeMiniButton} onClick={() => beginEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className={styles.episodeMiniButton} onClick={() => onDelete(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.sectionDivider} />

            <h2>Mitglied erstellen</h2>
            <form className={styles.form} onSubmit={onCreate}>
              <div className={styles.gridTwo}>
                <div className={styles.field}>
                  <label htmlFor="create-handle">Handle *</label>
                  <input id="create-handle" value={handle} onChange={(event) => setHandle(event.target.value)} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="create-role">Rolle *</label>
                  <input id="create-role" value={role} onChange={(event) => setRole(event.target.value)} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="create-since">Seit Jahr</label>
                  <input id="create-since" value={sinceYear} onChange={(event) => setSinceYear(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="create-until">Bis Jahr</label>
                  <input id="create-until" value={untilYear} onChange={(event) => setUntilYear(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="create-notes">Notes</label>
                  <textarea id="create-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
              </div>
              <div className={styles.actions}>
                <button type="submit" className={styles.button} disabled={isSubmitting}>
                  Hinzufuegen
                </button>
              </div>
            </form>

            <div className={styles.sectionDivider} />

            <h2>Mitglied bearbeiten</h2>
            {!editMemberID ? <p className={styles.hint}>Waehle zuerst ein Mitglied aus der Liste.</p> : null}
            {editMemberID ? (
              <form className={styles.form} onSubmit={onUpdate}>
                <div className={styles.gridTwo}>
                  <div className={styles.field}>
                    <label htmlFor="edit-handle">Handle *</label>
                    <input id="edit-handle" value={editHandle} onChange={(event) => setEditHandle(event.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="edit-role">Rolle *</label>
                    <input id="edit-role" value={editRole} onChange={(event) => setEditRole(event.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="edit-since">Seit Jahr</label>
                    <input id="edit-since" value={editSinceYear} onChange={(event) => setEditSinceYear(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="edit-until">Bis Jahr</label>
                    <input id="edit-until" value={editUntilYear} onChange={(event) => setEditUntilYear(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="edit-notes">Notes</label>
                    <textarea id="edit-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                  </div>
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.buttonSecondary} disabled={isSubmitting}>
                    Speichern
                  </button>
                </div>
              </form>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
