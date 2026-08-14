# 128-22 SUMMARY - Live UAT of canonical navigation, privacy & responsive delivery

**Status:** PASSED. Human live-UAT over the Windows SSH tunnel (http://127.0.0.1:3300)
against the reseeded canonical fixtures. All acceptance checks confirmed by the user.

## UAT results (all passed)
1. Public /members/sheppert (anon) - full profile composition, stored canonical URL.
2. Privacy neutrality - /members/phase128-missing, /members/2 (numeric),
   /members/sokolada (guessed), /members/csubs-leader (private, anon) all render the
   identical neutral 'Profil nicht verfuegbar' page (HTTP 404). No existence oracle (D-09).
3. Refresh-only owner preview - signed in as csubs-leader, /members/csubs-leader shows
   the private notice + full composition + edit/visibility actions, no 404/login flash.
4. Canonical redirect - /members/Sheppert (and other non-canonical casing) 308-redirects
   to the stored slug, no toast.
5. Responsive - narrow<->wide window (and high zoom): no horizontal overflow.
6. Visibility control - /me/profile?tab=visibility opens the public/private control.

## Two real defects found during completion and fixed
- fb3df4d8 - useSearchParams in /me/profile (reused by /admin/profile) lacked a Suspense
  boundary -> next build (prod) failed CSR bailout. Wrapped in <Suspense>. Dev masked it.
- 2f08952e - canonical member-slug redirect (128-14) was authored as a proxy/middleware
  module that Next 16 never loaded (wrong location), so /members/Sheppert 404'd instead of
  308. Reimplemented as a server-side permanentRedirect in the member route
  (src/lib/memberCanonicalSlug.ts + members/[slug]/page.tsx); removed the dead middleware.
  Found by check 4 of this UAT - exactly what human verification is for.

## Ops note
The authoritative production build is 'docker compose build team4sv30-frontend' (fresh
.next). Running 'docker compose exec ... npm run build' inside the dev container reuses the
polluted dev .next volume and can report spurious prerender errors (e.g. /_global-error
'React null'); those are cache artifacts, not code defects.

## Evidence
- Live: sheppert 200; missing/private/numeric/guessed 404 with identical visible content;
  Sheppert/SHEPPERT/Csubs-Leader 308 to stored slug; Nonexistent-Upper 308 (existence-independent).
- Automated: backend focused + full go test; frontend focused suites; memberCanonicalSlug (7);
  page.test.tsx (28); typecheck clean; docker prod build green.
