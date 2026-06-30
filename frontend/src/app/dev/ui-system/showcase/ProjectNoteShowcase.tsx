'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Badge, Button, Card, FormField, Input, SectionHeader, Select } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'

import styles from '../page.module.css'

export function ProjectNoteShowcase() {
  const [projectNoteTitle, setProjectNoteTitle] = useState('ffff')
  const [projectNoteVisibility, setProjectNoteVisibility] = useState<'internal' | 'public'>('internal')
  const [projectNoteStatus, setProjectNoteStatus] = useState<'draft' | 'published' | 'archived' | 'deleted'>('draft')
  const [projectNoteBody, setProjectNoteBody] = useState<unknown>({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hunter X Hunter 99 - Ep.62' }],
      },
    ],
  })

  return (
    <Card variant="section" title="Komposition 6 - Anime-Einblicke / Editor-Accordion" description="Referenz für Projekttexte: aufklappbare Anime-Karte, ruhige Editor-Hülle, Status-Badges und ein kompakter unterer Optionsblock.">
      <SectionHeader
        eyebrow="Fansub-Detail"
        title="Anime-Projekttexte"
        description="Projekttexte dieser Fansubgruppe zu ihren Anime. Pro Anime kann ein beschreibender Text gespeichert werden."
      />

      <div className={styles.projectNotesList}>
        <Card variant="nested" className={styles.projectNotesCard}>
          <button type="button" className={styles.projectNotesHeader} aria-expanded="true">
            <div className={styles.projectNotesHeaderBody}>
              <p className={styles.projectNotesEyebrow}>Anime-Projekttext</p>
              <h3 className={styles.projectNotesTitle}>Projekttext für Naruto</h3>
              <p className={styles.projectNotesHint}>
                Eintrag öffnen, um den Projekttext, Status und die Sichtbarkeit für diesen Anime zu pflegen.
              </p>
            </div>
            <div className={styles.projectNotesHeaderMeta}>
              <span>1 Editor</span>
              <span className={styles.disclosureIconInline} aria-hidden="true">
                <ChevronDown size={24} />
              </span>
            </div>
          </button>

          <div className={styles.projectNotesCardBody}>
            <div className={styles.projectNotesEditorCard}>
              <div className={styles.projectNotesEditorHeader}>
                <div className={styles.projectNotesEditorHeading}>
                  <p className={styles.projectNotesEyebrow}>Anime-Projekttext</p>
                  <h3 className={styles.projectNotesEditorTitle}>Projekttext für Naruto</h3>
                </div>
                <div className={styles.projectNotesBadgeRow}>
                  <Badge variant="muted">Intern</Badge>
                  <Badge variant="muted">Entwurf</Badge>
                </div>
              </div>

              <div className={styles.projectNotesEditorMain}>
                <FormField label="Titel">
                  <Input value={projectNoteTitle} onChange={(event) => setProjectNoteTitle(event.target.value)} />
                </FormField>

                <FormField label="Projekttext">
                  <div className={styles.projectNotesEditorSurface}>
                    <RichTextEditor
                      value={projectNoteBody}
                      onChange={setProjectNoteBody}
                      mode="longform"
                      minHeight={240}
                      placeholder="Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime."
                    />
                  </div>
                </FormField>
              </div>

              <div className={styles.projectNotesOptionsCard}>
                <div className={styles.projectNotesOptionsIntro}>
                  <p className={styles.projectNotesEyebrow}>Optionen</p>
                  <h4>Steuerung für Sichtbarkeit und Status</h4>
                </div>
                <div className={styles.projectNotesOptionsGrid}>
                  <FormField label="Sichtbarkeit">
                    <Select
                      value={projectNoteVisibility}
                      onChange={(event) => setProjectNoteVisibility(event.target.value as 'internal' | 'public')}
                    >
                      <option value="internal">Intern</option>
                      <option value="public">Öffentlich</option>
                    </Select>
                  </FormField>
                  <FormField label="Status">
                    <Select
                      value={projectNoteStatus}
                      onChange={(event) => setProjectNoteStatus(event.target.value as 'draft' | 'published' | 'archived' | 'deleted')}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="published">Veröffentlicht</option>
                      <option value="archived">Archiviert</option>
                      <option value="deleted">Gelöscht</option>
                    </Select>
                  </FormField>
                </div>
              </div>

              <div className={styles.projectNotesActionBar}>
                <p className={styles.projectNotesActionHint}>Gespeicherter Eintrag (ID: 2)</p>
                <Button variant="success">Speichern</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  )
}
