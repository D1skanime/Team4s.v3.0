'use client'

import { useEffect, useState } from 'react'

import { Button, FormField, Input, Textarea } from '@/components/ui'
import { ApiError, searchHistoricalMembers, submitMemberClaim, submitMemberRequest } from '@/lib/api'
import type { MemberClaimRow, MemberSearchResult } from '@/types/profile'

import styles from '../page.module.css'

type MemberClaimSectionProps = {
  currentClaim?: MemberClaimRow | null
  disabled?: boolean
}

function readClaimError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function MemberClaimSection({ currentClaim, disabled = false }: MemberClaimSectionProps) {
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
        const results = await searchHistoricalMembers(query)
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
  }, [searchQuery])

  if (currentClaim?.claim_status === 'verified') {
    return <p className={styles.mutedText}>Dein historischer Member-Eintrag ist bereits verifiziert.</p>
  }

  async function handleSubmitClaim() {
    if (!selectedMember) return
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await submitMemberClaim({ member_id: selectedMember.id, note: claimNote })
      setSuccessMessage('Dein Hinweis wurde gesendet. Team4s lässt die Zuordnung prüfen.')
    } catch (error) {
      // D-17: server-seitiger 409 memorial_not_claimable → verständlicher Hinweis
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === 'memorial_not_claimable'
      ) {
        setErrorMessage(
          'Dieses Gedenkprofil kann nicht verknüpft werden.',
        )
      } else {
        setErrorMessage(readClaimError(error, 'Die Identität konnte nicht verknüpft werden.'))
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
      await submitMemberRequest({ note: requestNote })
      setSuccessMessage('Dein Antrag wurde gesendet. Team4s prüft ihn.')
    } catch (error) {
      setErrorMessage(readClaimError(error, 'Der Antrag konnte nicht gesendet werden.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.claimStatusStack}>
      <FormField label="Historischen Nick suchen" htmlFor="member-identity-search">
        <Input
          id="member-identity-search"
          type="search"
          value={searchQuery}
          disabled={disabled || isSubmitting}
          placeholder="Nickname suchen..."
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setSelectedMember(null)
          }}
        />
      </FormField>
      {isSearching ? <p className={styles.mutedText}>Suche läuft...</p> : null}
      {searchResults.length > 0 ? (
        <div className={styles.claimStatusBody}>
          {searchResults.map((result) => (
            <Button key={result.id} type="button" variant="secondary" disabled={disabled || isSubmitting} onClick={() => setSelectedMember(result)}>
              {result.nickname}{result.display_name ? ` (${result.display_name})` : ''}
            </Button>
          ))}
        </div>
      ) : null}
      {selectedMember ? (
        <div className={styles.claimStatusBody}>
          <strong>Ausgewählt: {selectedMember.nickname}</strong>
          <FormField label="Notiz" htmlFor="member-identity-note" hint="Optional: Sag kurz, woran dich die Gruppe erkennen kann.">
            <Textarea id="member-identity-note" value={claimNote} placeholder="Optionale Notiz..." onChange={(event) => setClaimNote(event.target.value)} />
          </FormField>
          <Button type="button" disabled={disabled || isSubmitting} onClick={() => void handleSubmitClaim()}>
            Das bin ich
          </Button>
        </div>
      ) : null}
      <div className={styles.claimStatusBody}>
        <p className={styles.mutedText}>Keinen passenden Eintrag gefunden?</p>
        <Button type="button" variant="secondary" disabled={disabled || isSubmitting} onClick={() => setShowRequestForm(true)}>
          Neuanlage beantragen
        </Button>
      </div>
      {showRequestForm ? (
        <div className={styles.claimStatusBody}>
          <FormField label="Notiz" htmlFor="member-request-note">
            <Textarea id="member-request-note" value={requestNote} placeholder="Optionale Notiz..." onChange={(event) => setRequestNote(event.target.value)} />
          </FormField>
          <Button type="button" disabled={disabled || isSubmitting} onClick={() => void handleSubmitRequest()}>
            Antrag stellen
          </Button>
        </div>
      ) : null}
      {errorMessage ? <p className={styles.inlineError}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.successBox}>{successMessage}</p> : null}
    </div>
  )
}
