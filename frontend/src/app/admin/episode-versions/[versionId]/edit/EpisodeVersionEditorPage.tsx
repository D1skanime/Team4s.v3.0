'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { formatBytes, formatDateTime, formatDurationInput, padEpisodeNumber, parseDurationInput } from './episodeVersionEditorUtils'
import { useEpisodeVersionEditor } from './useEpisodeVersionEditor'
import { SegmenteTab } from './SegmenteTab'
import styles from './EpisodeVersionEditor.module.css'

type ActiveTab = 'uebersicht' | 'dateien' | 'informationen' | 'segmente' | 'changelog'

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('informationen')

  const segmentAnimeId = editor.contextData?.version.anime_id ?? null
  const segmentGroupId = editor.contextData?.selected_groups[0]?.id ?? null
  const segmentVersion: string | null = editor.contextData?.version.release_version?.trim() || 'v1'

  const animeTitle = editor.contextData?.anime_title ?? ''
  const episodeNumber = version?.episode_number ?? null
  const groupName = editor.contextData?.selected_groups[0]?.name ?? null

  const backHref =
    animeIDFromQuery && episodeIDFromQuery
      ? `/admin/anime/${animeIDFromQuery}/episodes/${episodeIDFromQuery}/versions`
      : editor.contextData
        ? `/admin/anime/${editor.contextData.version.anime_id}/episodes`
        : '/admin/anime'

  const animeHref = editor.contextData
    ? `/admin/anime/${editor.contextData.version.anime_id}/edit`
    : '/admin/anime'

  const episodesHref = editor.contextData
    ? `/admin/anime/${editor.contextData.version.anime_id}/episodes`
    : '/admin/anime'

  // Build breadcrumb parts
  const breadcrumbEpisodeLabel = episodeNumber != null
    ? `Episode ${padEpisodeNumber(episodeNumber)}`
    : 'Episode'
  const breadcrumbVersionLabel = groupName
    ? `${groupName} ${segmentVersion}`
    : version
      ? `Version #${version.id}`
      : 'Version'

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* Breadcrumb */}
        <nav className={styles.topLinks}>
          <Link href="/admin/anime">Anime</Link>
          <span>/</span>
          {animeTitle ? (
            <>
              <Link href={animeHref}>{animeTitle}</Link>
              <span>/</span>
            </>
          ) : null}
          <Link href={episodesHref}>{breadcrumbEpisodeLabel}</Link>
          <span>/</span>
          <span style={{ color: '#1c1c1e' }}>{breadcrumbVersionLabel}</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin Editor</p>
            <h1 className={styles.title}>
              {animeTitle || 'Episode-Version bearbeiten'}
            </h1>
            {version ? (
              <p className={styles.subtitle}>
                {breadcrumbEpisodeLabel}
                {groupName ? ` \u00B7 ${groupName} ${segmentVersion}` : ''}
              </p>
            ) : null}
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
            {/* 5-Tab navigation */}
            <div className={styles.tabNav}>
              <button
                type="button"
                className={activeTab === 'uebersicht' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('uebersicht')}
              >
                Uebersicht
              </button>
              <button
                type="button"
                className={activeTab === 'dateien' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('dateien')}
              >
                Dateien
              </button>
              <button
                type="button"
                className={activeTab === 'informationen' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('informationen')}
              >
                Informationen
              </button>
              <button
                type="button"
                className={activeTab === 'segmente' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('segmente')}
              >
                Segmente
              </button>
              <button
                type="button"
                className={activeTab === 'changelog' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('changelog')}
              >
                Changelog
              </button>
            </div>

            {/* Uebersicht tab stub */}
            {activeTab === 'uebersicht' ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Uebersicht</h2>
                    <p className={styles.helperText}>Zusammenfassung dieser Episode-Version.</p>
                  </div>
                </div>
                <div className={styles.stubInfo}>
                  <p className={styles.helperText}>
                    Anime: {animeTitle || '\u2014'}
                  </p>
                  <p className={styles.helperText}>
                    Episode: {episodeNumber != null ? padEpisodeNumber(episodeNumber) : '\u2014'}
                  </p>
                  {groupName ? (
                    <p className={styles.helperText}>Gruppe: {groupName}</p>
                  ) : null}
                  <p className={styles.helperText} style={{ marginTop: 8, fontStyle: 'italic' }}>
                    Eine detaillierte Uebersicht wird in einem spaeten Plan ergaenzt.
                  </p>
                </div>
              </section>
            ) : null}

            {/* Dateien tab stub */}
            {activeTab === 'dateien' ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Dateien</h2>
                    <p className={styles.helperText}>Medien-Datei-Verwaltung fuer diese Version.</p>
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
            ) : null}

            {/* Informationen tab — main metadata form */}
            {activeTab === 'informationen' ? (
            <>
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
                <label className={styles.field}>
                  <span>Gesamtdauer</span>
                  <input
                    value={editor.formState.durationSeconds}
                    placeholder="z. B. 24:10 oder 1450"
                    onChange={(event) => editor.setFormState((current) => ({ ...current, durationSeconds: event.target.value }))}
                    onBlur={(event) => {
                      const parsed = parseDurationInput(event.target.value)
                      if (parsed != null) {
                        editor.setFormState((current) => ({ ...current, durationSeconds: formatDurationInput(parsed) }))
                      }
                    }}
                  />
                </label>
              </div>
              <p className={styles.helperText}>Akzeptiert `m:ss`, `hh:mm:ss` oder rohe Sekunden. Wird als Grenze fuer Segment-Endzeiten verwendet.</p>
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
            </>) : null}

            {/* Segmente tab */}
            {activeTab === 'segmente' ? (
              <SegmenteTab
                animeId={segmentAnimeId}
                groupId={segmentGroupId}
                version={segmentVersion}
                episodeNumber={episodeNumber}
                durationSeconds={editor.contextData?.version.duration_seconds}
                releaseVariantId={editor.contextData?.version.id ?? null}
              />
            ) : null}

            {/* Changelog tab stub */}
            {activeTab === 'changelog' ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Changelog</h2>
                    <p className={styles.helperText}>Aenderungshistorie dieser Episode-Version.</p>
                  </div>
                </div>
                <p className={styles.helperText} style={{ fontStyle: 'italic' }}>
                  Changelog-Eintraege werden in einem spaeten Plan ergaenzt.
                </p>
              </section>
            ) : null}

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
