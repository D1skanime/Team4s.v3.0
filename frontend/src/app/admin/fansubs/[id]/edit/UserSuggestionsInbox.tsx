'use client'

import { EmptyState } from '@/components/ui'
import type { FansubGroupCapabilities } from '@/types/fansub'

// Phase 76 Follow-Up: echte Vorschlags-Liste pro domain+fansubId, gescoped (D-03/D-04)

type SuggestionDomain = 'media' | 'notes' | 'contribution'

interface UserSuggestionsInboxProps {
  fansubId: number
  /** D-03: Typ-gerechtes Routing — media/notes/contribution bestimmt Capability-Gate */
  domain: SuggestionDomain
  capabilities: FansubGroupCapabilities
}

/**
 * Capability-Gate-Mapping (D-08):
 *   media        → can_edit_group
 *   notes        → can_edit_notes
 *   contribution → can_manage_members
 *
 * Da Phase 76 nicht implementiert ist, wird ausschließlich ein EmptyState
 * gerendert — kein Fetch, kein erfundener Endpoint (D-03/D-04).
 */
function hasCapability(domain: SuggestionDomain, capabilities: FansubGroupCapabilities): boolean {
  switch (domain) {
    case 'media':
      return capabilities.can_edit_group
    case 'notes':
      return capabilities.can_edit_notes
    case 'contribution':
      return capabilities.can_manage_members
  }
}

export function UserSuggestionsInbox({
  fansubId: _fansubId,
  domain,
  capabilities,
}: UserSuggestionsInboxProps) {
  // D-08: null ohne Berechtigung
  if (!hasCapability(domain, capabilities)) return null

  return (
    <EmptyState
      variant="compact"
      title="Noch keine Nutzer-Vorschläge"
      description="Nutzer-Vorschläge erscheinen hier, sobald Phase 76 implementiert ist."
    />
  )
}
