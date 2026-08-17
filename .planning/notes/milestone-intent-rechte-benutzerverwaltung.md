# Milestone-Intent (Entwurf): Rechte- & Benutzerverwaltung (Desktop-first)

**Status:** INTENT-Entwurf — Input für einen späteren `/gsd:new-milestone`-Lauf auf dem VM-Weg.
**NICHT ausführen, solange v1.3 (Phasen 130-134) aktiv ist.** Gehört gestartet, wenn v1.3
abgeschlossen ist (nach Phase 134) — additiv (Phasen weiterzählen), nicht als Voll-Reset
(siehe Drift-Warnung im Projektgedächtnis).
**Erfasst:** 2026-08-14 (aus Audit + Diskussion der Admin-Rechte-Flächen).
**Vorgeschlagener Name/Version:** v1.4 — "Rechte- & Benutzerverwaltung (Desktop-first)".

## Kernidee / Core Value

Die Admin-Flächen für Rollen, Rechte und Benutzer werden konsolidiert, korrekt und modern
bedienbar — als kohärente, DESKTOP-FIRST Back-Office-Oberfläche. Betrifft die zwei
zusammenhängenden Surfaces `/admin/role-capabilities` und `/admin/users` (+ deren
Detail/Tabs), die über die Rolle↔User-Verlinkung ein Ökosystem bilden.

## Neues Projekt-Design-Prinzip (in PROJECT.md aufnehmen)

- **Öffentliche Seiten = mobile-first** (wie v1.3 Member-Profil).
- **Admin-/Back-Office-Seiten = desktop-first + graceful degradation.**
  Begründung: Rechte-/Benutzerverwaltung ist eine Desktop/Laptop-Aufgabe.
  Minimal-Sockel (billig, Pflicht): kein Total-Bruch auf schmalem Screen (breite Tabellen in
  `overflow-x`-Container statt Seiten-Overflow), Tastatur/A11y bleibt erhalten. "Nicht
  mobile-first" heißt "nicht optimiert", NICHT "kaputt".

## Scope (ein Milestone, intern in Phasen)

### Phase A - Rechte-Kern (funktional, daten-unabhängig)
`/admin/role-capabilities` (voll) + die rechte-relevanten Teile von `/admin/users`
(Globale-Rollen-Tab, GroupRights-Tab, Rollen-Filter/-Spalte, role↔user-Verlinkung).
Hier wird das **Inline-Styling → CSS-Modul + Container-Queries** einmal sauber als
**admin-weites Muster** gelöst (Vorlage für Phase B). Konkrete Seed-Findings aus dem Audit:
- **Toter Code entfernen (231 Z.):** RoleCapabilityTable.tsx, GrantCapabilityModal.tsx,
  RevokeCapabilityModal.tsx (nirgends importiert).
- **`assignable`-Doppelquelle auflösen:** Backend rechnet `assignable` via
  `IsKnownFansubGroupRole` neu statt die DB-Spalte `role_definitions.assignable` zu lesen;
  beide divergieren. Live tragen ALLE aktiven Rollen "Aktive App-Rolle" → Badge-Ebenen
  (Gruppe vs. Projekt/Release) reparieren. Eine Wahrheitsquelle wählen.
- **Inline-Styles → CSS-Modul/Container-Queries** (roleCapabilities.module.css hat nur 24 Z.,
  Layout liegt inline im TSX). Einheitliche Breakpoints (aktuell JS 759px vs CSS 860px).
- **JS `useIsMobile` → CSS/Container** (Hydration-Flash-Risiko, unnötiger Resize-Listener).
- **Kategorie-Quelle zentralisieren:** capabilityCategories.ts + CATEGORY_ORDER doppeln
  gruppe/projekt/release; DB-Kategorie `review` fehlt in beiden (nur Fallback).
- **UX:** Empty-State für leere Detailfläche (Erstladen), erste Kategorie offen,
  Rollen-/Action-Suche/Filter, Breitbild besser nutzen (Kategorien nebeneinander),
  ausgewählte Rolle in Masterliste sichtbar halten.

### Phase B - Benutzerverwaltung (desktop-first)
`/admin/users` breit: 12-Spalten-Tabelle (Filter/Sortierung/ggf. Pagination), die übrigen
Tabs (Overview, GroupMemberships, Claims, Contributions, Media, Audit, StreamingGrants),
Desktop-Layout + Degradation-Sockel. Bekannter Bug: Aktivitätsspalte zeigt "vor -1 Tagen"
(negatives relatives Datum → Date-/Timezone-Rechenfehler). Auch hier 12-Zeilen-CSS-Modul →
gleiches Inline-Muster wie A (Muster aus A anwenden).

### Phase C - Verifikation & Rollout
Fixture-getrieben (wie v1.3) + DESKTOP-UAT (statt Mobile-400%): beide Referenz-User an
Laptop-/Breitbild-Breiten, Tastatur, echte Route; Green-Gate (typecheck/lint/tests/build).

## DB-Findings (werden Requirements in Phase A/B)

- **Daten-Lücke:** `founder`, `co_leader`, `techadmin`, `gfxler` sind `assignable=true`, haben
  aber 0 `role_capabilities` (Führungsrollen ohne Rechte; neue Rollen leere Hüllen). Rechte
  definieren/seeden.
- **Fehlender Index** auf `role_capabilities.action_code` (PK ist (role_code, action_code);
  Reverse-Lookup "welche Rollen haben Action X" = Seq-Scan).
- **Fehlender Datenpunkt:** `action_definitions` hat kein `description`/Hilfetext (nur
  label_de) — für Rechte-Editor-Tooltips wertvoll.
- **Toter Datenpunkt:** `role_definitions.assignable` wird vom API ignoriert → nutzen oder
  entfernen (an `assignable`-Fix koppeln).
- Schema sonst sauber; Audit-Log existiert bereits (auditLogRepo.Write).

## Constraints (aus CLAUDE.md / Projekt)

- Brownfield: bestehende Admin-Flächen verbessern, nicht neu bauen.
- Globale `@/components/ui`-Primitives + Design-Tokens Pflicht; korrekte Umlaute in UI-Text.
- 450-Zeilen-Limit pro Produktionsdatei (auch CSS-Module).
- Capability-Registry-Infrastruktur ist bereits fertig (DB-getrieben, Startup-Check,
  Bypässe entfernt) - dieser Milestone baut DARAUF auf, nicht neu.
- Der pausierte Rollenmodell-Rework (Zwei-Ebenen-Taxonomie über `role_definitions.contexts[]`)
  ist verwandt; ob er Teil dieses Milestones wird oder eigener, ist beim formalen new-milestone
  zu entscheiden.

## Timing / Mechanik (WICHTIG)

- Formaler `/gsd:new-milestone` läuft auf dem VM-nativen GSD-Agenten (wie plan-phase),
  NICHT in der Windows-Session (die würde die stale Mirror-`.planning` beschreiben).
- ERST starten, wenn v1.3 (Phase 134) abgeschlossen ist - sonst Kollision mit aktiver
  130-Ausführung auf ROADMAP/STATE und Clobbern des v1.3-Trackings.
- Roadmap ADDITIV erweitern (Phasen 135+), keinen Voll-Reset (Drift-Sicherheit).

---

*Isolierte Intent-Notiz - kein Commit, keine Shared-File-Edits. Bereit als Input für den
späteren formalen new-milestone-Lauf.*

---

## NACHTRAG: IdP-Rollen-getriebener Admin + neue Test-Strategie

### Phase 0 (zuerst bauen, VOR dem Reset): IdP-role-driven global admin (JIT role sync)
**Ziel:** Eine designierte Keycloak-Realm-Rolle (z. B. `platform_admin`) macht einen User
automatisch zum team4s-App-Admin — KEIN `AUTH_ADMIN_BOOTSTRAP_USER_IDS`-Env, kein DB-Insert,
kein Backend-Restart. Admin anlegen = in Keycloak die Realm-Rolle zuweisen.

**Ist-Zustand (verifiziert):** Admin wird heute NUR aus `app_user_global_roles` (App-DB) bestimmt
(`AppUserHasGlobalRole`, authz.go:95). KC-Token-Rollen werden fuer Authz NICHT gelesen. Das Env
ist nur der Erst-Admin-Bootstrap (main.go:208, laeuft beim Start; JIT
`EnsureAppUserForIdentity` vergibt KEINE Rolle -> Henne-Ei).

**Aenderung (Backend + Realm):**
1. realm-team4s.json: Realm-Rollen `platform_admin`/`content_admin` definieren + Realm-Role-Mapper
   an die Clients, damit `realm_access.roles` im Token landet.
2. Auth-Middleware: `realm_access.roles` aus dem validierten JWT extrahieren.
3. JIT-Sync in/nach `EnsureAppUserForIdentity`: gemappte KC-Rollen -> `app_user_global_roles`
   synchronisieren (present -> ensure row; absent -> remove). NUR die globale Rollen-Menge
   (platform_admin/content_admin/user); die feinen App-DB-Rollen bleiben unberuehrt (Hybrid).
4. Config: KC-Realm-Rolle -> App-Global-Rolle Mapping. `AUTH_ADMIN_BOOTSTRAP_USER_IDS` wird
   Fallback/deprecated.
5. Tests: Token mit platform_admin-Realm-Rolle -> Admin ohne Env; ohne -> kein Admin; Entzug
   synchronisiert.

**DESIGN-ENTSCHEIDUNG (BESTAETIGT: globale Rollen IdP-verwaltet/read-only, feine Rollen App-UI):** Wenn KC die globalen Rollen autoritativ treibt,
wird die globale-Rollen-Verwaltung in `/admin/users` fuer die synchronisierten Rollen beim
naechsten Login ueberschrieben. -> Vorschlag: globale Admin-Rollen werden IdP-verwaltet (UI zeigt
sie read-only "aus IdP"), die App-UI verwaltet weiter die feinen Rollen. Verbindet sich mit dem
role-capabilities-Audit (die synthetischen globalen App-Rollen).

### Neue Test-Strategie (loest die alte Seed-/Fixture-Basis ab)
- Frischer Full-Reset (beide DB-Volumes wipe + up; KC re-importiert Realm+Clients+Realm-Rollen).
- Erster Admin: rein per KC-Realm-Rolle (nach Phase 0) — kein Env/DB-Gedoens mehr.
- Test-Daten werden MANUELL ueber die Admin-UI aufgebaut (Anime, User, Gruppen, Contributions).
- SPAETER: die manuell aufgebauten Daten als NEUEN, sauberen Seed einfangen (loest
  seed-member-profile-fixtures.mjs + member-profile-fixture.manifest.json ab).
- ALTE Seeds (csubs-leader/sheppert-gebunden) werden als sauberer committeter Schritt retired
  (NICHT ad-hoc rm) — Konsequenz: die Phase-134 fixture-basierte Verifikation wird mit abgeloest.

### Sequencing
Phase 0 (KC-Rollen-Admin) ZUERST -> dann Full-Reset -> manueller Aufbau -> spaeter Re-Seed.
Der Badge-Hang-Fix (B, De-Nesting) bleibt ein separates, orthogonales Code-Thema.
