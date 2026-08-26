'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { getNextReleaseReview } from '@/lib/api'
import type { ReleaseReviewQueueItem } from '@/types/releaseReviews'

import styles from '../../../releaseReviews.module.css'

const EXHAUSTED_MESSAGE = 'Keine weiteren Prüfungen für dich offen.'

type NextReviewControlProps =
  | { mode: 'post-decision'; fansubId: number; next: ReleaseReviewQueueItem | null }
  | { mode: 'standalone'; fansubId: number; reviewId: string }

type StandaloneState = 'idle' | 'loading' | 'exhausted' | 'error'

function reviewHref(fansubId: number, reviewId: string): string {
  return `/admin/fansubs/${fansubId}/reviews/${encodeURIComponent(reviewId)}`
}

function PostDecisionNextControl({
  fansubId,
  next,
}: {
  fansubId: number
  next: ReleaseReviewQueueItem | null
}) {
  if (!next) {
    return <p className={styles.statusPanel}>{EXHAUSTED_MESSAGE}</p>
  }

  return (
    <Button href={reviewHref(fansubId, next.id)}>
      Nächste offene Prüfung
    </Button>
  )
}

function StandaloneNextControl({
  fansubId,
  reviewId,
}: {
  fansubId: number
  reviewId: string
}) {
  const router = useRouter()
  const [state, setState] = useState<StandaloneState>('idle')

  async function handleClick() {
    setState('loading')
    try {
      const response = await getNextReleaseReview(fansubId, reviewId)
      if (response.data) {
        router.push(reviewHref(fansubId, response.data.id))
        return
      }
      setState('exhausted')
    } catch {
      setState('error')
    }
  }

  if (state === 'exhausted') {
    return <p className={styles.statusPanel}>{EXHAUSTED_MESSAGE}</p>
  }

  if (state === 'error') {
    return (
      <div className={styles.inlineError} role="alert">
        <p>Die nächste Prüfung konnte nicht geladen werden.</p>
        <Button variant="secondary" onClick={() => void handleClick()}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="secondary"
      loading={state === 'loading'}
      onClick={() => void handleClick()}
    >
      Nächste Prüfung
    </Button>
  )
}

export function NextReviewControl(props: NextReviewControlProps) {
  if (props.mode === 'post-decision') {
    return <PostDecisionNextControl fansubId={props.fansubId} next={props.next} />
  }

  return <StandaloneNextControl fansubId={props.fansubId} reviewId={props.reviewId} />
}
