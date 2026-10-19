import { Button, Input } from '@/components/ui'

import type { FansubGroupDependents } from '@/types/episodeVersion'
import type { FansubGroup, FansubGroupSummary } from '@/types/fansub'

import { formatDependentsReason } from './episodeVersionEditorUtils'
import styles from './EpisodeVersionEditor.module.css'

interface FansubGroupsSectionProps {
  groupQuery: string
  setGroupQuery: (value: string) => void
  isSearching: boolean
  searchMessage: string | null
  groupResults: FansubGroup[]
  selectedGroups: FansubGroupSummary[]
  groupDependents: Record<number, FansubGroupDependents>
  addGroup: (group: FansubGroup) => void
  removeGroup: (groupID: number) => void
}

export function FansubGroupsSection({
  groupQuery,
  setGroupQuery,
  isSearching,
  searchMessage,
  groupResults,
  selectedGroups,
  groupDependents,
  addGroup,
  removeGroup,
}: FansubGroupsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Partnergruppe hinzufügen</h2>
          <p className={styles.helperText}>
            Suche nach Gruppenname oder Alias. Mehrere Gruppen
            werden als Kollaboration gespeichert.
          </p>
        </div>
      </div>

      <label className={styles.field}>
        <span>Gruppe suchen</span>
        <Input
          value={groupQuery}
          onChange={(event) => setGroupQuery(event.target.value)}
          placeholder="Name oder Alias..."
        />
      </label>

      {isSearching ? (
        <p className={styles.helperText}>Suche läuft...</p>
      ) : null}
      {searchMessage ? (
        <p className={styles.helperText}>{searchMessage}</p>
      ) : null}
      {groupResults.length > 0 ? (
        <div className={styles.groupSearchList}>
          {groupResults.map((group) => (
            <Button
              key={group.id}
              variant="secondary"
              size="sm"
              className={styles.groupSearchItem}
              onClick={() => addGroup(group)}
            >
              <strong>{group.name}</strong>
              <span>
                {"Gruppe"}{" "}
                | {group.slug}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      <div className={styles.chipRow}>
        {selectedGroups.length > 0 ? (
          selectedGroups.map((group) => {
            const dependents = groupDependents?.[group.id]
            const blockingReason = formatDependentsReason(dependents)
            return (
              <Button
                key={group.id}
                variant="subtle"
                size="sm"
                className={styles.chip}
                disabled={blockingReason != null}
                title={blockingReason ?? `Slug: ${group.slug}`}
                onClick={() => removeGroup(group.id)}
              >
                {group.name} x
              </Button>
            )
          })
        ) : (
          <span className={styles.helperText}>
            Keine Gruppe ausgewählt.
          </span>
        )}
      </div>
    </section>
  )
}
