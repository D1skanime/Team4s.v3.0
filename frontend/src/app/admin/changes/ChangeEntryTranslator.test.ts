// @vitest-environment jsdom
//
// Plan 138-11 (D-25/R-07): ChangeEntryTranslator ist die einzige, zentrale Übersetzungsfunktion
// von audit_logs.event_type + payload in einen deutschen, fachlich lesbaren Satz. Diese Tests
// prüfen die vier locked Behaviors aus 138-11-PLAN.md Task 1: role_capability.granted (mit
// role_code/action_code, ohne Vorher/Nachher), effective_rights.override.mutated (ohne
// Vorher/Nachher, da das reale Payload keinen aufgelösten Vorher/Nachher-Snapshot trägt), ein
// unbekannter event_type (ehrlicher Fallback ohne Crash) und das generische *.denied-Muster
// ("Zugriff verweigert").

import { describe, expect, it } from 'vitest'

import type { AdminChangeEntry } from '@/types/admin-users'

import { translateChangeEntry } from './ChangeEntryTranslator'

function makeEntry(overrides: Partial<AdminChangeEntry>): AdminChangeEntry {
  return {
    event_id: 1,
    event_type: 'role_capability.granted',
    target_type: 'role_capability',
    target_id: null,
    action: 'grant_capability',
    outcome: 'allowed',
    occurred_at: '2026-08-23T10:00:00Z',
    actor_app_user_id: 7,
    scope_type: 'none',
    scope_id: null,
    payload: {},
    ...overrides,
  }
}

describe('translateChangeEntry — role_capability.granted', () => {
  it('erwähnt role_code und action_code aus dem Payload und liefert kein Vorher/Nachher', () => {
    const entry = makeEntry({
      event_type: 'role_capability.granted',
      payload: { role_code: 'fansub_lead', action_code: 'fansub_group.edit' },
    })

    const result = translateChangeEntry(entry)

    expect(result.sentence).toContain('fansub_lead')
    expect(result.sentence).toContain('fansub_group.edit')
    expect(result.before).toBeUndefined()
    expect(result.after).toBeUndefined()
  })
})

describe('translateChangeEntry — effective_rights.override.mutated', () => {
  it('liefert einen Satz ohne Vorher/Nachher (Payload trägt keinen aufgelösten Snapshot, R-07)', () => {
    const entry = makeEntry({
      event_type: 'effective_rights.override.mutated',
      target_type: 'user_group_capability_override',
      target_id: 42,
      scope_type: 'group',
      scope_id: 5,
      payload: { action_code: 'review.decide', kind: 'set_deny', changed: true },
    })

    const result = translateChangeEntry(entry)

    expect(result.sentence).toContain('review.decide')
    expect(result.before).toBeUndefined()
    expect(result.after).toBeUndefined()
  })
})

describe('translateChangeEntry — unbekannter event_type', () => {
  it('fällt ehrlich auf einen generischen Satz aus event_type/action/outcome zurück, ohne zu werfen', () => {
    const entry = makeEntry({
      event_type: 'some_future_event.happened',
      action: 'do_something',
      outcome: 'allowed',
    })

    expect(() => translateChangeEntry(entry)).not.toThrow()
    const result = translateChangeEntry(entry)
    expect(result.sentence).toContain('some_future_event.happened')
    expect(result.sentence.length).toBeGreaterThan(0)
  })
})

describe('translateChangeEntry — generisches *.denied-Muster', () => {
  it('rendert die "Zugriff verweigert"-Satzform für jeden *.denied event_type', () => {
    const entry = makeEntry({
      event_type: 'effective_rights.inspect.denied',
      target_type: 'effective_rights',
      target_id: 42,
      action: 'inspect',
      outcome: 'denied',
    })

    const result = translateChangeEntry(entry)

    expect(result.sentence).toContain('Zugriff verweigert')
  })
})
