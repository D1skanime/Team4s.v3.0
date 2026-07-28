# Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) - Research

**Researched:** 2026-07-28
**Domain:** Abgeleitete Member-Badge-Projektionen (Go/pgx Repository-Read + Next.js/React Rendering) über bestehendem Punkte-/Contribution-Fundament
**Confidence:** HIGH (fast alle Kernaussagen sind gegen realen Code/Schema per Read/Grep verifiziert; die verbleibenden Unsicherheiten sind Definitions-/Politik-Entscheidungen, nicht technische Unbekannte)

<user_constraints>
## User Constraints (from 113-CONTEXT.md)

### Locked Decisions

**D-01 Gemeinsames Prinzip (alle drei Familien)**
- B/S/G sind Stufen **einer** zählbaren, wiederholbaren Leistung (kein zusätzliches Meilenstein-Naming wie bei Typ 2).
- Rein abgeleitet aus vorhandenen Daten; **kein neuer Buchungs-/Pflegepfad**, keine Punkte fürs Badge.
- **Live-Projektion:** Fällt die Zahl durch Storno/Entfernen unter eine Schwelle, **stuft das Badge zurück**.
- Jeweils **netto** gezählt (storniert / gelöscht / zurückgezogen zählt nicht).

**D-02 Familie 1 — „Vollständig mitgetragene Projekte" (1 / 5 / 15)**
- Zählbasis: Anzahl Projekte, die der Member durchgängig mitgetragen hat.
- Ein Projekt zählt, wenn der Member zu JEDEM Release des Projekts in mindestens einer seiner Rollen beigetragen hat (Upload, QC/Test o. ä.). Lückenlose Beteiligung über alle Releases.
- Datenquelle: `release_role_work`-Buchungen (Phase 108/109-Ledger), netto.
- **Bewusst KEINE Story-/Medien-Bedingung.** (Roadmap-Idee „Story + Release + Medien" verworfen.)

**D-03 Familie 2 — „Chronist" (10 / 50 / 150)**
- Zählbasis: alle eigenen Notiz-/Text-Beiträge des Members, veröffentlicht/aktiv.
- „Akzeptiert" = veröffentlicht/aktiv genügt — **kein formaler Review-/Freigabe-Gate**. Netto.
- Bewusst **breiter** als `project_text_first_author`-Punkt-Credit.
- Member-Story (eigenes Profil) ist KEIN Beitrag.

**D-04 Familie 3 — „Bildarchivar" (10 / 50 / 150)**
- Zählbasis: Anzahl beigetragener Bilder GESAMT (jede `release_version_media`-Zeile), nicht distinct Release-Versionen.
- Gate: aktiv/vorhanden genügt — jedes hochgeladene, nicht (soft-)gelöschte Bild, **unabhängig von review_status/Sichtbarkeit**. Netto.
- Datenquelle: `release_version_media` über `uploaded_by_user_id → Member`. Kein Ledger.
- Scope: `release_version_media` only. `fansub_group_media` NICHT Teil.

**D-05 Anzeige & Gruppierung**
- Neue Gruppe „Beiträge" in der „Auszeichnungen"-Sektion, getrennt von „Fortschritt" und „Rollen".
- Pro Familie nur die höchste erreichte Stufe.
- Immer sichtbar wenn erreicht — **kein Sichtbarkeits-Toggle** (Abweichung von persistierten `member_badges`).

### Claude's Discretion
- Badge-Codes/Labels/Icons/Palette (Lucide-Platzhalter, Bronze/Silber/Gold-Farbgebung). Label Familie 1 → „vollständig mitgetragene Projekte" o. ä.
- Ableitungsort: Frontend-Ableitung vs. schmaler Backend-Read (Hinweis: schwerere Aggregationen → wahrscheinlich Backend-Read).
- Rendering-Konsistenz zum Phase-112-Derived-Badge-Muster. Platzhalter-Icons ohne Logikänderung tauschbar.

### Deferred Ideas (OUT OF SCOPE)
- Weitere Badge-Kategorien über Typ 1–3 + diese drei hinaus.
- Bildarchivar als distinct Release-Versionen (verworfen zugunsten „Anzahl Bilder gesamt").
- Review-/Freigabe-gebundene Chronist-Zählung (verworfen).
- Echte Episoden-Granularität für volumenbasierte Familien.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAM-04 | Badges als getrennte, abgeleitete Projektion; keine Punkte für Selbstpflege; `member_badges` bleibt getrennte Projektion | Alle drei Familien werden als **read-time synthetische `PublicMemberBadge` mit `ID:0`** emittiert (nie in `member_badges` geschrieben), exakt wie die bereits gelieferten `role_entry_*`- und `role_volume_*`-Badges (Phase 110/112). Kein neuer Buchungspfad, kein `UpsertMemberBadge`-Aufruf. Siehe „Architecture Patterns" + „Don't Hand-Roll". |
</phase_requirements>

## Summary

Diese Phase ist **kein neues Datenfundament** — sie ist eine dritte Runde read-time abgeleiteter Badges auf einem Muster, das Phase 110 (`role_entry_*`) und Phase 112 (`role_volume_*`) bereits vollständig etabliert und live geschaltet haben. Alle benötigten Tabellen, Autor-Seams und Netto-/Storno-Semantiken existieren und sind im Code in Betrieb. Der Kern der Arbeit ist: pro Familie **eine member-gefilterte SQL-Aggregation** schreiben, das Ergebnis durch eine reine Go-Schwellenfunktion in „höchste erreichte Stufe" übersetzen, das Ergebnis als synthetisches `PublicMemberBadge` an `profile.PublicBadges` anhängen, und im Frontend eine neue Gruppe „Beiträge" plus Presentation-Einträge ergänzen.

Die drei Familien unterscheiden sich technisch deutlich in Schwierigkeit: **Familie 3 (Bildarchivar)** ist ein trivialer `COUNT(*)` über `release_version_media` (net soft-delete) — direkt aus der bereits im Code vorhandenen Autor-Seam ableitbar. **Familie 2 (Chronist)** ist ein Multi-Tabellen-Count, dessen einzige saubere Quelle (`release_version_notes`) eine direkte `member_id`-Spalte hat, während die beiden anderen Kandidaten-Tabellen nur einen fragilen `created_by_user_id → users → member_claims`-Seam bieten. **Familie 1 (Coverage)** ist die anspruchsvollste: eine Pro-Projekt-Vollabdeckungsprüfung über `release_role_credit_lifecycles`, mit **einer echten Definitions-Landmine** (was zählt als „Release-Menge eines Projekts", wenn Alt-Releases gar keine Ledger-Credits haben).

**Primary recommendation:** Backend-Read (nicht Frontend-Ableitung). Neues Split-File `backend/internal/repository/member_profile_contribution_badges_repository.go` mit `loadContributionBadges(ctx, memberID) []PublicMemberBadge`, aufgerufen in `GetPublicMemberProfile` direkt nach `loadRoleVolumeBadges` (5-Zeilen-Callsite-Diff). Frontend: neue `MemberBadgeGroup 'contributions'` + 9 Presentation-Einträge in `memberBadgeLabels.ts`; die Badges fließen als earned-but-not-in-catalog-Zusätze ein (kein Locked-Zustand, kein Toggle), exakt wie es der bestehende `catalogWithEarnedBadges`-Fallback erlaubt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Familie-1 Coverage-Aggregation (per-Projekt-Vollabdeckung) | API / Backend (pgx Repository) | Database (SQL GROUP BY / EXISTS) | Erfordert Joins über `release_role_credit_lifecycles` × `release_version_groups` × Releases/Episoden — Daten liegen NICHT im bereits geladenen Frontend-Profil vor. [VERIFIED: codebase member_profile_repository.go:1661-1689] |
| Familie-2 Chronist-Count (Multi-Tabelle) | API / Backend | Database | Multi-Tabellen-Autorschaftszählung, teils über `created_by_user_id → member_claims`-Seam — nur serverseitig möglich. |
| Familie-3 Bildarchivar-Count | API / Backend | Database | `COUNT(*)` über `release_version_media` net soft-delete; Autor-Seam ist Backend-Wissen. |
| Schwellen→Stufe-Mapping (B/S/G, höchste Stufe) | API / Backend (reine Go-Funktion) | — | Konsistent mit `highestRoleVolumeTier` (Phase 112, Backend). Counts bleiben serverseitig; Frontend bekommt fertigen Badge-Code. [VERIFIED: codebase member_profile_role_volume_repository.go:15-28] |
| Badge-Label/Icon/Palette/Gruppierung + Rendering | Frontend (React) | — | `memberBadgeLabels.ts` + `MemberBadgeChain.tsx`; reine Präsentation, keine Zähllogik. [VERIFIED: codebase MemberBadgeChain.tsx:59-85] |
| „Immer sichtbar, kein Toggle" | Frontend (Rendering-Pfad) | Backend (emittiert ID:0, nie persistiert) | Derived Badges umgehen die `member_badges`-Visibility-Spalte komplett; sie erscheinen NICHT im `/me`-`AchievementBadgesCard` (Toggle-UI), sondern nur in der öffentlichen `MemberBadgeChain`. [VERIFIED: codebase AchievementBadgesCard.tsx:31-71, members/[slug]/page.tsx:137-142] |

## Standard Stack

Kein neuer externer Stack. Reuse ausschließlich vorhandener Bausteine.

### Core (bestehend, wiederverwenden)
| Baustein | Ort | Zweck | Warum Standard |
|----------|-----|-------|----------------|
| `MemberProfileRepository` | `backend/internal/repository/member_profile_repository.go` | Trägt `GetPublicMemberProfile`; hier hängt die neue Familie an | Etablierter Read-Pfad; Phase 112 hat exakt hier `loadRoleVolumeBadges` angedockt [VERIFIED: codebase member_profile_repository.go:535-539] |
| `loadRoleVolumeBadges` / `highestRoleVolumeTier` | `member_profile_role_volume_repository.go` | **Blueprint** für Familie 1–3 (COUNT/GROUP BY + reine Schwellenfunktion + ID:0-Badge) | 1:1 kopierbares Muster für alle drei Familien [VERIFIED: codebase member_profile_role_volume_repository.go:15-69] |
| `PublicMemberBadge` (Go model + TS type) | `models` / `frontend/src/types/profile.ts:144` | Transport der synthetischen Badges (`{id, badge_code, badge_category}`) | Bereits Träger von `role_entry_*`/`role_volume_*` [VERIFIED: codebase profile.ts:144-148] |
| `memberBadgeLabels.ts` | `frontend/src/components/profile/` | Presentation-Map + Gruppen-Labels + Katalog | Andockpunkt für neue Gruppe „Beiträge" [VERIFIED: codebase memberBadgeLabels.ts:53-110] |
| `MemberBadgeChain.tsx` (`buildMemberBadgeGroups`) | `frontend/src/components/profile/` | Rendert kategorie-gruppierte „Auszeichnungen"; earned-but-not-in-catalog-Merge via `catalogWithEarnedBadges` | Nimmt neue Gruppe ohne Umbau auf [VERIFIED: codebase MemberBadgeChain.tsx:36-85] |

### Alternatives Considered
| Statt | Möglich | Tradeoff |
|-------|---------|----------|
| Backend-Read | Frontend-Ableitung aus geladenen Daten | **Verworfen:** Die nötigen Rohdaten (Ledger-Lifecycles, Media-Counts, Notiz-Autorschaft) sind NICHT im Profil-DTO enthalten; eine Frontend-Ableitung bräuchte 3 neue Endpunkte. Backend-Read ist das kleinere Delta. [ASSUMED — folgt aus D-05-Diskretionshinweis „schwerere Aggregationen → Backend-Read"] |
| Synthetisch (ID:0, read-time) | Persistierte Projektions-Rows in `member_badges` | **Verworfen:** GAM-04 + D-05 verlangen getrennte Projektion ohne Visibility-Präferenz; Persistenz würde Live-Downgrade (D-01) und Storno-Konsistenz komplizieren. Der `role_volume_`-Präzedenzfall ist read-time. |

**Installation:** Keine. Kein `npm install`, kein neues Go-Modul.

## Package Legitimacy Audit

**Nicht anwendbar** — diese Phase installiert keine externen Pakete (reiner Brownfield-Read über vorhandenem Go/pgx-Backend und Next.js-Frontend). Kein slopcheck/Registry-Gate erforderlich.

## Architecture Patterns

### System Architecture Diagram (Datenfluss)

```
GET /api/v1/members/:slug
        │
        ▼
AppPublicProfileHandler.GetPublicMemberProfile  (app_public_profile.go)
        │  visibility-Gate (members_only) unverändert
        ▼
MemberProfileRepository.GetPublicMemberProfile  (member_profile_repository.go:391)
        │
        ├─ loadPublicBadges(memberID)        → member_badges (persistiert) + role_entry_* (read-time)
        ├─ loadRoleVolumeBadges(memberID)    → role_volume_*_<tier> (read-time)   [Phase 112]
        ├─ loadContributionBadges(memberID)  → NEU: 3 Familien (read-time)        [PHASE 113]
        │        │
        │        ├─ Familie 1: release_role_credit_lifecycles (awarded)
        │        │             × release_version_groups × fansub_releases × episodes
        │        │             → per (anime_id, fansub_group_id): full-coverage? → COUNT → tier
        │        │
        │        ├─ Familie 2: release_version_notes (member_id direct)
        │        │             [+ anime_fansub_project_notes / fansub_group_notes via
        │        │              created_by_user_id→users→app_users→member_claims  ← ASSUMED set]
        │        │             → COUNT(published, deleted_at IS NULL) → tier
        │        │
        │        └─ Familie 3: release_version_media
        │                      WHERE uploaded_by_user_id IN (member's legacy_user_ids)
        │                        AND deleted_at IS NULL   (kein review/visibility-Gate)
        │                      → COUNT(*) → tier
        │
        ▼
profile.PublicBadges  (append)  ──► JSON {data: profile}  ──► members/[slug]/page.tsx
                                                                    │
                                                                    ▼
                                                        MemberBadgeChain earnedBadges=public_badges
                                                        buildMemberBadgeGroups → Gruppe "Beiträge"
```

### Pattern 1: Read-time synthetisches Badge (ID:0, nie persistiert)
**What:** Aggregation im Read, Schwelle in reiner Funktion, Emission als `PublicMemberBadge{ID:0, BadgeCode:..., BadgeCategory:...}`.
**When to use:** Für alle drei Familien.
**Example (kanonisches Vorbild, 1:1 adaptierbar):**
```go
// Source: backend/internal/repository/member_profile_role_volume_repository.go:36-69 [VERIFIED]
func (r *MemberProfileRepository) loadRoleVolumeBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role_code, COUNT(*) AS credit_count
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		GROUP BY role_code
		ORDER BY role_code
	`, memberID)
	// ... für jede Zeile: tier := highestRoleVolumeTier(count); if tier != "" { append ID:0-Badge }
}
```

### Pattern 2: Reine Schwellenfunktion (höchste Stufe, absteigend)
```go
// Source: member_profile_role_volume_repository.go:15-28 [VERIFIED] — analog pro Familie 113 bauen
func highestContribProjectsTier(count int) string {
	switch {
	case count >= 15: return "gold"
	case count >= 5:  return "silver"
	case count >= 1:  return "bronze"
	default:          return ""
	}
}
// Chronist / Bildarchivar: 150 / 50 / 10
```

### Pattern 3: Autor→Member-Seam (users.id → app_users.legacy_user_id → verified member_claims)
```sql
-- Source: member_profile_repository.go:1379-1386 (media_rows) [VERIFIED]
WHERE rvm.uploaded_by_user_id IN (
    SELECT au.legacy_user_id
    FROM member_claims mc
    JOIN app_users au ON au.id = mc.app_user_id
    WHERE mc.member_id = $1
      AND mc.claim_status = 'verified'
      AND au.legacy_user_id IS NOT NULL
)
```
**When:** Familie 3 (Pflicht) und Familie-2-Tabellen ohne `member_id` (`anime_fansub_project_notes`, `fansub_group_notes`).

### Pattern 4: „Projekt = (anime_id, fansub_group_id)" + Release-Menge des Projekts
```sql
-- Source: member_profile_repository.go:1661-1666 (total_release_version_count) [VERIFIED]
SELECT COUNT(DISTINCT rv.id)
FROM release_versions rv
JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
JOIN fansub_releases fr ON fr.id = rv.release_id
JOIN episodes ep ON ep.id = fr.episode_id
WHERE ep.anime_id = :anime_id
  AND rvg.fansub_group_id = :fansub_group_id
```
Dies ist die **exakte, bereits produktive** Definition der „Release-Versionen eines Projekts". Familie 1 baut darauf auf.

### Recommended Familie-1 Query-Shape (Coverage)
```sql
-- Release-Version-Granularität; "Release" == release_version (Ledger keyed auf release_version_id).
-- Projekt zählt, wenn (total > 0) AND (member deckt jede release_version des (anime,group) ab).
WITH project_versions AS (   -- alle Release-Versionen je (anime, group)
  SELECT ep.anime_id, rvg.fansub_group_id, rv.id AS release_version_id
  FROM release_versions rv
  JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
  JOIN fansub_releases fr ON fr.id = rv.release_id
  JOIN episodes ep ON ep.id = fr.episode_id
  -- ↓↓↓ SIEHE LANDMINE: hier ggf. auf "release_version hat ≥1 awarded credit von IRGENDWEM" einschränken
),
member_covered AS (          -- Release-Versionen mit ≥1 awarded credit DES Members (netto)
  SELECT DISTINCT release_version_id, fansub_group_id
  FROM release_role_credit_lifecycles
  WHERE member_id = $1 AND lifecycle_status = 'awarded'
)
SELECT COUNT(*) FROM (
  SELECT pv.anime_id, pv.fansub_group_id
  FROM project_versions pv
  GROUP BY pv.anime_id, pv.fansub_group_id
  HAVING COUNT(*) > 0
     AND COUNT(*) = COUNT(*) FILTER (
           WHERE EXISTS (SELECT 1 FROM member_covered mc
                         WHERE mc.release_version_id = pv.release_version_id
                           AND mc.fansub_group_id   = pv.fansub_group_id))
) fully_carried;
```

### Anti-Patterns to Avoid
- **Persistente Row für Derived Badge anlegen:** Verletzt GAM-04/D-05 und bricht Live-Downgrade. Immer `ID:0`, nie `member_badges`-INSERT.
- **Derived Badges in `AchievementBadgesCard.tsx` (Toggle-UI) einblenden:** Das ist die persistierte-`member_badges`-Fläche mit Visibility-Schalter. Die neue Gruppe gehört ausschließlich in die öffentliche `MemberBadgeChain`. [VERIFIED: codebase AchievementBadgesCard.tsx:31-71]
- **`member_profile_repository.go` weiter aufblähen:** Datei ist **1881 Zeilen** (weit über 450). Neue Logik MUSS in ein Split-File; Callsite-Diff ≤ 5 Zeilen. [VERIFIED: codebase — Datei ist 1881 Z., Phase-112-Präzedenz member_profile_role_volume_repository.go]
- **Familie 3 mit review/visibility-Gate zählen:** D-04 verlangt ausdrücklich `unabhängig von review_status/Sichtbarkeit`. Der bestehende `loadLatestContributions`-Media-Query joint `review_statuses='approved'` + `visibilities='public'` — **diese Joins NICHT übernehmen**. [VERIFIED: codebase member_profile_repository.go:1371-1372]

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|--------------------|-------------|-------|
| Netto-/Storno-Semantik für Credits | Eigene reversal-Summierung über `point_ledger_entries` | `release_role_credit_lifecycles WHERE lifecycle_status='awarded'` | „awarded" ist bereits der Netto-Zustand; reversed-Zeilen sind ausgeschlossen. [VERIFIED: 0137 migration:22-53] |
| Autor→Member-Auflösung | Eigener User-Join | Seam-Muster aus `media_rows` (Pattern 3) | Behandelt legacy_user_id-NULL + verified-Gate korrekt [VERIFIED: member_profile_repository.go:1379-1386] |
| „Release-Versionen eines Projekts" | Eigene Release-Zählung | `total_release_version_count`-Subquery (Pattern 4) | Bereits produktiv, deckt anime→episode→release→version-Kette ab [VERIFIED: :1661-1666] |
| „Höchste erreichte Stufe" | Kette/Array aller Stufen | Reine `switch`-Funktion (Pattern 2) | D-05: nur höchste Stufe; Präzedenz `highestRoleVolumeTier` |
| Badge-Gruppierung/Merge im Frontend | Neue Rendering-Komponente | `buildMemberBadgeGroups` + neuer Gruppen-Key | Nimmt Gruppen leer-ausblendend auf; kein Umbau [VERIFIED: MemberBadgeChain.tsx:59-85] |

**Key insight:** Praktisch die gesamte „schwere" Logik (Netto-Credits, Projekt-Release-Mengen, Autor-Seam, Schwellen→Stufe, Gruppen-Rendering) existiert bereits als produktiver, getesteter Code. Phase 113 ist Komposition dieser Bausteine, nicht Neubau.

## Common Pitfalls

### Pitfall 1: Familie-1 „alle Releases" — Ledger-Abdeckungslücke (HÖCHSTE PRIORITÄT)
**What goes wrong:** Definiert man „jedes Release des Projekts" literal als *jede existierende `release_version` des (anime, group)*, dann kann ein Member ein Projekt nie voll abdecken, sobald es auch nur eine `release_version` gibt, für die **niemand** einen `release_role_work`-Credit hat (typisch für Alt-/Historik-Releases, die vor dem Ledger-Fundament ab Phase 106 entstanden). Ergebnis: Familie 1 ist in der Praxis fast immer leer → Feature wirkt kaputt.
**Why it happens:** Der Ledger (`release_role_credit_lifecycles`) wurde erst ab Phase 106+ befüllt; ältere Release-Versionen existieren in `release_versions`, tragen aber keine awarded-Credits.
**How to avoid:** Zwei zulässige Definitionen — der Planner/`discuss-phase` MUSS eine wählen:
  1. **(Empfohlen, [ASSUMED])** „Release-Menge des Projekts" = nur `release_version`en mit **≥1 awarded Credit von irgendeinem Member** (die den credited Workflow durchlaufen haben). Der Member muss dann alle davon abdecken. Robust gegen Alt-Daten, trifft die Intention „vollständig mitgetragen".
  2. **(Literal)** jede existierende `release_version`. Strenger, aber praktisch fast immer leer.
**Warning signs:** Integrationstest zeigt „bekannter Vollzeit-Mitwirkender bekommt kein Familie-1-Badge"; live `/members/:slug` zeigt „Beiträge"-Gruppe ohne Projekt-Badge trotz vieler Credits.

### Pitfall 2: Chronist-Tabellenmenge & Visibility-Gate ist unterdefiniert
**What goes wrong:** D-03 sagt „alle Notiz-/Text-Flächen", nennt aber 3 Kandidaten mit sehr unterschiedlicher Attributierbarkeit. `release_version_notes` hat `member_id` direkt; `anime_fansub_project_notes` und `fansub_group_notes` haben **nur** `created_by_user_id → users(id)` (kein member_id) → nur über den fragilen verified-claim-Seam zählbar, historische Member ohne Account fallen raus. Zusätzlich offen: zählt `visibility='internal'`-aber-`status='published'` mit?
**Why it happens:** Die drei Tabellen entstammen verschiedenen Phasen mit unterschiedlichen Ownership-Modellen. [VERIFIED: 0061/0063 → created_by_user_id→users; 0064 → member_id direct]
**How to avoid:** Empfohlene Zählmenge (Planner bestätigen lassen):
  - **Sicher (Pflicht):** `release_version_notes WHERE member_id=$1 AND status='published' AND deleted_at IS NULL`.
  - **Optional ([ASSUMED], via Seam):** `anime_fansub_project_notes` + `fansub_group_notes` mit `created_by_user_id`-Seam, gleiche Gates.
  - **Gate „veröffentlicht/aktiv":** `status='published' AND deleted_at IS NULL`. Empfehlung: **visibility-unabhängig** (der Beitrag existiert, D-03 fordert kein Public-Gate) — aber als Unter-Entscheidung markieren.
  - Member-Story/`members`-Textfelder zählen NICHT (D-03 explizit).
**Warning signs:** Doppelzählung (dieselbe Notiz über zwei Seams), oder Chronist-Zahl springt je nachdem ob interne Notizen mitzählen.

### Pitfall 3: Identitäts-Asymmetrie member_id vs. users.id
**What goes wrong:** Familie 1 und `release_version_notes` keyen sauber auf `member_id`. Familie 3 (`release_version_media`) und die Zusatz-Notiztabellen keyen auf `uploaded_by_user_id/created_by_user_id → users.id` und benötigen den verified-`member_claims`-Seam. Ein historischer Member **ohne** app_user/verified-claim bekommt Familie 3 = 0, obwohl faktisch Bilder existieren.
**How to avoid:** Bewusst dokumentieren (kein Bug — Bilder ohne verifizierten Uploader sind einem Member nicht sicher zurechenbar). In Tests beide Fälle abdecken (mit/ohne claim).

### Pitfall 4: N+1 / Kosten pro Profil-Read
**What goes wrong:** `GetPublicMemberProfile` führt bereits ~11 sequentielle Queries pro Aufruf aus. Familie 1 ist die teuerste (Joins über 4 Tabellen + GROUP BY/FILTER).
**Why it happens:** Ein Read pro Familie zusätzlich.
**How to avoid:** Single-Profile-Scope (kein Listen-/Ranking-Kontext — Ranking nutzt nur `member_point_totals` [VERIFIED: loadTotalPoints:631-645]). Ein Query je Familie, member-gefiltert, mit vorhandenen Indizes (`idx_release_role_credit_context`, `idx_rvm_public`). Kein Aufruf in Schleifen über mehrere Member. Akzeptabel für Einzelprofil.

### Pitfall 5: 450-Zeilen-Limit / falsche Datei
**What goes wrong:** `member_profile_repository.go` ist bereits 1881 Zeilen. Direktes Anhängen verschärft den CLAUDE.md-Verstoß.
**How to avoid:** Neues Split-File `member_profile_contribution_badges_repository.go` (package `repository`, Extension-Methoden auf `*MemberProfileRepository`), Callsite-Diff in `GetPublicMemberProfile` ≤ 5 Zeilen — exakt wie Phase 112. [VERIFIED: 112-01-SUMMARY.md:34-36]

## Code Examples

### Familie 3 (Bildarchivar) — vollständige empfohlene Zählung
```sql
-- D-04: TOTAL Bilder, net soft-delete, KEIN review/visibility-Gate.
SELECT COUNT(*)
FROM release_version_media rvm
WHERE rvm.deleted_at IS NULL
  AND rvm.uploaded_by_user_id IN (
      SELECT au.legacy_user_id
      FROM member_claims mc
      JOIN app_users au ON au.id = mc.app_user_id
      WHERE mc.member_id = $1
        AND mc.claim_status = 'verified'
        AND au.legacy_user_id IS NOT NULL
  );
-- Tier: 150/50/10 → gold/silver/bronze
```

### Familie 2 (Chronist) — sichere Kernquelle
```sql
-- release_version_notes trägt member_id DIREKT (kein Seam nötig).
SELECT COUNT(*)
FROM release_version_notes
WHERE member_id = $1
  AND status = 'published'
  AND deleted_at IS NULL;
-- (Optional additiv: anime_fansub_project_notes + fansub_group_notes via created_by_user_id-Seam)
-- Tier: 150/50/10
```

### Frontend — neue Gruppe „Beiträge" + earned-Merge (kein Katalog-Lock, kein Toggle)
```ts
// memberBadgeLabels.ts: MemberBadgeGroup um 'contributions' erweitern,
// MEMBER_BADGE_GROUP_LABELS['contributions'] = 'Beiträge',
// MEMBER_BADGE_GROUP_ORDER entsprechend ergänzen.
// 9 Presentation-Einträge (3 Familien × bronze/silver/gold), group:'contributions',
// Lucide-Platzhalter (z.B. FolderCheck / ScrollText / Images) + gold/silver/bronze-Palette.
// KEIN Eintrag in PUBLIC_MEMBER_BADGE_CATALOG → sie erscheinen NUR wenn earned
// (catalogWithEarnedBadges-Fallback), analog point_milestone_* (D-05: immer sichtbar wenn erreicht).
// Source-Muster: memberBadgeLabels.ts:71-79 (point_milestone_* bewusst nicht im Katalog) [VERIFIED]
```

## State of the Art

| Alt | Aktuell | Wann geändert | Bedeutung für 113 |
|-----|---------|---------------|-------------------|
| Badges als persistierte `member_badges`-Rows mit Visibility-Toggle | Read-time synthetische `PublicMemberBadge{ID:0}` | Phase 110 (`role_entry_*`), Phase 112 (`role_volume_*`) | 113 folgt dem read-time-Muster; `member_badges` bleibt unangetastet |
| Familie-1-Idee „Story+Release+Medien" (Roadmap) | „durchgängige Rollen-Beteiligung über alle Releases", netto Ledger | 113-CONTEXT D-02 | Roadmap-Text ist SUPERSEDED; nur `release_role_work` zählt |
| Bildarchivar „N distinct Release-Versionen" (Roadmap) | „Anzahl Bilder GESAMT" | 113-CONTEXT D-04 | `COUNT(*)` der Rows, nicht `COUNT(DISTINCT release_version_id)` |

**Deprecated/nicht verwenden:**
- Der `project_text_first_author`-Punkt-Credit (`project_note_credit_lifecycles`) ist für Chronist **zu eng** (nur Erstautor-Projekt-Texte). D-03 fordert bewusst breiter. Nicht als Chronist-Quelle verwenden.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | „Release-Menge eines Projekts" = release_versions mit ≥1 awarded Credit (nicht literal alle) | Pitfall 1 / Familie-1-Query | HOCH — falsche Wahl macht Familie 1 fast immer leer oder unerwartet streng. Muss von User/discuss bestätigt werden. |
| A2 | Chronist zählt `release_version_notes` (Pflicht) + optional `anime_fansub_project_notes`/`fansub_group_notes` via Seam | Pitfall 2 / Familie-2-Query | MITTEL — bestimmt die Chronist-Zahlbasis; falsche Menge verändert erreichte Stufen spürbar. |
| A3 | Chronist-Gate = `status='published' AND deleted_at IS NULL`, visibility-unabhängig | Pitfall 2 | MITTEL — ob interne veröffentlichte Notizen mitzählen ist eine Politik-Entscheidung. |
| A4 | Backend-Read (nicht Frontend-Ableitung) ist der richtige Ableitungsort | Standard Stack / Alternatives | NIEDRIG — durch fehlende Rohdaten im DTO stark gestützt; D-05 nennt Backend-Read explizit als wahrscheinlich. |
| A5 | „Release" == `release_version` (Ledger-Granularität), nicht `fansub_release`/Episode | Familie-1-Query | MITTEL — CONTEXT D-02 nennt das ausdrücklich als offene Research-Frage; Ledger keyt auf release_version_id, daher naheliegend. |
| A6 | Familie-3-Count ignoriert review_status/visibility (nur deleted_at) | Code Examples / Anti-Patterns | NIEDRIG — D-04 ist hier explizit. |

## Open Questions

1. **Familie-1 Release-Mengen-Definition (A1).** Siehe Pitfall 1. Empfehlung: Definition (1) (ledger-verankert). Für `discuss-phase`/Planner zur Bestätigung.
2. **Chronist-Tabellenmenge (A2/A3).** Nur `release_version_notes` oder zusätzlich die zwei Seam-Tabellen? Und zählen interne (`visibility='internal'`) veröffentlichte Notizen? Empfehlung: `release_version_notes` als Pflicht-Kern; Seam-Tabellen additiv, visibility-unabhängig.
3. **Anzeigeort im /me-Profil.** D-05 verortet die Gruppe in der öffentlichen `MemberBadgeChain`. Offen (klein): Soll das eigene `/me/profile` ebenfalls eine (read-only, ungetoggelte) Vorschau dieser Gruppe zeigen? Aktuell zeigt `/me` nur die toggle-basierte `AchievementBadgesCard` (persistierte Badges). Empfehlung: außerhalb Scope belassen, sofern nicht ausdrücklich gewünscht.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 16 | Alle drei Familien (SQL-Aggregation) | Compose-Service `team4sv30-db` | 16 | — (Kernabhängigkeit) |
| Go 1.25 + testify | Backend-Repository + Unit/Integration-Tests | ✓ (bestehend) | 1.25 | — |
| `TEAM4S_PHASE106_TEST_DSN` | Postgres-Integrationstests (award→reverse→hidden) | ✗ meist ungesetzt in Agent-Umgebung | — | Tests laufen als `SKIP` (nicht FAIL); reine Schwellen-Unit-Tests laufen ohne DB [VERIFIED: 112-01-SUMMARY.md:92-95] |
| Docker (Live-UAT :3000) | Live-Verifikation der „Beiträge"-Gruppe | Umgebungsabhängig | — | Frontend-Restart-Prozedur (MEMORY: `docker restart team4sv30-frontend` + Strg+F5, kein HMR) |
| Vitest 3 | Frontend `memberBadgeLabels`/`buildMemberBadgeGroups`-Tests | ✓ (bestehend) | 3 | — |

**Missing dependencies with no fallback:** keine.
**Missing dependencies with fallback:** `TEAM4S_PHASE106_TEST_DSN` fehlt üblicherweise → Integrationstests SKIP; das ist der dokumentierte, sichere Normalzustand für Phase 106+ in dieser Umgebung. Live-Postgres-Verifikation bleibt eine Nacharbeit, kein Code-Blocker.

## Validation Architecture

`workflow.nyquist_validation = true` [VERIFIED: .planning/config.json] → Sektion aktiv.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Go `testing` + `github.com/stretchr/testify` |
| Framework (Frontend) | Vitest 3 (`@` path alias) |
| Config file (Frontend) | `frontend/vitest.config.ts` |
| Quick run command (Backend, DB-frei) | `cd backend && go test ./internal/repository/... -run "TestHighestContrib" -v` |
| Full suite command (Backend) | `cd backend && go build ./... && go vet ./internal/repository/... && go test ./...` |
| Integration (DB, optional) | `TEAM4S_PHASE106_TEST_DSN=... go test ./internal/repository/... -run "TestLoadContributionBadgesPostgres" -v` |
| Frontend | `cd frontend && npx vitest run src/components/profile/` |

### Phase Requirements → Test Map
| Req | Behavior (Invariante) | Test Type | Automated Command | File Exists? |
|-----|-----------------------|-----------|-------------------|-------------|
| GAM-04 | Derived Badge nie in `member_badges` persistiert (ID:0, read-time) | integration | `go test ...-run TestLoadContributionBadgesPostgres` | ❌ Wave 0 |
| D-01 | Live-Downgrade: award N → Stufe sichtbar; reverse unter Schwelle → Stufe verschwindet | integration | s. o. (award→reverse→re-read) | ❌ Wave 0 |
| D-02 | Familie 1: Vollabdeckung aller Release-Versionen eines (anime,group) → Projekt zählt; eine Lücke → zählt nicht | integration | s. o. | ❌ Wave 0 |
| D-02 | Familie-1 Schwellen 1/5/15 (Grenzwerte 0/1, 4/5, 14/15) | unit | `go test -run TestHighestContribProjectsTier` | ❌ Wave 0 |
| D-03 | Familie 2: published+aktiv zählt; deleted_at → nicht; Grenzwerte 10/50/150 | unit + integration | s. o. | ❌ Wave 0 |
| D-04 | Familie 3: jede Media-Row zählt (TOTAL), soft-delete raus, review/visibility ignoriert; Grenzwerte 10/50/150 | unit + integration | s. o. | ❌ Wave 0 |
| D-05 | Frontend: neue Gruppe „Beiträge", nur höchste Stufe, earned-only (kein Katalog-Lock, kein Toggle) | unit (Vitest) | `npx vitest run src/components/profile/memberBadgeLabels.test.ts MemberBadgeChain.test.tsx` | ⚠️ erweitern (Dateien existieren) |

### Sampling Rate
- **Per task commit:** DB-freie Schwellen-Unit-Tests (Go) + Vitest-Presentation-Tests (< 30 s).
- **Per wave merge:** volle Backend-Suite `go test ./...` + Frontend `vitest run`.
- **Phase gate:** grün vor `/gsd:verify-work`; Postgres-Integrationstests live nachgezogen sobald DSN verfügbar (SKIP ist kein FAIL).

### Wave 0 Gaps
- [ ] `backend/internal/repository/member_profile_contribution_badges_repository_test.go` — 3 reine Schwellenfunktions-Unit-Tests (Grenzwerte pro Familie).
- [ ] Postgres-Integrationstest(s) analog `TestLoadPublicBadgesPostgresRoleVolume` (award→reverse→hidden; Coverage-Vollständigkeit; note published/deleted; media count/soft-delete).
- [ ] Frontend: `memberBadgeLabels.test.ts` um 9 neue Codes + Gruppe erweitern; `MemberBadgeChain.test.tsx` um `contributions`-Gruppenbildung erweitern.

## Security Domain

`security_enforcement` nicht in config → als **enabled** behandelt. Diese Phase ist read-only, additiv, ohne neuen Input-Pfad; die Angriffsfläche ist minimal.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Keine neue Auth; öffentlicher Read über bestehenden Handler. |
| V3 Session Management | no | Unverändert. |
| V4 Access Control | yes (leicht) | Bestehendes `members_only`-Visibility-Gate in `GetPublicMemberProfile` bleibt vorgeschaltet [VERIFIED: app_public_profile.go:51-58]. Derived Badges dürfen dieses Gate nicht umgehen. |
| V5 Input Validation | yes (minimal) | Einziger Input ist der bereits validierte/normalisierte `slug`; neue Logik nimmt keine User-Parameter. Alle SQL parametrisiert (pgx `$1`). |
| V6 Cryptography | no | Keine. |

### Known Threat Patterns for {Go/pgx read-only Aggregation}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL-Injection über Slug/member_id | Tampering | Ausschließlich parametrisierte pgx-Queries (`$1`), kein String-Building [VERIFIED: bestehendes Muster durchgängig] |
| Information Disclosure: Badge verrät nicht-öffentliche Contribution-Zahlen | Information Disclosure | Bewusst akzeptiert per D-03/D-04 (Badge = intrinsische Member-Leistung, nicht Sichtbarkeit). Nur aggregierte Stufe wird exponiert, keine Rohzeilen. Dokumentieren, kein Leck von IDs/Inhalten. |
| DoS über teure Familie-1-Aggregation | Denial of Service | Single-Profile-Scope, indizierte Joins; nicht in Listen/Ranking aufrufen. |

## Sources

### Primary (HIGH confidence — verifiziert per Read/Grep in diesem Repo)
- `backend/internal/repository/member_profile_role_volume_repository.go:15-69` — Blueprint (COUNT/GROUP BY + Schwellenfunktion + ID:0-Badge).
- `backend/internal/repository/member_profile_repository.go` — `GetPublicMemberProfile:391-569`, `loadPublicBadges:571-624`, `loadTotalPoints:631-645`, Autor-Seam `:1379-1386`, Projekt-Release-Count `:1661-1689`, `loadRecentMedia:1510` (rvm-Autor via `uploaded_by_user_id`).
- `database/migrations/0137_phase108_contribution_sources.up.sql` — `release_role_credit_lifecycles` (awarded/reversed, keyed release_version_id×group×member×role_code).
- `database/migrations/0059_release_version_media_schema.up.sql:5-30` — `release_version_media` (`uploaded_by_user_id→users`, `deleted_at`, `category`).
- `database/migrations/0064_release_version_notes.up.sql` — **`member_id` direkt** + status/visibility/deleted_at.
- `database/migrations/0061_fansub_group_notes.up.sql`, `0063_anime_fansub_project_notes.up.sql` — `created_by_user_id→users` (KEIN member_id), status/visibility/deleted_at.
- `frontend/src/components/profile/memberBadgeLabels.ts:53-146`, `MemberBadgeChain.tsx:36-150`, `AchievementBadgesCard.tsx:31-71`, `members/[slug]/page.tsx:90-142`, `types/profile.ts:144-226`.
- `backend/internal/handlers/app_public_profile.go:28-61` — Handler + visibility-Gate.
- `.planning/phases/112-member-punkt-meilenstein-badges/112-01-SUMMARY.md` — Split-File-Konvention, Test-SKIP-Verhalten, Tier-Token-Konvention.

### Secondary (MEDIUM)
- CONTEXT-Dateien 109/110/112/113 — Entscheidungshistorie, Prinzip „eine Quelle, mehrere Sichten".

### Tertiary (LOW)
- Keine — alle technischen Claims sind gegen Repo-Code/Schema verifiziert; verbleibende Unsicherheiten sind als [ASSUMED]-Politikentscheidungen im Assumptions Log geführt.

## Metadata

**Confidence breakdown:**
- Standard stack / Rendering-Seam: HIGH — direkter Präzedenzfall (role_volume_*) im Code verifiziert.
- Familie 3 (Bildarchivar): HIGH — Tabelle, Autor-Seam, soft-delete alle verifiziert; Definition eindeutig.
- Familie 2 (Chronist): MEDIUM — Kernquelle (release_version_notes.member_id) verifiziert; Tabellenmenge/visibility-Gate sind offene Politikentscheidungen (A2/A3).
- Familie 1 (Coverage): MEDIUM — Bausteine (Ledger + Projekt-Release-Count) verifiziert; „Release-Menge"-Definition ist die zentrale offene Entscheidung (A1/A5).

**Research date:** 2026-07-28
**Valid until:** 2026-08-27 (stabiler Brownfield-Code; nur relevant falls das Badge-Rendering oder das Ledger-Schema vorher umgebaut wird)

## RESEARCH COMPLETE
