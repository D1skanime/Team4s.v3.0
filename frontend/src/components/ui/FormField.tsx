import { Children, cloneElement, isValidElement, useId } from 'react'
import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { DatePicker } from './DatePicker'
import { Input } from './Input'
import { Label } from './Label'
import { Select } from './Select'
import { Switch } from './Switch'
import { Text } from './Text'
import { Textarea } from './Textarea'
import { YearPicker } from './YearPicker'
import styles from './FormField.module.css'

export interface FormFieldProps {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  children: ReactNode
}

/**
 * Die sechs Feld-Primitive, für die FormField automatisch id/disabled/invalid/aria-invalid/
 * aria-describedby injizieren darf. Jeder andere Kind-Typ (z. B. UploadDropzone, ein eigener
 * Radiogroup-Baustein oder mehrere Kinder gleichzeitig) bleibt unangetastet -- reines
 * {children}-Rendering wie vor diesem Umbau, damit kein bestehender Verwender riskiert wird.
 */
const KNOWN_FIELD_TYPES: readonly unknown[] = [Input, Select, Textarea, DatePicker, YearPicker, Switch]

/**
 * Führt eine bereits am Kind vorhandene aria-describedby mit den neu erzeugten Hinweis-/
 * Fehler-IDs zusammen -- leerzeichengetrennt, ohne Duplikate, ergibt undefined statt eines
 * leeren Strings, wenn nichts zu verknüpfen ist.
 */
function mergeDescribedBy(existing: string | undefined, ...ids: Array<string | undefined>): string | undefined {
  const tokens = new Set<string>()
  for (const token of (existing ?? '').split(' ')) {
    if (token) tokens.add(token)
  }
  for (const id of ids) {
    if (id) tokens.add(id)
  }
  return tokens.size > 0 ? Array.from(tokens).join(' ') : undefined
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  disabled = false,
  children,
}: FormFieldProps) {
  // useId() unconditional aufrufen (React-Hook-Regel) -- wird nur genutzt, wenn weder das Kind
  // noch FormField selbst bereits eine ID mitbringen.
  const generatedId = useId()

  const childArray = Children.toArray(children)
  const singleChild = childArray.length === 1 ? childArray[0] : null
  const isKnownField = singleChild !== null && isValidElement(singleChild) && KNOWN_FIELD_TYPES.includes(singleChild.type)

  let renderedChildren: ReactNode = children
  let labelHtmlFor = htmlFor
  let labelId: string | undefined
  let hintId: string | undefined
  let errorId: string | undefined

  if (isKnownField && singleChild && isValidElement(singleChild)) {
    const childProps = singleChild.props as Record<string, unknown>
    // Reihenfolge verbindlich: eigene id am Kind gewinnt, sonst FormField.htmlFor, sonst eine neu
    // generierte ID -- so zeigt ein Label mit explizitem htmlFor nie auf eine andere ID als die,
    // die das Kind tatsächlich bekommt.
    const existingId = typeof childProps.id === 'string' ? childProps.id : undefined
    const resolvedId = existingId ?? htmlFor ?? generatedId

    // Immer erzeugt, sobald ein sichtbares Label vorhanden ist (nicht mehr nur, wenn die ID selbst
    // neu generiert wurde) -- DatePicker/YearPicker verknüpfen ihren Trigger per aria-labelledby
    // darauf, damit ein Screenreader exakt den sichtbaren Labeltext vorliest statt eines zweiten,
    // unabhängigen Textes aus ihrer eigenen label-Prop (siehe triggerSafeProps unten). Additiv --
    // ändert an bereits korrekt verdrahteten Aufrufern nichts, da labelId bisher nur für das
    // <label id=...>-Attribut selbst genutzt wurde.
    labelId = label ? `${resolvedId}-label` : undefined

    hintId = hint ? `${resolvedId}-hint` : undefined
    errorId = error ? `${resolvedId}-error` : undefined

    const existingDescribedBy = typeof childProps['aria-describedby'] === 'string' ? childProps['aria-describedby'] : undefined
    const mergedDescribedBy = mergeDescribedBy(existingDescribedBy, hintId, errorId)
    const effectiveDisabled = disabled || Boolean(childProps.disabled)

    // Pflicht an das Kind durchreichen: required=true am Formular-Element selbst nur dort, wo das
    // native HTML-Attribut auf diesem Elementtyp tatsächlich greift (Input/Select/Textarea);
    // aria-required ist rollenunabhängig gültig und wird daher überall gesetzt.
    const effectiveRequired = required || Boolean(childProps.required)

    if (singleChild.type === Switch) {
      // Switch kennt kein invalid-Konzept -- aria-invalid kommt hier ausschließlich aus
      // FormField.error, ohne ODER-Verknüpfung mit einer am Kind nicht existierenden Prop.
      // required hat auf einem <button role="switch"> keine native HTML-Semantik -- nur
      // aria-required wird gesetzt (analog zur aria-invalid-Begründung unten bei DatePicker/
      // YearPicker, die aus demselben Grund ebenfalls auf einem Button rendern).
      const effectiveAriaInvalid = Boolean(error)
      renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Switch>>, {
        id: resolvedId,
        disabled: effectiveDisabled,
        ...(effectiveAriaInvalid ? { 'aria-invalid': true as const } : {}),
        ...(effectiveRequired ? { 'aria-required': true as const } : {}),
        'aria-describedby': mergedDescribedBy,
      })
    } else {
      const effectiveInvalid = Boolean(error) || Boolean(childProps.invalid)
      const injectedProps = {
        id: resolvedId,
        disabled: effectiveDisabled,
        invalid: effectiveInvalid,
        required: effectiveRequired,
        ...(effectiveInvalid ? { 'aria-invalid': true as const } : {}),
        ...(effectiveRequired ? { 'aria-required': true as const } : {}),
        'aria-describedby': mergedDescribedBy,
      }
      // DatePicker/YearPicker rendern ihren Trigger als <button> -- aria-invalid ist laut
      // ARIA-Spezifikation für die implizite button-Rolle nicht unterstützt (nur für
      // formularfeldartige Rollen wie textbox/combobox), und das native required-Attribut hat
      // auf einem Button ebenfalls keine Wirkung. Der Fehlerzustand bleibt dort über die bereits
      // vorhandene visuelle invalid-Klasse plus aria-describedby (rollenunabhängig gültig)
      // erkennbar, Pflicht bleibt über aria-required erkennbar -- beides ohne das jeweils
      // spec-widrige bzw. wirkungslose native Attribut.
      const { 'aria-invalid': _unusedAriaInvalid, required: _unusedRequired, ...triggerSafeProps } = injectedProps
      // DatePicker/YearPicker bekommen zusätzlich aria-labelledby auf labelId -- ihr Trigger zeigt
      // dann exakt auf den sichtbaren FormField-Labeltext statt eines zweiten, unabhängigen Textes
      // aus ihrer eigenen label-Prop (siehe DatePicker.tsx/YearPicker.tsx: aria-labelledby hat
      // Vorrang vor deren aria-label-Fallback, sobald gesetzt).
      // labelId ist nur gesetzt, wenn FormField ein label hat -- ohne label KEINEN
      // 'aria-labelledby': undefined mitgeben, sonst überschreibt cloneElement ein vom
      // Aufrufer selbst gesetztes aria-labelledby am Kind mit undefined.
      const pickerSafeProps = { ...triggerSafeProps, ...(labelId ? { 'aria-labelledby': labelId } : {}) }

      if (singleChild.type === Input) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Input>>, injectedProps)
      } else if (singleChild.type === Select) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Select>>, injectedProps)
      } else if (singleChild.type === Textarea) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Textarea>>, injectedProps)
      } else if (singleChild.type === DatePicker) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof DatePicker>>, pickerSafeProps)
      } else if (singleChild.type === YearPicker) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof YearPicker>>, pickerSafeProps)
      }
    }

    // Sicherer Label-/ID-Vertrag: das Label zeigt bei einem bekannten Einzelkind IMMER auf
    // resolvedId -- also exakt die ID, die das Kind tatsächlich bekommt (eigene Kind-id >
    // FormField.htmlFor > generierte ID, siehe Reihenfolge oben). Das deckt auch die beiden
    // zuvor fehlerhaften Fälle ab: ein Kind mit eigener id, aber ohne FormField.htmlFor (zuvor
    // blieb labelHtmlFor undefined, das Label fokussierte nichts), und ein widersprüchliches
    // FormField.htmlFor gegenüber einer abweichenden Kind-id (zuvor zeigte das Label auf die
    // falsche, nicht auf die tatsächlich gerenderte ID).
    labelHtmlFor = resolvedId
  }

  return (
    // role="group" macht aria-disabled auf diesem <div> für Screenreader wirksam -- ein <div>
    // ohne eigene ARIA-Rolle gibt aria-disabled sonst nicht weiter (pragmatische Lösung statt
    // eines <fieldset>-Umbaus, der zusätzliches Browser-Standard-Styling zurücksetzen müsste).
    <div className={styles.fieldset} role="group" aria-disabled={disabled}>
      {label ? (
        <div className={styles.fieldLabelRow}>
          <Label htmlFor={labelHtmlFor} id={labelId} required={required}>
            {label}
          </Label>
        </div>
      ) : null}
      {renderedChildren}
      {hint ? (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <Text as="p" tone="error" id={errorId} role="alert" className={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </div>
  )
}
