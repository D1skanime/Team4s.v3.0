'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { formatBytes, formatDateTime, padEpisodeNumber } from './episodeVersionEditorUtils'
import { useEpisodeVersionEditor } from './useEpisodeVersionEditor'
import styles from './EpisodeVersionEditor.module.css'

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return parsed
}

export function EpisodeVersionEditorPage() {
  const searchParams = useSearchParams()
  const editor = useEpisodeVersionEditor()
  const version = editor.contextData?.version
  const animeIDFromQuery = parsePositiveInt(searchParams.get('animeId'))
  const episodeIDFromQuery = parsePositiveInt(searchParams.get('episodeId'))
  const subtitle = version
    ? `Version #${version.id} - ${padEpisodeNumber(version.episode_number)} ${editor.contextData?.anime_title || ''}`.trim()
    : 'Episode-Version bearbeiten'
  const backHref =
    animeIDFromQuery && episodeIDFromQuery
      ? `/admin/anime/${animeIDFromQuery}/episodes/${episodeIDFromQuery}/versions`
      : editor.contextData
        ? `/admin/anime/${editor.contextData.version.anime_id}/episodes`
        : '/admin/anime'

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topLinks}>
          <Link href="/admin">Admin</Link>
          <span>/</span>
          <Link href={backHref}>Zurueck zu Episode-Versionen</Link>
        </div>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin Editor</p>
            <h1 className={styles.title}>Episode-Version bearbeiten</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          {editor.hasUnsavedChanges ? <span className={styles.unsavedBadge}>Ungespeicherte Aenderungen</span> : null}
        </header>

        {editor.errorMessage ? <div className={styles.errorBox}>{editor.errorMessage}</div> : null}
        {editor.successMessage ? <div className={styles.successBox}>{editor.successMessage}</div> : null}

        {editor.isLoading ? (
          <section className={styles.card}>
            <p className={styles.helperText}>Lade Editor-Daten...</p>
          </section>
        ) : version && editor.contextData ? (
          <form className={styles.form} onSubmit={(event) => void editor.handleSave(event)}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Basisdaten</h2>
                  <p className={styles.helperText}>Release-Metadaten fuer diese Version.</p>
                </div>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Release-Name</span>
                  <input
                    value={editor.formState.title}
                    onChange={(event) => editor.setFormState((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className={styles.field}>
                  <span>Release-Datum</span>
                  <input
                    type="datetime-local"
                    value={editor.formState.releaseDate}
                    onChange={(event) => editor.setFormState((current) => ({ ...current, releaseDate: event.target.value }))}
                  />
                </label>
                <label className={styles.field}>
                  <span>Untertitel-Typ</span>
                  <select
                    value={editor.formState.subtitleType}
                    onChange={(event) =>
                      editor.setFormState((current) => ({ ...current, subtitleType: event.target.value as typeof current.subtitleType }))
                    }
                  >
                    <option value="">keiner</option>
                    <option value="softsub">softsub</option>
                    <option value="hardsub">hardsub</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Aufloesung</span>
                  <input
                    value={editor.formState.videoQuality}
                    onChange={(event) => editor.setFormState((current) => ({ ...current, videoQuality: event.target.value }))}
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Speicherort</h2>
                  <p className={styles.helperText}>Der verknuepfte Anime-Ordner zur Plausibilitaetspruefung.</p>
                </div>
              </div>
              <label className={styles.field}>
                <span>Anime Folder Path</span>
                <input value={editor.folderPath || 'nicht verfuegbar'} readOnly />
              </label>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Medien &amp; Synchronisierung</h2>
                  <p className={styles.helperText}>Datei aus dem Anime-Ordner waehlen statt Media-ID manuell einzutragen.</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={() => void editor.handleScanFolder()} disabled={editor.isScanning}>
                  {editor.isScanning ? 'Ordner wird gelesen...' : 'Ordner synchronisieren'}
                </button>
              </div>

              <label className={styles.field}>
                <span>Stream Link</span>
                <input
                  value={editor.formState.streamURL}
                  onChange={(event) => editor.setFormState((current) => ({ ...current, streamURL: event.target.value }))}
                />
              </label>

              <div className={styles.fileCard}>
                <div className={styles.fileCardHeader}>
                  <h3 className={styles.fileCardTitle}>Ausgewaehlte Datei</h3>
                  <button className={styles.ghostButton} type="button" onClick={() => editor.setShowFilePanel((current) => !current)}>
                    {editor.showFilePanel ? 'Auswahl schliessen' : 'Datei wechseln'}
                  </button>
                </div>
                {editor.selectedFile ? (
                  <div className={styles.fileStats}>
                    <span>Datei: {editor.selectedFile.file_name}</span>
                    <span>Groesse: {formatBytes(editor.selectedFile.file_size_bytes)}</span>
                    <span>Qualitaet: {editor.selectedFile.video_quality || editor.formState.videoQuality || 'n/a'}</span>
                    <span>Media ID: {editor.selectedFile.media_item_id}</span>
                    <span>Geaendert: {formatDateTime(editor.selectedFile.last_modified)}</span>
                    <span>Erkannte Episode: {editor.selectedFile.detected_episode_number || 'n/a'}</span>
                  </div>
                ) : (
                  <p className={styles.helperText}>Noch keine Datei ausgewaehlt.</p>
                )}
              </div>

              {editor.showFilePanel ? (
                <div className={styles.filePanel}>
                  {editor.availableFiles.length > 0 ? (
                    editor.availableFiles.map((file) => (
                      <button key={`${file.media_item_id}-${file.path}`} type="button" className={styles.fileOption} onClick={() => editor.applyFile(file)}>
                        <strong>{file.file_name}</strong>
                        <span>{file.video_quality || 'n/a'}</span>
                        <span>{formatBytes(file.file_size_bytes)}</span>
                        <span>{formatDateTime(file.last_modified)}</span>
                        <span>Episode: {file.detected_episode_number || 'n/a'}</span>
                      </button>
                    ))
                  ) : (
                    <p className={styles.helperText}>Nach der Synchronisierung erscheinen hier auswaehlbare Dateien.</p>
                  )}
                </div>
              ) : null}

              <details className={styles.advancedPanel} open={editor.advancedMode} onToggle={(event) => editor.setAdvancedMode(event.currentTarget.open)}>
                <summary>Advanced Mode: manuelle Media-Override</summary>
                <div className={styles.grid}>
                  <label className={styles.field}>
                    <span>Media Provider</span>
                    <input
                      value={editor.formState.mediaProvider}
                      onChange={(event) => editor.setFormState((current) => ({ ...current, mediaProvider: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Jellyfin Media ID</span>
                    <input
                      value={editor.formState.mediaItemID}
                      onChange={(event) => editor.setFormState((current) => ({ ...current, mediaItemID: event.target.value }))}
                    />
                  </label>
                </div>
              </details>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Fansub Gruppen</h2>
                  <p className={styles.helperText}>Suche nach Gruppenname oder Alias. Mehrere Gruppen werden als Kollaboration gespeichert.</p>
                </div>
              </div>

              <label className={styles.field}>
                <span>Gruppe suchen</span>
                <input value={editor.groupQuery} onChange={(event) => editor.setGroupQuery(event.target.value)} placeholder="Name oder Alias..." />
              </label>

              {editor.isSearching ? <p className={styles.helperText}>Suche laeuft...</p> : null}
              {editor.searchMessage ? <p className={styles.helperText}>{editor.searchMessage}</p> : null}
              {editor.groupResults.length > 0 ? (
                <div className={styles.groupSearchList}>
                  {editor.groupResults.map((group) => (
                    <button key={group.id} type="button" className={styles.groupSearchItem} onClick={() => editor.addGroup(group)}>
                      <strong>{group.name}</strong>
                      <span>{group.group_type === 'collaboration' ? 'Kollaboration' : 'Gruppe'} | {group.slug}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={styles.chipRow}>
                {editor.selectedGroups.length > 0 ? (
                  editor.selectedGroups.map((group) => (
                    <button key={group.id} type="button" className={styles.chip} title={`Slug: ${group.slug}`} onClick={() => editor.removeGroup(group.id)}>
                      {group.name} x
                    </button>
                  ))
                ) : (
                  <span className={styles.helperText}>Keine Gruppe ausgewaehlt.</span>
                )}
              </div>
            </section>

            <section className={styles.actionBar}>
              <Link href={backHref} className={styles.secondaryButton}>
                Zurueck
              </Link>
              <button className={styles.primaryButton} type="submit" disabled={editor.isSaving}>
                {editor.isSaving ? <span className={styles.spinner} aria-hidden="true" /> : null}
                {editor.isSaving ? 'Speichert...' : 'Speichern'}
              </button>
              <button className={styles.dangerButton} type="button" onClick={() => void editor.handleDelete()} disabled={editor.isDeleting}>
                {editor.isDeleting ? 'Loescht...' : 'Delete'}
              </button>
            </section>
          </form>
        ) : null}
      </div>
    </main>
  )
}
