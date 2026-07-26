'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import {
  Badge,
  Button,
  FormField,
  LoadingState,
  Modal,
  Select,
  Textarea,
} from '@/components/ui'
import {
  ApiError,
  decideReleaseReview,
  getCurrentUser,
  getReleaseReview,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type {
  ReleaseReviewDecisionResponse,
  ReleaseReviewDetail,
  ReleaseReviewRejectionCategory,
} from '@/types/releaseReviews'

import {
  formatReleaseReviewDateTime,
  RELEASE_REVIEW_CATEGORY_LABELS,
  releaseReviewDetailStatus,
} from '../../../releaseReviewPresentation'
import styles from '../../../releaseReviews.module.css'
import { useReleaseReviewMobileGate } from '../../../useReleaseReviewMobileGate'
import { ReleaseReviewMediaPreview } from './ReleaseReviewMediaPreview'

const REJECTION_OPTIONS: Array<{
  value: ReleaseReviewRejectionCategory
  label: string
}> = [
  { value: 'content.incorrect', label: 'Inhaltlich falsch' },
  { value: 'release_context.wrong', label: 'Falscher Release-Kontext' },
  { value: 'quality.insufficient', label: 'Qualität unzureichend' },
  { value: 'rights.unclear', label: 'Quelle oder Rechte unklar' },
  { value: 'other', label: 'Sonstiger Grund' },
]

type DecisionState =
  | { kind: 'idle' }
  | { kind: 'pending'; decision: 'confirm' | 'reject' }
  | { kind: 'success'; response: ReleaseReviewDecisionResponse }
  | { kind: 'conflict' }
  | { kind: 'error' }

export default function ReleaseReviewPage() {
  const params = useParams<{ id: string; reviewId: string }>()
  const fansubId = Number(params.id)
  const reviewId = params.reviewId
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasActiveSession = hasAccessToken || hasRefreshToken
  const isMobile = useReleaseReviewMobileGate()
  const [detail, setDetail] = useState<ReleaseReviewDetail | null>(null)
  const [currentAppUserId, setCurrentAppUserId] = useState<number | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [decisionState, setDecisionState] = useState<DecisionState>({ kind: 'idle' })
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionCategory, setRejectionCategory] = useState<ReleaseReviewRejectionCategory | ''>('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const rejectionCategoryRef = useRef<HTMLSelectElement | null>(null)
  const rejectionReasonRef = useRef<HTMLTextAreaElement | null>(null)
  const overrideReasonRef = useRef<HTMLTextAreaElement | null>(null)
  const detailAbortRef = useRef<AbortController | null>(null)

  const returnHref = `/admin/fansubs/${fansubId}/edit?tab=pruefungen`

  const loadDetail = useCallback(async () => {
    if (!Number.isInteger(fansubId) || fansubId <= 0 || !reviewId) {
      setLoadError(true)
      setIsLoading(false)
      return
    }
    detailAbortRef.current?.abort()
    const controller = new AbortController()
    detailAbortRef.current = controller
    setIsLoading(true)
    setLoadError(false)
    try {
      const [detailResponse, userResponse] = await Promise.all([
        getReleaseReview(fansubId, reviewId, controller.signal),
        getCurrentUser(),
      ])
      if (controller.signal.aborted) return
      setDetail(detailResponse.data)
      setCurrentAppUserId(userResponse.data.app_user_id)
      setIsPlatformAdmin(Boolean(userResponse.data.is_platform_admin))
      setDecisionState({ kind: 'idle' })
    } catch {
      if (!controller.signal.aborted) setLoadError(true)
    } finally {
      if (detailAbortRef.current === controller) detailAbortRef.current = null
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [fansubId, reviewId])

  useEffect(() => {
    if (!isClientInitialized || !hasActiveSession || isMobile) return
    void loadDetail()
    return () => {
      detailAbortRef.current?.abort()
    }
  }, [hasActiveSession, isClientInitialized, isMobile, loadDetail])

  async function submitDecision(decision: 'confirm' | 'reject') {
    if (!detail || decisionState.kind === 'pending') return

    const requiresAdminOverride =
      isPlatformAdmin && currentAppUserId === detail.submitter_app_user_id
    const trimmedOverride = overrideReason.trim()
    if (requiresAdminOverride && (trimmedOverride.length < 10 || trimmedOverride.length > 1000)) {
      setValidationError('Der Override-Grund muss zwischen 10 und 1000 Zeichen lang sein.')
      overrideReasonRef.current?.focus()
      return
    }

    const trimmedReason = rejectionReason.trim()
    if (decision === 'reject') {
      if (!rejectionCategory) {
        setValidationError('Wähle einen Ablehnungsgrund.')
        rejectionCategoryRef.current?.focus()
        return
      }
      if (trimmedReason.length < 10 || trimmedReason.length > 1000) {
        setValidationError('Die Begründung muss mindestens 10 Zeichen und höchstens 1000 Zeichen lang sein.')
        rejectionReasonRef.current?.focus()
        return
      }
    }

    setValidationError(null)
    setDecisionState({ kind: 'pending', decision })
    try {
      const response = await decideReleaseReview(fansubId, reviewId, {
        decision,
        expected_revision: detail.source_revision,
        ...(decision === 'reject'
          ? {
              rejection_category: rejectionCategory as ReleaseReviewRejectionCategory,
              rejection_reason: trimmedReason,
            }
          : {}),
        ...(requiresAdminOverride ? { override_reason: trimmedOverride } : {}),
      })
      setRejectOpen(false)
      setDecisionState({ kind: 'success', response })
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === 'REVIEW_ALREADY_DECIDED'
      ) {
        setRejectOpen(false)
        setDecisionState({ kind: 'conflict' })
        return
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status: unknown }).status === 409 &&
        'code' in error &&
        (error as { code: unknown }).code === 'REVIEW_ALREADY_DECIDED'
      ) {
        setRejectOpen(false)
        setDecisionState({ kind: 'conflict' })
        return
      }
      setDecisionState({ kind: 'error' })
    }
  }

  if (isMobile) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.mobileGate}>
          <h2>Prüfungen benötigen mehr Platz</h2>
          <p>Öffne diesen Bereich auf einem Tablet oder Computer, um Beiträge sicher zu prüfen.</p>
          <Button href={returnHref} variant="secondary">Zurück zur Prüfliste</Button>
        </div>
      </main>
    )
  }

  if (!isClientInitialized) return <LoadingState title="Prüfung wird vorbereitet" />
  if (!hasActiveSession) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.inlineError}>Anmeldung erforderlich.</div>
      </main>
    )
  }
  if (isLoading) return <LoadingState title="Prüfung wird geladen" />
  if (loadError || !detail) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.inlineError} role="alert">
          <p>Diese Prüfung konnte nicht geladen werden. Kehre zur Prüfliste zurück und versuche es erneut.</p>
          <Button href={returnHref} variant="secondary">Zurück zur Prüfliste</Button>
        </div>
      </main>
    )
  }

  const status = releaseReviewDetailStatus(detail.status)
  const isOwnSubmission = currentAppUserId === detail.submitter_app_user_id
  const requiresAdminOverride = isOwnSubmission && isPlatformAdmin
  const showDecisionActions =
    detail.status === 'pending' &&
    (!isOwnSubmission || isPlatformAdmin) &&
    (decisionState.kind === 'idle' || decisionState.kind === 'pending')
  const isPending = decisionState.kind === 'pending'
  const decisionMessage = decisionState.kind === 'success'
    ? decisionState.response.data.decision === 'confirm'
      ? 'Beitrag bestätigt und veröffentlicht.'
      : 'Beitrag abgelehnt. Der Einreicher kann ihn bearbeiten und erneut einreichen.'
    : null

  return (
    <main className={styles.detailPage}>
      <header className={styles.detailHeader}>
        <Link href={returnHref}>Zurück zur Prüfliste</Link>
        <div className={styles.titleLine}>
          <h1>Prüfung</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </header>

      <dl className={styles.contextGrid}>
        <div><dt>Projekt / Anime</dt><dd>{detail.anime_title}</dd></div>
        <div><dt>Episode</dt><dd>{detail.episode_number}</dd></div>
        <div><dt>Release / Version</dt><dd>{detail.release_version}</dd></div>
        <div><dt>Einreicher</dt><dd>{detail.submitter_display_name}</dd></div>
        <div><dt>Eingegangen</dt><dd>{formatReleaseReviewDateTime(detail.submitted_at)}</dd></div>
        <div><dt>Letzte Aktivität</dt><dd>{formatReleaseReviewDateTime(detail.last_activity_at)}</dd></div>
        <div><dt>Typ</dt><dd>{detail.type === 'text' ? 'Text' : 'Bild'}</dd></div>
        {detail.category ? (
          <div><dt>Bildkategorie</dt><dd>{RELEASE_REVIEW_CATEGORY_LABELS[detail.category]}</dd></div>
        ) : null}
      </dl>

      <section className={styles.contentPanel}>
        <h2>Beitrag</h2>
        {detail.type === 'text' && detail.text ? (
          <>
            {detail.text.title?.trim() ? <h3>{detail.text.title}</h3> : null}
            <RichTextRenderer bodyHtml={detail.text.body_html} />
          </>
        ) : null}
        {detail.type === 'image' && detail.image ? (
          <ReleaseReviewMediaPreview
            thumbnailUrl={detail.image.thumbnail_url}
            originalUrl={detail.image.original_url}
            caption={detail.image.caption}
            altText={`Bildbeitrag für ${detail.anime_title}, Episode ${detail.episode_number}`}
          />
        ) : null}
        {detail.can_edit_release ? (
          <Button
            href={`/admin/episode-versions/${detail.release_version_id}/edit`}
            variant="secondary"
          >
            Release bearbeiten
          </Button>
        ) : null}
      </section>

      <section className={styles.decisionPanel}>
        <h2>Entscheidung</h2>
        {detail.status === 'pending' && isOwnSubmission && !isPlatformAdmin ? (
          <div className={styles.warningPanel}>
            <p>
              Das ist dein eigener Beitrag. Eine andere berechtigte Person muss ihn prüfen.
            </p>
          </div>
        ) : null}
        {requiresAdminOverride && decisionState.kind !== 'success' && decisionState.kind !== 'conflict' ? (
          <div className={styles.warningPanel}>
            <p>
              Du entscheidest als Plattform-Admin außerhalb der regulären Gruppenprüfung.
              Ein nachvollziehbarer Grund ist erforderlich; dafür wird kein Prüfpunkt vergeben.
            </p>
            <FormField label="Override-Grund" htmlFor="release-review-override">
              <Textarea
                ref={overrideReasonRef}
                id="release-review-override"
                value={overrideReason}
                minLength={10}
                maxLength={1000}
                rows={4}
                disabled={isPending}
                onChange={(event) => setOverrideReason(event.target.value)}
              />
            </FormField>
          </div>
        ) : null}

        <div aria-live="polite">
          {decisionState.kind === 'error' ? (
            <p className={styles.inlineError} role="alert">
              Die Entscheidung wurde nicht gespeichert. Der Beitrag bleibt offen und privat. Bitte versuche es erneut.
            </p>
          ) : null}
          {validationError && !rejectOpen ? (
            <p className={styles.fieldError} role="alert">{validationError}</p>
          ) : null}
          {decisionMessage ? <p className={styles.statusPanel}>{decisionMessage}</p> : null}
          {decisionState.kind === 'conflict' ? (
            <div className={styles.statusPanel}>
              <p>Diese Prüfung wurde bereits von einer anderen Person entschieden.</p>
              <div className={styles.successActions}>
                <Button variant="secondary" onClick={() => void loadDetail()}>
                  Aktuellen Stand laden
                </Button>
                <Button href={returnHref} variant="secondary">Zurück zur Prüfliste</Button>
              </div>
            </div>
          ) : null}
        </div>

        {showDecisionActions ? (
          <div className={styles.decisionActions}>
            <Button
              loading={decisionState.kind === 'pending' && decisionState.decision === 'confirm'}
              disabled={isPending}
              onClick={() => void submitDecision('confirm')}
            >
              Bestätigen und veröffentlichen
            </Button>
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() => {
                setValidationError(null)
                setRejectOpen(true)
              }}
            >
              Ablehnen
            </Button>
          </div>
        ) : null}

        {decisionState.kind === 'success' ? (
          <div className={styles.successActions}>
            {decisionState.response.data.next ? (
              <Button
                href={`/admin/fansubs/${fansubId}/reviews/${encodeURIComponent(decisionState.response.data.next.id)}`}
              >
                Nächste offene Prüfung
              </Button>
            ) : null}
            <Button href={returnHref} variant="secondary">Zurück zur Prüfliste</Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={rejectOpen}
        onClose={() => {
          if (!isPending) {
            setRejectOpen(false)
            setValidationError(null)
          }
        }}
        title="Beitrag ablehnen"
        description="Wähle einen Ablehnungsgrund und erkläre konkret, was vor der Neueinreichung geändert werden muss."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => setRejectOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              loading={decisionState.kind === 'pending' && decisionState.decision === 'reject'}
              onClick={() => void submitDecision('reject')}
            >
              Beitrag ablehnen
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          {validationError ? <p className={styles.fieldError} role="alert">{validationError}</p> : null}
          <FormField label="Ablehnungsgrund" htmlFor="release-review-rejection-category" required>
            <Select
              ref={rejectionCategoryRef}
              id="release-review-rejection-category"
              value={rejectionCategory}
              disabled={isPending}
              onChange={(event) => setRejectionCategory(
                event.target.value as ReleaseReviewRejectionCategory | '',
              )}
            >
              <option value="">Grund wählen</option>
              {REJECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Begründung"
            htmlFor="release-review-rejection-reason"
            hint="Beschreibe konkret, was vor der Neueinreichung geändert werden muss."
            required
          >
            <Textarea
              ref={rejectionReasonRef}
              id="release-review-rejection-reason"
              value={rejectionReason}
              minLength={10}
              maxLength={1000}
              rows={6}
              disabled={isPending}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </FormField>
          {rejectionReason.length >= 900 ? (
            <p className={styles.characterCount}>{1000 - rejectionReason.length} Zeichen verbleibend</p>
          ) : null}
        </div>
      </Modal>
    </main>
  )
}
