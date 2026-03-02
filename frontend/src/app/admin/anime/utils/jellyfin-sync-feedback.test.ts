import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'

import { buildJellyfinFeedback, formatJellyfinActionError } from './jellyfin-sync-feedback'

describe('jellyfin-sync-feedback', () => {
  it('maps structured jellyfin connectivity errors to explicit German feedback', () => {
    const feedback = formatJellyfinActionError(
      new ApiError(502, 'upstream failed', null, 'jellyfin_unreachable', 'timeout after 5s'),
      'fallback',
    )

    expect(feedback).toEqual({
      tone: 'error',
      message: 'Server nicht erreichbar.',
      details: 'timeout after 5s',
    })
  })

  it('keeps generic runtime error messages when no ApiError is present', () => {
    const feedback = formatJellyfinActionError(new Error('kaputt'), 'fallback')

    expect(feedback).toEqual(buildJellyfinFeedback('error', 'kaputt'))
  })

  it('falls back to the provided message for unknown non-error failures', () => {
    expect(formatJellyfinActionError('boom', 'fallback')).toEqual(buildJellyfinFeedback('error', 'fallback'))
  })
})
