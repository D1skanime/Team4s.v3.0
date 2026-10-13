'use client'

import { Button, Card, FormField, Input } from '@/components/ui'
import { EpisodeClassificationSection } from '@/components/releaseEditor/EpisodeClassificationSection'
import { JellyfinEnrichmentNotice } from '@/components/releaseEditor/JellyfinEnrichmentNotice'
import { ReleaseVersionMetadataFields } from '@/components/releaseEditor/ReleaseVersionMetadataFields'
import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'

import type { useReleaseEditorData } from './useReleaseEditorData'

interface ReleaseEditorMetadataTabProps {
  editor: ReturnType<typeof useReleaseEditorData>
  isPlatformAdmin: boolean
  canEditMetadata: boolean
  projectTimeline: AnimeFansubProjectTimeline | null
}

/**
 * Basisdaten-Tab-Inhalt (D-02): das geteilte Metadaten-Formular ist fuer alle Rollen sichtbar,
 * die admin-exklusiven Zusatzbloecke (Episoden-Klassifikation, Speicherort, Fansub-Gruppen,
 * Jellyfin-Anreicherungs-Hinweis) sind ausschliesslich an isPlatformAdmin gebunden -- fuer
 * Nicht-Admins existieren sie gar nicht im DOM (kein ausgegrauter Hinweis).
 */
export function ReleaseEditorMetadataTab({
  editor,
  isPlatformAdmin,
  canEditMetadata,
  projectTimeline,
}: ReleaseEditorMetadataTabProps) {
  // Caller (Plan 07's page orchestrator) only mounts this tab after the editor context has
  // loaded; this guard exists purely for type-safety (contextData is nullable in the hook's
  // return type while isLoading), not an expected runtime state for this component.
  if (!editor.contextData) return null

  return (
    <>
      <Card title="Basisdaten">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void editor.handleSave(event, !isPlatformAdmin && canEditMetadata)
          }}
        >
          <ReleaseVersionMetadataFields
            context={editor.contextData}
            formState={editor.formState}
            setFormState={editor.setFormState}
            projectTimeline={projectTimeline}
            selectedGroupIds={editor.selectedGroups.map((group) => group.id)}
          />
          {editor.errorMessage ? <p role="alert">{editor.errorMessage}</p> : null}
          {editor.successMessage ? <p role="status">{editor.successMessage}</p> : null}
          <Button type="submit" variant="success" loading={editor.isSaving}>
            Basisdaten speichern
          </Button>
        </form>
      </Card>

      {isPlatformAdmin && editor.contextData?.episode ? (
        <Card title="Episode-Klassifikation">
          <EpisodeClassificationSection
            key={editor.contextData.episode.episode_id}
            classification={editor.contextData.episode}
          />
        </Card>
      ) : null}

      {isPlatformAdmin ? (
        <Card title="Speicherort">
          <FormField label="Anime Folder Path">
            <Input value={editor.folderPath || 'nicht verfügbar'} readOnly />
          </FormField>
        </Card>
      ) : null}

      {isPlatformAdmin ? (
        <Card title="Fansub Gruppen">
          <FormField label="Gruppe suchen">
            <Input
              value={editor.groupQuery}
              onChange={(event) => editor.setGroupQuery(event.target.value)}
              placeholder="Name oder Alias..."
            />
          </FormField>
          {editor.isSearching ? <p role="status">Suche läuft...</p> : null}
          {editor.searchMessage ? <p role="status">{editor.searchMessage}</p> : null}
          {editor.groupResults.map((group) => (
            <Button key={group.id} type="button" variant="ghost" size="sm" onClick={() => editor.addGroup(group)}>
              {group.name} · {group.slug}
            </Button>
          ))}
          {editor.selectedGroups.length > 0 ? (
            editor.selectedGroups.map((group) => (
              <Button
                key={group.id}
                type="button"
                variant="ghost"
                size="sm"
                title={`Slug: ${group.slug}`}
                onClick={() => editor.removeGroup(group.id)}
              >
                {group.name} ×
              </Button>
            ))
          ) : (
            <p>Keine Gruppe ausgewählt.</p>
          )}
        </Card>
      ) : null}

      {isPlatformAdmin && editor.contextData?.jellyfin_enrichment_degraded ? <JellyfinEnrichmentNotice /> : null}
    </>
  )
}
