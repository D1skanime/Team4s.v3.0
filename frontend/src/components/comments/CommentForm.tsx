'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ApiError, createAnimeComment, getRuntimeDisplayName, hasRuntimeAuthToken } from '@/lib/api'
import { CommentListItem } from '@/types/comment'

import styles from './CommentForm.module.css'

interface CommentFormProps {
  animeID: number
  onCommentCreated?: (comment: CommentListItem) => void
}

const MAX_CONTENT_LENGTH = 4000

export function CommentForm({ animeID, onCommentCreated }: CommentFormProps) {
  const router = useRouter()

  const [content, setContent] = useState('')
  const [hasAuthToken, setHasAuthToken] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setHasAuthToken(hasRuntimeAuthToken())
    setDisplayName(getRuntimeDisplayName())
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedContent = content.trim()

    if (!hasRuntimeAuthToken()) {
      setHasAuthToken(false)
      setErrorMessage('Anmeldung erforderlich. Erstelle zuerst ein Token auf /auth.')
      setSuccessMessage(null)
      return
    }

    setHasAuthToken(true)
    setDisplayName(getRuntimeDisplayName())

    if (!trimmedContent) {
      setErrorMessage('content ist erforderlich')
      setSuccessMessage(null)
      return
    }
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setErrorMessage('content ist zu lang (max 4000 zeichen)')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await createAnimeComment(animeID, {
        content: trimmedContent,
      })

      setContent('')
      setSuccessMessage('Kommentar gespeichert.')
      onCommentCreated?.(response.data)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429 && error.retryAfterSeconds && error.retryAfterSeconds > 0) {
          setErrorMessage(`Zu viele Anfragen. Bitte in ${error.retryAfterSeconds} Sekunden erneut versuchen.`)
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('Kommentar konnte nicht gespeichert werden.')
      }
      setSuccessMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.wrapper} aria-label="Kommentar schreiben">
      <h3>Kommentar schreiben</h3>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.authInfo}>
          Angemeldet als: {hasAuthToken ? displayName || 'bekannter Benutzer' : 'nicht angemeldet'}
        </p>

        <label className={styles.fieldLabel} htmlFor="content">
          Kommentar
        </label>
        <textarea
          id="content"
          name="content"
          className={styles.textarea}
          maxLength={MAX_CONTENT_LENGTH}
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={isSubmitting}
          required
        />

        <button className={styles.submitButton} type="submit" disabled={isSubmitting || !hasAuthToken}>
          {isSubmitting ? 'Speichern...' : hasAuthToken ? 'Kommentar absenden' : 'Anmeldung erforderlich'}
        </button>
      </form>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
    </section>
  )
}
