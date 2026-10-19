import type { FansubGroup, FansubGroupSummary } from '@/types/fansub'

import styles from './EpisodeVersionEditor.module.css'

interface FansubGroupsSectionProps {
  groupQuery: string
  setGroupQuery: (value: string) => void
  isSearching: boolean
  searchMessage: string | null
  groupResults: FansubGroup[]
  selectedGroups: FansubGroupSummary[]
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
  addGroup,
  removeGroup,
}: FansubGroupsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Fansub Gruppen</h2>
          <p className={styles.helperText}>
            Suche nach Gruppenname oder Alias. Mehrere Gruppen
            werden als Kollaboration gespeichert.
          </p>
        </div>
      </div>

      <label className={styles.field}>
        <span>Gruppe suchen</span>
        <input
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
            <button
              key={group.id}
              type="button"
              className={styles.groupSearchItem}
              onClick={() => addGroup(group)}
            >
              <strong>{group.name}</strong>
              <span>
                {"Gruppe"}{" "}
                | {group.slug}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.chipRow}>
        {selectedGroups.length > 0 ? (
          selectedGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={styles.chip}
              title={`Slug: ${group.slug}`}
              onClick={() => removeGroup(group.id)}
            >
              {group.name} x
            </button>
          ))
        ) : (
          <span className={styles.helperText}>
            Keine Gruppe ausgewählt.
          </span>
        )}
      </div>
    </section>
  )
}
