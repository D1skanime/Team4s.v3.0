/**
 * Team4s registration stale-validation repair (Phase 104, D-22).
 *
 * Keycloak's stock register.ftl (keycloak.v2 theme) already clears the
 * server-rendered "password" error on its own "change" event via an inline
 * password-policy script, but leaves the other five registration fields
 * (username, password-confirm, email, firstName, lastName) untouched: once
 * the server re-renders the form with a validation error for a field, that
 * error stays visible even after the user corrects the value, until the
 * whole page reloads on the next submit.
 *
 * This script closes that gap for all six fields uniformly: on "input" it
 * removes only the edited field's own stale server error block and
 * aria-invalid state. It never touches other fields' errors and never
 * fabricates a "this is valid now" state - the next form submission still
 * goes through Keycloak's normal server-side validation, which remains
 * authoritative (D-22).
 *
 * Loaded via theme.properties `scripts=` on the Keycloak 26 built-in
 * register.ftl DOM (verified live against a running Keycloak 26 instance -
 * see 104-01-SUMMARY.md); no template override was needed or added.
 */
(function () {
  'use strict'

  var FIELD_IDS = ['username', 'password', 'password-confirm', 'email', 'firstName', 'lastName']

  function clearFieldError(fieldId) {
    var input = document.getElementById(fieldId)
    if (!input) {
      return
    }

    var errorBlock = document.getElementById('input-error-' + fieldId)
    if (errorBlock && errorBlock.parentNode) {
      errorBlock.parentNode.removeChild(errorBlock)
    }

    input.removeAttribute('aria-invalid')

    var controlWrapper = input.closest('.pf-v5-c-form-control')
    if (controlWrapper) {
      controlWrapper.classList.remove('pf-m-error')

      var errorIcon = controlWrapper.querySelector('.pf-v5-c-form-control__utilities')
      if (errorIcon && errorIcon.parentNode) {
        errorIcon.parentNode.removeChild(errorIcon)
      }
    }
  }

  function wireField(fieldId) {
    var input = document.getElementById(fieldId)
    if (!input) {
      return
    }
    input.addEventListener('input', function () {
      clearFieldError(fieldId)
    })
  }

  function init() {
    FIELD_IDS.forEach(wireField)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Extractable DOM behavior seam for automated jsdom coverage. Not required
  // for runtime behavior in the browser.
  window.Team4sRegistrationValidation = {
    FIELD_IDS: FIELD_IDS,
    clearFieldError: clearFieldError,
    wireField: wireField,
    init: init,
  }
})()
