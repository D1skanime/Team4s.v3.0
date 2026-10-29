import { Children, cloneElement, isValidElement, useId } from 'react'
import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { DatePicker } from './DatePicker'
import { Input } from './Input'
import { Select } from './Select'
import { Switch } from './Switch'
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
    const usesGeneratedId = !existingId && !htmlFor

    hintId = hint ? `${resolvedId}-hint` : undefined
    errorId = error ? `${resolvedId}-error` : undefined

    const existingDescribedBy = typeof childProps['aria-describedby'] === 'string' ? childProps['aria-describedby'] : undefined
    const mergedDescribedBy = mergeDescribedBy(existingDescribedBy, hintId, errorId)
    const effectiveDisabled = disabled || Boolean(childProps.disabled)

    if (singleChild.type === Switch) {
      // Switch kennt kein invalid-Konzept -- aria-invalid kommt hier ausschließlich aus
      // FormField.error, ohne ODER-Verknüpfung mit einer am Kind nicht existierenden Prop.
      const effectiveAriaInvalid = Boolean(error)
      renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Switch>>, {
        id: resolvedId,
        disabled: effectiveDisabled,
        ...(effectiveAriaInvalid ? { 'aria-invalid': true as const } : {}),
        'aria-describedby': mergedDescribedBy,
      })
    } else {
      const effectiveInvalid = Boolean(error) || Boolean(childProps.invalid)
      const injectedProps = {
        id: resolvedId,
        disabled: effectiveDisabled,
        invalid: effectiveInvalid,
        ...(effectiveInvalid ? { 'aria-invalid': true as const } : {}),
        'aria-describedby': mergedDescribedBy,
      }

      if (singleChild.type === Input) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Input>>, injectedProps)
      } else if (singleChild.type === Select) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Select>>, injectedProps)
      } else if (singleChild.type === Textarea) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof Textarea>>, injectedProps)
      } else if (singleChild.type === DatePicker) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof DatePicker>>, injectedProps)
      } else if (singleChild.type === YearPicker) {
        renderedChildren = cloneElement(singleChild as ReactElement<ComponentProps<typeof YearPicker>>, injectedProps)
      }
    }

    // Additive Fähigkeit: das Label bekommt nur dann htmlFor+id, wenn weder der Aufrufer noch
    // das Kind bereits eine Verknüpfung vorgegeben haben. Jeder bestehende explizite
    // htmlFor-Aufrufer (heutiger Normalfall) rendert exakt wie vor diesem Umbau.
    if (usesGeneratedId) {
      labelHtmlFor = resolvedId
      labelId = `${resolvedId}-label`
    }
  }

  return (
    <div className={styles.fieldset} aria-disabled={disabled}>
      {label ? (
        <div className={styles.fieldLabelRow}>
          <label htmlFor={labelHtmlFor} id={labelId} className={styles.fieldLabel}>
            {label}
          </label>
          {required ? <span className={styles.fieldRequired}>*</span> : null}
        </div>
      ) : null}
      {renderedChildren}
      {hint ? (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
