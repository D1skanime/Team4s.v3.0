---
phase: 74-public-member-profile-members-slug-memorial
plan: "06"
subsystem: frontend/profile
tags: [correction-modal, memorial-setter, claim-409, ui-gating, smoke-tests]
dependency_graph:
  requires:
    - "74-02 (setMemberMemorial endpoint)"
    - "74-03 (submitMemberCorrection endpoint)"
    - "74-04 (public profile layout)"
    - "74-05 (badge highlights + contribution filters)"
  provides:
    - "CorrectionReportModal — user-facing write action auf dem Public-Profil"
    - "MemorialSetterAction — Global-Admin-only Write-Action im Leader-Workspace"
    - "Memorial-Claim-409-Hinweis im MemberClaimSection"
  affects:
    - "frontend/src/app/members/[slug]/page.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/page.tsx"
    - "frontend/src/app/me/profile/components/MemberClaimSection.tsx"
tech_stack:
  added: []
  patterns:
    - "useAuthSession-Gate für clientseitige Sichtbarkeit (D-18)"
    - "isGlobalAdmin-Prop-Threading als Fallstrick-4-Schutz (D-16)"
    - "renderToStaticMarkup-Smoke-Vitest für UI-Sichtbarkeits-Gates"
key_files:
  created:
    - frontend/src/components/profile/CorrectionReportModal.tsx
    - frontend/src/components/profile/CorrectionReportModal.test.tsx
    - frontend/src/components/profile/MemorialSetterAction.tsx
    - frontend/src/components/profile/MemorialSetterAction.test.tsx
  modified:
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/me/profile/components/MemberClaimSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
decisions:
  - "CorrectionReportModal nutzt useAuthSession (hasAccessToken||hasRefreshToken) als clientseitiges Sichtbarkeits-Gate — kein direkter Token/Cookie-Zugriff (Lock K)"
  - "MemorialSetterAction erhält isGlobalAdmin als eigenes Prop (isPlatformAdmin aus page.tsx), nicht Gruppen-Capability — Fallstrick-4-Schutz (D-16)"
  - "ClaimManagementPanel bekommt optionales isGlobalAdmin-Prop (default: false) — rückwärtskompatibel"
  - "MemberClaimSection 409 memorial_not_claimable: error.code-Check gegen ApiError (der code-Typ ist bereits in api.ts definiert)"
  - "Keine neuen Pakete installiert (T-74-06-SC accept)"
metrics:
  duration: ~30min
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_pending: 1
  files_modified: 8
---

# Phase 74 Plan 06: Write-Flows Verdrahtung (Correction, Memorial-Setter, Claim-409) — Summary

**One-liner:** Korrektur-melden-Modal (nur eingeloggt), Global-Admin-only Memorial-Setter mit Bestätigung und Memorial-Claim-409-Hinweis sind in Public-Profil und Leader-Workspace eingehängt; beide Sichtbarkeits-Gates durch Smoke-Vitests abgesichert.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | CorrectionReportModal + Memorial-Claim-409-Hinweis | fce82b91 | GREEN |
| 2 | MemorialSetterAction im Leader-Workspace | b60a84d3 | GREEN |
| 3 | Human-Verify (live :3000) | — | PENDING (blocking) |

## Task 1: CorrectionReportModal (Public-Profil) + Memorial-Claim-409-Hinweis

### Was gebaut wurde

**`CorrectionReportModal.tsx`** (neu, 147 Zeilen):
- `'use client'` — Modal mit `@/components/ui` Modal/FormField/Select/Textarea/Button
- Felder: `target_type` (Select: Profilangaben / Beitrag / Rolle), `reason_text` (Textarea, required)
- Submit → `submitMemberCorrection` aus Plan 03 (review-gebunden, keine direkte Änderung)
- Sichtbarkeits-Gate: `useAuthSession` → `hasAccessToken || hasRefreshToken`; anonyme Besucher sehen `null`
- Erfolgs-Feedback: "Dein Vorschlag wird geprüft." (keine sofortige Änderung)
- Korrekte Umlaute in allen user-facing Strings

**`members/[slug]/page.tsx`** (modifiziert):
- `CorrectionReportModal` in die Profil-Toolbar eingehängt, neben `OwnProfileEditLink`

**`MemberClaimSection.tsx`** (modifiziert — D-17):
- `handleSubmitClaim` fängt `ApiError` mit `status === 409` und `code === 'memorial_not_claimable'` ab
- Zeigt deutschen Hinweis: "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden."
- UI ersetzt nicht die Server-Sperre (Plan 02, 409 bleibt autoritativ)

**`CorrectionReportModal.test.tsx`** (neu, 3 Smoke-Tests):
- `hasAccessToken=true` → Trigger sichtbar ✓
- `hasRefreshToken=true` (nur Refresh) → Trigger sichtbar ✓
- Anonym → leerer Render ✓

### Verifikation

```
npx vitest run CorrectionReportModal → 3/3 GREEN
npm run typecheck → 0 Fehler
npm run lint (neue Dateien) → 0 Warnungen
```

## Task 2: MemorialSetterAction im Leader-Workspace (Global-Admin-only)

### Was gebaut wurde

**`MemorialSetterAction.tsx`** (neu, 129 Zeilen):
- `'use client'` — Trigger + Bestätigungs-Modal mit `@/components/ui` Modal/Button
- `isGlobalAdmin` Prop als Sichtbarkeits-Gate (NICHT Gruppen-Capability, D-16/Fallstrick 4)
- Bestätigungs-Modal: deutliche Sprache "global wirksam, Account wird nicht deaktiviert" (D-13)
- Submit → `setMemberMemorial(memberId)` aus Plan 02
- 403-Fehlerbehandlung mit verständlichem Hinweis
- Korrekte Umlaute

**`ClaimManagementPanel.tsx`** (modifiziert):
- `isGlobalAdmin?: boolean` Prop hinzugefügt (default: `false`, rückwärtskompatibel)
- `MemorialSetterAction` pro Member eingehängt
- Kein `/admin/users`-Vorbau (Phase 80, deferred)

**`fansubs/[id]/edit/page.tsx`** (modifiziert):
- `isPlatformAdmin` an `ClaimManagementPanel` als `isGlobalAdmin` weitergeleitet

**`MemorialSetterAction.test.tsx`** (neu, 4 Smoke-Tests):
- `isGlobalAdmin=true` → Trigger sichtbar ✓
- `isGlobalAdmin=false` → leerer Render ✓
- `isGlobalAdmin=false` (Gruppen-Leader-Szenario, Fallstrick 4) → leerer Render ✓
- Sichtbarkeits-Text-Inhalt bei `isGlobalAdmin=true` ✓

### Verifikation

```
npx vitest run MemorialSetterAction → 4/4 GREEN
npm run typecheck → 0 Fehler
npm run lint (neue Dateien) → 0 Warnungen
```

## Gesamtverifikation

```
npx vitest run CorrectionReportModal MemorialSetterAction → 7/7 GREEN (2 Test Files)
```

---

## Task 3: Human-Verify — PENDING (blocking)

**Status:** Noch nicht durchgeführt. Erfordert Live-Verifikation auf Dev-Server :3000.

### Voraussetzungen

- Dev-Server auf Port :3000 starten (Hot-Reload, Keycloak redirect_uri nur für 3000 — NICHT Docker :3002)
- Global-Admin-Account und normaler User-Account verfügbar

### Verifikationsschritte (aus Plan)

1. **Normales Profil** `/members/[slug]` öffnen:
   - Sektions-Reihenfolge: Hero → Badges → Geschichte → Beiträge
   - Sticky-Anker-Nav scrollt und hebt aktive Sektion hervor (Desktop) bzw. Chip-Leiste (Mobil-Viewport)
   - Status-Pill neben Nickname mit Tooltip

2. **Contributions:** Filter (Anime/Gruppe/Rolle/Zeitraum/Status) reduzieren clientseitig; unbestätigte gedämpft + Badge "unbestätigt"; Inline-Expand zeigt Subtypes

3. **Badges:** Top-N prominent + "alle anzeigen"

4. **Als Global Admin** im Leader-Workspace `/admin/fansubs/[id]/edit` (Tab "Claims"):
   - Ein Member-Profil auf memorial setzen via "Als Gedenkprofil markieren"
   - Bestätigungs-Modal erscheint mit Hinweis: wirkt global, Account wird nicht deaktiviert
   - Profil neu laden: würdevolle Memorial-Hero ("Dieses Profil wird als historisches Gedenkprofil geführt."), KEINE Aktivitätsmetrik/Mengen-Badges, Contributions bleiben sichtbar

5. **Als normaler User** versuchen, das memorial-Profil zu claimen:
   - Verständlicher 409-Hinweis erscheint: "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden."
   - Claim wird abgelehnt

6. **Als registrierter User** "Korrektur melden" auf dem Public-Profil:
   - Modal öffnet sich (Trigger sichtbar, da eingeloggt)
   - Vorschlag absenden → Bestätigung "Dein Vorschlag wird geprüft." (keine sofortige öffentliche Änderung)
   - Als anonymer Besucher: kein "Korrektur melden"-Button sichtbar

**Prüfe zusätzlich:** Keine ASCII-Umlaut-Ersetzungen (ae/oe/ue statt ä/ö/ü) in user-facing Strings.

**Resume-Signal:** Tippe "approved" oder beschreibe Abweichungen.

---

## Deviations from Plan

### Pre-existing Lint Warnings in berührten Dateien (Scope Boundary)

`MemberClaimSection.tsx` enthält 3 pre-existing Lint-Warnungen (native `<input>`/`<textarea>`) aus der Zeit vor Phase 74. Diese wurden per Scope-Boundary nicht angefasst und in `deferred-items.md` dokumentiert.

### Keine sonstigen Abweichungen

- Alle Komponenten nutzen ausschließlich `@/components/ui`-Primitives
- Kein ad-hoc fetch (Lock K eingehalten)
- `isGlobalAdmin` als Prop statt `useAuthSession` in MemorialSetterAction — Plan-konform: der Prop wird von `isPlatformAdmin` aus dem Fansub-Edit-Workspace befüllt, der seinerseits `getCurrentUser().data.is_platform_admin` prüft (nicht Gruppen-Capability, Fallstrick 4)

## Known Stubs

Keine. Beide Komponenten rufen echte API-Funktionen auf (submitMemberCorrection/setMemberMemorial aus Plan 02/03).

## Threat Flags

Keine neuen Trust-Boundary-Oberflächen außerhalb des Plan-Threat-Models eingeführt.

## Self-Check

- [x] `frontend/src/components/profile/CorrectionReportModal.tsx` — FOUND (fce82b91)
- [x] `frontend/src/components/profile/CorrectionReportModal.test.tsx` — FOUND
- [x] `frontend/src/components/profile/MemorialSetterAction.tsx` — FOUND (b60a84d3)
- [x] `frontend/src/components/profile/MemorialSetterAction.test.tsx` — FOUND
- [x] Commit fce82b91 — FOUND
- [x] Commit b60a84d3 — FOUND
- [x] 7/7 Smoke-Tests GREEN (kombinierter Lauf)
- [x] typecheck: 0 Fehler
- [x] lint (neue Dateien): 0 Warnungen

## Self-Check: PASSED
