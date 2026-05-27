---
status: partial
phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
source:
  - 53-VERIFICATION.md
started: 2026-05-27T16:12:29Z
updated: 2026-05-27T16:12:29Z
---

# Phase 53 Human UAT

## Current Test

Awaiting live human/browser testing for the role-neutral member profile hub.

## Tests

### 1. Live non-admin `/me/profile` route and shell smoke

expected: A signed-in non-admin user reaches `/me/profile` through the Member Hub shell, sees no admin framing or `Verwaltung` navigation, profile data renders from the authenticated aggregate, and `/admin/profile` renders only the same transition implementation.
result: pending

### 2. Live avatar crop/upload smoke

expected: JPG/PNG/WEBP avatar upload opens the crop dialog, supports pointer and keyboard interaction, displays the cropped image, rejects SVG, and never exposes `source_original` as the public avatar URL.
result: pending

### 3. Mobile/accessibility visual pass

expected: Desktop, tablet, and mobile layouts have no overlap; controls are touch-sized; focus states are visible; the crop dialog traps focus and closes with Escape.
result: pending

### 4. Live Keycloak account-return flow

expected: Opening Keycloak account management in a new tab and returning to Team4s refreshes read-only account cards without overwriting dirty Team4s profile fields.
result: pending

## Focus Notes

- Check avatar crop preview fidelity on narrow mobile widths; the code-only UI audit warned that fixed crop metrics and responsive viewport size could diverge.
- Check year-field error accessibility with keyboard and screen-reader-style focus flow.
- Check the disabled membership `Gruppenbereich` action has an understandable reason or is not confusing in live use.

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
