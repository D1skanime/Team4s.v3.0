import { Card } from '@/components/ui'

/**
 * Änderungsverlauf-Tab (admin-exklusiv): reiner Platzhalter, inhaltlich unverändert aus dem
 * alten Admin-Editor-Changelog-Stub übernommen, Label korrigiert auf "Änderungsverlauf" (statt
 * "Changelog") per UI-SPEC Interaktionskontrakt #1.
 */
export function ReleaseEditorChangelogTab() {
  return (
    <Card title="Änderungsverlauf">
      <p>Änderungshistorie dieser Episode-Version.</p>
      <p style={{ fontStyle: 'italic' }}>Änderungseinträge werden in einem späten Plan ergänzt.</p>
    </Card>
  )
}
