'use client'

import { useEffect, useState } from 'react'

import { ApiError, searchHistoricalMembers, submitMemberClaim, submitMemberRequest } from '@/lib/api'
import type { MemberClaimRow, MemberSearchResult } from '@/types/profile'

import styles from '../page.module.css'

type MemberClaimSectionProps = {
  currentClaim?: MemberClaimRow | null
  authToken?: string
  disabled?: boolean
}

function readClaimError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function MemberClaimSection({ currentClaim, authToken, disabled = false }: MemberClaimSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null)
  const [claimNote, setClaimNote] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await searchHistoricalMembers(query, authToken)
        if (!cancelled) setSearchResults(results)
      } catch (error) {
        if (!cancelled) setErrorMessage(readClaimError(error, 'Member-Suche konnte nicht geladen werden.'))
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [authToken, searchQuery])

  if (currentClaim?.claim_status === 'verified') {
    return <p className={styles.mutedText}>Dein historischer Member-Eintrag ist bereits verifiziert.</p>
  }

  async function handleSubmitClaim() {
    if (!selectedMember) return
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await submitMemberClaim({ member_id: selectedMember.id, note: claimNote }, authToken)
      setSuccessMessage('Dein Claim wurde eingereicht. Warte auf Bestätigung durch den Leader.')
    } catch (error) {
      // D-17: server-seitiger 409 memorial_not_claimable → verständlicher Hinweis
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === 'memorial_not_claimable'
      ) {
        setErrorMessage(
          'Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.',
        )
      } else {
        setErrorMessage(readClaimError(error, 'Claim konnte nicht eingereicht werden.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmitRequest() {
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await submitMemberRequest({ note: requestNote }, authToken)
      setSuccessMessage('Dein Neuanlage-Antrag wurde eingereicht. Leader/Admin prüfen deinen Antrag.')
    } catch (error) {
      setErrorMessage(readClaimError(error, 'Neuanlage-Antrag konnte nicht eingereicht werden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.claimStatusStack}>
      <label className={styles.accountGrid}>
        <span>Historischen Nick suchen</span>
        <input
          type="search"
          value={searchQuery}
          disabled={disabled || isSubmitting}
          placeholder="Nickname suchen..."
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setSelectedMember(null)
          }}
        />
      </label>
      {isSearching ? <p className={styles.mutedText}>Suche läuft...</p> : null}
      {searchResults.length > 0 ? (
        <div className={styles.claimStatusBody}>
          {searchResults.map((result) => (
            <button key={result.id} type="button" disabled={disabled || isSubmitting} onClick={() => setSelectedMember(result)}>
              {result.nickname}{result.display_name ? ` (${result.display_name})` : ''}
            </button>
          ))}
        </div>
      ) : null}
      {selectedMember ? (
        <div className={styles.claimStatusBody}>
          <strong>Ausgewählt: {selectedMember.nickname}</strong>
          <textarea value={claimNote} placeholder="Optionale Notiz..." onChange={(event) => setClaimNote(event.target.value)} />
          <button type="button" disabled={disabled || isSubmitting} onClick={() => void handleSubmitClaim()}>
            Claim einreichen
          </button>
        </div>
      ) : null}
      <div className={styles.claimStatusBody}>
        <p className={styles.mutedText}>Keinen passenden Eintrag gefunden?</p>
        <button type="button" disabled={disabled || isSubmitting} onClick={() => setShowRequestForm(true)}>
          Neuanlage beantragen
        </button>
      </div>
      {showRequestForm ? (
        <div className={styles.claimStatusBody}>
          <textarea value={requestNote} placeholder="Optionale Notiz..." onChange={(event) => setRequestNote(event.target.value)} />
          <button type="button" disabled={disabled || isSubmitting} onClick={() => void handleSubmitRequest()}>
            Antrag stellen
          </button>
        </div>
      ) : null}
      {errorMessage ? <p className={styles.inlineError}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.successBox}>{successMessage}</p> : null}
    </div>
  )
}
