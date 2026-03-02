import { ApiError } from '@/lib/api'

import { JellyfinSyncFeedback } from '../types/admin-anime'

export function buildJellyfinFeedback(tone: 'success' | 'error', message: string, details?: string): JellyfinSyncFeedback {
  return {
    tone,
    message,
    ...(details ? { details } : {}),
  }
}

export function formatJellyfinActionError(error: unknown, fallback: string): JellyfinSyncFeedback {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.message.trim()) {
      return buildJellyfinFeedback('error', error.message)
    }

    return buildJellyfinFeedback('error', fallback)
  }

  switch (error.code) {
    case 'jellyfin_unreachable':
      return buildJellyfinFeedback('error', 'Server nicht erreichbar.', error.details || undefined)
    case 'jellyfin_auth_invalid':
      return buildJellyfinFeedback('error', 'Jellyfin Token ungueltig.', error.details || undefined)
    case 'jellyfin_not_configured':
      return buildJellyfinFeedback('error', 'Jellyfin ist nicht konfiguriert.', error.details || undefined)
    case 'jellyfin_series_not_found':
      return buildJellyfinFeedback('error', 'Keine passende Jellyfin-Serie gefunden.', error.details || undefined)
    case 'jellyfin_series_ambiguous':
      return buildJellyfinFeedback('error', 'Mehrere passende Jellyfin-Serien gefunden.', error.details || undefined)
    case 'jellyfin_no_matching_episodes':
      return buildJellyfinFeedback('error', 'Keine importierbaren Episoden gefunden.', error.details || undefined)
    default:
      return buildJellyfinFeedback('error', error.message || fallback, error.details || undefined)
  }
}
