---
phase: quick-260819-ipu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/admin.module.css
autonomous: false
requirements:
  - "Live-UAT Findings #27/#28 (Phase-135-Nachtrag): Duplikat-Guard beim historischen Mitglied-hinzufügen"
must_haves:
  truths:
    - "Beim Anlegen eines neuen historischen Mitglieds mit einem Anzeigenamen, der bereits in dieser Gruppe existiert, sieht der Admin eine Warnung mit Verweis auf den bestehenden Eintrag, bevor gespeichert wird."
    - "Ein aktiv/verknüpfter Namens-Treffer (active_app_member_id oder app_user_id gesetzt) wird in der Warnung gegenüber rein historischen Treffern priorisiert dargestellt."
    - "Der Admin kann die Warnung explizit bestätigen (Switch 'Trotzdem als neuen Eintrag anlegen') und danach wie bisher speichern -- legitime Namensdopplungen bleiben möglich (Soft-Guard, kein Hard-Block)."
    - "Ohne Namenskollision ändert sich das bisherige Verhalten des Formulars nicht (keine Warnung, Speichern wie gehabt aktiv)."
  artifacts:
    - path: "frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts"
      provides: "findDuplicateMemberMatches() reine Matching-Funktion + DuplicateMemberMatch-Typ, exportiert"
    - path: "frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx"
      provides: "Warnkarte (Card + Switch) im Anlegen-Formular, gated canSave-Logik"
    - path: "frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx"
      provides: "existingMembers-Prop-Wiring von tab.members an GroupMemberFormModals"
  key_links:
    - from: "frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx"
      to: "frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts"
      via: "import { findDuplicateMemberMatches }"
      pattern: "findDuplicateMemberMatches"
    - from: "frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx"
      to: "frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx"
      via: "existingMembers={tab.members} prop"
      pattern: "existingMembers=\\{tab\\.members\\}"
---

<objective>
Schließt Live-UAT Findings #27/#28 (Phase-135-Nachtrag): Beim historischen "Mitglied hinzufügen"
auf der Fansub-Edit-Seite wird aktuell ein neues `members`-Row + `hist_fansub_group_members`-Eintrag
angelegt, ohne gegen bereits vorhandene Mitglieder derselben Gruppe zu prüfen. Ein Namens-Duplikat
(z. B. bei einem aktiv verknüpften Mitglied) erzeugt so einen unverknüpften Zweit-Eintrag, an den
später fälschlich Release-Credits hängen können.

Purpose: Admin vor versehentlichen Duplikaten warnen, ohne legitime Namensgleichheit zu blockieren
(Soft-Guard).
Output: Nicht-blockierende Warnung im "Mitglied hinzufügen"-Formular, die einen Namens-Treffer in
der aktuellen Gruppe referenziert (aktiv/verknüpfte Treffer priorisiert) und eine explizite
Bestätigung ("trotzdem anlegen") vor dem Speichern verlangt.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
@frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
@frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx

<investigation_findings>
Kein Backend-Endpoint nötig: `GroupMembersTab` lädt über `useGroupMembersTab`'s `load()` bereits
ALLE historischen Mitglieder der Gruppe via `listGroupMembers(fansubId)` ->
`ListByFansubGroupWithDisplay` (backend/internal/repository/hist_group_members_repository.go).
Diese Response (`HistFansubGroupMember[]`, frontend/src/types/fansub.ts:580) enthält bereits pro
Zeile `display_name`, `active_app_member_id` (gesetzt, wenn eine verifizierte Claim + aktive
`fansub_group_members`-Mitgliedschaft existiert) und `app_user_id` (gesetzt bei verifiziertem
Claim). Das reicht für ein reines Client-seitiges Name-Matching gegen `tab.members` -- das ist die
Variante mit der geringsten neuen Angriffs-/Codefläche (kein neuer Handler, keine neue Route, keine
Contract-Änderung). Die "existence hint embedded in create response" / "lookup endpoint"-Optionen
aus der Aufgabenstellung entfallen damit ersatzlos.

Der Bug selbst liegt in `backend/internal/repository/hist_group_members_repository.go`'s
`CreateWithAutoMember` (Zeile 430ff.): legt unconditional eine neue `members`-Zeile an, mit
`allocatePublicMemberSlugTx` das bei Namenskollision transparent einen Suffix anhängt
(`sorata` -> `sorata-2`). Dieser Slug-Suffix-Mechanismus selbst bleibt unverändert (er ist die
harmlose Ursache, nicht das eigentliche Problem) -- das eigentliche Problem ist das Fehlen jeder
Warnung im UI davor. Backend bleibt in diesem Plan unangetastet.

`GroupMemberFormModals`'s "Mitglied hinzufügen"-Modal (editTarget === null) ruft in
`useGroupMembersTab.ts`'s `handleSave()` (Zeile 331ff.) `createGroupMember(fansubId, body)` ohne
`member_id` auf -> Backend nimmt den `CreateWithAutoMember`-Pfad. Der Bearbeiten-Pfad
(editTarget !== null) ruft `updateGroupMember` -- keine Neuanlage, daher aus Scope dieses Plans
(Duplikat-Warnung gilt nur für Neuanlage, nicht fürs Umbenennen bestehender Einträge).
</investigation_findings>

<interfaces>
From frontend/src/types/fansub.ts (bereits vorhanden, keine Änderung):
```typescript
export interface HistFansubGroupMember {
  id: number;
  fansub_group_id: number;
  member_id: number;
  display_name: string;
  joined_date: string | null;
  left_date: string | null;
  app_user_id: number | null;
  app_username: string | null;
  active_app_member_id?: number | null;
  status: HistoricalContributionStatus;
  visibility?: HistoricalContributionVisibility;
  confirmed_by_app_user_id?: number | null;
  confirmed_by_display_name?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}
```

From frontend/src/components/ui (bereits vorhanden, per CLAUDE.md Pflicht-Primitives):
```typescript
// Card.tsx
export function Card({ variant, title, description, header, footer, className, children, ...props }: CardProps): JSX.Element
// variant "nested" existiert bereits (styles.cardNested)

// Switch.tsx
export function Switch({ checked, onCheckedChange, disabled, label, className, ...rest }: SwitchProps): JSX.Element
```

New export this plan adds (Task 1, contract-first):
```typescript
// frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
export type DuplicateMemberMatch = {
  member: HistFansubGroupMember
  isActiveLinked: boolean // true wenn active_app_member_id ODER app_user_id gesetzt
}

export function findDuplicateMemberMatches(
  members: HistFansubGroupMember[],
  displayName: string,
): DuplicateMemberMatch[]
// Case-insensitive, getrimmter Exact-Match von display_name gegen den eingegebenen Namen.
// Leeres/nur-Whitespace displayName -> leeres Array (kein Match-Rauschen bei leerem Feld).
// Sortiert: isActiveLinked === true zuerst.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Duplikat-Matching-Funktion + Warnkarte im Anlegen-Formular</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts, frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts, frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx, frontend/src/app/admin/admin.module.css</files>
  <behavior>
    - Test 1: `findDuplicateMemberMatches(members, 'Sora')` findet ein Mitglied mit `display_name: 'sora'` (case-insensitive) und `display_name: '  Sora  '` (getrimmt) -- beides Treffer.
    - Test 2: Ein Mitglied mit `active_app_member_id: 5` liefert `isActiveLinked: true`; ein Mitglied ohne `active_app_member_id`/`app_user_id` liefert `isActiveLinked: false`.
    - Test 3: Bei mehreren Treffern steht der `isActiveLinked: true`-Treffer an erster Stelle des Ergebnis-Arrays, unabhängig von der Eingabereihenfolge.
    - Test 4: `findDuplicateMemberMatches(members, '')` und `findDuplicateMemberMatches(members, '   ')` liefern `[]`.
    - Test 5: Kein Namens-Treffer -> `[]`.
  </behavior>
  <action>
    In useGroupMembersTab.ts (neben den bestehenden reinen Helfern wie `normalizeInviteLink`,
    `roleLabelForCode`) den Typ `DuplicateMemberMatch` und die Funktion
    `findDuplicateMemberMatches(members, displayName)` exportieren, exakt gemäß
    `<interfaces>`-Vertrag oben (case-insensitive/getrimmter Exact-Match, active-linked zuerst
    sortiert, leerer Name -> `[]`). RED-Tests zuerst in useGroupMembersTab.test.ts als neuer
    `describe('findDuplicateMemberMatches', ...)`-Block (Muster: bestehender
    `describe('roleLabelForCode', ...)`-Block in derselben Datei) -- lokale
    `HistFansubGroupMember`-Fixture-Builder-Funktion mit sinnvollen Defaults, pro Testfall nur die
    relevanten Felder überschreiben.

    In admin.module.css nach dem Muster von `.errorBox`/`.successBox` (Zeilen ~244-258) eine neue
    `.warningBox`-Klasse ergänzen, die `var(--color-warning)` (frontend/src/styles/globals.css:14,
    bereits an mehreren Stellen z. B. AnimeBrowser.module.css so verwendet) für Border/Background
    nutzt statt `--color-error`/`--color-success`.

    In GroupMemberFormModals.tsx: neue Prop `existingMembers: HistFansubGroupMember[]` zu
    `GroupMemberFormModalsProps` hinzufügen. Lokalen State `duplicateConfirmed` (useState<boolean>,
    initial false) einführen; per `useEffect` auf `form.displayName` zurücksetzen (jede
    Namensänderung verlangt erneute explizite Bestätigung). Mit `useMemo` `duplicateMatches`
    berechnen: `editTarget ? [] : findDuplicateMemberMatches(existingMembers, form.displayName)`
    (Warnung nur bei Neuanlage, nicht beim Bearbeiten -- Bug betrifft ausschließlich den
    Create-Pfad). Direkt unter dem "Anzeigename"-`FormField` (vor "Sichtbarkeit") bei
    `duplicateMatches.length > 0` eine `Card`-Komponente (`variant="nested"`,
    `className={styles.warningBox}`) rendern mit deutschem Warntext, der den priorisierten
    (`duplicateMatches[0]`) Treffer referenziert -- exakt wie in der Aufgabenstellung
    vorgegeben: "Ein Mitglied mit diesem Namen existiert bereits: &lt;Name&gt; (aktiv/verknüpft) --
    trotzdem als neuen Eintrag anlegen?" (bzw. "(historisch)" wenn `isActiveLinked` false ist; bei
    mehr als einem Treffer zusätzlich "und N weitere(r) Eintrag/Einträge" ergänzen). Darunter eine
    `Switch`-Komponente (`checked={duplicateConfirmed}`, `onCheckedChange={setDuplicateConfirmed}`,
    `label="Ja, trotzdem als neuen Eintrag anlegen"`).

    `canSave`-Berechnung erweitern: bisher `Boolean(form.displayName.trim()) && hasRequiredRole`;
    neu zusätzlich `&& (duplicateMatches.length === 0 || duplicateConfirmed)` -- Speichern bleibt
    bei Namenskollision deaktiviert, bis der Admin den Switch explizit bestätigt hat (Soft-Guard:
    niemals dauerhaft blockiert, der Admin kontrolliert die Bestätigung selbst und kann danach immer
    speichern). Alle neuen JSX-Textknoten mit korrekten deutschen Umlauten (siehe CLAUDE.md
    Sprachqualität-Regel).
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend && npx vitest run src/app/admin/fansubs/\[id\]/edit/useGroupMembersTab.test.ts</automated>
  </verify>
  <done>Alle 5 neuen findDuplicateMemberMatches-Testfälle grün; GroupMemberFormModals.tsx rendert Warnkarte + Switch nur bei Namenskollision im Anlegen-Modus; canSave respektiert duplicateConfirmed.</done>
</task>

<task type="auto">
  <name>Task 2: existingMembers-Prop verdrahten + Typecheck/Build-Verifikation</name>
  <files>frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx</files>
  <action>
    In GroupMembersTab.tsx bei der bestehenden `&lt;GroupMemberFormModals ... /&gt;`-Stelle
    (aktuell ca. Zeile 223ff.) die neue Prop `existingMembers={tab.members}` ergänzen (`tab.members`
    ist die bereits geladene vollständige `HistFansubGroupMember[]`-Liste der Gruppe aus
    `useGroupMembersTab`, kein neuer Fetch nötig).
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend && npm run typecheck</automated>
  </verify>
  <done>tsc --noEmit läuft ohne neue Fehler in den vier geänderten Dateien; existingMembers ist verdrahtet.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Live-UAT Duplikat-Warnung auf der Fansub-Edit-Seite</name>
  <files>none</files>
  <action>
    Gebaut: Nicht-blockierende Duplikat-Warnung im "Mitglied hinzufügen"-Formular der
    Fansub-Edit-Seite -- bei Namensübereinstimmung mit einem bestehenden Gruppenmitglied erscheint
    eine Warnkarte (priorisiert aktiv/verknüpfte Treffer), "Speichern" ist erst nach explizitem
    Bestätigen per Switch aktiv.

    Verifikation:
    1. `docker restart team4sv30-frontend` ausführen und kurz warten, bis der Container wieder
       "healthy"/erreichbar ist (`docker compose ps`).
    2. Auf http://192.168.235.196:3000 als Admin einloggen, zu einer Fansub-Gruppen-Edit-Seite mit
       mindestens einem historischen Mitglied navigieren (Tab "Historische Mitglieder").
    3. "Mitglied hinzufügen" klicken, im Feld "Anzeigename" den exakten Namen (Groß-/Kleinschreibung
       egal) eines bereits vorhandenen Mitglieds dieser Gruppe eingeben, mindestens eine Rolle
       wählen. Erwartet: Warnkarte erscheint mit Verweis auf den existierenden Namen und
       "(aktiv/verknüpft)" bzw. "(historisch)" je nach Mitglied; "Speichern" ist deaktiviert.
    4. Den Switch "Ja, trotzdem als neuen Eintrag anlegen" aktivieren. Erwartet: "Speichern" wird
       aktiv, Klick legt wie zuvor einen neuen Eintrag an (bestehendes Verhalten bleibt für den
       bestätigten Fall unverändert).
    5. Modal erneut öffnen, einen eindeutigen (noch nicht vergebenen) Namen eingeben. Erwartet:
       keine Warnkarte, "Speichern" verhält sich wie vor diesem Fix.
    6. Falls ein aktiv verknüpftes Mitglied in der Testgruppe existiert (member_claims verified +
       aktive fansub_group_members-Zeile): dessen Namen testen und bestätigen, dass die Warnung
       "(aktiv/verknüpft)" statt "(historisch)" anzeigt (Priorisierung).
  </action>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin-Browser -> Frontend-State | Admin-Eingabe (Anzeigename) wird rein client-seitig gegen bereits geladene, serverseitig autorisierte Mitgliederliste (`tab.members`) abgeglichen -- kein neuer Netzwerkpfad, keine neue Vertrauensgrenze. |
| Frontend -> Backend (Create) | Unverändert: `createGroupMember` -> `CreateHistGroupMember` -> `CreateWithAutoMember`, weiterhin durch bestehende Permission-Middleware (`ActionFansubGroupHistoricalMembersManage`) geschützt. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260819-01 | Tampering | GroupMemberFormModals.tsx canSave-Gate | accept | Rein clientseitige UX-Gate (Soft-Guard); ein Admin mit gültiger Session könnte das Gate umgehen (z. B. direkter API-Call), aber Backend-Autorisierung/Validierung bleibt unverändert und ist die eigentliche Sicherheitsgrenze -- dieses Feature ist ein Warnhinweis, keine Zugriffskontrolle. |
| T-260819-02 | Information Disclosure | Warnkarte zeigt existierenden Mitgliedsnamen | accept | Der Admin sieht ohnehin bereits die vollständige Mitgliederliste derselben Gruppe (tab.members, bereits geladen und angezeigt in GroupMembersHistTable) -- kein zusätzliches Datenleck. |

Kein Package-Legitimacy-Gate anwendbar (keine neuen npm/pip/cargo-Installs in diesem Plan).
</threat_model>

<verification>
- `npx vitest run src/app/admin/fansubs/\[id\]/edit/useGroupMembersTab.test.ts` grün (neue Duplikat-Matching-Tests + bestehende `roleLabelForCode`-Tests).
- `npm run typecheck` (tsc --noEmit) ohne neue Fehler.
- Live-Checkpoint (Task 3) vom Admin bestätigt: Warnung erscheint bei Namenskollision, priorisiert aktiv/verknüpfte Treffer, Speichern nach Bestätigung möglich, kein Verhaltensunterschied ohne Kollision.
</verification>

<success_criteria>
- Admin sieht vor dem Anlegen eines historischen Mitglieds mit kollidierendem Namen eine
  nicht-blockierende Warnung mit Verweis auf den existierenden Eintrag.
- Aktiv/verknüpfte Treffer werden gegenüber rein historischen Treffern priorisiert dargestellt.
- Legitime Namensdopplungen bleiben nach expliziter Bestätigung weiterhin anlegbar (kein Hard-Block).
- Ohne Namenskollision ist das Formularverhalten byte-für-byte wie zuvor.
- Keine Backend-Änderung nötig/erfolgt (Matching nutzt ausschließlich bereits geladene Daten).
</success_criteria>

<output>
Create `.planning/quick/260819-ipu-duplikat-guard-beim-historischen-mitglie/260819-ipu-SUMMARY.md` when done
</output>
