---
phase: 111
reviewed: 2026-07-28T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/repository/authz_capability_mutations.go
  - frontend/src/app/admin/users/[id]/page.tsx
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
  - frontend/src/app/admin/users/AdminUsersClient.tsx
  - frontend/src/app/admin/users/useUserListFilters.ts
  - frontend/src/app/admin/users/resolveRoleLink.ts
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
  - frontend/src/app/admin/role-capabilities/RoleMasterList.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
  - frontend/src/app/admin/role-capabilities/page.tsx
  - frontend/src/components/ui/Accordion.tsx
  - frontend/src/types/admin-capability.ts
  - shared/contracts/admin-capabilities.yaml
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 111: Code Review Report

**Reviewed:** 2026-07-28
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Der überwiegende Teil der Phase-111-Umsetzung folgt den in `111-RESEARCH.md`
dokumentierten Mustern sauber: die Impact-Count-/Auflösbarkeits-Logik in
`RoleMasterList.tsx` und `resolveRoleLink.ts` prüft korrekt über
`global_assignment_count != null` bzw. per Matrix-Lookup — **nicht** über
`assignable === true` (Pitfall 1 wurde vermieden). Die neue Route
`/admin/users/[id]/page.tsx` liegt korrekt unter `PlatformAdminGate`, analog zu
`/admin/role-capabilities`. Das `Accordion`-`keepMountedIds`-Feature ist additiv
und bricht bestehende Aufrufer nicht (Default `undefined` → identisches
Verhalten wie zuvor). Die synthetischen globalen Rollen-Zeilen im Backend
(`ListCapabilityMatrix`/`CountGlobalRoleAssignments`) sind sauber parametrisiert,
korrekt gruppiert und mit einem eigenen Go-Test abgedeckt. Verschachtelte
interaktive Elemente (Button-im-Button) wurden bewusst vermieden
(Geschwister-Layout in `RoleMasterList.tsx`). Alle geprüften Dateien liegen
unter dem 450-Zeilen-Limit, deutsche Umlaute in user-facing Strings sind korrekt.

Trotzdem wurde ein konkreter, reproduzierbarer Funktionsfehler in der
Zurück-Link-Rekonstruktion gefunden (D-06-Vertragsbruch bei Suchbegriffen mit
`+`/Sonderzeichen, z. B. E-Mail-Alias-Suche — genau der im UI-SPEC benannte
Haupt-Anwendungsfall), der von der bestehenden Testabdeckung nicht erkannt
wird, weil das Test-Mock für `useSearchParams` das reale Decodierverhalten
nicht korrekt nachbildet. Daneben gibt es kleinere Robustheits- und
Konsistenzlücken (fehlende Validierung der Routen-ID, ein nicht bereinigtes
CLAUDE.md-UI-Primitive-Problem in einer in dieser Phase intensiv bearbeiteten
Datei).

## Critical Issues

### CR-01: Zurück-Link dekodiert den `from`-Query-Parameter doppelt und korrumpiert Suchbegriffe mit `+`/Sonderzeichen

**File:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:58-59`

**Issue:**
```tsx
const fromQuery = searchParams.get('from')
const backHref = fromQuery ? `/admin/users?${decodeURIComponent(fromQuery)}` : '/admin/users'
```

`searchParams.get('from')` (Next.js `useSearchParams`, intern ein
`URLSearchParams`, das aus der tatsächlichen, bereits prozentkodierten URL
geparst wird) liefert den Wert **bereits einmal dekodiert** zurück — das ist
Standardverhalten der Web-API, nicht optional. Der zusätzliche
`decodeURIComponent(fromQuery)`-Aufruf dekodiert daher ein zweites Mal.

Für einfache Query-Strings ohne reservierte/prozentkodierte Zeichen (z. B.
`q=abc&status=active`) ist die doppelte Dekodierung ein No-Op und fällt nicht
auf. Sobald der ursprüngliche Suchwert aber ein Zeichen enthält, das beim
Schreiben in die URL prozentkodiert wurde — und genau das ist beim
Haupt-Anwendungsfall dieses Suchfelds ("Name oder E-Mail-Adresse suchen …",
`AdminUsersClient.tsx:119`) der Normalfall, z. B. bei Gmail-Plus-Aliasing
(`user+test@test.com`) — wird der Wert korrumpiert: Aus `+` (kodiert als
`%2B`) wird nach der zweiten Dekodierung ein literales `+`, das beim erneuten
Parsen auf `/admin/users` von `URLSearchParams` gemäß
`application/x-www-form-urlencoded` als Leerzeichen interpretiert wird.

Reproduktion (Node, exakt der Produktionscodepfad nachgebildet):
```
q ursprünglich:        user+test@test.com
currentQuery (Liste):  q=user%2Btest%40test.com&status=active
from-Param in URL:     from=q%3Duser%252Btest%2540test.com%26status%3Dactive
searchParams.get('from') [1x korrekt dekodiert]:
                        q=user%2Btest%40test.com&status=active
nach zusätzlichem decodeURIComponent(): q=user+test@test.com&status=active
final geparster q-Wert auf /admin/users: "user test@test.com"  ← korrumpiert
erwarteter q-Wert:      "user+test@test.com"
```

Der Zurück-Link stellt damit **nicht** die exakte vorherige gefilterte Ansicht
wieder her — ein direkter Bruch der Locked Decision D-06
("... der Zurück-Link von `/admin/users/[id]` (D-01) stellt exakt die
vorherige gefilterte Liste wieder her", `111-RESEARCH.md:17`) und der
UI-SPEC-Vorgabe (`111-UI-SPEC.md:197`).

Die bestehende Testabdeckung erkennt dies nicht: Der `setNav()`-Helper in
`frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx:157-161`
konstruiert das Mock via `new URLSearchParams({ from })` aus einem
JS-Objekt — dabei wird der übergebene String **nicht** wie bei echtem
URL-Parsing einmal dekodiert, sondern unverändert als Wert übernommen. Der
Test simuliert damit effektiv nur eine einzelne Dekodierstufe (nämlich genau
die im Produktivcode vorhandene `decodeURIComponent`), nicht aber die vorab
bereits von `useSearchParams()` selbst durchgeführte Dekodierung — wodurch der
Test grün bleibt, obwohl das reale Verhalten fehlerhaft ist. Siehe auch WR-03.

**Fix:**
```tsx
const fromQuery = searchParams.get('from')
const backHref = fromQuery ? `/admin/users?${fromQuery}` : '/admin/users'
```
`fromQuery` ist bereits der korrekt dekodierte Original-Query-String — kein
weiterer `decodeURIComponent`-Aufruf nötig. (Hinweis: Das im Research-Dokument
unter „Code Examples" skizzierte Beispiel enthält denselben Fehler — die
Implementierung hat die fehlerhafte Vorlage 1:1 übernommen, nicht selbst
verursacht.)

## Warnings

### WR-01: Keine Validierung der `id`-Routenparameter — ungültige IDs erzeugen `NaN`-Requests und „Benutzer #NaN"

**File:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:56`

**Issue:**
```tsx
const params = useParams<{ id: string }>()
const userId = Number(params.id)
```
Bei einem direkten Aufruf von `/admin/users/abc` (Tippfehler, manuell
bearbeitete/geteilte URL, alter Bookmark) liefert `Number('abc')` `NaN`. Dieser
Wert wird ungeprüft an `getAdminUserOverview(userId)` sowie an alle neun
Accordion-Tab-Komponenten (`userId={userId}`) weitergereicht, was zu
Backend-Requests wie `GET /api/v1/admin/users/NaN/overview` führt. Der Fehler
wird im leeren `catch`-Block in `loadOverview` (Zeile 70-73) still geschluckt,
sodass der `PageHeader`-Titel auf `Benutzer #NaN` zurückfällt — kein Error-State,
keine erkennbare Rückmeldung für den Admin, warum die Seite leer bleibt.

**Fix:** Frühzeitige Validierung mit dediziertem Fehlerzustand statt stillem
Fallback, z. B.:
```tsx
const userId = Number(params.id)
if (!Number.isInteger(userId) || userId <= 0) {
  return <ErrorState title="Ungültige Benutzer-ID" description="Die aufgerufene URL enthält keine gültige Benutzer-ID." />
}
```

### WR-02: Handgebautes natives `<button>` in `RoleMasterList.tsx` bleibt trotz intensiver Überarbeitung derselben Interaktionszone unangetastet (CLAUDE.md-Verstoß)

**File:** `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx:96-132`

**Issue:** CLAUDE.md verbietet explizit handgebaute native `<button>`-Elemente,
wenn `@/components/ui` bereits ein Primitive dafür bereitstellt
("Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen vom globalen
Design-System"). Der Auswahl-Button für die Rollen-Card ist ein rohes
`<button type="button">` (vorbestehend aus Phase 94/95, nicht neu von Phase
111 eingeführt). Phase 111 hat exakt diesen Layout-Block umgebaut (aus dem
`<button>`, das früher die gesamte Card-Breite einnahm, wurde ein
Flex-Geschwister-Layout mit dem neuen `Button`-Primitive für den
Impact-Count direkt daneben, Zeilen 95-142) und dabei bewusst dokumentiert,
warum verschachtelte interaktive Elemente vermieden werden — aber die
Gelegenheit, den bestehenden Verstoß im selben Zug zu beheben (analog zum in
`AdminUsersClient.tsx` erledigten `<label>`→`FormField`-Fix, Pitfall 5),
wurde nicht genutzt. Das Ergebnis: ein `Button`-Primitive-Import direkt neben
einem weiterhin handgebauten `<button>` in derselben Komponente.

**Fix:** Den nativen `<button>` durch `@/components/ui` `Button` (oder ein
neues, dediziertes `variant`, falls das bestehende `Button`-Primitive das
mehrzeilige Label+Badge-Layout nicht abbildet) ersetzen, ggf. als eigenes
Nachfolge-Ticket, aber explizit vermerken statt stillschweigend zu belassen.

### WR-03: Test-Mock für `useSearchParams` bildet reales Decodierverhalten nicht nach und maskiert CR-01

**File:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx:157-161`

**Issue:**
```tsx
function setNav({ id = '1', from }: { id?: string; from?: string } = {}) {
  mockUseParams.mockReturnValue({ id })
  mockUseSearchParams.mockReturnValue(
    new URLSearchParams(from !== undefined ? { from } : {}),
  )
}
```
`new URLSearchParams({ from: 'q%3Dabc%26status%3Dactive' })` übernimmt den
String **unverändert** als Wert (Objekt-Konstruktion dekodiert nichts). Damit
simuliert der Test effektiv nur *eine* Dekodierstufe — genau die im
Produktivcode vorhandene explizite `decodeURIComponent(fromQuery)` —, nicht
aber die bereits von echtem `useSearchParams()` beim Parsen der Browser-URL
durchgeführte automatische Dekodierung. Der Test „back link" bleibt dadurch
grün, obwohl das reale Zusammenspiel beider Dekodierstufen (CR-01) fehlerhaft
ist. Das ist eine Testzuverlässigkeits-Lücke, kein reines Stil-Problem.

**Fix:** Das Mock sollte den `from`-Wert wie eine reale, bereits
prozentkodierte URL bereitstellen, z. B. `new URL('http://x/y?' + rawQuery).searchParams`
oder gezieltes manuelles `encodeURIComponent` vor dem Einsetzen in
`URLSearchParams`, damit ein Test-Case mit einem `+`/`%`-haltigen
Suchbegriff die Regression aus CR-01 tatsächlich fängt.

## Info

### IN-01: Impact-Count-Link in `RoleMasterList.tsx` interpoliert `role_code` ohne `encodeURIComponent`

**File:** `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx:38`

**Issue:**
```tsx
href={`/admin/users?role=${role.role_code}`}
```
`resolveRoleLink.ts` (Zeile 21) kodiert `roleCode` konsequent mit
`encodeURIComponent`; hier fehlt das Pendant. Aktuell unkritisch, da
`role_code` in der Praxis nur aus einer festen, kontrollierten Menge
(`platform_admin`/`content_admin`/`user`) stammt — aber inkonsistenter
Stil zwischen zwei Stellen, die dieselbe Aufgabe lösen.

**Fix:** `href={`/admin/users?role=${encodeURIComponent(role.role_code)}`}`

### IN-02: Debounce-Timer in `useUserListFilters.ts` wird beim Unmount nicht bereinigt

**File:** `frontend/src/app/admin/users/useUserListFilters.ts:38,83-89`

**Issue:** `debounceRef` wird in `handleSearchChange` gesetzt/gecleart, aber es
existiert kein `useEffect`-Cleanup, der einen noch ausstehenden Timer beim
Unmount des Hooks (bzw. der Komponente) abbricht. Praktisch risikoarm, da
`router.replace` unabhängig vom Mount-Zustand aufrufbar ist, aber ein nach dem
Verlassen der Seite feuernder Navigations-Aufruf ist unsauberes Verhalten.

**Fix:**
```ts
useEffect(() => () => {
  if (debounceRef.current) clearTimeout(debounceRef.current)
}, [])
```

---

_Reviewed: 2026-07-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
