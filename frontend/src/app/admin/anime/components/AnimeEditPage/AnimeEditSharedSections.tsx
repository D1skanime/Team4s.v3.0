import { AdminAnimeEditorHydratedState } from '@/types/admin'
import { AnimeDetail } from '@/types/anime'

import { AnimePatchClearFlags } from '../../types/admin-anime'
import { AnimeEditorController } from '../../types/admin-anime-editor'
import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

interface AnimeEditSourceSectionProps {
  title: string
  source: string
  folderName: string
  coverUrl: string
}

interface AnimeEditAssetsSectionProps {
  hydratedState: AdminAnimeEditorHydratedState
}

interface AnimeEditCoreDetailsSectionProps {
  animeID: number
  values: {
    title: string
    type: string
    contentType: string
    status: string
    year: string
    maxEpisodes: string
    titleDE: string
    titleEN: string
  }
  animeTypes: string[]
  contentTypes: string[]
  animeStatuses: string[]
  onFieldChange: (
    field:
      | 'title'
      | 'type'
      | 'contentType'
      | 'status'
      | 'year'
      | 'maxEpisodes'
      | 'titleDE'
      | 'titleEN',
    value: string,
  ) => void
}

interface AnimeEditReviewSectionProps {
  editor: AnimeEditorController
  anime: AnimeDetail
  title: string
  source: string
  folderName: string
  clearFlags: AnimePatchClearFlags
  onClearFlagChange: (field: keyof AnimePatchClearFlags, value: boolean) => void
  onReset: (anime: AnimeDetail) => void
}

function formatPersistedAssetLabel(label: string, present: boolean): string {
  return `${label}: ${present ? 'vorhanden' : 'nicht gesetzt'}`
}

export function AnimeEditSourceSection({
  title,
  source,
  folderName,
  coverUrl,
}: AnimeEditSourceSectionProps) {
  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Aktueller Datensatz</h2>
          <p className={styles.sectionMeta}>
            Bestehende Titel- und Quellkontexte bleiben sichtbar. AniSearch-Nachladen ist bewusst nicht Teil des
            Edit-Flows.
          </p>
        </div>
      </div>
      <div className={workspaceStyles.sectionGrid}>
        <label className={workspaceStyles.field}>
          <span>Titel</span>
          <input className={styles.input} value={title} readOnly />
        </label>
        <label className={workspaceStyles.field}>
          <span>Quelle</span>
          <input className={styles.input} value={source} readOnly />
        </label>
        <label className={workspaceStyles.field}>
          <span>Ordnerpfad</span>
          <input className={styles.input} value={folderName} readOnly />
        </label>
        <label className={workspaceStyles.field}>
          <span>Cover</span>
          <input className={styles.input} value={coverUrl} readOnly />
        </label>
      </div>
    </section>
  )
}

export function AnimeEditAssetsSection({ hydratedState }: AnimeEditAssetsSectionProps) {
  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Persistierte Assets</h2>
          <p className={styles.sectionMeta}>
            Der Edit-Flow liest dieselbe zweite Arbeitszone wie Create, jetzt aus dem bestehenden Datensatz hydratisiert.
          </p>
        </div>
      </div>
      <div className={workspaceStyles.sectionGrid}>
        <label className={workspaceStyles.field}>
          <span>Cover</span>
          <input
            className={styles.input}
            value={formatPersistedAssetLabel('Cover', Boolean(hydratedState.persistedAssets.cover))}
            readOnly
          />
        </label>
        <label className={workspaceStyles.field}>
          <span>Banner</span>
          <input
            className={styles.input}
            value={formatPersistedAssetLabel('Banner', Boolean(hydratedState.persistedAssets.banner))}
            readOnly
          />
        </label>
        <label className={workspaceStyles.field}>
          <span>Logo</span>
          <input
            className={styles.input}
            value={formatPersistedAssetLabel('Logo', Boolean(hydratedState.persistedAssets.logo))}
            readOnly
          />
        </label>
        <label className={workspaceStyles.field}>
          <span>Backgrounds</span>
          <input
            className={styles.input}
            value={`${hydratedState.persistedAssets.backgrounds.length} gespeichert`}
            readOnly
          />
        </label>
        <label className={workspaceStyles.field}>
          <span>Background-Video</span>
          <input
            className={styles.input}
            value={formatPersistedAssetLabel(
              'Background-Video',
              Boolean(hydratedState.persistedAssets.background_video),
            )}
            readOnly
          />
        </label>
      </div>
    </section>
  )
}

export function AnimeEditCoreDetailsSection({
  animeID,
  values,
  animeTypes,
  contentTypes,
  animeStatuses,
  onFieldChange,
}: AnimeEditCoreDetailsSectionProps) {
  return (
    <>
      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Basisdaten</h2>
            <p className={styles.sectionMeta}>Titel, Typ, Inhaltstyp und Status des Anime.</p>
          </div>
        </div>
        <div className={workspaceStyles.sectionGrid}>
          <label className={workspaceStyles.field}>
            <span>Anime ID</span>
            <input className={styles.input} value={String(animeID)} readOnly disabled />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel</span>
            <input className={styles.input} value={values.title} onChange={(event) => onFieldChange('title', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Type</span>
            <select className={styles.select} value={values.type} onChange={(event) => onFieldChange('type', event.target.value)}>
              <option value="">-- unveraendert --</option>
              {animeTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={workspaceStyles.field}>
            <span>Inhaltstyp</span>
            <select className={styles.select} value={values.contentType} onChange={(event) => onFieldChange('contentType', event.target.value)}>
              <option value="">-- unveraendert --</option>
              {contentTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={workspaceStyles.field}>
            <span>Status</span>
            <select className={styles.select} value={values.status} onChange={(event) => onFieldChange('status', event.target.value)}>
              <option value="">-- unveraendert --</option>
              {animeStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Titel und Struktur</h2>
            <p className={styles.sectionMeta}>Jahr, Episodenstruktur und lokalisierte Titel.</p>
          </div>
        </div>
        <div className={workspaceStyles.sectionGrid}>
          <label className={workspaceStyles.field}>
            <span>Jahr</span>
            <input className={styles.input} value={values.year} onChange={(event) => onFieldChange('year', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Max. Episoden</span>
            <input className={styles.input} value={values.maxEpisodes} onChange={(event) => onFieldChange('maxEpisodes', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel DE</span>
            <input className={styles.input} value={values.titleDE} onChange={(event) => onFieldChange('titleDE', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel EN</span>
            <input className={styles.input} value={values.titleEN} onChange={(event) => onFieldChange('titleEN', event.target.value)} />
          </label>
        </div>
      </section>
    </>
  )
}

export function AnimeEditReviewSection({
  editor,
  anime,
  title,
  source,
  folderName,
  clearFlags,
  onClearFlagChange,
  onReset,
}: AnimeEditReviewSectionProps) {
  return (
    <>
      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Speicherkontrolle</h2>
            <p className={styles.sectionMeta}>
              Edit verwendet dieselbe finale Pruefzone wie Create, aber mit Save-only Verhalten statt Redirect.
            </p>
          </div>
        </div>
        <div className={workspaceStyles.sectionGrid}>
          <label className={workspaceStyles.field}>
            <span>Aktueller Titel</span>
            <input className={styles.input} value={title} readOnly />
          </label>
          <label className={workspaceStyles.field}>
            <span>Quelle</span>
            <input className={styles.input} value={source} readOnly />
          </label>
          <label className={workspaceStyles.field}>
            <span>Ordnerpfad</span>
            <input className={styles.input} value={folderName} readOnly />
          </label>
        </div>
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={editor.onSubmit}
            disabled={!editor.canSubmit || editor.isSubmitting}
          >
            {editor.isSubmitting ? 'Aenderungen werden gespeichert...' : 'Aenderungen speichern'}
          </button>
        </div>
      </section>

      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <details className={styles.developerPanel}>
          <summary>Erweitert / Developer</summary>
          <div className={styles.developerPanelContent}>
            <div className={workspaceStyles.advancedGrid}>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.year} onChange={(event) => onClearFlagChange('year', event.target.checked)} />Jahr leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.maxEpisodes} onChange={(event) => onClearFlagChange('maxEpisodes', event.target.checked)} />Max. Episoden leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.titleDE} onChange={(event) => onClearFlagChange('titleDE', event.target.checked)} />Titel DE leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.titleEN} onChange={(event) => onClearFlagChange('titleEN', event.target.checked)} />Titel EN leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.genre} onChange={(event) => onClearFlagChange('genre', event.target.checked)} />Genres leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.description} onChange={(event) => onClearFlagChange('description', event.target.checked)} />Beschreibung leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={clearFlags.coverImage} onChange={(event) => onClearFlagChange('coverImage', event.target.checked)} />Cover leeren</label>
            </div>
            <div className={styles.actionsRow}>
              <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => onReset(anime)}>
                Patch-Form aus Kontext neu fuellen
              </button>
            </div>
          </div>
        </details>
      </section>
    </>
  )
}
