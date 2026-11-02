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
 * Verhaltensnachweis für die FormField-Autoverknüpfung (UAT-Befund 5): FormField reicht
 * id/disabled/invalid/aria-invalid/aria-describedby automatisch an genau EIN umschlossenes,
 * bekanntes Feld weiter (Input/Select/Textarea/DatePicker/YearPicker/Switch), ohne dass ein
 * expliziter htmlFor/invalid-Aufrufer etwas daran ändert.
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

  it('verknüpft das Label sicher, wenn das Kind bereits eine eigene id hat, aber FormField kein htmlFor übergibt', () => {
    render(
      <FormField label="Vorhandene ID ohne htmlFor">
        <Input id="bereits-vergeben" />
      </FormField>,
    )

    // getByLabelText scheitert, wenn label[for] nicht auf die tatsächliche Feld-id zeigt --
    // das ist exakt der zuvor fehlerhafte Fall (labelHtmlFor blieb undefined).
    const input = screen.getByLabelText('Vorhandene ID ohne htmlFor') as HTMLInputElement
    expect(input.id).toBe('bereits-vergeben')
    const label = screen.getByText('Vorhandene ID ohne htmlFor')
    expect(label.getAttribute('for')).toBe('bereits-vergeben')
  })

  it('löst einen Widerspruch zwischen FormField.htmlFor und einer abweichenden Kind-id zugunsten der tatsächlichen Kind-id auf', () => {
    render(
      <FormField label="Widersprüchliche IDs" htmlFor="vom-aufrufer-gemeint">
        <Input id="tatsaechliche-kind-id" />
      </FormField>,
    )

    // resolvedId bevorzugt die vorhandene Kind-id -- das Label MUSS derselben Priorität folgen,
    // sonst zeigt label[for] auf eine ID, die am Feld gar nicht existiert.
    const input = screen.getByLabelText('Widersprüchliche IDs') as HTMLInputElement
    expect(input.id).toBe('tatsaechliche-kind-id')
    const label = screen.getByText('Widersprüchliche IDs')
    expect(label.getAttribute('for')).toBe('tatsaechliche-kind-id')
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

  it('verknüpft Switch per aria-labelledby mit dem sichtbaren FormField-Label (analog zu DatePicker/YearPicker)', () => {
    render(
      <FormField label="Benachrichtigungen">
        <Switch checked={false} onCheckedChange={() => {}} />
      </FormField>,
    )

    // Die zugängliche Bezeichnung kommt über aria-labelledby vom sichtbaren FormField-Label --
    // Switch selbst bekommt hier keine eigene label-Prop, hätte also ohne diese Verknüpfung
    // keinen für Screenreader vorgelesenen Namen außer "Schalter, aus".
    const switchEl = screen.getByRole('switch', { name: 'Benachrichtigungen' }) as HTMLButtonElement
    const visibleLabel = screen.getByText('Benachrichtigungen')
    expect(switchEl.getAttribute('aria-labelledby')).toBe(visibleLabel.id)
  })

  it('verknüpft DatePicker/YearPicker über ihren internen Trigger-Button mit aria-describedby (ohne aria-invalid -- die implizite button-Rolle unterstützt dieses Attribut laut ARIA-Spezifikation nicht, siehe FormField.tsx)', () => {
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
    // Die zugängliche Bezeichnung kommt jetzt über aria-labelledby vom sichtbaren FormField-Label
    // ("Datum"), nicht mehr von DatePickers eigener, unabhängiger label-Prop ("Geburtsdatum") --
    // genau das behebt den zuvor möglichen Auseinanderlauf zwischen vorgelesenem und sichtbarem Text.
    const dateTrigger = screen.getByRole('button', { name: 'Datum' })
    expect(dateTrigger.getAttribute('aria-invalid')).toBeNull()
    expect(dateTrigger.getAttribute('aria-describedby')).toBeTruthy()
    const dateLabel = screen.getByText('Datum')
    expect(dateTrigger.getAttribute('aria-labelledby')).toBe(dateLabel.id)

    render(
      <FormField label="Jahr" error="Ungültiges Jahr">
        <YearPicker id="erschienen" label="Erschienen" value="" minYear={1900} maxYear={2100} onChange={() => {}} />
      </FormField>,
    )
    const yearTrigger = screen.getByRole('button', { name: 'Jahr' })
    expect(yearTrigger.getAttribute('aria-invalid')).toBeNull()
    expect(yearTrigger.getAttribute('aria-describedby')).toBeTruthy()
    const yearLabel = screen.getByText('Jahr')
    expect(yearTrigger.getAttribute('aria-labelledby')).toBe(yearLabel.id)
  })

  it('belässt DatePicker/YearPicker bei ihrer eigenständigen label-Prop als aria-label-Quelle, wenn sie ohne FormField (also ohne sichtbares Label) verwendet werden', () => {
    render(
      <DatePicker id="eigenstaendig-datum" label="Veröffentlichungsdatum" value="" minYear={1900} maxYear={2100} onChange={() => {}} />,
    )
    const dateTrigger = screen.getByRole('button', { name: 'Veröffentlichungsdatum auswählen' })
    expect(dateTrigger.getAttribute('aria-labelledby')).toBeNull()

    render(
      <YearPicker id="eigenstaendig-jahr" label="Erschienen" value="" minYear={1900} maxYear={2100} onChange={() => {}} />,
    )
    const yearTrigger = screen.getByRole('button', { name: 'Erschienen' })
    expect(yearTrigger.getAttribute('aria-labelledby')).toBeNull()
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

  it('löst keinen Klick aus, wenn der Switch deaktiviert ist (Rückwärtskompat-Smoketest)', () => {
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
