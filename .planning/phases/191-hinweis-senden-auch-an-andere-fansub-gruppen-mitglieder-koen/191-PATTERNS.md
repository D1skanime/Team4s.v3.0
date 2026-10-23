# Phase 191: „Hinweis senden" auch an andere Fansub-Gruppen - Pattern Map

**Mapped:** 2026-10-23
**Files analyzed:** 21 (neu oder geändert)
**Analogs found:** 21 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0187_fansub_group_hints.up.sql` (+`.down.sql`) | migration | CRUD (schema) | `database/migrations/0086_anime_contributions.up.sql` | exact |
| `backend/internal/repository/fansub_group_hints_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_proposal_repository.go` + `anime_contributions_repository.go` (`MemberBelongsToFansub`) | exact |
| `backend/internal/handlers/fansub_group_hints_me_handler.go` (Create, `POST /api/v1/me/fansub-group-hints`) | handler | request-response | `backend/internal/handlers/contribution_proposals_me_handler.go` | exact |
| `backend/internal/handlers/fansub_group_hints_review_handler.go` (Leader-List/Confirm/Reject, gruppen-gescoped) | handler | request-response | `backend/internal/handlers/contribution_review_handler.go` | exact |
| `backend/internal/handlers/admin_fansub_group_hints_handler.go` (Plattform-Admin-Liste + Confirm/Reject, `fansub_lead`-Fall) | handler | request-response | `backend/internal/handlers/admin_claims_list_handler.go` | exact |
| `backend/internal/middleware/comment_rate_limit.go` (Key-Funktion erweitern, additiv) | middleware | request-response | sich selbst (zweite `NewCommentRateLimiter`-Instanz) | exact |
| `backend/cmd/server/main.go` (Wiring: Limiter-Instanz, Routen) | config/wiring | request-response | bestehende Instanziierung Zeile 119/422 | exact |
| `shared/contracts/fansub-group-hints.yaml` | config (contract) | request-response | `shared/contracts/contributions.yaml` | exact |
| `frontend/src/hooks/useFansubGroupSearch.ts` | hook | request-response (debounced search) | inline Logik in `useEpisodeVersionEditor.ts:155-187,246-258` + Stil von `frontend/src/hooks/useDebouncedValue.ts` | role-match (Extraktion, kein 1:1-Vorbild) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` (Refactor: Hook nutzen) | hook (Call-Site) | request-response | sich selbst (reiner Umbau-Commit) | exact |
| `frontend/src/components/contributions/ProposalForm.tsx` | component (Wizard-Container) | request-response | sich selbst | exact |
| `frontend/src/components/contributions/ProposalForm.steps.tsx` (+ ggf. `ProposalForm.toggles.tsx`) | component (Wizard-Steps) | request-response | sich selbst + `Step2Role`-Radiogroup-Muster | exact |
| `frontend/src/components/contributions/MyProposalsSection.tsx` (Trigger-Gating A6) | component | request-response | sich selbst | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx` | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | exact |
| `frontend/src/app/admin/fansub-group-hints/page.tsx` | component (route entry) | request-response | `frontend/src/app/admin/claims/page.tsx` | exact |
| `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` | component | request-response | `frontend/src/app/admin/claims/ClaimsClient.tsx` | exact |
| `frontend/src/components/admin/AdminMainNav.tsx` (Nav-Eintrag) | component | request-response | sich selbst | exact |
| `frontend/src/lib/api/fansub-group-hints.ts` (neue API-Client-Funktionen) | utility (API client) | request-response | `frontend/src/lib/api/contributions-admin.ts` + `contributions-me.ts` | exact |
| `frontend/src/types/contributions.ts` (oder neue `fansub-group-hints.ts`) | model (Typdefinitionen) | request-response | `GroupProposalRow`/`MembershipEntry`-Typen in `frontend/src/types/contributions.ts` | exact |
| `docs/BACKEND_ARCHITEKTUR.md`, `docs/FRONTEND_ARCHITEKTUR.md`, `DECISIONS.md` | doc | — | bestehende Abschnitte (Rechte/Capabilities, Abschnitt 12 Hooks) | exact |
| Tests (siehe Shared Patterns → Testmuster) | test | request-response | `contribution_review_handler_test.go`, `ContributionsReviewSection.test.tsx` | exact |

## Pattern Assignments

### `backend/internal/repository/fansub_group_hints_repository.go` (repository, CRUD)

**Analog:** `backend/internal/repository/anime_contributions_proposal_repository.go` (Insert-Pattern) + `backend/internal/repository/anime_contributions_repository.go` (Ownership-Query-Stil)

**Package/Transaktions-Pattern** (`anime_contributions_proposal_repository.go:1-27`):
```go
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type ProposalInput struct {
	FansubGroupMemberID int64
	MemberID         int64
	RoleCodes        []string
	Note             *string
	StartedYear      *int
	EndedYear        *int
	ReleaseVersionID *int64
	AppUserID        int64
}
```
Für `fansub_group_hints` analog: eigener `HintInput`-Struct mit `SenderAppUserID` NIE aus Request
(siehe Security Domain in RESEARCH.md), `TargetFansubGroupID`, `HintType`, `RelatedAnimeID *int64`,
`RelatedReleaseVersionID *int64`, `RequestedRoleCode *string`, `Note *string`.

**Insert-Pattern mit Conflict-Mapping** (`anime_contributions_proposal_repository.go:46-127`):
```go
func (r *AnimeContributionsRepository) CreateProposal(ctx context.Context, fansubGroupID int64, animeID int64, input ProposalInput) (*AnimeContributionRow, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	...
	err = tx.QueryRow(ctx, `
		INSERT INTO anime_contributions (...) VALUES (...)
		RETURNING id
	`, /* params */).Scan(&newID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("vorschlag erstellen: Beitrag bereits vorhanden: %w", ErrConflict)
		}
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("vorschlag erstellen: Referenz nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("vorschlag erstellen: insert: %w", err)
	}
	...
	if err := tx.Commit(ctx); err != nil { ... }
	return r.GetByID(ctx, newID)
}
```
`CreateHint` für `fansub_group_hints` übernimmt exakt dieses Muster: `isUniqueViolation(err)` wird
zum D-04(1)-409-Pfad (Partial-Unique-Index-Verstoß → `ErrConflict`), `isForeignKeyViolation(err)`
zum 404-Pfad. Kein eigenes neues Fehler-Mapping erfinden — `ErrConflict`/`ErrNotFound` sind
bestehende Sentinel-Errors im `repository`-Package (siehe `isUniqueViolation`/`isForeignKeyViolation`
Helfer, bereits im Package vorhanden, keine Neuimplementierung).

**Ownership-/Query-Stil für Routing-Split-Reads** (`anime_contributions_repository.go:55-70`):
```go
func (r *AnimeContributionsRepository) MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error) {
	// UNION-Query gegen hist_fansub_group_members UND fansub_group_members
}
```
Für die Leser-Seite (`ListOpenByTargetGroup`, `ListOpenForFansubLeadRole`) denselben
pgx-Query-Stil (direktes `tx.QueryRow`/`db.Query`, kein ORM) übernehmen. Die beiden GET-Pfade
(Leader vs. Plattform-Admin) sind laut RESEARCH.md zwei **getrennte** Repository-Methoden mit
jeweils eigenem `WHERE`, nicht eine Methode mit Nachfilterung im Handler (Security: serverseitige
Ableitung, kein Client-Flag).

**Row-Typ-Konvention** (`anime_contributions_proposal_repository.go:29-40`):
```go
type GroupProposalRow struct {
	ID                  int64     `json:"id"`
	FansubGroupMemberID int64     `json:"fansub_group_member_id"`
	MemberDisplayName   string    `json:"member_display_name"`
	...
	CreatedAt           time.Time `json:"created_at"`
}
```
Analog: eigener `FansubGroupHintRow`-Typ mit `HintType`, `RequestedRoleCode *string`,
`SenderDisplayName`, `SenderOwnGroupName *string` (für Contract B3), `Status`, `CreatedAt`.

---

### `backend/internal/handlers/fansub_group_hints_me_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/contribution_proposals_me_handler.go`

**Interface-Abstraktion für Stub-Tests** (Zeilen 24-66):
```go
type ProposalRepository interface {
	CreateProposal(ctx context.Context, fansubGroupID, animeID int64, input repository.ProposalInput) (*repository.AnimeContributionRow, error)
	...
}
type MemberResolver interface {
	ResolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error)
}
type FansubMembershipChecker interface {
	MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error)
}
```
Für den neuen Hinweis-Handler: eigene schmale Interfaces (`HintRepository`, wiederverwendeter
`MemberResolver`) — **kein** `FansubMembershipChecker`-Zwang, weil D-02 explizit fremde Gruppen
erlaubt (das ist der entscheidende Unterschied zum Donor — den Ownership-Guard NICHT übernehmen,
siehe RESEARCH.md Anti-Patterns).

**Sicherheitskette im Handler** (Zeilen 140-187, Kommentar Zeile 139):
```go
// CreateProposal verarbeitet POST /api/v1/me/contribution-proposals.
// Sicherheitskette: Auth → Pflichtfelder → Member-Identitaet → Ownership → Rollenvalidierung → DB → Audit.
func (h *ContributionProposalsMeHandler) CreateProposal(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok { return }

	var req createProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	memberID, err := h.memberResolver.ResolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	...
}
```
Für den neuen Handler: Auth → Pflichtfelder (`hint_type`, `target_fansub_group_id`, je nach Typ
`related_anime_id`/`related_release_version_id` oder `requested_role_code`) → `ResolveVerifiedMemberID`
(unverändert wiederverwendet) → **kein** Ownership-Check (D-02 Kernänderung) → Rate-Limit ist
Middleware, nicht Handler-Code → DB-Insert mit 409/404-Mapping → kein Audit-Log-Pflicht laut
Entscheidungen (optional, Precedent vorhanden in `contribution_review_handler.go` falls gewünscht).

**sender_app_user_id NIE aus Request** (Security-Pflicht, RESEARCH.md BOLA-Pattern):
`identity.AppUserID` (aus `requireMeIdentityForProposals`) ist die einzige Quelle für
`sender_app_user_id`, exakt wie `createdBy := input.AppUserID` in
`anime_contributions_proposal_repository.go:53` aus `identity` stammt, nie aus dem Body.

---

### `backend/internal/handlers/fansub_group_hints_review_handler.go` (handler, request-response, Leader-Pfad)

**Analog:** `backend/internal/handlers/contribution_review_handler.go` (komplette Datei, 247 Zeilen)

**Autorisierungs-Pattern, 1:1 übernehmen** (Zeilen 79-100, 121-148, 181-208):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil {
	writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
	return
}
if !result.Allowed {
	auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_hint.list.denied", &fansubID, "fansub_group_hint", nil, permissions.ActionFansubGroupMembersManage, result)
	writePermissionDenied(c, result)
	return
}
```
Exakt dieselbe Capability (`ActionFansubGroupMembersManage`), kein neues Recht (D-06). Nur
`EventType`-Strings ändern (`fansub_group_hint.*` statt `anime_contribution.*`) und die
Ziel-Entity-Typen (`"fansub_group_hint"` statt `"anime_contribution"`).

**Reject mit optionalem Grund, Raw-Body-Parsing-Pattern** (Zeilen 210-221):
```go
var req rejectRequest
body, err := c.GetRawData()
if err != nil { internalError(c, "interner serverfehler"); return }
if len(strings.TrimSpace(string(body))) > 0 {
	if err := json.Unmarshal(body, &req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}
}
```
Direkt wiederverwendbar — unverändert für die Hinweis-Ablehnung mit optionaler `decision_note`.

**Confirm = reine Status-Änderung, KEIN Seiteneffekt (D-03 Unterschied zum Donor):** Der Donor
`ConfirmProposal` ruft `h.releaseCrewSvc.ConfirmContribution(...)` (Release-Crew-Zuweisung als
Seiteneffekt, Zeilen 150-152). Für `fansub_group_hints` MUSS dieser Service-Call entfallen —
Confirm setzt nur `status='acknowledged'`, `decided_by`, `decided_at` (D-03: „reine Information,
keine automatische Mitgliedschaft"). Dies ist der wichtigste strukturelle Unterschied zum Donor,
nicht nur Copy-Paste.

---

### `backend/internal/handlers/admin_fansub_group_hints_handler.go` (handler, request-response, Plattform-Admin-Pfad)

**Analog:** `backend/internal/handlers/admin_claims_list_handler.go`

**Platform-Admin-Gate + Filter-Parsing-Pattern** (Zeilen 1-89, komplett):
```go
type AdminClaimsListHandler struct {
	authzRepo capabilityAuthzRepo
	claimsRepo claimsListRepo
}

func (h *AdminClaimsListHandler) ListClaims(c *gin.Context) {
	if _, ok := requirePlatformAdminIdentity(c, h.authzRepo, ""); !ok {
		return
	}
	...
	filter := repository.ClaimListFilter{
		Limit:  parseOptionalInt(c.Query("limit")),
		Offset: parseOptionalInt(c.Query("offset")),
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filter.Status = &status
	}
	...
	rows, total, err := h.claimsRepo.ListClaims(c.Request.Context(), filter)
	...
	effectiveLimit, effectiveOffset := repository.ClampAdminListPage(filter.Limit, filter.Offset)
	c.JSON(http.StatusOK, gin.H{"data": rows, "meta": gin.H{"total": total, "limit": effectiveLimit, "offset": effectiveOffset}})
}
```
`requirePlatformAdminIdentity` ist die exakte Gate-Funktion für den D-01-Plattform-Admin-Fall
(`fansub_lead`-Rolle). Filter-Parsing-Helfer (`parseOptionalInt`, `parseOptionalPositiveID`,
`parseOptionalRFC3339`) sind bereits paketweit vorhanden/exportierbar — für die neue Liste
wiederverwenden statt neu schreiben. Die neue Liste braucht **kein** `claim_type`-Filter-Äquivalent
(jede Zeile ist per Definition `requested_role_code='fansub_lead'`, siehe UI-SPEC C3).

**Confirm/Reject für den Admin-Pfad:** Gleiche Statuslogik wie im Leader-Handler
(`fansub_group_hints_review_handler.go`), aber Autorisierung über `requirePlatformAdminIdentity`
statt `CanForFansubGroup`. Erwägenswert: gemeinsame private Helper-Funktion
`decideFansubGroupHint(ctx, repo, hintID, actorAppUserID, note)` in einer dritten, kleinen Datei,
von beiden Handlern aufgerufen — vermeidet Code-Duplikat zwischen Leader- und Admin-Pfad (nicht im
Donor-Code vorgezeichnet, aber laut CLAUDE.md-Modularitätsregel sinnvoll).

---

### Rate-Limit (D-04(2)) — `backend/internal/middleware/comment_rate_limit.go` + `main.go`

**Analog:** sich selbst — zweite Instanz, kein neuer Mechanismus.

**Bestehende Instanziierung** (`comment_rate_limit.go:56`, `main.go:119,422`):
```go
// main.go:119
commentCreateLimiter := middleware.NewCommentRateLimiter(redisClient, 5, time.Minute)
// main.go:422
middleware.CommentCreateRateLimitMiddleware(commentCreateLimiter),
```
**Für D-04(2), Key-Problem:** `CommentCreateRateLimitMiddleware` (Zeile 116-162) bindet hart an
`c.ClientIP()` (Zeile 118). Es gibt **keinen** Parameter für eine alternative Key-Funktion.
Benötigt wird additiv entweder (a) eine neue Funktion `AppUserRateLimitMiddleware(limiter *CommentRateLimiter)`,
die nach `AuthMiddleware` in der Chain sitzt und `identity.AppUserID` als Key nutzt (Signatur-Kopie
von `CommentCreateRateLimitMiddleware`, nur `key := c.ClientIP()` → `key := strconv.FormatInt(identity.AppUserID, 10)`),
oder (b) die bestehende Funktion um eine `keyFn func(*gin.Context) string`-Parameter-Variante
erweitern (additiv, Default bleibt `c.ClientIP()` für den bestehenden Kommentar-Call-Site — siehe
RESEARCH.md Open Question 1, Planer muss entscheiden). `CommentRateLimiter.Allow` selbst (Zeilen
81-112) ist bereits generisch über den `key`-Parameter und braucht **keine** Änderung.
```go
fansubHintDailyLimiter := middleware.NewCommentRateLimiter(redisClient, 10, 24*time.Hour)
```
Degraded-Modus (Zeilen 119-133, fail-open bei Redis-Ausfall) wird unverändert mitgeerbt — laut
D-04/RESEARCH.md Pitfall 3 explizit akzeptiert, DB-Unique-Index ist der Backstop.

---

### `shared/contracts/fansub-group-hints.yaml` (config, Contract)

**Analog:** `shared/contracts/contributions.yaml`

**Datei-Kopfstruktur** (Zeilen 1-17):
```yaml
openapi: 3.0.3
info:
  title: Team4s Contributions API
  version: 1.0.0
  description: |
    OpenAPI contract for member contribution proposal and leader review endpoints.
    Phase 65: member-vorschläge-review-queue.

tags:
  - name: Contributions
    description: Member contribution proposals and review queue endpoints.

paths:
  /api/v1/me/memberships:
    get:
      tags: [Contributions]
      summary: List own group memberships
      description: ...
      operationId: getMyMemberships
      security:
        - bearerAuth: []
      responses:
        "200": { ... }
        "401": { ... examples mit deutschen Fehlermeldungen ... }
```
Neue Datei `fansub-group-hints.yaml` mit eigenem `tags: [FansubGroupHints]`, Pfaden
`/api/v1/me/fansub-group-hints`, `/api/v1/admin/fansubs/{id}/group-hints(/{hid}/confirm|reject)`,
`/api/v1/admin/fansub-group-hints(/{hid}/confirm|reject)`, Schemas `FansubGroupHint`,
`CreateFansubGroupHintRequest`, `ErrorResponse`-Referenz wiederverwendet (nicht neu definieren).
Deutsche `description`-Blöcke mit 409/429-Beispielen (D-04). Eintrag im Dach-`openapi.yaml`
ergänzen (D-08-Pflicht).

---

### `frontend/src/hooks/useFansubGroupSearch.ts` (hook, request-response, Debounced Search)

**Analog:** inline Logik in `useEpisodeVersionEditor.ts:155-187` (Debounce-Suche) +
`:246-258` (`addGroup`/`removeGroup`), Platzierungs-Stil `frontend/src/hooks/useDebouncedValue.ts`
(bereits zentral, zeigt die projektübliche Hook-Datei-Form: schmale `.ts`-Datei, kein `.tsx`, kein
eigenes CSS).

**Zu extrahierende Debounce-Suche** (`useEpisodeVersionEditor.ts:155-187`):
```typescript
useEffect(() => {
  const query = groupQuery.trim()
  if (!hasAuthSession || query.length < 1) {
    setGroupResults([])
    setSearchMessage(null)
    setIsSearching(false)
    return
  }

  let cancelled = false
  const timeoutID = window.setTimeout(async () => {
    setIsSearching(true)
    setSearchMessage(null)
    try {
      const response = await getFansubList({ q: query, page: 1, per_page: 10 })
      if (cancelled) return

      const selectedIDs = new Set(selectedGroups.map((group) => group.id))
      const nextResults = response.data.filter((group) => !selectedIDs.has(group.id))
      setGroupResults(nextResults)
      if (nextResults.length === 0) setSearchMessage('Keine passende Gruppe oder kein passender Alias gefunden.')
    } catch (error) {
      if (!cancelled) setSearchMessage(formatError(error))
    } finally {
      if (!cancelled) setIsSearching(false)
    }
  }, 180)

  return () => {
    cancelled = true
    window.clearTimeout(timeoutID)
  }
}, [groupQuery, hasAuthSession, selectedGroups])
```
Signatur nach UI-SPEC A1: `useFansubGroupSearch({ excludeIds }) → { query, setQuery, results,
isSearching, message, addGroup, removeGroup }`. `excludeIds: number[]` ersetzt das bisher inline
berechnete `selectedIDs`-Set — Call-Site übergibt `ownGroups.map(g => g.fansub_group_id)` (im
Formular, "Andere Gruppe") bzw. `selectedGroups.map(g => g.id)` (im Release-Editor, unverändertes
Verhalten). **Kein Verhaltensunterschied** zum bestehenden Call-Site nach der Extraktion — reiner
Umbau-Commit zuerst, danach die Nutzung im Hinweis-Formular als separater Commit.

**`addGroup`/`removeGroup`** (`useEpisodeVersionEditor.ts:246-258`):
```typescript
function addGroup(group: FansubGroup) {
  setSelectedGroups((current) => {
    if (current.some((item) => item.id === group.id)) return current
    return [...current, { id: group.id, slug: group.slug, name: group.name, logo_url: group.logo_url }]
  })
  setGroupQuery('')
  setGroupResults([])
  setSearchMessage(null)
}

function removeGroup(groupID: number) {
  setSelectedGroups((current) => current.filter((group) => group.id !== groupID))
}
```
Im Hook wird `selectedGroups`-State intern im Hook selbst gehalten ODER der Hook bleibt zustandslos
bezüglich der Auswahl (nur Suche liefert Kandidaten, Auswahl-State bleibt Sache der Call-Site) —
Planungsentscheidung, UI-SPEC legt nur die externe Signatur fest, nicht die interne Aufteilung.

---

### `frontend/src/components/contributions/ProposalForm.steps.tsx` (component, Wizard-Steps)

**Analog:** `Step2Role`-Radiogroup-Muster für die zwei neuen Toggles (Hinweisart, Gruppen-Bereich).

**Radiogroup-Button-Pattern** (Zeilen 205-235):
```tsx
export function Step2Role({ roleDefinitions, selectedRoleCode, roleError, ownGroups, onSelectRole }: Step2Props) {
  return (
    <FormField label="Welche Rolle soll geprüft werden?" error={roleError ?? undefined} required>
      <div role="radiogroup" aria-label="Rolle auswählen" className={styles.rolePicker}>
        {roleDefinitions.map((role) => {
          const selected = selectedRoleCode === role.code
          return (
            <button
              key={role.code}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? styles.roleChoiceActive : styles.roleChoice}
              onClick={() => onSelectRole(role.code)}
              disabled={ownGroups.length === 0}
            >
              {selected ? <Check size={15} aria-hidden="true" /> : null}
              <span>{role.label_de}</span>
            </button>
          )
        })}
      </div>
    </FormField>
  )
}
```
UI-SPEC A2/A3 verlangt exakt dieses Muster für `HintTypeToggle` (zwei Buttons: „Korrektur-Hinweis"/
„Anfrage für Mitgliedschaft") und `GroupScopeToggle` (zwei Buttons: „Eigene Gruppe"/„Andere Gruppe"),
jeweils mit `role="radiogroup"`/`role="radio"`/`aria-checked`/`Check`-Icon-wenn-aktiv — keine neue
Visual-Komponente erfinden.

**`ChoiceSelect`-Suchergebnis-Muster NICHT für die neue Fremd-Gruppen-Suche verwenden** —
UI-SPEC stellt klar: `ChoiceSelect` (Zeilen 40-113) bleibt für die bestehenden Eigene-Gruppe/Anime-
Picks, die neue Fremd-Gruppen-Suche nutzt den `Input` + Result-Button-List-Stil aus
`FansubGroupsSection.tsx` (siehe A1/A3 oben) über den neuen Hook.

**Datei-Split bei Zeilenüberschreitung (A7):** Falls `.steps.tsx` (aktuell 324 Zeilen) durch die
zwei neuen Toggles + Rollenfeld über 450 Zeilen wächst, die beiden Toggles in eine eigene
`ProposalForm.toggles.tsx` auslagern — reiner Umbau-Commit vor der inhaltlichen Änderung
(CLAUDE.md-Split-Regel).

---

### `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx` (component)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` (ganze Datei,
255 Zeilen) — Copy-and-relabel-Reuse laut UI-SPEC Component Contract B, keine neue Visual-Komponente.

**Composition-Gerüst, 1:1 übernehmen** (Zeilen 37-65, 119-137):
```tsx
export function ContributionsReviewSection({ fansubId, capabilities }: ContributionsReviewSectionProps) {
  if (!capabilities.can_manage_members) return null
  return <ContributionsReviewSectionInner fansubId={fansubId} />
}

function ContributionsReviewSectionInner({ fansubId }: { fansubId: number }) {
  const [proposals, setProposals] = useState<ProposalWithStatus[]>([])
  ...
  const loadProposals = useCallback(async () => {
    try {
      setIsLoading(true); setError(null)
      const resp = await listGroupProposals(fansubId, undefined)
      setProposals(resp.data)
    } catch (err) {
      setError(readErrorMessage(err, 'Vorschläge konnten nicht geladen werden. Seite neu laden.'))
    } finally { setIsLoading(false) }
  }, [fansubId])
  ...
  return (
    <Card variant="section" className={styles.reviewSection}>
      <Toolbar leading={<SectionHeader title={...} description={...} />} trailing={<Button ...>Nur offene anzeigen</Button>} />
      {visibleProposals.length === 0 ? <EmptyState ... /> : <div className={styles.cardStack}>{visibleProposals.map(...)}</div>}
    </Card>
  )
}
```
Datenquelle wird `listGroupHints(fansubId)` statt `listGroupProposals`; `confirmProposal`/
`rejectProposal` werden `confirmHint`/`rejectHint`. Alle Copy-Strings aus UI-SPEC Component
Contract B2-Tabelle übernehmen (z. B. „Hinweis bestätigen" statt „Vorschlag bestätigen" — bewusst
andere Copy wegen D-03, siehe UI-SPEC-Begründung).

**Reject-Expansion inkl. `aria-label`-Pflicht** (Zeilen 197-222, `X`-Icon ohne `aria-label` im
Donor — UI-SPEC verlangt für den neuen Code explizit `aria-label="Ablehnung abbrechen"` auf dem
`X`-Icon, das ist eine Verbesserung gegenüber dem Donor, nicht reines Copy-Paste):
```tsx
<Button variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectNote('') }}>
  Abbrechen
</Button>
```
(Donor nutzt Text-Button „Abbrechen", kein reines Icon — UI-SPEC-Pflicht für den `X`-Icon-Fall
betrifft primär Contract C, wo der `X` als alleinstehendes Icon vorkommt; für B bleibt der
Text-Button-Stil erhalten, falls so umgesetzt.)

---

### `frontend/src/app/admin/fansub-group-hints/page.tsx` + `FansubGroupHintsAdminClient.tsx` (component)

**Analog:** `frontend/src/app/admin/claims/page.tsx` (15 Zeilen, komplett) + `ClaimsClient.tsx`
(369 Zeilen, strukturelles Vorbild für Composition — Tabelle/Mobile-Card/Filter/Modal).

**Page-Wrapper, 1:1 übernehmen** (`claims/page.tsx`, komplett):
```tsx
import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'
import { ClaimsClient } from './ClaimsClient'

export const dynamic = 'force-dynamic'

export default function AdminClaimsPage() {
  return (
    <PlatformAdminGate>
      <main>
        <ClaimsClient />
      </main>
    </PlatformAdminGate>
  )
}
```
Neue Datei `page.tsx` identisch, nur `ClaimsClient` → `FansubGroupHintsAdminClient`, `<h1>Hinweise
(Leitung)</h1>` statt `<h1>Claims</h1>` (UI-SPEC C3, plain unstyled `<h1>`, keine neue Komponente).

**Filter/Table/Mobile-Card-Komposition:** `ClaimsClient.tsx` wurde nicht volltext gelesen (369
Zeilen, Budget-Grenze dieser Pattern-Map eingehalten) — der Planner/Executor soll beim
Implementieren gezielt die Abschnitte Filter-State, `useIsMobile`-Verzweigung, Tabellen-Render und
`ClaimDecisionImpactPanel`-Ersatz (→ einfacher `Modal` laut UI-SPEC C3) lesen. Strukturelle
Eckpunkte stehen bereits vollständig in `191-UI-SPEC.md` Component Contract C (Tabelle mit
Spalten-Mapping, Reject-Modal-Textarea-Pattern analog zu Contract B).

---

### `frontend/src/components/admin/AdminMainNav.tsx` (component, Nav)

**Analog:** sich selbst — additive Zeile.

**Bestehende Nav-Liste, komplette Datei (26 Zeilen):**
```tsx
const ADMIN_NAV_LINKS = [
  { label: 'Benutzer', href: '/admin/users' },
  { label: 'Gruppen', href: '/admin/groups' },
  { label: 'Rollen', href: '/admin/roles' },
  { label: 'Claims', href: '/admin/claims' },
  { label: 'Änderungen', href: '/admin/changes' },
]
```
Ein Eintrag `{ label: 'Hinweise (Leitung)', href: '/admin/fansub-group-hints' }` anhängen (UI-SPEC
C2) — keine Render-Logik-Änderung nötig, `belongsToRightsModule`/aktiver Zustand funktionieren
automatisch über die Array-Erweiterung.

---

## Shared Patterns

### Capability-Autorisierung (gruppen-gescoped)
**Source:** `backend/internal/handlers/contribution_review_handler.go:79-100`
**Apply to:** `fansub_group_hints_review_handler.go` (alle drei Endpunkte: List/Confirm/Reject)
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed { writePermissionDenied(c, result); return }
```
Kein neues Capability-Recht (D-06) — exakt `ActionFansubGroupMembersManage` wiederverwenden.

### Platform-Admin-Gate
**Source:** `backend/internal/handlers/admin_claims_list_handler.go:43` (`requirePlatformAdminIdentity`)
**Apply to:** `admin_fansub_group_hints_handler.go` (alle Endpunkte)

### Member-Identität auflösen
**Source:** `backend/internal/handlers/contribution_proposals_me_handler.go:161` (`ResolveVerifiedMemberID`)
**Apply to:** `fansub_group_hints_me_handler.go` — unverändert wiederverwendbares Interface
`MemberResolver`, kein neuer Auflösungsweg.

### Error-Response-Format (Backend)
**Source:** durchgängig in allen gelesenen Handlern
```go
c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "..."}})
```
**Apply to:** alle neuen Handler-Dateien — einheitliches `{"error": {"message": "..."}}`-Envelope,
kleingeschriebene deutsche Fehlermeldungen (Projektkonvention, nicht groß wie UI-Copy).

### Frontend-Error-Lesen
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx:29-33`
```tsx
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```
**Apply to:** `FansubGroupHintsReviewSection.tsx`, `FansubGroupHintsAdminClient.tsx`,
`ProposalForm.tsx` (dort bereits per `ApiError`/`err.status === 409`-Branch vorhanden, Zeilen
213-219 — gleiches Muster für den neuen 429-Fall ergänzen).

### API-Client-Fehlerbehandlung
**Source:** `frontend/src/lib/api/contributions-admin.ts:215-240` (`listGroupProposals`)
```typescript
const response = await authorizedFetch(`${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals`, { cache: "no-store", authToken })
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
return response.json() as Promise<GroupProposalsResponse>
```
**Apply to:** neue `frontend/src/lib/api/fansub-group-hints.ts` — `listGroupHints`, `confirmHint`,
`rejectHint`, `createFansubGroupHint`, `listAdminFansubGroupHints` folgen demselben
fetch→check→parse→throw/return-Gerüst.

### Rate-Limit-Mechanik (nicht neu bauen)
**Source:** `backend/internal/middleware/comment_rate_limit.go:56-112`
**Apply to:** `fansub_group_hints_me_handler.go`-Route in `main.go` — zweite
`NewCommentRateLimiter`-Instanz, Key = `AppUserID`, Limit=10, Window=24h (siehe Pattern-Abschnitt
oben für das Key-Funktions-Problem).

### Testmuster (Teststil-Pflicht aus CLAUDE.md)
**Source:** `backend/internal/handlers/contribution_review_handler_test.go`,
`frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx`
**Apply to:** alle neuen Backend-Handler/Repository-Tests (httptest + Fake-Repo, Statuscode +
Body-Assertion) und Frontend-Hook-/Formular-Logik-Tests (kein Render-/Klick-Simulation-Test für
reine Logik, siehe `191-RESEARCH.md` Validation Architecture Wave-0-Gaps-Liste).

## No Analog Found

Keine — jede identifizierte Datei hat einen konkreten Analog im Repo gefunden (teils exaktes
Vorbild, teils Extraktion aus bestehender inline-Logik beim Hook).

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/middleware/`, `backend/internal/permissions/`, `backend/cmd/server/`,
`database/migrations/`, `shared/contracts/`, `frontend/src/app/admin/`,
`frontend/src/components/contributions/`, `frontend/src/components/admin/`, `frontend/src/hooks/`,
`frontend/src/lib/api/`
**Files scanned (read):** 16 (Backend: 6, Frontend: 8, Migration: 1, Contract: 1)
**Pattern extraction date:** 2026-10-23
