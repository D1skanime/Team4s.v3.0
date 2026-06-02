---
phase: 64-fansub-contributions-member-dashboard-public-pages
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/member_badges_handler.go
  - backend/internal/repository/badge_repository.go
  - backend/internal/services/badge_service.go
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/app/me/contributions/page.tsx
  - frontend/src/app/members/[slug]/page.tsx
  - frontend/src/components/anime/AnimeContributionsSection.module.css
  - frontend/src/components/anime/AnimeContributionsSection.tsx
  - frontend/src/components/anime/GroupContributionBlock.module.css
  - frontend/src/components/anime/GroupContributionBlock.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/contributions/MyContributionsSection.tsx
  - frontend/src/components/contributions/VisibilityDropdown.tsx
  - frontend/src/components/fansubs/GroupLeaderTimeline.module.css
  - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
  - frontend/src/components/profile/MemberBadgeChips.tsx
  - frontend/src/components/profile/MemberRoleTimeline.tsx
  - frontend/src/components/profile/profile.module.css
  - frontend/src/lib/api.ts
  - frontend/src/types/contributions.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 64: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 64 bringt öffentliche Contribution-Seiten, ein Member-Dashboard, Badge-Verwaltung und den Fansub-Profil-Tab mit Leader-Timeline. Der Backend-Code ist solide strukturiert; die größten Probleme liegen in zwei inhaltlichen Logikfehlern: `confirmAnimeContribution` und `rejectAnimeContribution` missbrauchen das Sichtbarkeits-Endpoint als Bestätigungs-Signal, und der `BadgeService` wird instanziiert, aber die Referenz sofort verworfen, wodurch die Badge-Berechnung nie getriggert werden kann. Weitere Findings betreffen fehlerhafte Bestätigungs-/Ablehnungs-Logik in der UI, eine unsichere CORS-Konfiguration in main.go, und mehrere kleinere Qualitätsprobleme.

---

## Critical Issues

### CR-01: `confirmAnimeContribution` und `rejectAnimeContribution` sind inhaltlich falsch implementiert

**File:** `frontend/src/lib/api.ts:6909-6921`
**Issue:** `confirmAnimeContribution` ruft `patchAnimeContributionVisibility(id, true)` auf und `rejectAnimeContribution` ruft `patchAnimeContributionVisibility(id, false)` auf. Beides patcht nur das Feld `is_public_on_member_profile` auf dem Visibility-Endpoint (`PATCH /me/anime-contributions/:id/visibility`). Bestätigen und Ablehnen sind aber konzeptionell andere Aktionen als das Umschalten der öffentlichen Sichtbarkeit. Ein Benutzer, der "Ablehnen" klickt, setzt damit lediglich `is_public_on_member_profile=false` – der Contribution-Status bleibt unverändert auf `proposed` oder `draft`. Das hat zwei direkte Konsequenzen:

1. Nach dem "Ablehnen" verschwindet der Beitrag aus der pending-Liste (weil `MyContributionsSection` ihn optimistisch filtert), erscheint aber auch nicht in der confirmed-Liste — er ist dauerhaft aus der UI verschwunden, bleibt aber tatsächlich in einem `proposed`-Status in der DB.
2. Nach dem "Bestätigen" ändert sich der Status nicht auf `confirmed`, weshalb beim nächsten Seitenaufruf der Beitrag erneut in der ausstehenden Liste erscheint.

Das API-Routing in `main.go:357-358` zeigt, dass es separate Visibility-Patch-Routen für Anime- und Gruppe-Contributions gibt, aber kein explizites Confirm/Reject-Endpoint. Wenn das Backend keine solchen Endpoints hat, muss entweder der Backend-Endpoint nachgezogen werden oder die UI darf "Bestätigen/Ablehnen" nicht anbieten. Die aktuell implementierte Semantik ist inkorrekt und führt zu Datenverlust aus User-Perspektive.

**Fix:**
```typescript
// Option A: Eigene Backend-Endpoints anlegen:
// POST /api/v1/me/anime-contributions/:id/confirm
// POST /api/v1/me/anime-contributions/:id/reject
// und in api.ts:
export async function confirmAnimeContribution(id: number): Promise<void> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/me/anime-contributions/${id}/confirm`,
    { method: 'POST' }
  );
  if (!response.ok) { /* Fehlerbehandlung */ }
}

// Option B: Wenn Bestätigen/Ablehnen in Phase 64 noch nicht vorgesehen ist,
// die Buttons aus ContributionCard und MyContributionsSection entfernen.
```

---

### CR-02: `BadgeService`-Instanz wird sofort verworfen (`_ = ...`) — Badge-Berechnung nie ausgelöst

**File:** `backend/cmd/server/main.go:347`
**Issue:**
```go
_ = services.NewBadgeService(dbPool, badgeRepo)
```
Die `BadgeService`-Instanz wird mit `_` verworfen. `NewBadgeService` registriert keinen Hintergrund-Task und besitzt keine Selbst-Initialisierung — der Service macht nur dann etwas, wenn sein `ComputeAndStoreBadges`-Methode explizit aufgerufen wird. Da die Instanz nicht gespeichert wird, kann niemand die Methode aufrufen. Alle Badge-Berechnungen (`founding_member`, `historical_leader`, `long_term_member`) werden niemals ausgeführt. Die in `badge_repository.go` und `badge_service.go` implementierte Logik ist damit toter Code in der Produktion.

**Fix:**
```go
// Entweder: BadgeService als Dependency übergeben und bei hist_group_member-Mutationen aufrufen:
badgeSvc := services.NewBadgeService(dbPool, badgeRepo)
// … und an histGroupMembersHandler oder animeContributionsHandler übergeben

// Oder: Einen periodischen Hintergrund-Job hinzufügen, ähnlich wie rvmCleanupSvc:
badgeSvc := services.NewBadgeService(dbPool, badgeRepo)
go func() {
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()
    for range ticker.C {
        // recompute badges for active members
    }
}()
```

---

## Warnings

### WR-01: CORS-Wildcard erlaubt Cross-Origin-Zugriff von beliebigen Origins auf authentifizierte Endpunkte

**File:** `backend/cmd/server/main.go:398`
**Issue:** `corsMiddleware()` setzt `Access-Control-Allow-Origin: *` für alle Routen. Das bedeutet, dass jede beliebige Website CORS-Anfragen an das Backend senden kann. Da Cookies `SameSite=Lax` gesetzt sind, greift der Cookie-Schutz bei einfachen GET-Requests nicht. Mit `Access-Control-Allow-Headers: Authorization` können externe Sites darüber hinaus explizit Bearer-Tokens senden. Für ein internes Admin-System ist ein Wildcard-CORS-Header ein unnötiges Risiko.

**Fix:**
```go
// Erlaubte Origins aus Config lesen oder zumindest auf bekannte Domains beschränken:
allowedOrigins := []string{"https://team4s.example.com", cfg.FrontendBaseURL}
// und im Handler:
origin := c.Request.Header.Get("Origin")
for _, allowed := range allowedOrigins {
    if origin == allowed {
        c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
        c.Writer.Header().Set("Vary", "Origin")
        break
    }
}
```

---

### WR-02: `long_term_member`-Badge-Logik ergibt false positives für aktive Einträge ohne zeitliche Untergrenze

**File:** `backend/internal/services/badge_service.go:92-99`
**Issue:**
```sql
(joined_year IS NOT NULL AND left_year IS NULL)
```
Diese Bedingung ergibt `true` für jeden Member, der jemals einer Gruppe beigetreten ist und noch kein `left_year` hat — unabhängig davon, wie lange er Mitglied ist. Ein Member, der heute beigetreten ist und `left_year IS NULL` hat, erhält sofort das `long_term_member`-Badge. Die Intention des Kommentars lautet "mindestens 5 Jahre oder noch aktiv", aber die SQL-Logik prüft die Aktivdauer für aktive Mitglieder nicht.

**Fix:**
```sql
WHERE member_id = $1
  AND (
      (joined_year IS NOT NULL AND left_year IS NOT NULL AND left_year - joined_year >= 5)
      OR
      (joined_year IS NOT NULL AND left_year IS NULL
       AND EXTRACT(YEAR FROM NOW()) - joined_year >= 5)
  )
```

---

### WR-03: `MemberBadgeChips` ist ein Server-Component-Kandidat, aber definiert eine async-Funktion in einem Client Component — Badge-Hide schlägt lautlos fehl ohne UI-Feedback

**File:** `frontend/src/components/profile/MemberBadgeChips.tsx:33-41`
**Issue:** `handleHide` fängt Fehler, aber gibt dem Benutzer keinerlei Rückmeldung:
```typescript
} catch {
  // Fehler ignorieren — Badge bleibt sichtbar
}
```
Der Benutzer klickt "Ausblenden", das Badge verschwindet nicht (weil kein State-Update bei Fehler erfolgt) und es erscheint keine Fehlermeldung. Das ist deswegen besonders problematisch, weil nach einem erfolgreichen Hide-Call ebenfalls kein State-Update stattfindet — `visibleBadges` wird nur aus dem `badges`-Prop gefiltert, das sich nach dem API-Call nicht ändert. Das Badge bleibt nach dem Klick auf "Ausblenden" für den Rest der Seitensession sichtbar, auch wenn der API-Call erfolgreich war. `onVisibilityChanged` würde den Parent informieren, aber dieser Callback wird in `members/[slug]/page.tsx` nicht übergeben.

**Fix:**
```typescript
// 1. onVisibilityChanged in page.tsx übergeben oder lokalen State führen
// 2. Fehler dem User anzeigen:
async function handleHide(badgeId: number) {
  if (!token) return
  try {
    await patchMyBadgeVisibility(token, badgeId, 'hidden')
    onVisibilityChanged?.(badgeId, 'hidden')
    // falls kein onVisibilityChanged: lokalen State aktualisieren
  } catch {
    // Fehlermeldung anzeigen, z.B. via setState
    setError('Badge konnte nicht ausgeblendet werden.')
  }
}
```

---

### WR-04: `GroupContributionBlock` verwendet Array-Indizes als React-Keys für contributors und roles

**File:** `frontend/src/components/anime/GroupContributionBlock.tsx:28, 37`
**Issue:**
```tsx
<li key={index} className={styles.contributorItem}>
<span key={roleIndex} className={styles.roleChip}>
```
Index-Keys führen zu falschen Diff-Berechnungen beim Expand/Collapse. Wenn `expanded` sich ändert, slicet der Component die `visibleContributors`-Liste neu. Mit Index-Keys wird React die bestehenden DOM-Elemente wiederverwenden und nur Textinhalte patchen, anstatt korrekt zu mounten/unmounten. Falls zukünftig animierte Übergänge hinzugefügt werden, ist dieses Pattern garantiert kaputt.

**Fix:**
```tsx
// Contributor hat member_display_name + fansub_group_id als stabilen Key:
<li key={`${contributor.member_display_name}-${contributor.member_slug ?? index}`}>
// Role label ist stabil:
<span key={label}>
```

---

### WR-05: `getMyBadges` in api.ts swallows alle Fehler und gibt eine leere Liste zurück — 401-Fehler (nicht eingeloggt) und echte Netzwerkfehler werden gleich behandelt

**File:** `frontend/src/lib/api.ts:7004-7021`
**Issue:**
```typescript
export async function getMyBadges(authToken: string): Promise<MemberBadgesResponse> {
  try {
    const response = await authorizedFetch(...);
    if (!response.ok) {
      return { badges: [] };  // swallows 403, 500, etc.
    }
    return response.json() ...
  } catch {
    return { badges: [] };    // swallows network errors
  }
}
```
Der Kommentar "Route aus Phase 62 — falls noch nicht vorhanden" erklärt die Intention, aber in Phase 64 ist der Route definitiv vorhanden (er wird in `main.go:351` registriert und in `badge_repository.go` implementiert). Alle Fehler auf dem Badge-Endpoint werden jetzt dauerhaft versteckt, auch 500er.

**Fix:**
```typescript
// 404 tolerieren (Route noch nicht vorhanden), alles andere werfen:
if (!response.ok) {
  if (response.status === 404) return { badges: [] };
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
}
```

---

## Info

### IN-01: `badge_service.go` — `ComputeAndStoreBadges` gibt immer `nil` zurück, Signatur suggeriert aber echtes Error-Handling

**File:** `backend/internal/services/badge_service.go:31-36`
**Issue:** Die Methode hat die Signatur `func (...) ComputeAndStoreBadges(...) error` und gibt immer `nil` zurück. Fehler werden nur geloggt. Aufrufer könnten annehmen, dass ein `nil`-Return Erfolg bedeutet. Die Methode sollte entweder keinen Error-Rückgabewert haben (`func (...) ComputeAndStoreBadges(...)`) oder tatsächlich Fehler zurückgeben.

**Fix:** Signatur auf `func (s *BadgeService) ComputeAndStoreBadges(ctx context.Context, memberID int64)` ohne `error`-Return ändern.

---

### IN-02: `MyContributionsSection` enthält einen hard-codierten Stub "Beitrag vorschlagen folgt in Phase 65"

**File:** `frontend/src/components/contributions/MyContributionsSection.tsx:122-125`
**Issue:**
```tsx
<h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
  Eigene Vorschläge (0)
</h2>
<p style={{ color: '#888', fontSize: '0.9rem' }}>
  Beitrag vorschlagen folgt in Phase 65.
</p>
```
Ein interner Entwicklungshinweis ist im UI-Text für Endnutzer sichtbar. Dieser Text sollte entweder entfernt oder durch einen neutralen Platzhalter ersetzt werden.

**Fix:** Sektion entweder vollständig entfernen oder durch `<p>Diese Funktion ist noch nicht verfügbar.</p>` ersetzen.

---

### IN-03: `members/[slug]/page.tsx` liest zwei unterschiedliche Cookie-Namen für den Auth-Token aus

**File:** `frontend/src/app/members/[slug]/page.tsx:59-63`
**Issue:**
```typescript
const token = (
  cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
  cookieStore.get('access_token')?.value ||
  ''
).trim()
```
`AUTH_TOKEN_COOKIE_NAME` ist `'team4s_access_token'`. Der zweite Fallback `'access_token'` ist ein undokumentierter Legacy-Cookie-Name. Andere Server-Komponenten (z.B. `anime/[id]/page.tsx`) lesen nur `AUTH_TOKEN_COOKIE_NAME`. Die Inkonsistenz deutet auf vergessenes Cleanup hin.

**Fix:** Den zweiten Fallback entfernen und nur `AUTH_TOKEN_COOKIE_NAME` verwenden.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
