# Phase 95 — Design-Seed: Rollenmodell entwirren

> Vor-Diskussions-Kontext aus der Phase-94-Session (2026-06-30). Feeds `/gsd:discuss-phase 95`.
> Verwandt: Memory `project_role_model_rework`, `94-REVIEW.md`, `.planning/notes/capability-registry-design.md`.

## Auslöser

In Phase 94 (Capability-/Rollen-UX) fiel auf: Dieselbe reale Rolle existiert als zwei Codes
(z. B. `leader`/„Gruppenleitung" historisch vs. `fansub_lead`/„Fansub-Lead" aktiv). Die
Capability-Matrix badge-te Rollen binär „aktiv vs. historisch", obwohl der Kontext (nicht die
Rolle) historisch/aktiv ist. Nutzer-Entscheidung: Modell erst entwirren, dann weiterbauen.

## Beschlossenes Ziel-Modell (zwei Ebenen, gemeinsames `role_code`-Vokabular)

### Gruppen-Ebene (gruppenweit, tragen Rechte → assignable, in Capability-Matrix)
- Gründer/in (`founder`)
- Gruppenleitung / Fansub-Lead — `leader` + `fansub_lead` **vereint**
- Co-Leitung (`co_leader`)
- Fansub-Projektleitung — `project_manager` + `project_lead` **vereint**; **eigene** Rolle, ≠ Gruppenleitung (bestätigt)
- **Techadmin** (NEU) — kümmert sich um die Fansub-Page/Technik, nicht um Projekte
- **GFXler / Gruppen-Grafik** (NEU) — Grafik für die Gruppe; ↔ `designer` auf Projektebene

### Projekt-/Anime-Ebene (Contribution an einem konkreten Anime)
- Übersetzung, Editing, Timing, Typesetting/FX, Encoding, Raw, QC, **Design** (`designer`)
- GFXler (Gruppe) ↔ Designer (Projekt) = dasselbe Skill, zwei Scopes (Beleg für die Zwei-Ebenen-Logik)

## Bestätigte Entscheidungen
- Gruppen-Rollen **tragen Rechte** (z. B. Techadmin darf Dinge im Fansubgruppen-Kontext) → assignable.
- Gruppenleitung/Fansub-Lead und Fansub-Projektleitung sind **zwei verschiedene** Rollen.
- Lifecycle = **koexistieren** (kein Auto-Löschen): aktive Rolle = jetzt; historische Rolle = Jahres-Zeitraum.

## Schema-Faktum (bereits vorhanden, NICHT neu bauen)
- `hist_group_member_roles`: `role_code, started_year, ended_year, status, visibility, confirmed_by/at,
  hist_fansub_group_member_id`. Tenure + Übergabe (z. B. Leader 2014–2018, danach Encoder 2019–,
  Nachfolger ab 2019) sind ohne neue Migration abbildbar. `visibility` steuert Member-Sichtbarkeit pro Eintrag.
- Aktive Tabelle `fansub_group_member_roles` hat **keine** Datums-Spalten (= „jetzt").
- `CanForFansubGroup` liest Rollen NUR aus `fansub_group_member_roles`, nicht aus `anime_contributions`.

## Data-driven-Umbau (Ziel: neue Rolle = nur Migration)
Heutige Code-Touch-Points für eine neue Rolle (entfernen):
1. Go-Slice `fansubGroupRoleCatalog` (`backend/internal/permissions/permissions.go:200-211`) → aus `role_definitions` laden.
2. Frontend-Listen `FANSUB_GROUP_ROLE_OPTIONS` (`frontend/src/types/fansub.ts`) + `contributionRoles.ts` (×2) → per API holen.
3. Go-Role-Const (ggf. obsolet machen).
Ein neues **Recht** ist bereits fast data-driven (Migration + Go-Const in `allKnownActions` + 1 Endpoint-Check).

## Aus Phase 94 verschobene Review-Schuld (94-REVIEW.md) — hier mitfixen
- **CR-01 (Critical):** `CreateHistGroupMemberRole` validiert `role_code` nur gegen breiten `group_history`-Kontext,
  nicht gegen die 4-Rollen-Whitelist → Write-Pfad-Umgehung mit App-Rollen-Code. Serverseitig härten.
- **WR-02:** `ListHistGroupMemberRoles` liest per rohem `member_id` ohne Cross-Group-Check → Scope-Leak.
- **WR-01:** Capability-Tests prüfen Handler-Kopie `adminCapabilityHandlerWithStubs` statt Prod-Handler.
- **WR-03/04:** `ProposalForm.tsx` (541 Z.) + `dev/ui-system/page.tsx` (1251 Z.) > 450.
- **WR-05:** Kategorie-Reihenfolge in `RoleCapabilityDetail` nicht-deterministisch.

## Offene Fragen für discuss-phase
1. Historischen „ended"-Eintrag bei Leitungs-Übergabe **manuell** lassen oder beim Entzug der aktiven
   Rolle **automatisch** vorschlagen/erzeugen? (einzige neue Logik)
2. Migrationsstrategie für bestehende `leader`/`co_leader`/`project_manager`-Einträge bei Code-Vereinheitlichung.
3. Member-Sichtbarkeit der **eigenen** Historie (über `visibility`-Spalte) — ja/nein, Default?
4. Umfang der Techadmin-Rechte (welche Capabilities konkret?).
5. Verhältnis zur geplanten Capability-Registry-Phase (`project_capability_registry_planned`).
