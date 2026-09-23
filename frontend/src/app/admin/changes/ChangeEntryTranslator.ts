import type { AdminChangeEntry } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'
import { actionLabelFor, roleLabelFor } from '../users/tabs/userGroupRightsHelpers'

/**
 * D-25/D-26/D-27/R-07: die EINE zentrale, reine Übersetzungsfunktion von
 * `audit_logs.event_type` + `payload` in einen deutschen, fachlichen Satz.
 *
 * `before`/`after` werden NUR gesetzt, wenn das reale Backend-Payload des jeweiligen
 * `event_type` tatsächlich einen aufgelösten Vorher/Nachher-Zustand trägt (R-07: niemals
 * raten/erfinden — lieber ehrlich weglassen). Jeder hier gemappte `event_type` und jeder
 * gelesene `payload`-Schlüssel wurde gegen den realen `Payload: map[string]any{...}`-Literal
 * am jeweiligen Go-Audit-Aufrufort dieser Session gegengeprüft (siehe 138-11-PLAN.md
 * <interfaces>-Block):
 *
 *   - role_capability.granted/revoked (admin_capability_handler.go):
 *       Payload{role_code, action_code} — kein Vorher/Nachher-Snapshot vorhanden.
 *   - effective_rights.override.mutated (admin_effective_rights_handler.go):
 *       Payload{action_code, kind, changed} — ebenfalls kein aufgelöster
 *       Vorher/Nachher-Snapshot (nur "was wurde gesetzt", nicht "was war vorher aktiv").
 *   - member_claim.verified/activated (member_claims_handler.go):
 *       Payload ist nil — reiner Statuswechsel, keine Vorher/Nachher-Werte möglich.
 *   - jedes *.denied event_type (auditPermissionDenied in permission_authz.go):
 *       Payload{matched_role, matched_scope} — generische "Zugriff verweigert"-Satzform.
 *
 * Unbekannte event_types (inkl. z. B. effective_rights.override.rejected, die zwar in dieser
 * Session real beobachtet wurden, aber keine eigene, ehrlich befüllbare Satzform haben) fallen
 * auf einen generischen, niemals werfenden Fallback zurück — spiegelt
 * capabilityCategories.ts's categoryDisplayLabel-Fallback-Muster.
 */

export interface ChangeEntryTranslation {
  sentence: string
  before?: string
  after?: string
}

function payloadString(payload: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = payload?.[key]
  return typeof value === 'string' ? value : undefined
}

function payloadNumber(payload: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = payload?.[key]
  return typeof value === 'number' ? value : undefined
}

function targetLabel(entry: AdminChangeEntry): string {
  return entry.target_id != null ? `${entry.target_type} #${entry.target_id}` : entry.target_type
}

export function translateChangeEntry(
  entry: AdminChangeEntry,
  matrix: RoleCapabilityMatrix | null = null,
): ChangeEntryTranslation {
  switch (entry.event_type) {
    case 'role_capability.granted':
    case 'role_capability.revoked': {
      const roleCode = payloadString(entry.payload, 'role_code') ?? 'unbekannte Rolle'
      const actionCode = payloadString(entry.payload, 'action_code') ?? 'unbekannte Berechtigung'
      const roleLabel = roleCode === 'unbekannte Rolle' ? roleCode : roleLabelFor(roleCode, matrix)
      const actionLabel =
        actionCode === 'unbekannte Berechtigung' ? actionCode : actionLabelFor(actionCode, matrix)
      const verb = entry.event_type === 'role_capability.granted' ? 'gewährt' : 'entzogen'
      return {
        sentence: `Admin hat der Rolle ${roleLabel} die Berechtigung ${actionLabel} ${verb}.`,
      }
    }

    case 'effective_rights.override.mutated': {
      const actionCode = payloadString(entry.payload, 'action_code') ?? 'unbekannte Berechtigung'
      const actionLabel =
        actionCode === 'unbekannte Berechtigung' ? actionCode : actionLabelFor(actionCode, matrix)
      const kind = payloadString(entry.payload, 'kind')
      const verb = kind === 'remove' ? 'entfernt' : 'gesetzt'
      const targetId = entry.target_id ?? '?'
      const scopeId = entry.scope_id ?? '?'
      return {
        sentence: `Admin hat ${actionLabel} für Benutzer #${targetId} in Gruppe #${scopeId} ${verb}.`,
      }
    }

    case 'member_claim.verified':
      return {
        sentence: `Admin hat einen Mitgliedschaftsanspruch bestätigt (Claim #${entry.target_id ?? '?'}).`,
      }

    case 'member_claim.activated':
      return {
        sentence: `Admin hat Mitglied #${entry.target_id ?? '?'} als aktives Mitglied übernommen.`,
      }

    case 'fansub_group_alias.created':
      return {
        sentence: `Admin hat den Alias "${payloadString(entry.payload, 'alias') ?? 'unbekannt'}" angelegt.`,
      }

    case 'fansub_group_alias.deleted':
      // Kein Alias-Text im Payload dieses Events verfügbar — ehrlich die target_id verwenden,
      // statt zu raten (D-09, "niemals raten"-Disziplin dieser Datei).
      return {
        sentence: `Admin hat den Alias #${entry.target_id ?? '?'} entfernt.`,
      }

    case 'fansub_group_alias.reassigned':
      return {
        sentence: `Admin hat den Alias "${payloadString(entry.payload, 'alias') ?? 'unbekannt'}" von Gruppe #${payloadNumber(entry.payload, 'from_group_id') ?? '?'} zu Gruppe #${payloadNumber(entry.payload, 'to_group_id') ?? '?'} umgehängt.`,
      }

    case 'fansub_group_alias.learned':
      // Phrasiert als Systemaktion, nicht "Admin hat..." — dieses Event feuert aus dem
      // Import-Apply-Codepfad, nicht aus einer direkten Admin-Alias-Bearbeitung.
      return {
        sentence: `Beim Import wurde der Alias "${payloadString(entry.payload, 'alias') ?? 'unbekannt'}" automatisch als neuer Alias gelernt.`,
      }

    default: {
      if (entry.event_type.endsWith('.denied')) {
        return {
          sentence: `Zugriff verweigert: ${entry.action || entry.event_type} für ${targetLabel(entry)}.`,
        }
      }

      // Ehrlicher, niemals werfender Fallback für jeden nicht explizit gemappten event_type
      // (z. B. effective_rights.override.rejected) — verwendet nur reale Felder des Eintrags.
      return {
        sentence: `${entry.action || entry.event_type} (${entry.event_type}) — Ergebnis: ${entry.outcome || 'unbekannt'}.`,
      }
    }
  }
}
