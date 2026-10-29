// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { DatePicker } from './DatePicker'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Switch } from './Switch'
import { Textarea } from './Textarea'
import { YearPicker } from './YearPicker'

/**
 * Verhaltensnachweis für die FormField-Autoverknuepfung (UAT-Befund 5): FormField reicht
 * id/disabled/invalid/aria-invalid/aria-describedby automatisch an genau EIN umschlossenes,
 * bekanntes Feld weiter (Input/Select/Textarea/DatePicker/YearPicker/Switch), ohne dass ein
 * expliziter htmlFor/invalid-Aufrufer etwas daran aendert.
 */
describe('FormField Autoverknüpfung', () => {
  it('vergibt bei genau einem Input-Kind ohne eigene id/invalid automatisch id, invalid, aria-invalid und aria-describedby auf den Fehlertext', () => {
    render(
      <FormField label="Titel" error="Pflichtfeld">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('Titel') as HTMLInputElement
    expect(input.id).toBeTruthy()
    expect(input.getAttribute('aria-invalid')).toBe('true')

    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const errorNode = screen.getByText('Pflichtfeld')
    expect(describedBy).toContain(errorNode.id)
  })

  it('verknüpft bei hint UND error beide <p>-IDs leerzeichengetrennt ohne Duplikate', () => {
    render(
      <FormField label="Titel" hint="Hinweistext" error="Fehlertext">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('Titel') as HTMLInputElement
    const hintNode = screen.getByText('Hinweistext')
    const errorNode = screen.getByText('Fehlertext')
    const tokens = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)

    expect(tokens).toContain(hintNode.id)
    expect(tokens).toContain(errorNode.id)
    expect(new Set(tokens).size).toBe(tokens.length)
  })

  it('überschreibt einen expliziten htmlFor/id-Normalfall nicht', () => {
    render(
      <FormField label="Titel" htmlFor="eigene-id">
        <Input id="eigene-id" />
      </FormField>,
    )

    const input = screen.getByLabelText('Titel') as HTMLInputElement
    expect(input.id).toBe('eigene-id')
  })

  it('verknüpft manuell gesetztes invalid=true mit error ODER-artig (bleibt invalid)', () => {
    render(
      <FormField label="Titel" error="Fehlertext">
        <Input invalid />
      </FormField>,
    )

    const input = screen.getByLabelText('Titel') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('reicht FormField.disabled an ein Kind ohne eigenes disabled weiter', () => {
    render(
      <FormField label="Titel" disabled>
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('Titel') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('verknüpft Select und Textarea ebenso automatisch', () => {
    render(
      <FormField label="Auswahl" error="Bitte wählen">
        <Select>
          <option value="a">A</option>
        </Select>
      </FormField>,
    )
    const select = screen.getByLabelText('Auswahl') as HTMLSelectElement
    expect(select.getAttribute('aria-invalid')).toBe('true')
    expect(select.getAttribute('aria-describedby')).toBeTruthy()

    render(
      <FormField label="Beschreibung" error="Zu kurz">
        <Textarea />
      </FormField>,
    )
    const textarea = screen.getByLabelText('Beschreibung') as HTMLTextAreaElement
    expect(textarea.getAttribute('aria-invalid')).toBe('true')
    expect(textarea.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('verknüpft Switch mit aria-invalid/aria-describedby/id, aber ohne invalid-Prop', () => {
    render(
      <FormField label="Benachrichtigungen" error="Fehlertext">
        <Switch checked={false} onCheckedChange={() => {}} />
      </FormField>,
    )

    const switchEl = screen.getByRole('switch') as HTMLButtonElement
    expect(switchEl.id).toBeTruthy()
    expect(switchEl.getAttribute('aria-invalid')).toBe('true')
    expect(switchEl.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('verknüpft DatePicker/YearPicker über ihren internen Trigger-Button mit aria-describedby/aria-invalid', () => {
    render(
      <FormField label="Datum" error="Ungültiges Datum">
        <DatePicker
          id="geburtsdatum"
          label="Geburtsdatum"
          value=""
          minYear={1900}
          maxYear={2100}
          onChange={() => {}}
        />
      </FormField>,
    )
    const dateTrigger = screen.getByRole('button', { name: 'Geburtsdatum auswählen' })
    expect(dateTrigger.getAttribute('aria-invalid')).toBe('true')
    expect(dateTrigger.getAttribute('aria-describedby')).toBeTruthy()

    render(
      <FormField label="Jahr" error="Ungültiges Jahr">
        <YearPicker id="erschienen" label="Erschienen" value="" minYear={1900} maxYear={2100} onChange={() => {}} />
      </FormField>,
    )
    const yearTrigger = screen.getByRole('button', { name: 'Erschienen' })
    expect(yearTrigger.getAttribute('aria-invalid')).toBe('true')
    expect(yearTrigger.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('rendert ein nicht unterstütztes Kind (mehrere Kinder oder unbekannter Typ) unverändert ohne Fehler', () => {
    expect(() =>
      render(
        <FormField label="Mehrere Kinder">
          <Input />
          <span>Zusatztext</span>
        </FormField>,
      ),
    ).not.toThrow()

    function CustomField() {
      return <div data-testid="custom-field">Custom</div>
    }

    expect(() =>
      render(
        <FormField label="Unbekannter Typ" error="Fehlertext">
          <CustomField />
        </FormField>,
      ),
    ).not.toThrow()

    expect(screen.getByTestId('custom-field')).not.toBeNull()
  })

  it('löst keinen Klick aus, wenn der Switch deaktiviert ist (Rueckwaertskompat-Smoketest)', () => {
    render(
      <FormField label="Status">
        <Switch checked={false} onCheckedChange={() => {}} disabled />
      </FormField>,
    )

    const switchEl = screen.getByRole('switch') as HTMLButtonElement
    fireEvent.click(switchEl)
    expect(switchEl.getAttribute('aria-checked')).toBe('false')
  })
})
