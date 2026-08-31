import type { Dispatch, SetStateAction } from 'react'

import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import type { EpisodeVersionEditorContext } from '@/types/episodeVersion'
import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'

import {
  defaultReleaseTitle,
  formatDurationInput,
  normalizeCRC32Draft,
  parseDurationInput,
  type FormState,
} from './episodeVersionEditorUtils'
import styles from './EpisodeVersionEditor.module.css'

interface ReleaseVersionMetadataFieldsProps {
  context: EpisodeVersionEditorContext
  formState: FormState
  setFormState: Dispatch<SetStateAction<FormState>>
  projectTimeline: AnimeFansubProjectTimeline | null
}

export function ReleaseVersionMetadataFields({
  context,
  formState,
  setFormState,
  projectTimeline,
}: ReleaseVersionMetadataFieldsProps) {
  return (
    <>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Release-Name</span>
          <input
            value={formState.title}
            placeholder={defaultReleaseTitle(context)}
            onChange={(event) =>
              setFormState((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>Untertitel-Typ</span>
          <select
            value={formState.subtitleType}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                subtitleType: event.target.value as typeof current.subtitleType,
              }))
            }
          >
            <option value="">keiner</option>
            <option value="softsub">softsub</option>
            <option value="hardsub">hardsub</option>
          </select>
        </label>
        <div className={styles.field}>
          <span>Bearbeitung begonnen am</span>
          <DatePicker
            id="production-started-on"
            label="Bearbeitung begonnen am"
            value={formState.productionStartedOn}
            minYear={1900}
            maxYear={2100}
            minDate={projectTimeline?.productionStartedOn ?? undefined}
            maxDate={formState.releaseDate || projectTimeline?.productionCompletedOn || undefined}
            onChange={(value) =>
              setFormState((current) => ({ ...current, productionStartedOn: value }))
            }
          />
        </div>
        <div className={styles.field}>
          <span>Bearbeitung abgeschlossen am</span>
          <DatePicker
            id="release-date"
            label="Bearbeitung abgeschlossen am"
            value={formState.releaseDate}
            minYear={1900}
            maxYear={2100}
            minDate={formState.productionStartedOn || projectTimeline?.productionStartedOn || undefined}
            maxDate={projectTimeline?.productionCompletedOn ?? undefined}
            panelAlign="end"
            onChange={(value) =>
              setFormState((current) => ({ ...current, releaseDate: value }))
            }
          />
        </div>
        <label className={styles.field}>
          <span>Auflösung</span>
          <input
            value={formState.videoQuality}
            onChange={(event) =>
              setFormState((current) => ({ ...current, videoQuality: event.target.value }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>CRC32</span>
          <Input
            value={formState.crc32}
            maxLength={13}
            placeholder="1CC0A2E3"
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                crc32: normalizeCRC32Draft(event.target.value),
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>Gesamtdauer</span>
          <input
            value={formState.durationSeconds}
            placeholder="z. B. 24:10 oder 1450"
            onChange={(event) =>
              setFormState((current) => ({ ...current, durationSeconds: event.target.value }))
            }
            onBlur={(event) => {
              const parsed = parseDurationInput(event.target.value)
              if (parsed != null) {
                setFormState((current) => ({
                  ...current,
                  durationSeconds: formatDurationInput(parsed),
                }))
              }
            }}
          />
        </label>
      </div>
      <p className={styles.helperText}>
        Akzeptiert `m:ss`, `hh:mm:ss`, rohe Sekunden sowie Kurzformen wie `2m` oder `1m30s`. Wird als Grenze für Segment-Endzeiten verwendet.
      </p>
    </>
  )
}
