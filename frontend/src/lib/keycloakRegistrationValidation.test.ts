// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Executes the real Keycloak theme script from
 * infra/keycloak/themes/team4s/login/resources/js/registration-validation.js
 * against jsdom. This is the exact file Keycloak serves and wires through
 * `theme.properties` (`scripts=js/registration-validation.js`) on the
 * built-in Keycloak 26 `register.ftl` DOM; the fixture markup below mirrors
 * the live-verified structure (see 104-01-SUMMARY.md).
 */
const SCRIPT_PATH = path.resolve(
  __dirname,
  '../../../infra/keycloak/themes/team4s/login/resources/js/registration-validation.js',
)
const scriptSource = readFileSync(SCRIPT_PATH, 'utf-8')

type FieldId = 'username' | 'password' | 'password-confirm' | 'email' | 'firstName' | 'lastName'

const ALL_FIELD_IDS: FieldId[] = ['username', 'password', 'password-confirm', 'email', 'firstName', 'lastName']

function textFieldMarkup(fieldId: FieldId, errorMessage: string): string {
  return `
    <div class="pf-v5-c-form__group">
      <span class="pf-v5-c-form-control ">
        <input type="text" id="${fieldId}" name="${fieldId}" value="" class="pf-v5-c-form-control" aria-invalid="true" />
      </span>
      <div id="input-error-client-${fieldId}"></div>
      <div class="pf-v5-c-form__helper-text" aria-live="polite">
        <div class="pf-v5-c-helper-text">
          <div class="pf-v5-c-helper-text__item pf-m-error" id="input-error-${fieldId}">
            <span class="pf-v5-c-helper-text__item-text pf-m-error kc-feedback-text">${errorMessage}</span>
          </div>
        </div>
      </div>
    </div>
  `
}

function passwordFieldMarkup(fieldId: FieldId, errorMessage: string): string {
  return `
    <div class="pf-v5-c-form__group">
      <div class="pf-v5-c-input-group">
        <div class="pf-v5-c-input-group__item pf-m-fill">
          <span class="pf-v5-c-form-control pf-m-error">
            <input id="${fieldId}" name="${fieldId}" value="" type="password" aria-invalid="true" />
            <span class="pf-v5-c-form-control__utilities">
              <span class="pf-v5-c-form-control__icon pf-m-status">
                <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
              </span>
            </span>
          </span>
        </div>
      </div>
      <div id="input-error-client-${fieldId}"></div>
      <div class="pf-v5-c-form__helper-text" aria-live="polite">
        <div class="pf-v5-c-helper-text">
          <div class="pf-v5-c-helper-text__item pf-m-error" id="input-error-${fieldId}">
            <span class="pf-v5-c-helper-text__item-text pf-m-error kc-feedback-text">${errorMessage}</span>
          </div>
        </div>
      </div>
    </div>
  `
}

/** Builds the full registration form, all six fields carrying a stale server error. */
function buildRegistrationFormWithAllErrors(): void {
  document.body.innerHTML = `
    <form id="kc-register-form">
      ${textFieldMarkup('username', 'Bitte geben Sie einen Benutzernamen ein.')}
      ${passwordFieldMarkup('password', 'Bitte geben Sie ein Passwort ein.')}
      ${passwordFieldMarkup('password-confirm', 'Passwortbestätigung stimmt nicht überein.')}
      ${textFieldMarkup('email', 'Bitte geben Sie eine E-Mail-Adresse ein.')}
      ${textFieldMarkup('firstName', 'Bitte geben Sie dieses Feld aus.')}
      ${textFieldMarkup('lastName', 'Bitte geben Sie dieses Feld aus.')}
    </form>
  `
}

/** Executes the real theme script source against the current jsdom document. */
function runScript(): void {
  const executeInGlobalScope = new Function(scriptSource)
  executeInGlobalScope.call(window)
}

function dispatchInput(fieldId: FieldId): void {
  const input = document.getElementById(fieldId) as HTMLInputElement
  input.value = 'corrected-value'
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function hasErrorBlock(fieldId: FieldId): boolean {
  return document.getElementById(`input-error-${fieldId}`) !== null
}

function ariaInvalid(fieldId: FieldId): string | null {
  return document.getElementById(fieldId)?.getAttribute('aria-invalid') ?? null
}

describe('keycloak registration-validation.js (theme script, executed live)', () => {
  beforeEach(() => {
    buildRegistrationFormWithAllErrors()
    runScript()
  })

  it('exposes the extractable behavior seam on window for automated coverage', () => {
    const seam = (window as unknown as { Team4sRegistrationValidation?: Record<string, unknown> })
      .Team4sRegistrationValidation
    expect(seam).toBeDefined()
    expect(seam?.FIELD_IDS).toEqual(ALL_FIELD_IDS)
    expect(typeof seam?.clearFieldError).toBe('function')
  })

  it.each(ALL_FIELD_IDS)('clears only the %s field\'s stale error on input, preserving all others', (fieldId) => {
    for (const id of ALL_FIELD_IDS) {
      expect(hasErrorBlock(id)).toBe(true)
      expect(ariaInvalid(id)).toBe('true')
    }

    dispatchInput(fieldId)

    expect(hasErrorBlock(fieldId)).toBe(false)
    expect(ariaInvalid(fieldId)).toBeNull()

    for (const otherId of ALL_FIELD_IDS) {
      if (otherId === fieldId) continue
      expect(hasErrorBlock(otherId)).toBe(true)
      expect(ariaInvalid(otherId)).toBe('true')
    }
  })

  it('removes the password-type error icon and pf-m-error class on correction', () => {
    const passwordInput = document.getElementById('password') as HTMLInputElement
    const controlWrapper = passwordInput.closest('.pf-v5-c-form-control') as HTMLElement
    expect(controlWrapper.classList.contains('pf-m-error')).toBe(true)
    expect(controlWrapper.querySelector('.pf-v5-c-form-control__utilities')).not.toBeNull()

    dispatchInput('password')

    expect(controlWrapper.classList.contains('pf-m-error')).toBe(false)
    expect(controlWrapper.querySelector('.pf-v5-c-form-control__utilities')).toBeNull()
  })

  it('clears username then email independently across two separate corrections', () => {
    dispatchInput('username')
    expect(hasErrorBlock('username')).toBe(false)
    expect(hasErrorBlock('email')).toBe(true)

    dispatchInput('email')
    expect(hasErrorBlock('email')).toBe(false)

    // Fields never touched keep their stale error - server validation stays authoritative.
    expect(hasErrorBlock('password-confirm')).toBe(true)
    expect(hasErrorBlock('firstName')).toBe(true)
    expect(hasErrorBlock('lastName')).toBe(true)
  })

  it('is idempotent and does not throw when a field has no prior error', () => {
    document.body.innerHTML = `
      <form id="kc-register-form">
        ${textFieldMarkup('username', 'irrelevant')}
      </form>
    `
    document.getElementById('input-error-username')?.remove()
    document.getElementById('username')?.removeAttribute('aria-invalid')

    expect(() => {
      runScript()
      dispatchInput('username')
    }).not.toThrow()
  })

  it('does not crash when optional fields are absent from the DOM (e.g. a shorter form)', () => {
    document.body.innerHTML = `<form id="kc-register-form">${textFieldMarkup('username', 'Bitte geben Sie einen Benutzernamen ein.')}</form>`

    expect(() => runScript()).not.toThrow()
    dispatchInput('username')
    expect(hasErrorBlock('username')).toBe(false)
  })
})
