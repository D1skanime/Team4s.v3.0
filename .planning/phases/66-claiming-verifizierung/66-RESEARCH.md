# Phase 66: Claiming und Verifizierung — Research

**Recherchiert:** 2026-06-02
**Domäne:** Claim-/Verifizierungs-Flow (member_claims), Einladungslink-Mechanik, noindex-Meta-Tag, verified-Badge
**Konfidenz:** HIGH (alle relevanten Dateien direkt gelesen; keine externen Quellen nötig)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Gesperrte Entscheidungen (Locked Decisions)

- **D-01:** Beide Richtungen: Self-Service-Claim (App-User reicht ein) UND Leader-Einladung (Einladungslink). Beide münden in `member_claims`.
- **D-02:** Self-Service-Suche per Nick — App-User sucht historischen Eintrag, beansprucht Treffer.
- **D-03:** Kein Treffer → Neuanlage-Antrag → Leader/Admin-Queue.
- **D-04:** Token in neuer Tabelle `member_claim_invitations` (Vorbild: `fansub_group_invitations`/0076): `token_hash` SHA-256, `expires_at`, `status` (pending/accepted/cancelled/expired), FK auf historischen Member + Leader.
- **D-05:** Einladungslinks 7 Tage gültig.
- **D-06:** Manuelles Teilen (Discord), kein automatischer Mail-Versand V1.
- **D-07:** Einlösung über Keycloak-Account-Flow; "Empfänger hat bereits Account"-Fall → Login statt Registrierung, danach gleiche Verknüpfung.
- **D-08:** Self-Service-Claims werden von Gruppen-Leader ODER Plattform-Admins bestätigt.
- **D-09:** Nur 1 verified-Claim pro historischem Member; weitere pending-Claims bleiben sichtbar bis Leader wählt.
- **D-10:** `verification_method`: `invite_link` (Einladungslink) | `manual_review` (Self-Service bestätigt).
- **D-11:** noindex-Toggle in `me/profile` → PATCH auf `members.noindex`.
- **D-12:** Beim Verifizieren wird `noindex = false` gesetzt (D-12 überschreibt Schema-Default `true`).
- **D-13:** Verified-Status als Häkchen-Badge neben Member-Namen im öffentlichen Profil. `(historisch)`-Label entfällt bei verified.
- **D-14:** noindex wirkt nur auf robots-Meta-Tag (`noindex,nofollow`), V1 kein Sitemap-Ausschluss.
- **D-15:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten.

### Claude's Discretion

- Genaues Schema `member_claim_invitations` (Spalten, Constraints, Indizes).
- Technische Keycloak-Anbindung: Redirect-Parameter, Callback, bereits-eingeloggt-Erkennung.
- Frontend-Verortung der Claim-Queue und Neuanlage-Queue.
- Ob Nick-Suche neuen Endpunkt braucht oder bestehende Suche wiederverwendet werden kann.
- Datei-Aufteilung unter 450-Zeilen-Limit.

### Deferred (AUSSER SCOPE)

- E-Mail-Versand des Einladungslinks (SMTP Phase 60).
- Sitemap-Ausschluss bei noindex.
- Automatische Account-Erstellung ohne Keycloak-Standardflow.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Grundlage |
|----|--------------|-------------------|
| P66-SC1 | `member_claims`-Tabelle unterstützt pending/verified/rejected; App-User kann Claim einreichen. | Migration 0081 bereits vorhanden; nur Handler/Repo nötig. |
| P66-SC2 | Leader kann Einladungslink für historischen Member-Eintrag generieren; Claim wird nach Bestätigung auf `verified` gesetzt. | Neue Tabelle `member_claim_invitations` (Vorbild 0076); neuer Handler. |
| P66-SC3 | noindex-Flag pro Member-Profil einstellbar; verified-Status im öffentlichen Profil sichtbar. | `members.noindex` existiert (0081); PATCH-Endpunkt + Toggle + robots-Meta-Tag nötig. |
</phase_requirements>

---

## Zusammenfassung

Phase 66 baut auf bestehenden Migrationen auf: `member_claims` und `members.noindex` existieren bereits (Migration 0081). Es braucht **keine neuen Datenbank-Schemas für Claims** — nur Handler, Repository-Methoden und den Einladungslink-Infrastruktur-Block.

Drei Kernaufgaben:

1. **Self-Service-Claiming-Flow** (P66-SC1): Nick-Suche → Claim einreichen (POST `/api/v1/me/member-claims`) + Leader/Admin-Review (bestätigen/ablehnen). Eine neue Nick-Suche ist nötig, da kein allgemeiner öffentlicher Member-Suchendpunkt existiert.

2. **Leader-Einladungslink-Flow** (P66-SC2): Neue Tabelle `member_claim_invitations` (Migration 0092) modelliert nach `fansub_group_invitations` (0076). Einlösungsflow dockt an den bestehenden Keycloak-Account-Flow an: der Empfänger landet auf `/claim-invitations/accept?token=…` — ist er nicht eingeloggt, kommt zuerst Login/Registrierung, danach automatische Weiterleitung zurück. Das Token wird im URL-Parameter übergeben; nach Login prüft der Backend-Endpunkt `token_hash`, setzt `member_claims.claim_status = 'verified'` und `members.noindex = false` in einer Transaktion.

3. **noindex + verified-Badge** (P66-SC3): `members.noindex` existiert bereits. Nötig: PATCH `/api/v1/me/profile/noindex` (oder Erweiterung des bestehenden PUT `/api/v1/me/profile`), Toggle in `me/profile`-Seite, `generateMetadata()`-Funktion in `frontend/src/app/members/[slug]/page.tsx` mit `robots: { index: !noindex }`, verified-Badge (Häkchen) im `MemberProfileHero` und in `GroupContributionBlock`.

**Primäre Empfehlung:** Claim-Handler und Invitation-Handler als getrennte Dateien anlegen (je unter 450 Zeilen), Repository-Methoden für `member_claims` in eine dedizierte `member_claims_repository.go`, für `member_claim_invitations` in `member_claim_invitations_repository.go`.

---

## Architektur-Verantwortungskarte

| Fähigkeit | Primary Tier | Secondary Tier | Begründung |
|-----------|-------------|----------------|------------|
| Self-Service-Claim einreichen | API / Backend | — | Auth-geschützt, schreibt in `member_claims` |
| Nick-Suche (historische Member) | API / Backend | Frontend (Anzeige) | Server-seitiger ILIKE-Query auf `members.nickname` |
| Claim-Queue (Leader/Admin-Review) | API / Backend | Frontend (Manage-Area) | Berechtigungsprüfung via `permissionSvc`, Auth-Middleware |
| Einladungslink generieren | API / Backend | Frontend (Manage-Area) | Token-Erzeugung + SHA-256-Hashing, nur Backend |
| Einladungslink einlösen | API / Backend | Frontend (Accept-Seite) | Token validieren + `member_claims` + `noindex` in Transaktion |
| Keycloak-Account-Flow (Redirect/Login) | Frontend Server (SSR) | Browser / Client | URL-Parameter-Weitergabe über `?token=...`; Login-State via Keycloak-OIDC |
| noindex-Toggle | Frontend Server (SSR) + Browser | API (PATCH) | `generateMetadata()` liest `noindex` serverseitig; PATCH schreibt Backend-DB |
| robots-Meta-Tag | Frontend Server (SSR) | — | Next.js `generateMetadata()` in `members/[slug]/page.tsx` |
| verified-Badge | Frontend (Komponente) | — | Client-seitige Darstellung basierend auf API-Daten |

---

## Standard-Stack

### Kern (bestehend — kein Neuinstall nötig)

| Bibliothek | Version | Zweck | Warum Standard |
|------------|---------|-------|----------------|
| `github.com/gin-gonic/gin` | bestehend | HTTP-Framework Backend | Projektweit einheitlich |
| `github.com/jackc/pgx/v5` | bestehend | PostgreSQL-Treiber | Projektweit einheitlich |
| `crypto/sha256` + `encoding/hex` | Go stdlib | Token-Hashing (SHA-256) | Identisch zu `fansub_group_invitations_repository.go` |
| `crypto/rand` + `encoding/base64` | Go stdlib | Token-Generierung | Identisch zu `fansub_group_invitations_repository.go` |
| Next.js App Router `generateMetadata()` | bestehend (Next.js 16) | robots-Meta-Tag | Projektweit einheitlich |
| `lucide-react` | bestehend | Icons (Häkchen-Badge) | Projektweit einheitlich |

### Keine neuen Pakete erforderlich

Diese Phase installiert keine neuen NPM- oder Go-Pakete. Alle benötigten Primitiven sind im bestehenden Stack vorhanden.

---

## Package Legitimacy Audit

Keine neuen externen Pakete werden installiert. Audit entfällt.

---

## Architektur-Muster

### System-Architektur-Diagramm (Claim-Flow)

```
App-User (Browser)
  │
  ├── Self-Service-Flow
  │     GET /api/v1/me/member-search?q=Nick
  │       → members-Tabelle (ILIKE-Suche)
  │       → Ergebnis: [{member_id, nickname, ...}]
  │     POST /api/v1/me/member-claims
  │       → member_claims (claim_status='pending')
  │       ↓
  │     Leader/Admin (Claim-Queue)
  │       GET /api/v1/admin/member-claims?status=pending
  │       POST /api/v1/admin/member-claims/:id/verify  → claim_status='verified', noindex=false
  │       POST /api/v1/admin/member-claims/:id/reject  → claim_status='rejected'
  │
  └── Leader-Einladungs-Flow
        POST /api/v1/admin/fansubs/:id/group-members/:memberId/claim-invitations
          → member_claim_invitations (status='pending', token_hash=SHA256)
          → Antwort: { invite_link: "/claim-invitations/accept?token=..." }
        Leader teilt Link manuell (Discord)
          ↓
        Empfänger klickt Link
          → Frontend: /claim-invitations/accept?token=...
          → Wenn nicht eingeloggt: Redirect zu /login?return_to=/claim-invitations/accept?token=...
          → Nach Login: POST /api/v1/claim-invitations/accept { token: "..." }
            → token_hash validieren, member_claim_invitations.status='accepted'
            → member_claims INSERT (status='verified', verification_method='invite_link')
            → members.noindex = false
            (alles in einer Transaktion)

Öffentliches Profil (/members/[slug])
  → generateMetadata(): robots { index: !noindex, follow: !noindex }
  → MemberProfileHero: verified-Badge (Häkchen) wenn is_verified=true
  → GroupContributionBlock: (historisch)-Label entfällt wenn is_verified=true
```

### Empfohlene Datei-Struktur (neue Dateien)

```
database/migrations/
├── 0092_member_claim_invitations.up.sql   # neue Tabelle
├── 0092_member_claim_invitations.down.sql

backend/internal/repository/
├── member_claims_repository.go            # CRUD für member_claims
├── member_claim_invitations_repository.go # Token-Logik (analog fansub_group_invitations)

backend/internal/handlers/
├── member_claims_handler.go              # Self-Service + Admin-Queue
├── member_claim_invitations_handler.go   # Leader-Generierung + Einlösungs-Endpunkt

frontend/src/app/
├── claim-invitations/
│   └── accept/
│       └── page.tsx                      # analog invitations/accept/page.tsx
├── me/profile/
│   └── components/
│       └── ClaimStatusCard.tsx           # Claim-Status + noindex-Toggle

frontend/src/components/
├── profile/
│   └── VerifiedBadge.tsx                 # Häkchen-Badge-Komponente
```

---

## Konkrete technische Befunde

### 1. member_claim_invitations — Schema (D-04, Migration 0092) [VERIFIED: codebase]

Nächste freie Migrationsnummer: **0092** (0089, 0090 und 0091 sind belegt; per ls verifiziert).

Empfohlenes Schema, direkt modelliert nach `0076_fansub_group_invitations.up.sql`:

```sql
-- Migration 0092: Member-Claim-Einladungen (Vorbild: fansub_group_invitations, 0076)
CREATE TABLE IF NOT EXISTS member_claim_invitations (
    id                      BIGSERIAL PRIMARY KEY,
    member_id               BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    fansub_group_id         BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    token_hash              VARCHAR(64) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at              TIMESTAMPTZ NOT NULL,
    created_by_app_user_id  BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    cancelled_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_at             TIMESTAMPTZ NULL,
    cancelled_at            TIMESTAMPTZ NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_member_claim_invitations_status
        CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    CONSTRAINT chk_member_claim_invitations_token_hash_length
        CHECK (char_length(token_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_claim_invitations_pending_member
    ON member_claim_invitations (member_id)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_claim_invitations_token_hash
    ON member_claim_invitations (token_hash);

CREATE INDEX IF NOT EXISTS idx_member_claim_invitations_member_status
    ON member_claim_invitations (member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_claim_invitations_expires_at
    ON member_claim_invitations (expires_at);
```

**Unterschiede zu `fansub_group_invitations`:**
- Kein `email`-Feld (Einladung ist member_id-gebunden, nicht email-gebunden)
- `fansub_group_id` als FK (Leader-Kontext)
- Unique-Pending-Index auf `member_id` statt `(fansub_group_id, normalized_email)` — nur ein offener Einladungslink pro historischem Member gleichzeitig [ASSUMED — alternativ könnte man mehrere Pending-Links erlauben]

### 2. Keycloak-Einlösungsflow (D-07) [VERIFIED: codebase]

**Bestehender Flow (`/invitations/accept`):**

`frontend/src/app/invitations/accept/page.tsx` ist ein reiner Client-Component. Der Flow ist:
1. Seite lädt mit `?token=...` im URL
2. `useAuthSession()` prüft `hasAccessToken`
3. Falls **kein** Token → zeigt Link zu `/login`
4. Falls eingeloggt → Button "Einladung annehmen" → `POST /api/v1/invitations/accept { token }`

**Für Phase 66 geltendes Muster:**

Neue Seite `/claim-invitations/accept?token=...` (analog). Für den "noch nicht eingeloggt"-Fall: Statt statischen Login-Link eine Weiterleitung mit `?return_to=/claim-invitations/accept?token=...`, damit der User nach dem Login automatisch zurückkommt. Der Token-Parameter bleibt im URL bis zur Einlösung — er wird erst beim POST an das Backend gesendet.

**"Bereits eingeloggt"-Fall:** Wird vom bestehenden Pattern automatisch abgefangen — `hasAccessToken` ist `true`, der Button erscheint sofort. Kein Sonderfall nötig.

**Backend-Einlösung** (`POST /api/v1/claim-invitations/accept`):
- Auth-Middleware: Authenticated App-User (kein E-Mail-Match wie bei Fansub-Einladung — die Einladung ist member_id-gebunden)
- Transaktion: `member_claim_invitations` → `accepted`; `member_claims` INSERT mit `claim_status='verified'`, `verification_method='invite_link'`; `members.noindex = false`

### 3. member_claims-Lesen (resolveVerifiedMemberID) [VERIFIED: codebase]

`contributions_me_handler.go` → `resolveVerifiedMemberID()` liest direkt:

```go
SELECT member_id FROM member_claims
WHERE app_user_id = $1 AND claim_status = 'verified'
ORDER BY verified_at DESC
LIMIT 1
```

Dies zeigt: Die Invariante "nur 1 verified-Claim pro historischem Member" (D-09) wird **nicht** durch einen UNIQUE-Constraint erzwungen, sondern muss in der Claim-Bestätigungs-Logik implementiert werden. Der Backend-Handler für "Claim verifizieren" muss prüfen, ob bereits ein `verified`-Claim für diesen `member_id` existiert, bevor er einen weiteren bestätigt — und falls ja, den Versuch mit einem klar lesbaren Fehler ablehnen.

**UNIQUE(member_id, app_user_id)** ist in 0081 vorhanden — verhindert Duplikat-Claims desselben Users auf denselben Member. Verhindert aber **nicht** zwei verschiedene User, die beide denselben Member beanspruchen.

### 4. Nick-Suche (D-02) [VERIFIED: codebase]

Es gibt **keinen bestehenden allgemeinen Member-Suchendpunkt**. Vorhanden:
- `GET /members/:slug` — einzelnes öffentliches Profil
- `GET /admin/fansubs/:id/app-member-candidates?q=...` — sucht App-User (für Fansub-Mitglieder, mit fansub_group_id-Kontext)
- `repo.SearchCandidates()` in `fansub_group_app_members_repository.go` — ILIKE auf `m.nickname`

**Empfehlung:** Neuer Endpunkt `GET /api/v1/me/member-search?q=...` [ASSUMED als Name] ohne Admin-Scope. Sucht in `members.nickname` per ILIKE, gibt unverknüpfte (kein `verified`-Claim) historische Member zurück. Darf nur für eingeloggte User zugänglich sein (Auth-Middleware). Limit: 10 Ergebnisse.

Alternative wäre Wiederverwendung des Admin-Endpunkts — aber der hat fansub_group_id-Pflichtkontext und liefert App-User-Kandidaten, nicht historische Member.

### 5. noindex + robots-Meta-Tag (D-11, D-12, D-14) [VERIFIED: codebase]

**Wo ist `noindex`?**
- `members.noindex BOOLEAN NOT NULL DEFAULT true` — direkt auf der `members`-Tabelle (Migration 0081), **nicht** auf einer separaten `member_profiles`-Tabelle.
- CONTEXT.md-Referenz `member_profiles.noindex` ist irreführend; korrekt ist `members.noindex`.

**Bestehende `GetPublicMemberProfile()`-Abfrage** (Member-Profile-Repository) liest derzeit `noindex` **nicht** zurück. Sie muss erweitert werden um:
```sql
m.noindex
```

**robots-Meta-Tag in Next.js 16 App Router** [VERIFIED: codebase — Next.js 16 im Stack]:
Die Profilseite `frontend/src/app/members/[slug]/page.tsx` ist ein Server Component (kein `'use client'`). Sie muss eine `generateMetadata()` Funktion exportieren:

```typescript
// Source: Next.js App Router Metadata API [ASSUMED — nicht direkt via Context7 verifiziert, aber
// Next.js 16 App Router Docs-Wissen ist stabil; Pattern analog zu Next.js 13+]
export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()
  // noindex aus API laden
  const profile = await getMemberProfileForMeta(slug)
  if (!profile || profile.noindex) {
    return { robots: { index: false, follow: false } }
  }
  return { robots: { index: true, follow: true } }
}
```

**PATCH-Endpunkt für noindex:** Entweder separater `PATCH /api/v1/me/profile/noindex` oder Erweiterung des bestehenden `PUT /api/v1/me/profile` um ein `noindex`-Feld. Empfehlung: Erweiterung des bestehenden PATCH-Endpunkts, da weniger neue Routen.

**Toggle in `me/profile`:** Neue `NoindexToggleCard`-Komponente (oder Erweiterung von `VisibilityCard`) mit Checkbox: "Mein Profil von Suchmaschinen indexieren lassen" (checked = noindex=false).

### 6. verified-Badge (D-13) [VERIFIED: codebase]

**Wo kommt `(historisch)` her?**

Zwei Stellen:
1. `GroupContributionBlock.tsx` (L35): `{!contributor.is_verified && <span>(historisch)</span>}` — `is_verified` ist ein Feld im `PublicAnimeContribution`-Typ (schon vorhanden).
2. `MemberRoleTimeline.tsx` (L47): `entry.status === 'historical'` → `(historisch)`.

**verified-Badge beim öffentlichen Profil-Namen:**
- `MemberProfileHero.tsx` zeigt nur den Namen, noch kein verified-Badge.
- `PublicMemberProfileData` in `frontend/src/types/profile.ts` hat noch kein `is_verified`-Feld.
- Nötig: `is_verified: boolean` zu `PublicMemberProfileData` hinzufügen, `GetPublicMemberProfile()` im Repository erweitern (JOIN auf `member_claims` WHERE `claim_status='verified'`), `MemberProfileHero` Badge rendern.

**Badge-Darstellung:** `CheckCircle`-Icon aus `lucide-react` neben dem Namen — konsistent mit vorhandenem Icon-Set.

### 7. Datei-Aufteilung (450-Zeilen-Limit) [VERIFIED: codebase]

Analyse der analogen `fansub_group_invitations_repository.go`: 508 Zeilen. Für Phase 66 entstehen zwei neue Repository-Dateien — beide werden voraussichtlich unter 450 Zeilen bleiben da die Claim-Invitations einfacher sind (kein E-Mail-Feld, kein Gruppen-Membership-Seiteneffekt).

Handler-Dateien:
- `member_claims_handler.go`: Enthält Self-Service POST + Admin-Queue GET/POST-Verify/POST-Reject. Wird voraussichtlich 200–300 Zeilen.
- `member_claim_invitations_handler.go`: Leader-Generierung + Einlösungs-Endpunkt. Wird voraussichtlich 150–250 Zeilen.

Falls ein Handler-File die 450 Zeilen droht zu überschreiten: Self-Service- und Admin-Seite trennen.

---

## Nicht selbst bauen

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Token-Erzeugung (32 Byte, Base64) | Eigene Zufalls-Implementierung | `crypto/rand` + `base64.RawURLEncoding` (wie in `generateInvitationToken()`) | Bereits getested, kryptografisch sicher |
| Token-Hashing (SHA-256) | Eigene Hash-Funktion | `hashInvitationToken()` aus `fansub_group_invitations_repository.go` kopieren/wiederverwenden | Idempotent, konstante 64-Zeichen-Hex-Ausgabe |
| Token-Ablauf-Markierung | Cron-Job | Lazy-Expire beim Zugriff (wie in `expirePendingInvitations()`) | Einfacher, kein separater Prozess |
| Verified-Invariante | Datenbank-UNIQUE-Constraint allein | Anwendungslogik-Check + Transaktion | Schema hat nur UNIQUE(member_id, app_user_id), nicht "nur 1 verified per member_id" |
| robots-Meta-Tag | Custom HTTP-Header | `generateMetadata()` in Next.js App Router | Framework-Standard, serverseitig, korrekt |
| Keycloak-Account-Flow | Eigener OAuth-Flow | Bestehender `/login?return_to=...`-Redirect | Keycloak bleibt alleiniger Auth-Owner |

---

## Häufige Fallstricke

### Fallstrick 1: noindex auf `members`, nicht `member_profiles`
**Was schiefgeht:** CONTEXT.md referenziert `member_profiles.noindex` — diese Tabelle existiert nicht als eigene Tabelle. Das Feld ist direkt auf `members.noindex` (Migration 0081).
**Warum:** `member_profiles` ist im Code-Kontext ein konzeptueller Begriff für die Profile-bezogenen Spalten der `members`-Tabelle.
**Vermeidung:** Alle SQL-Abfragen und Repository-Methoden nutzen `members.noindex` direkt.

### Fallstrick 2: verified-Invariante nicht durch DB-Constraint erzwungen
**Was schiefgeht:** Zwei Admins bestätigen parallel zwei Claims auf denselben historischen Member.
**Warum:** `member_claims` hat nur UNIQUE(member_id, app_user_id), nicht "nur 1 verified per member_id".
**Vermeidung:** `VerifyClaim()`-Repo-Methode: `SELECT ... FOR UPDATE` auf member_id-Ebene + `EXISTS`-Check für bereits-verified vor dem UPDATE. Bei Konflikt: `ErrConflict` zurückgeben (HTTP 409).

### Fallstrick 3: Token im URL-Parameter persistiert in Browser-History
**Was schiefgeht:** Nach Einlösung bleibt der Token im URL und kann aus der Browser-History extrahiert werden.
**Warum:** SPA-Navigation.
**Vermeidung:** Nach erfolgreicher Einlösung: `router.replace('/me/profile')` ohne Token im URL. Token ist nach Einlösung in DB `accepted` und kann nicht nochmals verwendet werden — geringes Restrisiko.

### Fallstrick 4: `GetPublicMemberProfile()` gibt noindex nicht zurück
**Was schiefgeht:** `generateMetadata()` kann das noindex-Flag nicht lesen, weil es nicht im API-Response ist.
**Warum:** Die bestehende `GetPublicMemberProfile()`-Abfrage liest `m.noindex` nicht.
**Vermeidung:** Repository-Methode und `PublicMemberProfile`-Modell um `Noindex bool` erweitern. API-Response entsprechend ergänzen.

### Fallstrick 5: Einladungslink für Member ohne Fansub-Zugehörigkeit
**Was schiefgeht:** Leader A erstellt Einladungslink für Member, der nicht in seiner Gruppe ist.
**Warum:** Einladungs-Endpunkt ist unter `/admin/fansubs/:id/group-members/:memberId/claim-invitations` — aber der memberId-Parameter könnte aus einer anderen Gruppe stammen.
**Vermeidung:** Backend-Handler prüft: `hist_fansub_group_members.fansub_group_id = :fansubId AND member_id = :memberId` vor Token-Erzeugung. Nur Members der eigenen Gruppe können eingeladen werden.

### Fallstrick 6: Neuanlage-Antrags-Queue (D-03) — Scope-Klärung
**Was schiefgeht:** D-03 beschreibt einen "Neuanlage-Antrag" als eigenen Workflow, der im Scope von Phase 66 liegt, aber noch keine Tabelle hat.
**Warum:** Kein Migration für einen separaten `member_creation_requests`-Tisch existiert.
**Empfehlung:** Für V1 einfachste Variante: Neuanlage-Anträge als `member_claims` mit `member_id = NULL` und einem Notizfeld — kein separater Tisch nötig. [ASSUMED als Implementierungsstrategie — Planner soll mit User klären ob D-03 eine eigene Tabelle braucht oder ob Inline-Handling ausreicht]

---

## Code-Beispiele

### Token-Erzeugung und Hashing (analog bestehendem Pattern)
```go
// Source: backend/internal/repository/fansub_group_invitations_repository.go (Z. 482-493)
func generateClaimInvitationToken() (string, string, error) {
    buffer := make([]byte, 32)
    if _, err := rand.Read(buffer); err != nil {
        return "", "", err
    }
    rawToken := base64.RawURLEncoding.EncodeToString(buffer)
    return rawToken, hashClaimInvitationToken(rawToken), nil
}

func hashClaimInvitationToken(raw string) string {
    sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
    return hex.EncodeToString(sum[:])
}
```

### resolveVerifiedMemberID (bereits implementiert, zur Referenz)
```go
// Source: backend/internal/handlers/contributions_me_handler.go (Z. 39-54)
func (h *ContributionsMeHandler) resolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
    var memberID int64
    err := h.db.QueryRow(ctx, `
        SELECT member_id FROM member_claims
        WHERE app_user_id = $1 AND claim_status = 'verified'
        ORDER BY verified_at DESC
        LIMIT 1
    `, appUserID).Scan(&memberID)
    if errors.Is(err, pgx.ErrNoRows) {
        return 0, repository.ErrNotFound
    }
    return memberID, err
}
```

### Nick-Suche (neuer Query)
```go
// Source: [ASSUMED] — Muster nach fansub_group_app_members_repository.go SearchCandidates
rows, err := db.Query(ctx, `
    SELECT m.id, m.nickname, m.display_name
    FROM members m
    WHERE m.nickname ILIKE $1
      AND NOT EXISTS (
          SELECT 1 FROM member_claims mc
          WHERE mc.member_id = m.id AND mc.claim_status = 'verified'
      )
    ORDER BY m.nickname
    LIMIT 10
`, "%"+query+"%")
```

### generateMetadata für robots-Meta-Tag
```typescript
// Source: [ASSUMED — Next.js 16 App Router Metadata API, stabile Konvention seit Next.js 13]
export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()
  if (!slug) return {}
  try {
    const response = await getMemberProfile(slug)
    if ('data' in response && response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
  } catch {
    // Fallback: keine robots-Direktive (Browser-Default: index=true)
  }
  return {}
}
```

### Claim-Queue-Verify (Invariante)
```go
// Source: [ASSUMED] — Muster nach fansub_group_invitations_repository.go Accept()
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
// ...
// Prüfe ob bereits ein verified-Claim für diesen Member existiert
var alreadyVerified bool
_ = tx.QueryRow(ctx, `
    SELECT EXISTS(
        SELECT 1 FROM member_claims
        WHERE member_id = $1 AND claim_status = 'verified'
    )
`, claim.MemberID).Scan(&alreadyVerified)
if alreadyVerified {
    return nil, &ClaimMutationError{Code: "already_verified", Message: "Dieser Member-Eintrag ist bereits verifiziert.", HTTPStatus: 409}
}
// UPDATE claim_status = 'verified', verified_by = actorID, verified_at = NOW()
// UPDATE members SET noindex = false WHERE id = claim.MemberID
```

---

## State of the Art

| Alter Ansatz | Aktueller Stand | Bedeutung |
|--------------|----------------|-----------|
| Kein Claiming-Flow | Phase 66 führt vollständigen Flow ein | Alle bisherigen Contributions waren "historisch ungeprüft" |
| member_claims existiert (0081) | Noch kein Handler | Tabelle fertig, nur Anwendungslogik fehlt |
| noindex existiert (0081) | Noch kein PATCH-Endpunkt | Column fertig, Toggle fehlt |
| invitations/accept (Fansub) | Neue claim-invitations/accept Seite | Gleiches Muster, anderer Einlösungs-Effekt |

---

## Annahmen-Log

| # | Behauptung | Abschnitt | Risiko bei Falschheit |
|---|-----------|-----------|----------------------|
| A1 | Unique-Pending-Index auf `member_claim_invitations` pro `member_id` (nur 1 offener Link pro Member gleichzeitig) | Migration 0092 | Falls mehrere Pending-Links erlaubt sein sollen, Index anpassen |
| A2 | Neuanlage-Anträge (D-03) werden als `member_claims` mit `member_id = NULL` modelliert | Fallstrick 6 | Falls eigene Tabelle gewünscht, separate Migration + Handler nötig |
| A3 | Nick-Suche-Endpunkt heißt `GET /api/v1/me/member-search?q=...` | Nick-Suche | Name frei wählbar, Planner entscheidet |
| A4 | `generateMetadata()` in Next.js 16 App Router setzt `robots`-Meta-Tag korrekt | noindex | Stabiles Next.js API seit v13, sehr geringes Risiko |
| A5 | noindex-Toggle wird in bestehenden `PUT /api/v1/me/profile` integriert statt eigener Route | noindex | Falls separate Route gewünscht: `PATCH /api/v1/me/profile/noindex` |

---

## Offene Fragen

1. **D-03: Neuanlage-Antrag — eigene Tabelle oder inline?**
   - Was wir wissen: D-03 ist im Scope, keine Migrations-Vorlage existiert.
   - Was unklar ist: Ob ein einfaches Notizfeld in `member_claims` mit `member_id = NULL` ausreicht oder ob eine eigene `member_creation_requests`-Tabelle gewünscht ist.
   - Empfehlung: Planner klärt mit User vor Plan-Erstellung.

2. **Unique-Pending pro Member bei Einladungslinks — ein oder mehrere?**
   - Was wir wissen: Bei Fansub-Einladungen ist 1 pending pro E-Mail erzwungen.
   - Was unklar ist: Ob bei Member-Claim-Einladungen mehrere parallele Pending-Links erlaubt sein sollen (z. B. Leader aus 2 verschiedenen Gruppen laden denselben Member ein).
   - Empfehlung: Schema-Default "1 pending pro Member" (einfacher), aber Planner kann nach Bedarf anpassen.

3. **noindex-Erweiterung des bestehenden PUT `/me/profile` vs. separater Endpunkt?**
   - Was wir wissen: Bestehender Endpunkt existiert, ist gut integriert.
   - Empfehlung: Integration in bestehenden Endpunkt (weniger Routen).

---

## Environment Availability

Step 2.6: SKIPPED — Phase ist rein Code/Config. Keine neuen externen Dienste oder CLI-Tools erforderlich. Alle Abhängigkeiten (PostgreSQL, Go, Next.js) sind bereits im Docker-Compose-Stack vorhanden.

---

## Validation Architecture

### Test-Framework
| Eigenschaft | Wert |
|-------------|------|
| Framework (Backend) | `github.com/stretchr/testify` |
| Framework (Frontend) | Vitest 3 |
| Konfig | `frontend/vitest.config.ts` |
| Schnell-Run | `cd frontend && npm test -- --run` |
| Vollständig | `cd frontend && npm test` + Go `go test ./...` |

### Phase Requirements → Test-Map

| Req ID | Verhalten | Testtyp | Automatischer Command | Datei vorhanden? |
|--------|-----------|---------|----------------------|-----------------|
| P66-SC1 | Self-Service-Claim POST + Review | unit | `go test ./backend/internal/handlers/... -run TestMemberClaim` | ❌ Wave 0 |
| P66-SC1 | member_claims UNIQUE(member_id, app_user_id) | migration-test | bestehende Migration-Tests | ✅ (0081) |
| P66-SC2 | Einladungslink erzeugen + einlösen | unit | `go test ./backend/internal/repository/... -run TestMemberClaimInvitation` | ❌ Wave 0 |
| P66-SC2 | Token-Hash SHA-256, 64 Zeichen | unit | innerhalb obigem Test | ❌ Wave 0 |
| P66-SC3 | noindex-Toggle PATCH | unit | `go test ./backend/internal/handlers/... -run TestNoindex` | ❌ Wave 0 |
| P66-SC3 | verified-Badge im öffentlichen Profil | component | `cd frontend && npm test -- MemberProfileHero` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `backend/internal/handlers/member_claims_handler_test.go` — deckt P66-SC1
- [ ] `backend/internal/repository/member_claims_repository_test.go` — deckt P66-SC1 UNIQUE-Invariante
- [ ] `backend/internal/repository/member_claim_invitations_repository_test.go` — deckt P66-SC2
- [ ] `frontend/src/components/profile/VerifiedBadge.test.tsx` — deckt P66-SC3

---

## Sicherheitsdomäne

### Anwendbare ASVS-Kategorien

| ASVS Kategorie | Anwendbar | Standard-Kontrolle |
|----------------|----------|-------------------|
| V2 Authentication | ja | Keycloak (bestehend); alle Claim-Endpunkte hinter `authMiddleware` |
| V3 Session Management | nein | Keine Session-Änderungen |
| V4 Access Control | ja | `permissionSvc.CanForFansubGroup()` für Leader-Einladungslink; Platform-Admin für globale Claim-Queue |
| V5 Input Validation | ja | Token-Länge (64 Zeichen), claim_status CHECK Constraint, member_id positiv |
| V6 Kryptographie | ja | SHA-256 für Token-Hash (nie Klartext-Token in DB) |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Standard-Mitigierung |
|--------|--------|---------------------|
| Token-Brute-Force | Elevation of Privilege | 32-Byte-Zufallstoken (Base64) → 256-Bit-Entropie ausreichend |
| Doppelte Claim-Bestätigung (Race) | Tampering | SELECT FOR UPDATE in Transaktion + ErrConflict bei bereits-verified |
| Unbefugter Einladungslink für fremden Member | Tampering | Backend prüft `hist_fansub_group_members.fansub_group_id = :fansubId` |
| Rohtoken im Audit-Log | Information Disclosure | Nur `token_hash` persistieren; rawToken nur im Response |
| robots-Meta-Tag umgehbar durch direkten Crawl | Information Disclosure | noindex ist nur Hinweis an kooperative Crawler; kein Zugriffsschutz |

---

## Quellen

### Primär (HIGH Konfidenz — direkt aus Codebase gelesen)
- `database/migrations/0081_historical_members_identity.up.sql` — `member_claims`-Schema, `members.noindex`
- `database/migrations/0076_fansub_group_invitations.up.sql` — Einladungslink-Token-Muster
- `backend/internal/repository/fansub_group_invitations_repository.go` — Token-Erzeugung, Hashing, Accept-Flow
- `backend/internal/handlers/app_auth.go` — Keycloak-Anbindung, Handler-Konstruktions-Muster
- `backend/internal/handlers/contributions_me_handler.go` — `resolveVerifiedMemberID()`, member_claims-Lesemuster
- `frontend/src/app/invitations/accept/page.tsx` — bestehender Invitation-Accept-Flow
- `frontend/src/app/members/[slug]/page.tsx` — öffentliches Profil (Server Component, kein `generateMetadata`)
- `frontend/src/app/me/profile/page.tsx` — eigenes Profil-Form, bestehende Struktur
- `frontend/src/components/profile/MemberRoleTimeline.tsx` — `(historisch)`-Label-Logik
- `frontend/src/components/anime/GroupContributionBlock.tsx` — `is_verified`-basiertes `(historisch)`-Label
- `frontend/src/types/profile.ts` — `PublicMemberProfileData` (noch kein `is_verified`, kein `noindex`)
- `backend/cmd/server/main.go` + `admin_routes.go` — Routen-Verdrahtung
- Migrations-Nummerierung: letzte ist `0091` (anime_contributions_release_version) → nächste ist `0092` (per ls database/migrations/ verifiziert)

### Sekundär (MEDIUM Konfidenz)
- Next.js 16 App Router `generateMetadata()` API — bekanntes stabiles Pattern seit Next.js 13, [ASSUMED aus Training aber hoch verlässlich]

---

## Metadaten

**Konfidenz-Aufschlüsselung:**
- Standard-Stack: HIGH — alle Abhängigkeiten bereits im Projekt vorhanden
- Architektur: HIGH — direkt aus kanonischen Referenzdateien abgeleitet
- Fallstricke: HIGH — aus tatsächlichem Code-Lesen identifiziert
- Migration 0092: HIGH (Muster), MEDIUM (Uniqueness-Strategie = A1)

**Research-Datum:** 2026-06-02
**Gültig bis:** 2026-07-02 (stabiler Stack)
