'use client'

import { Card, FormField, Input, Select, Textarea } from '@/components/ui'

import styles from './showcases.module.css'

/**
 * Formular mit mehreren gleichzeitig fehlerhaften Feldern -- bei JEDEM Feld ist NUR `error` am
 * FormField gesetzt, ohne manuelles `invalid` am umschlossenen Input/Select/Textarea. Zeigt
 * sichtbar, dass die automatische id-/aria-invalid-/aria-describedby-Verknüpfung aus Befund 5
 * greift, ohne dass der Aufrufer sie am Feld selbst wiederholen muss.
 */
export function FormWithErrorsShowcase() {
  return (
    <Card
      variant="section"
      title="Anime anlegen"
      description="Alle drei Felder zeigen einen Fehler, ohne dass invalid/aria-* manuell am Feld gesetzt wurde."
    >
      <p className={styles.formWithErrorsHint}>
        Die Fehlerverknüpfung (id, aria-invalid, aria-describedby) erfolgt automatisch durch
        FormField, sobald nur <code>error</code> gesetzt wird.
      </p>
      <div className={styles.stack}>
        <FormField label="Titel" error="Titel ist bereits vergeben.">
          <Input placeholder="z. B. Naruto" />
        </FormField>
        <FormField label="Status" error="Bitte einen Status wählen.">
          <Select>
            <option value="">-- auswählen --</option>
            <option value="public">Öffentlich</option>
            <option value="private">Privat</option>
          </Select>
        </FormField>
        <FormField label="Beschreibung" error="Mindestens 20 Zeichen erforderlich.">
          <Textarea placeholder="Beschreibung eingeben" />
        </FormField>
      </div>
    </Card>
  )
}
