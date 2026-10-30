'use client'

import { useState } from 'react'

import { Button, Card, FormField, Input, Modal, Select, Table, TableBody, TableCell, TableRow } from '@/components/ui'

import styles from './showcases.module.css'

/**
 * Demonstriert ein vollständiges Modal im Kontext einer realistischen Seite: eine Mock-Tabelle
 * mit Daten, ein "Bearbeiten"-Button, der das Modal öffnet, und darin ein Formular mit
 * FormField+Input/Select. Zeigt die Modal/DialogHeader/IconButton-Komposition (Task 7) so, wie
 * sie in einer echten Admin-Seite verwendet würde — nicht nur isoliert als Primitiv-Story.
 *
 * `initialOpen` ist additiv und ausschließlich für Storybook gedacht (z. B. eine "Geöffnet"-
 * Story, die das Modal ohne Klick auf "Bearbeiten" direkt sichtbar macht) -- die normale
 * Verwendung ohne diese Prop verhält sich unverändert (startet geschlossen).
 */
interface ModalInContextShowcaseProps {
  initialOpen?: boolean
}

export function ModalInContextShowcase({ initialOpen = false }: ModalInContextShowcaseProps = {}) {
  const [open, setOpen] = useState(initialOpen)
  const [title, setTitle] = useState('Naruto')
  const [status, setStatus] = useState('public')

  return (
    <>
      <Card variant="section" title="Anime-Liste" description="Mock-Seite zur Demonstration des Modal-über-Seite-Flusses.">
        <Table variant="compact">
          <TableBody>
            <TableRow>
              <TableCell>{title}</TableCell>
              <TableCell>{status === 'public' ? 'Öffentlich' : status === 'private' ? 'Privat' : 'Deaktiviert'}</TableCell>
              <TableCell>
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
                  Bearbeiten
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Anime bearbeiten"
        description="Änderungen werden erst nach dem Speichern übernommen."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={() => setOpen(false)}>Speichern</Button>
          </>
        )}
      >
        <div className={styles.stack}>
          <FormField label="Titel" hint="Wie im Katalog angezeigt.">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="public">Öffentlich</option>
              <option value="private">Privat</option>
              <option value="disabled">Deaktiviert</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </>
  )
}
