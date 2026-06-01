# Phase 62: Fansub Contributions Admin-API — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Fansub Contributions & Gruppenhistorie, 2026-06-01)
**Depends on:** Phase 61 (Datenmodell)

<domain>
## Phase Boundary

Diese Phase implementiert ausschließlich Backend-Repositories und HTTP-Handler.
Kein Frontend. Kein Migration-Code (kommt aus Phase 61).

Ziel: Admin-API für Leader-Workflow + Public-Routen für Archive-Page + Me-Routen für Member.

</domain>

<decisions>
## Implementation Decisions

### Routen-Stil (LOCKED — Team4s-Konvention)

Admin-Routen unter `/api/v1/admin/fansubs/:id/...` — bestehender Stil, niemals neu erfinden.

```
GET/POST   /api/v1/admin/fansubs/:id/group-members
PATCH/DEL  /api/v1/admin/fansubs/:id/group-members/:memberId

GET/POST   /api/v1/admin/fansubs/:id/member-roles
PATCH/DEL  /api/v1/admin/fansubs/:id/member-roles/:roleId

GET/POST   /api/v1/admin/fansubs/:id/anime/:animeId/contributions
PATCH/DEL  /api/v1/admin/fansubs/:id/anime/:animeId/contributions/:contributionId

GET/PATCH  /api/v1/admin/fansubs/:id/history
```

Me-Routen:
```
GET   /api/v1/me/anime-contributions
GET   /api/v1/me/group-contributions
PATCH /api/v1/me/anime-contributions/:contributionId/visibility
PATCH /api/v1/me/group-contributions/:contributionId/visibility
```

Public-Routen (KEIN /public-Prefix — Team4s-Konvention):
```
GET /api/v1/fansubs/:id/contributions
GET /api/v1/anime/:id/contributions
GET /api/v1/members/:slug/contributions
```

### Contributions, nicht Contributors (LOCKED)

Der Begriff `contributors` wird nicht als Route eingeführt. Eine Contribution ist mehr als eine Person — sie enthält Kontext, Rolle, Zeitraum, Status, Sichtbarkeit.

### Identity-Anker: hist_fansub_group_members (LOCKED)

Alle Contributions hängen an `hist_fansub_group_members.id`. Kein direktes `app_user_id` in Contributions. Die Verbindung App-User → Member läuft über `member_claims`.

### Sichtbarkeit in Public-Routen (LOCKED)

Public-Routen geben nur Einträge zurück, bei denen:
- `anime_contributions.is_public_on_anime_page = true` (für /anime/:id/contributions)
- `anime_contributions.is_public_on_member_profile = true` (für /members/:slug/contributions)
- `hist_fansub_group_members.visibility = 'public'` (für Gruppe)
- `members.noindex = false` wird NICHT als Filter verwendet — noindex ist für Suchmaschinen, nicht für API

### Auth-Middleware (LOCKED)

Admin-Routen: bestehende Fansub-Leader-Middleware (prüft ob User Leader der Gruppe ist).
Me-Routen: bestehende Auth-Middleware (eingeloggt).
Public-Routen: keine Auth.

### Handler-Muster (LOCKED)

Bestehender Gin-Handler-Stil. Kein neues Framework, keine neue Abstraktion. Dependency-Injection wie in `backend/cmd/server/main.go`. Repositories werden mit DB-Pool-Handle instanziiert.

### Rollen-Validierung (LOCKED)

Beim POST/PATCH von Contributions: role_code muss in role_definitions existieren UND der context muss passen (`anime_contribution` für anime_contribution_roles, `group_history` für member-roles). Validierung im Handler-Layer.

### Paginierung

Public-Routen geben maximal 50 Einträge zurück. Kein Cursor-Paging im MVP — einfaches LIMIT.

### Claude's Discretion

- Exakte Repository-Methoden-Signatur (analog zu bestehenden Repositories prüfen)
- Error-Wrapping (bestehender Stil aus anderen Handlers übernehmen)
- Response-DTOs: inline Structs oder eigene Typen (analog zu Phase 45/46 prüfen)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Phase 61 Datenmodell (Fundament dieser Phase)
- `.planning/phases/61-fansub-contributions-datenmodell/61-CONTEXT.md` — Tabellennamen, Feldnamen, Constraints
- `.planning/phases/61-fansub-contributions-datenmodell/61-01-PLAN.md` — members, member_claims, hist_fansub_group_members
- `.planning/phases/61-fansub-contributions-datenmodell/61-02-PLAN.md` — hist_group_member_roles, role_definitions
- `.planning/phases/61-fansub-contributions-datenmodell/61-03-PLAN.md` — anime_contributions, anime_contribution_roles

### Bestehende Handler als Pattern-Referenz
- `backend/internal/handlers/` — bestehender Gin-Handler-Stil
- `backend/internal/repository/` — bestehender Repository-Stil
- `backend/cmd/server/main.go` — Dependency-Injection-Muster

### Bestehende Fansub-Routen (Namenskonvention)
- `backend/internal/handlers/fansub_handler.go` (oder ähnlich) — bestehende /admin/fansubs/:id Routen
- `shared/contracts/openapi.yaml` — bestehender Contract-Stil

### Projektkonventionen
- `CLAUDE.md` — max 450 Zeilen pro Datei, deutschen UI-Text mit Umlauten

</canonical_refs>

<specifics>
## Specific Ideas

### Response-Struktur für Anime-Contributions (öffentlich)

```json
{
  "contributions": [
    {
      "member_display_name": "Sora",
      "member_slug": "sora",
      "roles": ["translator", "editor"],
      "started_year": 2004,
      "ended_year": 2006,
      "is_verified": true
    }
  ]
}
```

### Request-Body für POST anime-contribution

```json
{
  "fansub_group_member_id": 42,
  "role_codes": ["translator", "editor"],
  "started_year": 2004,
  "ended_year": 2006,
  "note": "",
  "is_public_on_anime_page": false,
  "is_public_on_member_profile": false
}
```

### Rollen-Validierung

Vor INSERT in anime_contribution_roles: `SELECT 1 FROM role_definitions WHERE code = $1 AND 'anime_contribution' = ANY(contexts)` — wenn kein Ergebnis: 422 Unprocessable Entity.

</specifics>

<deferred>
## Deferred Ideas

- contribution-proposals Route (POST /me/contribution-proposals) — kommt in Phase 65
- GET /admin/fansubs/:id/contribution-proposals — kommt in Phase 65
- Vollständige OpenAPI-Dokumentation aller neuen Routen — kann in dieser Phase als Grundgerüst entstehen, vollständige Dokumentation in Phase 64
- Claiming-Routen — Phase 66

</deferred>

---

*Phase: 62-fansub-contributions-admin-api*
*Context gathered: 2026-06-01 aus moderierter Produktdiskussion*
