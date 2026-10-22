---
phase: quick-261022-dmr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/fansubs/FansubContributorsSection.tsx
  - frontend/src/components/fansubs/FansubContributorsSection.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Zwei Contributor-Einträge mit identischem Anzeigenamen aber unterschiedlicher id erhalten unterschiedliche React-Keys."
    - "Die Key-Bildung ist über eine pure, unit-testbare Funktion abgedeckt, nicht nur implizit im JSX."
    - "Der Fix nutzt KEINEN Quelle+id-Mechanismus (buildFansubMemorialKey), weil contributors eine einzige, nicht gemischte Datenquelle mit eindeutiger id ist — anders als der Memorial-Block, der zwei DB-Tabellen mit überlappendem id-Raum kombiniert."
  artifacts:
    - path: "frontend/src/components/fansubs/FansubContributorsSection.tsx"
      provides: "React-Key je Contributor-Card gebaut aus contributor.id statt aus member_display_name, über eine benannte, exportierte pure Funktion"
      contains: "selectFansubContributorKey"
    - path: "frontend/src/components/fansubs/FansubContributorsSection.test.tsx"
      provides: "Logiktest: gleicher Anzeigename, unterschiedliche id -> unterschiedlicher Key (kein Render/Snapshot)"
      contains: "selectFansubContributorKey"
  key_links:
    - from: "frontend/src/components/fansubs/FansubContributorsSection.tsx"
      to: "frontend/src/types/domain-projection.ts"
      via: "selectFansubContributorKey(contributor: DomainProjectionContributorRow): number liest contributor.id"
      pattern: "selectFansubContributorKey"
---

<objective>
Behebt den in Quick-Task 261022-ap1 während des Risiko-Sweeps gemeldeten, aber bewusst nicht
geänderten Fund: `FansubContributorsSection.tsx` bildet den React-Key für Contributor-Karten aus
`contributor.member_display_name` ohne Fallback. Zwei externe Mitwirkende mit gleichem Anzeigenamen
kollidieren dadurch als React-Key (falsche Wiederverwendung/fehlende Karten beim Re-Render).

Abgrenzung zum vorherigen Fix (Memorial-Block): Dort mussten zwei verschiedene DB-Tabellen
(`DomainProjectionMemberRow` / `DomainProjectionHistoricalRow`) mit potenziell überlappendem
id-Raum kombiniert werden, weshalb Quelle+id (`buildFansubMemorialKey`) nötig war. Hier liegt mit
`DomainProjectionContributorRow[]` eine einzige, nicht gemischte Liste mit eigenem, eindeutigem
`id`-Feld (Primärschlüssel der Contributor-Zeile selbst, siehe `frontend/src/types/domain-projection.ts`
Zeile 46-61) vor — `contributors` wird an keiner Stelle im Code mit einer zweiten Quelle
zusammengeführt (einziger Verwendungsort der Komponente ist aktuell sie selbst; keine andere Datei
importiert sie produktiv). Ein einfacher `id`-basierter Key ist daher ausreichend und korrekt; der
Quelle+id-Mechanismus aus `fansub-memorial-key.ts` würde hier unnötige Komplexität ohne Zusatznutzen
einführen und wird bewusst NICHT wiederverwendet.

Purpose: React-Key-Kollision im Contributors-Block der öffentlichen Fansub-Gruppenseite verhindern.
Output: Pure, unit-getestete Key-Auswahlfunktion + verdrahteter Fix in FansubContributorsSection.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/fansubs/FansubContributorsSection.tsx
@frontend/src/types/domain-projection.ts
@frontend/src/lib/fansub-memorial-key.ts
</context>

<interfaces>
<!-- Aktueller Stand FansubContributorsSection.tsx (Zeile 42 ist die Bug-Stelle, verifiziert 2026-10-22): -->

Datei: frontend/src/components/fansubs/FansubContributorsSection.tsx

```
export function FansubContributorsSection({ contributors, teamMemberNames }: FansubContributorsSectionProps) {
  const visibleContributors = contributors.filter(
    (c) => c.visibility === 'public' && c.review_status === 'approved',
  )
  // ...
  {visibleContributors.map((contributor) => {
    const isAlsoMember = teamSet.has(contributor.member_display_name.toLowerCase())
    return (
      <Card key={contributor.member_display_name} variant="flat" className={styles.contributorCard}>
        {/* BUG: Zeile 42 -- Key nur aus Anzeigenamen, kein Fallback */}
```

<!-- Relevanter Typ (frontend/src/types/domain-projection.ts Zeile 46-61), bereits bestätigt: -->
<!-- eine einzige, eigenständige Zeilenart mit eigenem Primärschlüssel-Feld `id` -- keine Vermischung -->
<!-- mehrerer Quellen wie beim Memorial-Block: -->

```
export interface DomainProjectionContributorRow {
  id: number;
  anime_id: number;
  anime_title: string;
  member_id: number;
  member_display_name: string;
  member_slug: string | null;
  roles: string[];
  role_labels: string[];
  started_year: number | null;
  ended_year: number | null;
  status: string;
  dispute_state: DomainProjectionDisputeState;
  visibility: string;
  review_status: DomainProjectionReviewStatus;
}
```

Gültige Werte (zum Bauen von Testdaten): `DomainProjectionDisputeState = "none" | "open" | "resolved"`,
`DomainProjectionReviewStatus = "in_review" | "approved" | "rejected" | "archived" | "removed"`.

<!-- Zum Vergleich, NICHT wiederverwenden (anderer Anwendungsfall -- zwei Quellen, überlappender -->
<!-- id-Raum): frontend/src/lib/fansub-memorial-key.ts -->

```
export type FansubMemorialSource = 'member' | 'historical'
export function buildFansubMemorialKey(source: FansubMemorialSource, id: number): string
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pure Key-Auswahlfunktion extrahieren, Fix verdrahten, Logiktest schreiben</name>
  <files>frontend/src/components/fansubs/FansubContributorsSection.tsx, frontend/src/components/fansubs/FansubContributorsSection.test.tsx</files>
  <behavior>
    - Test: "liefert unterschiedliche Keys für gleichen Anzeigenamen bei unterschiedlicher id" --
      zwei DomainProjectionContributorRow-Objekte mit identischem member_display_name aber
      unterschiedlicher id (z. B. 1 und 2) müssen über selectFansubContributorKey unterschiedliche
      Rückgabewerte liefern (.not.toBe(...)). Das ist exakt der im Task beschriebene Kollisionsfall.
    - Test: "liefert die contributor.id unverändert zurück" -- selectFansubContributorKey(contributor)
      === contributor.id für ein Beispielobjekt (fixiert das Verhalten: keine String-Transformation,
      keine Kombination mit anderen Feldern, da single-source).
  </behavior>
  <action>
    In frontend/src/components/fansubs/FansubContributorsSection.tsx: füge direkt nach
    renderContributorName (nach der aktuellen Zeile 19) eine neue, exportierte pure Funktion
    "export function selectFansubContributorKey(contributor: DomainProjectionContributorRow): number"
    ein, die schlicht "return contributor.id" liefert. Kurzer Kommentar direkt darüber erklärt, warum
    hier (im Unterschied zum Memorial-Block) ein reiner id-Key ausreicht: contributors ist eine
    einzige, nicht gemischte Liste mit eigenem Primärschlüssel, kein Quelle+id-Mechanismus nötig.
    Ersetze in der aktuellen Zeile 42 "key={contributor.member_display_name}" durch
    "key={selectFansubContributorKey(contributor)}". Keine weiteren Änderungen an der Datei (Struktur,
    Styles, restliches Markup bleiben unverändert).

    Erstelle frontend/src/components/fansubs/FansubContributorsSection.test.tsx (Vitest,
    describe/it/expect, KEIN @vitest-environment jsdom, KEIN render/renderToStaticMarkup -- reiner
    Funktionsaufruf gegen Testdaten, analog zu fansub-memorial-key.test.ts). Importiere
    selectFansubContributorKey aus ./FansubContributorsSection und den Typ
    DomainProjectionContributorRow aus @/types/domain-projection. Definiere eine lokale
    Factory-Funktion contributorRow(overrides: Partial<DomainProjectionContributorRow> = {}):
    DomainProjectionContributorRow mit sinnvollen Default-Werten für alle Pflichtfelder (id: 1,
    anime_id: 1, anime_title: 'Testanime', member_id: 1, member_display_name: 'Max Mustermann',
    member_slug: null, roles: [], role_labels: ['Übersetzung'], started_year: null, ended_year: null,
    status: 'active', dispute_state: 'none', visibility: 'public', review_status: 'approved') und
    implementiere die zwei Tests aus behavior damit (zweiter Contributor im Kollisionstest nur mit
    overrides { id: 2 }, Anzeigename bleibt identisch).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubContributorsSection.test.tsx"</automated>
  </verify>
  <done>Beide Tests in FansubContributorsSection.test.tsx laufen grün; selectFansubContributorKey hat keine React-/DOM-Abhängigkeit; der React-Key in Zeile 42 nutzt selectFansubContributorKey(contributor) statt contributor.member_display_name.</done>
</task>

<task type="auto">
  <name>Task 2: Vollverifikation im Container, Frontend-Neustart, Commit</name>
  <files>frontend/src/components/fansubs/FansubContributorsSection.tsx, frontend/src/components/fansubs/FansubContributorsSection.test.tsx</files>
  <action>
    Führe im Frontend-Container (nicht lokal) den betroffenen Test und den Typecheck aus: zuerst
    "docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/fansubs/FansubContributorsSection.test.tsx'",
    danach "docker compose exec -T team4sv30-frontend npm run typecheck". Bei Erfolg beider Befehle:
    "docker restart team4sv30-frontend" ausführen und prüfen, dass der Container laut
    "docker compose ps team4sv30-frontend" wieder "Up" ist. Danach ausschließlich die zwei
    geänderten/neuen Dateien aus files_modified gezielt stagen (git add mit expliziten Pfaden, kein
    git add -A oder git add .) und committen mit der Message
    "fix(quick-261022-dmr): React-Key in FansubContributorsSection aus contributor.id statt Anzeigename bilden"
    -- kein Push, kein Co-Authored-By-Trailer.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/FansubContributorsSection.test.tsx" && docker compose exec -T team4sv30-frontend npm run typecheck && docker compose ps team4sv30-frontend | grep -q "Up" && git log -1 --format=%s | grep -q "quick-261022-dmr"</automated>
  </verify>
  <done>
    Der Testfile läuft grün im Container, der Typecheck ist fehlerfrei, team4sv30-frontend wurde
    neu gestartet und läuft wieder, und genau ein neuer Commit mit den zwei genannten Dateien existiert
    (kein Push, kein Co-Authored-By-Trailer, keine weiteren Dateien im Commit).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Öffentliche Fansub-Gruppenseite (Server-Render) → React-Key-Bildung | Rein interne Rendering-Korrektheit; keine neue Eingabe von außen, keine neuen Trust-Boundary-Übergänge. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-dmr-01 | Information Disclosure | FansubContributorsSection.tsx | accept | Die Key-Kollision führte höchstens zu falscher React-Wiederverwendung/fehlenden Karten innerhalb bereits öffentlich sichtbarer Contributor-Daten derselben Gruppe -- kein Zugriff auf fremde Daten, keine neue Angriffsfläche durch den Fix. |
</threat_model>

<verification>
Beide Tasks laufen sequenziell im Frontend-Container. Nach Task 2 muss der betroffene Testfile grün
sein, der Typecheck fehlerfrei sein, der Frontend-Container nach Neustart wieder laufen, und genau
ein neuer, gezielt gestagter Commit mit den zwei genannten Dateien existieren.
</verification>

<success_criteria>
- selectFansubContributorKey liefert für zwei Contributor-Objekte mit identischem Anzeigenamen aber
  unterschiedlicher id unterschiedliche Keys -- bewiesen durch einen reinen Logiktest ohne
  Render-Simulation.
- FansubContributorsSection.tsx baut den React-Key aus contributor.id (über
  selectFansubContributorKey) statt aus contributor.member_display_name.
- Die Entscheidung gegen die Wiederverwendung von buildFansubMemorialKey ist im Code-Kommentar und
  im Plan explizit begründet (single-source Liste mit eigenem Primärschlüssel, kein überlappender
  id-Raum wie beim Memorial-Block).
- Verifikation lief im Frontend-Container (nicht lokal); team4sv30-frontend wurde danach neu
  gestartet.
- Genau ein gezielter Commit mit den zwei Dateien, ohne Push, ohne Co-Authored-By-Trailer.
</success_criteria>

<output>
Create `.planning/quick/261022-dmr-fansubcontributorssection-react-key-eind/261022-dmr-SUMMARY.md` when done
</output>
