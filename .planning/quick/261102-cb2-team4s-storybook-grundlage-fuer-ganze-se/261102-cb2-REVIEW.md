---
phase: 261102-cb2-team4s-storybook-grundlage-fuer-ganze-se
reviewed: 2026-11-02T00:00:00Z
depth: deep
files_reviewed: 28
files_reviewed_list:
  - frontend/.storybook/main.ts
  - frontend/.storybook/mocks/handlers.ts
  - frontend/.storybook/mocks/profileFixtures.ts
  - frontend/.storybook/mocks/roleSimulation.ts
  - frontend/.storybook/preview.tsx
  - frontend/src/app/anime/AnimeListView.fixtures.ts
  - frontend/src/app/anime/AnimeListView.stories.tsx
  - frontend/src/app/anime/AnimeListView.tsx
  - frontend/src/app/anime/[id]/AnimeDetailView.fixtures.ts
  - frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx
  - frontend/src/app/anime/[id]/AnimeDetailView.tsx
  - frontend/src/app/anime/[id]/page.performance.test.ts
  - frontend/src/app/anime/[id]/page.test.tsx
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/app/anime/animeListPageHref.test.ts
  - frontend/src/app/anime/animeListPageHref.ts
  - frontend/src/app/anime/page.tsx
  - frontend/src/app/archiv/page.tsx
  - frontend/src/app/members/ranking/page.tsx
  - frontend/src/components/ui/Accordion.stories.tsx
  - frontend/src/components/ui/Drawer.stories.tsx
  - frontend/src/components/ui/FormField.stories.tsx
  - frontend/src/components/ui/Modal.stories.tsx
  - frontend/src/components/ui/Pagination.test.tsx
  - frontend/src/components/ui/Pagination.tsx
  - frontend/src/components/ui/Switch.stories.tsx
  - frontend/src/components/ui/UploadDropzone.stories.tsx
  - frontend/src/components/ui/catalogTaxonomy.test.ts
  - scripts/smoke-pagination.sh
  - docs/FRONTEND_ARCHITEKTUR.md
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: fixed
fix_commit: cbfef1396
outcomes:
  CR-01: fixed — hrefPattern-Ersatz jetzt auf page= verankert (Regex statt erster Treffer); buildArchivUrl in eigene Datei (archiv/buildArchivUrl.ts) ausgelagert, Regressionstests für den Kollisionsfall ergänzt (animeListPageHref.test.ts, buildArchivUrl.test.ts)
  CR-02: fixed — frontend/.storybook/mocks/cookieSandbox.ts isoliert die drei Auth-Cookies vollständig vom echten document.cookie-Speicher, mit Regressionstest (cookieSandbox.test.ts)
  WR-01: fixed — Kommentare in AnimeListView.tsx/archiv/page.tsx/members/ranking/page.tsx präzisiert als bewusst akzeptierter Soft-Nav-Kompromiss; linkComponent={Link}-Entfernung live isoliert erneut gegenverifiziert (Fehlerzähler-Delta pro Einzel-Request)
  WR-02: fixed — ASCII-Umlaute in AnimeDetailView.tsx korrigiert
  WR-03: fixed — ASCII-Umlaute in anime/page.tsx korrigiert
  WR-04: fixed — AnimeDetailView.stories.tsx: Normal nutzt jetzt den echten Default-Handler (nicht in Watchlist) statt identisch zu InWatchlist zu sein; zusätzliche WatchlistFehler-Story für den zuvor ungenutzten watchlistErrorHandler
  IN-01: no_change_needed — bleibt wie dokumentiert (automatisierter curl-Nachweis prüft HTTP-Status, keine Link-Korrektheit); außerhalb des Scopes dieser Review-Fix-Runde
  IN-02: no_change_needed — vorbestehender, nicht durch diesen Auftrag eingeführter Leak in ErsetzenMitVorschauDemo (UploadDropzone.stories.tsx); vom Reviewer selbst als optional/nicht-blockierend eingestuft, bewusst nicht angefasst (Scope-Disziplin: keine Nebenbei-Umbauten an unberührtem Bestand)
---

# Code Review Report: Team4S Storybook-Grundlage für ganze Seiten (261102-cb2)

**Reviewed:** 2026-11-02
**Depth:** deep (cross-file trace, empirically reproduced two of the findings outside the sandbox: Node repro of the `hrefPattern` bug, and static trace of the cookie-write code path)
**Files Reviewed:** 28 (+ `docs/FRONTEND_ARCHITEKTUR.md`)
**Status:** issues_found

## Summary

Reviewed the Pagination `hrefPattern` fix, the new MSW/role-simulation Storybook
infrastructure, the Server/View split for `AnimeListView`/`AnimeDetailView`, and the
showcase-to-primitive-story migration. The AnimeDetailView/AnimeListView split itself is a
faithful, verified 1:1 JSX move (confirmed by diff) and the showcase migrations (Switch
`aria-label` WCAG 2.5.3 fix, Drawer/Modal/FormField/UploadDropzone/Accordion content moves) are
correctly done with no dangling imports.

However, two **Critical** issues were found that directly contradict claims made in this task's
own threat model and summary:

1. The new `hrefPattern` string-replace mechanism in `Pagination.tsx`, combined with
   `buildArchivUrl`'s parameter ordering in `archiv/page.tsx`, has a real, reproducible
   correctness bug: a reflected filter value equal to the literal placeholder text corrupts
   pagination silently (no crash, wrong links forever). The task's threat register explicitly
   claims "kein neues Angriffsflächen-Delta" for this exact mechanism — that claim is false.
2. The global Storybook role-simulation decorator (`withRoleSimulation` in
   `roleSimulation.ts`/`preview.tsx`) unconditionally writes/clears real, non-httpOnly, non-port-
   scoped browser cookies (`team4s_access_token`, `team4s_refresh_token`,
   `team4s_display_name`) on **every single story render** (including the default `anonym`
   role, which calls `clearAuthSession()`). Since Storybook (`:6006`) and the production
   frontend (`:3000`) run on the same host per this project's own documented dev topology,
   opening Storybook in a browser that also has a live Team4s session open silently destroys or
   replaces that real session's auth cookies. The task's "Threat Flags: Keine neuen ...
   Bedrohungsflächen gefunden" claim in the SUMMARY is also false — this exact threat class is
   absent from the STRIDE register in `261102-cb2-PLAN.md`.

Also found: the removal of `linkComponent={Link}` turns pagination on all three public pages
into full page reloads (acknowledged in code comments, but not re-examined for a less invasive
fix), and freshly-authored/freshly-moved German code comments contain ASCII-umlaut
substitutions in direct violation of this repo's binding language-quality rule.

## Critical Issues

### CR-01: `hrefPattern` first-occurrence `.replace()` silently corrupts Archiv pagination when a filter value equals the literal placeholder text

**File:** `frontend/src/components/ui/Pagination.tsx:124-126`, `frontend/src/app/archiv/page.tsx:239-251`

**Issue:**
`buildArchivUrl` sets query params in a fixed order — `rolle`, `gruppe`, `von`, `bis`, then
**`page` last**:

```ts
if (params.rolle) q.set('rolle', params.rolle)
if (params.gruppe) q.set('gruppe', params.gruppe)
if (params.von) q.set('von', params.von)
if (params.bis) q.set('bis', params.bis)
q.set('page', String(page))          // <-- always LAST
...
return page === '{page}' ? href.replace('%7Bpage%7D', '{page}') : href
```

`String.prototype.replace(string, ...)` (no `/g` flag) replaces only the **first** match in the
string. If any earlier-set filter (`rolle`, `gruppe`, `von`, `bis`) happens to carry the exact
value `{page}` (reachable simply by visiting `/archiv?rolle=%7Bpage%7D`, a syntactically
ordinary query string — no injection needed, just a coincidental/copy-pasted value), the first
`%7Bpage%7D` occurrence in the built query string belongs to `rolle=`, not to the real `page=`
param. The decode-back-to-literal step then unmasks the placeholder in the **wrong** field, and
`Pagination.tsx`'s own `hrefPattern.replace('{page}', String(page))` (same single-match
semantics) subsequently substitutes the real page number into `rolle=`, leaving the actual
`page` query param permanently stuck as the literal string `%7Bpage%7D`.

Empirically reproduced (Node, using the exact logic from both files):

```
hrefPattern built by server: /archiv?rolle={page}&page=%7Bpage%7D
Link for page=3: /archiv?rolle=3&page=%7Bpage%7D
Link for page=5: /archiv?rolle=5&page=%7Bpage%7D
```

Every pagination link on `/archiv?rolle=%7Bpage%7D` is now permanently wrong: clicking "page 2"
sends the visitor to `/archiv?rolle=2&page=%7Bpage%7D` — the role filter is clobbered with a
page number, and the actual page parameter never changes. No error is shown; the feature is
just silently broken for as long as that URL is bookmarked/shared/crawled.

This is a direct regression introduced by this task's own `hrefPattern` design (the previous
`hrefForPage={(page) => buildArchivUrl(resolved, page)}` closure directly interpolated the
real page number — it had no placeholder-collision surface at all). The task's own threat
register (`261102-cb2-PLAN.md`, T-261102cb2-02) explicitly disposes this exact mechanism as
"accept ... kein neues Angriffsflächen-Delta gegenüber dem bisherigen `hrefForPage`" — that
disposition is factually incorrect.

Note `buildAnimeListPageHref` (`animeListPageHref.ts`) does not have this bug only because it
happens to call `query.set('page', ...)` **first**, before `letter`/`per_page`/etc. — i.e. the
anime-list route is safe by accident of field ordering, not by design, and the next
contributor who reorders those `.set()` calls (e.g. to fix a URL cosmetic concern) will silently
reintroduce the same class of bug there too.

**Fix:** Don't rely on first-match string replace against a value that user input can also
produce. Either (a) build the pattern by inserting a URL-safe token that cannot collide with
user input (e.g. a UUID, or percent-encode/escape literal `{`/`}` in filter values before
building the query string so they can never decode back to `%7Bpage%7D`), or (b) replace by
anchoring to the known param name instead of the bare placeholder text:

```ts
// Archiv: build the pattern with page fixed at a sentinel, then replace precisely on `page=`
const href = `/archiv${qs ? `?${qs}` : ''}`
return typeof page === 'string' && page === '{page}'
  ? href.replace(/([?&]page=)%7Bpage%7D\b/, '$1{page}')
  : href
```
and in `Pagination.tsx`, anchor the final substitution the same way (`hrefPattern.replace(/\{page\}/g, ...)` still has the same multi-occurrence ambiguity — the real fix is to never let arbitrary filter values produce the literal placeholder text in the first place, e.g. reject/escape `{`/`}` in `rolle`/`gruppe`/`von`/`bis` before they ever reach `URLSearchParams`). Add a regression test with `rolle=%7Bpage%7D` as input, matching the existing `animeListPageHref.test.ts` placeholder test but for the collision case.

### CR-02: Storybook's global role-simulation decorator writes real, non-port-scoped auth cookies that can clobber a live Team4s session on the same host

**File:** `frontend/.storybook/mocks/roleSimulation.ts:66-83`, `frontend/.storybook/preview.tsx:66-83`, `frontend/src/lib/api/client.ts:272-288` (`writeBrowserCookie`)

**Issue:** `withRoleSimulation` is registered as a **global** decorator (`preview.tsx`
`decorators: [..., withRoleSimulation]`), which means it runs on **every single story render**,
not just when a developer deliberately toggles the role switcher. On the default global value
(`anonym`), it calls:

```ts
if (role === 'anonym') {
  clearAuthSession()
  setActiveProfileFixture(anonymProfile)
}
```

`clearAuthSession()` (`frontend/src/lib/api/client.ts:674`) writes real browser cookies via
`document.cookie = ...` with `Path=/` and **no `Domain` attribute**:

```ts
document.cookie = `${name}=${encodedValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureSuffix}`
```

Per RFC 6265, cookies are scoped by **hostname only, never by port**. This project's own
documented dev topology (`docker-compose.yml:226-245`, `AGENTS.md`, `CLAUDE.md`) runs the
Storybook service and the production Next.js frontend on the **same host**, different ports
(`192.168.235.196:6006` vs `192.168.235.196:3000`, or via the documented SSH tunnel mapping).
Because the cookie names written here (`team4s_access_token`, `team4s_refresh_token`,
`team4s_display_name`, `frontend/src/lib/api/client.ts:137-139`) are exactly the same names the
real app's central API client reads on every request (`readBrowserCookie(AUTH_TOKEN_COOKIE_NAME)`
etc., `client.ts:513`), a developer with the real Team4s frontend open and logged in, who opens
Storybook in another tab of the **same browser profile**, will have their real session cookies
silently overwritten the moment *any* story renders (default role is `anonym` → `clearAuthSession()`
fires immediately), or replaced with non-functional fixture tokens
(`storybook-access-${role}`/`storybook-refresh-${role}`) if a non-anonymous role is toggled.
Reloading the real app afterward will see `hasAccessToken || hasRefreshToken` as either false
(silently logged out) or true-but-invalid (triggers a doomed refresh against the real backend
with a fake refresh token, per this project's own Auth Session Rules in `CLAUDE.md`/`AGENTS.md`),
either way destroying a real, valid session that existed before Storybook was opened — with no
warning anywhere in the UI that this happened.

This exact threat class (dev-tooling cookie write bleeding into the production app's cookie
jar because both share a hostname) is **not** in the STRIDE register in
`261102-cb2-PLAN.md` (`T-261102cb2-01` only covers fixture *data* leakage, not session
clobbering), and the task's own SUMMARY explicitly claims "Keine neuen ... Bedrohungsflächen
gefunden" — that claim is incorrect.

**Fix:** Do not let the Storybook decorator call the real cookie-writing helpers at all.
Options, in order of preference:
1. Gate `persistAuthSession`/`clearAuthSession`/`writeBrowserCookie` behind an explicit
   "Storybook/test" check (e.g. an injected flag, or writing to an isolated in-memory/sessionStorage-backed store when `process.env.STORYBOOK` or an equivalent build-time flag is set) instead of `document.cookie` directly.
2. At minimum, make the Storybook dev server run on a distinct hostname (not just a distinct
   port) in local dev — e.g. bind it to `127.0.0.1` only while the frontend uses the LAN IP, or
   document and enforce that Storybook must never be opened in the same browser profile as a
   logged-in Team4s session, with a loud warning banner in the Storybook UI.
3. Add a regression/security check (per this repo's own Auth Session Rules requirement for any
   phase touching protected UI/auth state) that fails CI if a decorator in `.storybook/` imports
   `persistAuthSession`/`clearAuthSession`/`writeBrowserCookie` from the production `api/client.ts` without an isolation guard.

## Warnings

### WR-01: Removing `linkComponent={Link}` turns three public pages' pagination into full page reloads — acknowledged but not re-examined for a less invasive fix

**File:** `frontend/src/app/anime/AnimeListView.tsx:58-68`, `frontend/src/app/archiv/page.tsx:217-227`, `frontend/src/app/members/ranking/page.tsx:88-92`

**Issue:** The code comments (identical across all three call sites) correctly document that
removing `linkComponent={Link}` causes "vollen Seitenwechsel statt Soft-Nav" (full page reload
instead of client-side soft navigation) for `/anime`, `/archiv`, and `/members/ranking`
pagination — previously all three used `next/link` for client-side navigation. The root-cause
theory (a Client Component reference like `next/link`'s `Link`, imported in a Server Component
file and passed as a prop to another Client Component, cannot reliably cross the RSC boundary
in the Next.js 16.1.6 dev server) is plausible and was manually reproduced 3/3 times per the
task's own SUMMARY, but:
- it contradicts the documented React/Next.js pattern of passing Client Component references as
  props (this is explicitly supported in official docs — only *arbitrary functions* are
  disallowed, not tagged client references), so there is a real possibility this masks a
  different root cause (e.g. a dev-server HMR/module-registration timing issue specific to this
  Next.js version) that could resurface in a different form later;
- no automated regression test actually exercises *soft navigation* — `scripts/smoke-pagination.sh`
  only checks HTTP 200 status, which would pass identically whether pagination does a soft nav
  or a full reload, so a future "fix" that silently reverts to full-page navigation (or that
  re-adds `linkComponent={Link}` and reintroduces the 500) would not be caught by this task's own
  regression tooling;
- a less invasive fix exists and wasn't attempted: rendering the actual `<Link>` elements as
  **children** passed from the server page (instead of passing the `Link` function as a *prop*)
  is the officially supported RSC pattern and would have preserved soft navigation.

**Fix:** At minimum, add a comment/decision note acknowledging the UX regression is a deliberate
accepted tradeoff (currently the comment reads as a root-cause diagnosis, not a tradeoff
decision), and consider restructuring `Pagination`'s API to accept pre-rendered link children
(or a render-prop) from the server page instead of a bare component reference, which would
restore soft navigation without touching the now-fixed boundary issue.

### WR-02: Freshly-authored/freshly-moved German code comments use ASCII-umlaut substitutions, violating this repo's binding language-quality rule

**File:** `frontend/src/app/anime/[id]/AnimeDetailView.tsx:25,226-229`

**Issue:** `AnimeDetailView.tsx` is a **brand-new file** created by this task (`fe6b1bdb4`).
CLAUDE.md states, as a binding rule that "OVERRIDE[s] any default behavior": *"Code-Kommentare
werden auf Deutsch mit korrekten Umlauten ... geschrieben, nicht in ASCII-Ersatzschreibung
(ae/oe/ue/ss)."* This new file nonetheless contains comments mechanically copy-pasted from the
old `page.tsx` without correcting the pre-existing ASCII spelling:

```
Line 25:  /** Baut den q-losen Such-Link fuer einen Tag-/Genre-Chip ueber den etablierten ... */
Line 227: // page.test.tsx nur ueber eine flache props.children-Baumwanderung geprueft, die
Line 228: // sind fuer diese Prüfung unsichtbare Props, keine JSX-Children). FansubVersionBrowser
Line 229: // (Task 2) nutzt ErrorState/EmptyState regulaer, dort rendert echtes RTL react-dom.
```

(`fuer`→`für`, `ueber`→`über`, `geprueft`→`geprüft`, `regulaer`→`regulär`.) Since this is a
newly created file in this very task (not merely "touched"), the mandatory correction applies
in full, not just as "Bestand" cleanup debt.

**Fix:** Correct all four occurrences to use proper Umlaute (`für`, `über`, `geprüft`, `regulär`).

### WR-03: Pre-existing ASCII-umlaut comments in the heavily rewritten `anime/page.tsx` were left uncorrected

**File:** `frontend/src/app/anime/page.tsx:29,44`

**Issue:** `anime/page.tsx` was substantially rewritten in this task (dropped from ~130 to ~100
lines, most of the JSX moved out, several new comments added). Per CLAUDE.md's "Bestand beim
Anfassen einer Datei" rule, pre-existing ASCII-umlaut comments in a file that is substantively
touched must be corrected in the same change:

```
Line 29: /** Aufgeloeste (nicht mehr Promise-basierte) Such-Parameter für die Anime-Listenseite. */
Line 44: * Laedt die gefilterte Anime-Liste vom Backend und rendert das Raster mit A-Z-Filter und Pagination.
```

(`Aufgeloeste`→`Aufgelöste`, `Laedt`→`Lädt`.) These predate this task (introduced in historic
commit `d99fc153b`) but were not corrected despite the file being directly and substantially
edited here.

**Fix:** Correct to `Aufgelöste`/`Lädt`.

### WR-04: Duplicate story definitions `Normal`/`InWatchlist` in `AnimeDetailView.stories.tsx`

**File:** `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx:45-51`

**Issue:** `Normal` and `InWatchlist` are defined with identical args and identical
`parameters.msw.handlers` (`[watchlistPresentHandler]`), rendering the exact same state twice
under two different names. This isn't a correctness bug (no component behavior affected), but
it's redundant catalog surface that will drift silently (e.g. a future edit to one that forgets
the other) and makes "Normal" a misleading label — a reader expects "Normal" to mean the
Storybook default/neutral state, not specifically "in watchlist".

**Fix:** Either drop `Normal` (keep only the explicitly named `InWatchlist`/`NichtInWatchlist`
pair) or make `Normal` genuinely distinct (e.g. no MSW override, falling through to the
default `watchlistAbsentHandler`, matching what "Normal"/baseline usually means elsewhere in
this catalog).

## Info

### IN-01: `scripts/smoke-pagination.sh` is solid but only proves HTTP 200, not pagination correctness

**File:** `scripts/smoke-pagination.sh:21-30`

**Issue:** Quoting/injection safety is fine (`set -euo pipefail`, all variables quoted, no
`eval`, static route array, `BASE_URL` is an operator-supplied CLI arg not untrusted external
input). However the script only checks that the route's *first* HTTP response is 200 — it never
actually clicks through to page 2/3 or inspects the resulting `href` values, so it would not
have caught CR-01 above (the `/archiv?rolle=%7Bpage%7D` page still returns HTTP 200; only the
*links on the page* are wrong). This matches the documented purpose (catching the original RSC
serialization 500), but the SUMMARY's broader claim that this script "verhindert eine stille
Regression" for the pagination fix as a whole overstates its coverage.

**Fix (optional, not blocking):** Extend the smoke test to `grep` the rendered HTML for the
expected `href="/archiv?..."` pattern with an incrementing page number, or add a Vitest/Playwright
case that asserts the built `hrefPattern` round-trips correctly for at least one filter
combination containing the literal placeholder text.

### IN-02: `URL.createObjectURL` without matching `revokeObjectURL` in `UploadDropzone.stories.tsx`

**File:** `frontend/src/components/ui/UploadDropzone.stories.tsx:81-97`

**Issue:** `ErsetzenMitVorschauDemo` creates a new object URL on every file selection
(`URL.createObjectURL(file)`) but never revokes the previous one, leaking a blob URL per
selection for the lifetime of the Storybook tab. Out of this review's stated performance/memory
scope as a *production* concern, but flagged since it's trivially fixable and this file is a
new addition.

**Fix:** Revoke the previous URL in a `useEffect` cleanup or before creating a new one.

---

_Reviewed: 2026-11-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
