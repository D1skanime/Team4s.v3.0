# Phase 119: Sammlungskarten für Fortschritt, Punkte, Beiträge, Mitgliedschaft und besondere Auszeichnungen - Research

**Researched:** 2026-08-03
**Domain:** Öffentliche Memberprofil-Auszeichnungen, exakte Fortschrittsprojektion und Sammlungskarten-UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fortschritt bildet eine Sammlung aus Erste Mitwirkung, 10, 25 und 50 Anime-Projekten.
- **D-02:** Punkte-Meilensteine bilden eine erweiterbare Sammlung aus allen vorhandenen Punktestufen.
- **D-03:** Beitraege bilden drei getrennte Sammlungen: Mitgetragene Projekte, Chronikpflege und Bildarchivpflege; Bronze, Silber und Gold bleiben Stufen ihrer jeweiligen Familie.
- **D-04:** Mitgliedschaft bildet eine Sammlung. Gruendungsmitglied ist die besondere Startstufe vor 5, 7 und 10 Jahren.
- **D-05:** Jede erhaltene besondere Auszeichnung bildet eine eigene einstufige Sammlungskarte ohne kuenstlichen Fortschritt.
- **D-06:** Neue Stufen werden automatisch an die kanonische Sammlung ihrer Familie angehaengt. Ein Badge erscheint auf der Profilseite genau einmal und wird nicht kategorienuebergreifend dupliziert.
- **D-07:** Das grosse Hauptmotiv zeigt standardmaessig die hoechste erreichte Stufe. Ist noch nichts erreicht, zeigt es die erste Stufe ausgegraut als Ziel.
- **D-08:** Eine laufende Serie zeigt aktuellen Wert, naechstes Ziel und verbleibende Menge. Eine abgeschlossene Serie zeigt eine volle Leiste und `Hoechste Stufe erreicht`.
- **D-09:** Alle erreichten Stufen bleiben in voller Farbe sichtbar; nur die hoechste erreichte Stufe traegt `Aktuell`.
- **D-10:** Erreichte kleine Stufen sind als temporaere Grossansicht anklickbar. Der echte Rang behaelt `Aktuell`, die betrachtete Stufe erhaelt `Ausgewaehlt`.
- **D-11:** Lange Stufenleisten bleiben auf Mobile horizontal scrollbar und bringen die aktuelle Stufe automatisch ins Sichtfeld.
- **D-12:** Zukuenftige Stufen zeigen ihr Motiv ausgegraut mit Schloss, sind aber nicht anklickbar.
- **D-13:** Nicht erhaltene besondere Auszeichnungen werden nicht angezeigt. Besitzt ein Mitglied keine besondere Auszeichnung, wird der gesamte Bereich ausgeblendet.
- **D-14:** Reihenfolge: Rollen, Fortschritt, Punkte-Meilensteine, Beitraege, Mitgliedschaft, besondere Auszeichnungen.
- **D-15:** Jede Kategorie verwendet das globale Karussell. Kategorien mit nur einer Sammlungskarte zeigen eine ruhige Einzelkarte ohne Pfeile oder Positionspunkte.
- **D-16:** `Alle Auszeichnungen in ... anzeigen` oeffnet ein Inline-Raster im jeweiligen Bereich. Mehrere Raster duerfen unabhaengig gleichzeitig geoeffnet bleiben.

### the agent's Discretion
- Exakte Abstaende, responsive Breakpoints und interne Helper-Aufteilung, solange Phase 118, das globale UI-System und die Entscheidungen oben eingehalten werden.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 119 sollte die bestehende `MemberBadgeChain` und `memberBadgeLabels.ts` von „eine große Karte je Badge“ auf „eine große Karte je Familie“ erweitern und ausschließlich das globale `FocalCarousel` verwenden. Phase 118 hat die Rollen-Familienkarte, Stufenleiste, Artwork-Layer und zentrale Carousel-Geometrie bereits etabliert; deren noch dokumentierte Pointer-/Reduced-Motion-Testlücken müssen als Wave-0-Abhängigkeit geschlossen oder mindestens in Phase 119 regressiv abgedeckt werden. [VERIFIED: codebase grep, 118-VERIFICATION.md]

Eine rein frontendseitige Umsetzung reicht für die exakten, auch noch nicht erreichten Fortschrittszustände nicht vollständig. `total_points` deckt Punkte ab und synthetische Contribution-Badges tragen exakte Werte, sobald Bronze erreicht wurde; unterhalb der ersten Beitragsstufe wird jedoch gar kein Badge emittiert. Die Fortschrittsfamilie liefert persistierte Stufencodes ohne exakten Anime-Zähler, und die Mitgliedschaftsbadges liefern keine exakte Dauer. Planerisch ist deshalb eine additive Erweiterung der bestehenden öffentlichen Profilprojektion nötig: vorhandene Repository-Zähler wiederverwenden, fehlende Rohwerte über bestehende Datenquellen ergänzen und sie im vorhandenen Profil-DTO transportieren — kein neuer Endpoint, keine Migration, keine Freischalt- oder Buchungslogik. [VERIFIED: `member_profile_repository.go`, `member_profile_contribution_badges_repository.go`, `badge_service.go`, `profile.ts`]

**Primary recommendation:** vier eng gekoppelte Slices planen: Wave 0 für Vertrags-/Carousel-Testlücken; Wave 1 für exakte Familienmetriken im bestehenden Public-Profile-DTO und pure Familienresolver; Wave 2 für Sammlungskarten, Auswahl, Einzelkarten und unabhängige Raster; Wave 3 für automatisierte Gates und blockierende Live-UAT. [VERIFIED: 119-UI-SPEC.md, codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Exakte Rohwerte für Anime-Projekte, Beiträge und Mitgliedschaft | API / Backend | Database / Storage | Repository-Abfragen besitzen die kanonischen Zähl- und Mitgliedschaftssemantiken; der Browser darf sie nicht rekonstruieren. [VERIFIED: `badge_service.go`, contribution repository] |
| Punktestand | API / Backend | Database / Storage | `total_points` ist bereits Bestandteil des öffentlichen Profil-DTOs und stammt aus `member_point_totals`. [VERIFIED: `member_profile_repository.go`, OpenAPI] |
| Familien-/Stufenprojektion | Browser / Client | API / Backend | Backend liefert Werte; pure Frontendresolver ordnen die kanonischen Katalogstufen, Status und Copy zu. [VERIFIED: bestehendes `memberBadgeLabels.ts`-Muster] |
| Sammlungskarten, temporäre Hero-Auswahl und Stufen-Autozentrierung | Browser / Client | — | Lokaler Präsentationszustand gehört in `MemberBadgeChain`; URL und Persistenz bleiben unverändert. [VERIFIED: 119-UI-SPEC.md] |
| Scroll/Drag/Snap/Keyboard/Raster | Browser / Client | — | `FocalCarousel` ist der bestehende globale Eigentümer. [VERIFIED: `FocalCarousel.tsx`] |
| Badge-Artwork | CDN / Static | Browser / Client | Getrackte Assets liegen in `frontend/public/member-achievement-badges`; Resolver und Icon-Fallback existieren. [VERIFIED: asset inventory, `MemberBadgeChain.tsx`] |

## Project Constraints (from AGENTS.md)

- Sämtliche Umsetzung, Git-, Build- und Testarbeit läuft in `/home/d1sk/team4s` über `team4s-linux`; Runtime-Abhängigkeiten bleiben in Docker Compose. [VERIFIED: AGENTS.md]
- Search-first ist Pflicht; `MemberBadgeChain`, `memberBadgeLabels.ts`, `FocalCarousel`, Public-Profile-DTO/Repository und bestehende Tests sind zu erweitern, nicht zu duplizieren. [VERIFIED: AGENTS.md, implementation-contract.md]
- API-Änderungen müssen Go-Modell, Runtime-Projektion, `shared/contracts/openapi.yaml`, TypeScript-DTO und fokussierte Tests atomar synchronisieren. [VERIFIED: AGENTS.md, api-contracts.md]
- Nutzerseitige deutsche Texte verwenden korrekte Umlaute; bestehende globale UI-Komponenten und CSS-Tokens sind verbindlich. [VERIFIED: AGENTS.md]
- Live-UAT erfolgt über sichtbare Navigation im Codex-In-App-Browser auf `http://127.0.0.1:3300`; Headless-Tests ersetzen diesen Flow nicht. [VERIFIED: AGENTS.md]
- Keine Datenmigration, kein Backfill und keine neue Tabelle sind für diese Read-only-Darstellungsphase vorgesehen; Testdaten sind disponibel. [VERIFIED: AGENTS.md, 119-CONTEXT.md]
- Relevante Checks: fokussierte Tests, Typecheck, Lint, Build soweit möglich und `git diff --check`; bestehende Fremdfehler separat dokumentieren. [VERIFIED: AGENTS.md]

## Mandatory Search-First Inventory / `read_first`

Zukünftige Pläne müssen mindestens diese Analog- und Owner-Dateien in `read_first` aufnehmen. [VERIFIED: codebase inventory]

| Datei | Warum zuerst lesen |
|---|---|
| `.planning/phases/119-.../119-CONTEXT.md` und `119-UI-SPEC.md` | Gesperrte Produkt- und UI-Entscheidungen. [VERIFIED: planning docs] |
| `.planning/phases/118-.../118-CONTEXT.md`, `118-UI-SPEC.md`, `118-VERIFICATION.md` | Rollenkarte als Referenz und offene Carousel-Regressionen. [VERIFIED: planning docs] |
| `.planning/quick/260803-be5-.../260803-be5-SUMMARY.md` | Korrigierte Zentrierung, 1480-px-Shell und Overflow-UAT. [VERIFIED: planning docs] |
| `frontend/src/components/profile/MemberBadgeChain.tsx` + `.module.css` + `.test.tsx` | Einziger Badge-Chain-Owner, Artwork, Rollenkarte, aktuelles Raster und Responsive-Vertrag. [VERIFIED: codebase grep] |
| `frontend/src/components/profile/memberBadgeLabels.ts` + `.test.ts` | Kanonische Labels, Gruppenreihenfolge, Katalog, Punkte-/Rollen-Schwellen und Resolvermuster. [VERIFIED: codebase grep] |
| `frontend/src/components/ui/FocalCarousel.tsx` + `.module.css` + `.test.tsx` | Einziger Carousel-/Raster-Owner. [VERIFIED: codebase grep] |
| `frontend/src/components/fansubs/FansubProjectsGrid.tsx` + Test | Zweiter produktiver Consumer; Pflicht-Regression bei Carousel-Änderungen. [VERIFIED: codebase grep] |
| `frontend/src/app/members/[slug]/page.tsx` + `.test.tsx` + `page.module.css` | SSR-Datenübergabe, öffentliche Route, Reihenfolge und 1480-px-Shell. [VERIFIED: codebase grep] |
| `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts` | Public-Profile-DTO und bestehender Transportseam. [VERIFIED: codebase grep] |
| `backend/internal/models/member_profile.go` | Go-Vertragsowner. [VERIFIED: codebase grep] |
| `backend/internal/repository/member_profile_repository.go` + Tests | Einbettung aller Badge-/Punkteprojektionen in denselben Profil-Read. [VERIFIED: codebase grep] |
| `backend/internal/repository/member_profile_contribution_badges_repository.go` + Tests | Wiederverwendbare Rohzähler und Schwellen für drei Beitragsfamilien. [VERIFIED: codebase grep] |
| `backend/internal/services/badge_service.go` + Tests | Kanonische Projekt- und Mitgliedschaftsregeln, die neue Rohwertprojektionen exakt spiegeln müssen. [VERIFIED: codebase grep] |
| `shared/contracts/openapi.yaml` und `frontend/src/types/__tests__/v12-projection-contract.test.ts` | Vertrag und vorhandenes Paritätsmuster. [VERIFIED: codebase grep] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | 16.1.6 installiert | SSR-Profilroute und Image | Bestehender App-Router-Stack; kein Upgrade in dieser Phase. [VERIFIED: Compose `npm list`] |
| React / React DOM | 18.3.1 | Lokaler Auswahlzustand und Rendering | Bestehender Projektstack. [VERIFIED: Compose `npm list`] |
| TypeScript | 5.9.3 installiert | DTOs und pure Resolver | Bestehender Compiler im Frontend-Container. [VERIFIED: Compose `npm list`] |
| Projektinternes UI-System | Repositorystand | `Card`, `Badge`, `Button`, `SectionHeader`, `FocalCarousel` | Im genehmigten UI-Vertrag verbindlich; keine neue Registry/Abhängigkeit. [VERIFIED: 119-UI-SPEC.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| Vitest | 3.2.4 | Resolver-/Komponentenregressionen | Für Schwellen, Auswahl, Sichtbarkeit, Einzel-/Mehrkartenmodus. [VERIFIED: Compose `npm list`] |
| Testing Library React | 16.3.2 | Accessible-DOM-Tests | Für Tastatur, `aria-pressed`, Progressbar und Rasterfokus. [VERIFIED: Compose `npm list`] |
| lucide-react | 0.469.0 | `Lock` und bestehende Fallback-Icons | Nur über bestehende Resolver/Komponenten. [VERIFIED: Compose `npm list`] |
| Go + pgx | bestehender Backendstand | Additive Profilprojektion | Nur wenn exakte Metriken ergänzt werden. [VERIFIED: repository imports] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Bestehendes `FocalCarousel` | Neue Carousel-Library/lokaler Hook | Verbotener Parallelpfad und Regressionen bei Grid/Fokus/Auth-freier SSR. [VERIFIED: 119-CONTEXT.md, implementation-contract.md] |
| Bestehendes Public-Profile-DTO | Neuer Badge-Progress-Endpoint | Erzeugt API-Fan-out trotz derselben Memberprojektion. [VERIFIED: 119-UI-SPEC.md] |
| Kanonischer Katalog + Familienresolver | Manuelle JSX-Arrays pro Kategorie | Neue Stufen würden nicht automatisch einsortiert und könnten dupliziert werden. [VERIFIED: D-06] |

**Installation:** keine. Registry-Abfragen zeigen zwar neuere Major-/Minor-Versionen (React 19.2.8, Next 16.2.12, Vitest 4.1.10; Registry geändert 2026-07-24 bis 2026-08-01), aber Phase 119 soll den installierten Stack nicht upgraden. [VERIFIED: npm registry, 2026-08-03]

## Data-to-Presentation Mapping

| Datenfeld / Quelle | Semantik in der UI | Planhinweis |
|---|---|---|
| `public_badges[].badge_code` | Erreichte Stufe bzw. erhaltene einstufige Ehrung | Genau einer Familie über Katalog-Metadaten zuordnen; Badge-Code nie aus Label parsen. [VERIFIED: `memberBadgeLabels.ts`] |
| `public_badges[].current_count` | Exakter aktueller Wert einer Serie | Heute zuverlässig für Rollen und erreichte Contribution-Familien; für alle Serienzustände ergänzen. [VERIFIED: Go DTO/Repository] |
| `current_tier`, `next_threshold`, `remaining_count`, `next_tier` | Aktuell-Chip, Progressbar und Zielcopy | Backendwerte nicht im JSX neu erfinden; terminale `null`-Werte bedeuten Abschluss. [VERIFIED: OpenAPI, contribution/role repositories] |
| `total_points` | Exakter Punktewert | `POINT_MILESTONES` aufsteigend als vollständige Stufenliste verwenden; nicht nur `deriveMilestoneBadge` (höchste Stufe). [VERIFIED: page.tsx, labels.ts] |
| bestätigte distinct `anime_contributions.anime_id` | Fortschritt „Anime-Projekte“ | Dieselbe SQL-Semantik wie `computeProductiveTiers` als Read-Projektion wiederverwenden/extrahieren. [VERIFIED: `badge_service.go`] |
| drei `loadContrib*Count`-Werte | Mitgetragene Projekte, Chronikpflege, Bildarchivpflege | Auch unter Bronze transportieren; kein „earned badge“ vortäuschen. [VERIFIED: contribution repository] |
| maximale Dauer einer einzelnen `hist_fansub_group_members`-Mitgliedschaft | Jahre Mitgliedschaft | Semantik muss exakt der Badge-Service-Regel `COALESCE(left_date,CURRENT_DATE) >= joined_date + interval` folgen; nicht Profil-`active_from_date` oder summierte Gruppenjahre verwenden. [VERIFIED: `badge_service.go`] |
| Katalog `label`, `detailLabel`, `palette`, `Icon`, Artworkresolver | Titel, Stufenname, Schwelle, Farbe, Fallback | Katalog um explizite Familien-/Schwellenmetadaten erweitern; keine Label-Stringanalyse. [VERIFIED: current catalog shape shows missing family metadata] |

## Architecture Patterns

### System Architecture Diagram

```text
GET /api/v1/members/:slug (optional auth, existing endpoint)
 -> visibility/owner gate
 -> MemberProfileRepository
    -> persisted public badges (special/membership/progress awards)
    -> exact progress-family metrics (existing/extracted count helpers)
    -> total_points
 -> existing PublicMemberProfile DTO / OpenAPI / profile.ts
 -> members/[slug]/page.tsx
 -> MemberBadgeChain
    -> canonical catalog + pure family resolver
       -> roles | progress | points | 3 contributions | membership | earned specials
    -> FamilyCollectionCard (domain-local composition)
       -> hero selection + progress + horizontally scrollable stages
    -> global FocalCarousel
       -> one card: quiet mode
       -> many cards: arrows/drag/snap/counter
       -> independent inline grid per category instance
```

[VERIFIED: codebase data-flow trace, 119-UI-SPEC.md]

### Recommended Project Structure
```text
backend/internal/repository/
  member_profile_repository.go
  member_profile_*progress*_repository.go       # only if extraction keeps line limits
backend/internal/models/member_profile.go
shared/contracts/openapi.yaml
frontend/src/types/profile.ts
frontend/src/components/profile/
  memberBadgeLabels.ts                          # catalog/family/stage SSOT
  MemberBadgeChain.tsx                          # family projection + selection owner
  MemberBadgeChain.module.css
  MemberBadgeChain.test.tsx
frontend/src/components/ui/
  FocalCarousel.tsx                             # only generic carousel/raster changes
  FocalCarousel.module.css
  FocalCarousel.test.tsx
```
[VERIFIED: existing project structure]

### Pattern 1: Canonical family registry, not category-specific branches

Extend catalog items with stable `family`, numeric `threshold`/order and stage kind. Build a one-pass badge-code ownership map, reject/skip duplicates deterministically, sort stages by threshold, and let unknown earned specials fall back to one-stage special cards. This fulfills automatic stage append and exactly-once rendering without parsing localized labels. [VERIFIED: D-05/D-06; current catalog lacks these fields]

### Pattern 2: Separate earned state from progress metrics

Do not represent a below-threshold metric as an earned Bronze badge. Transport family metrics independently (recommended: additive `badge_progress`/`badge_family_progress` collection on the existing profile DTO) or add an equally explicit non-earned projection type. `public_badges` remains the truth for earned/special visibility, while metrics drive bars and targets. [VERIFIED: current `loadContributionBadges` emits nothing below Bronze; D-07/D-08 require exact empty-family progress]

### Pattern 3: Reusable domain-local FamilyCollectionCard

Extract a focused component/helper inside `components/profile`, not `components/ui`: it owns badge-family semantics, Hero selection, `Aktuell` versus `Ausgewählt`, stage buttons/locks and auto-centering. `FocalCarousel` remains fachlogikfrei and receives whole families as items. [VERIFIED: ui-system.md, 119-UI-SPEC.md]

### Pattern 4: Reset and scroll selection by stable family identity

Key selection by family key plus badge code. On family/data change, reset to the highest currently earned stage; use a ref to the `Aktuell` miniature and `scrollIntoView({inline:'center', block:'nearest', behavior: reduced ? 'auto' : 'smooth'})` only inside the stage strip. Future stages render as non-button content, so they cannot become tab stops. [VERIFIED: 119-UI-SPEC.md]

### Pattern 5: Special cards are an earned-only projection

Build special cards from earned badges after the global ownership pass. Each card is terminal and omits progress, target and locked stages; if none remain, omit the entire category. Existing artwork resolver uses dedicated art where available and the catalog icon otherwise. [VERIFIED: D-05/D-13, `resolveBadgeArtwork`]

### Anti-Patterns to Avoid
- **Highest-badge-only family:** hides earlier earned stages and future targets. [VERIFIED: current non-role rendering]
- **Label parsing:** localized copy is not a stable family or threshold identifier. [VERIFIED: labels contain punctuation and umlauts]
- **Below-threshold fake award:** leaks metric semantics into `earnedCodes` and incorrectly colors/announces Bronze. [VERIFIED: current earned-code rendering]
- **Frontend SQL-semantic reconstruction:** `current_projects_count`, `recent_contributions` and profile dates are not equivalent to badge counts/durations. [VERIFIED: repository definitions]
- **One shared expanded state:** independent category grids require one `FocalCarousel` instance/state per category. [VERIFIED: D-16]
- **Nested interactive carousel station:** stage buttons may be tabbable, but Carousel keyboard arrows must not steal events from focused stage buttons. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Carousel/raster | Lokale Scroll-, Snap-, Pfeil-, Index- oder Expand-Logik | `FocalCarousel` | Globaler Owner mit zwei produktiven Consumern. [VERIFIED: codebase grep] |
| Punkteaggregation | Summe im Browser | `total_points` + `POINT_MILESTONES` | Trigger-maintained Backendwert ist kanonisch. [VERIFIED: OpenAPI] |
| Beitragszähler | Neue SQL im Handler | `loadContribProjectsCount`, `loadContribChronicleCount`, `loadContribArchivistCount` | Bestehende Scope-/Soft-delete-/Author-Seam-Regeln. [VERIFIED: contribution repository] |
| Projektzählung | `current_projects_count` oder Badge-Untergrenze | Extract/reuse `COUNT(DISTINCT anime_id)` aus `computeProductiveTiers` | Current-project- und Badge-Semantik unterscheiden sich. [VERIFIED: `badge_service.go`, public profile repository] |
| Mitgliedsdauer | Profiljahre/summierte Gruppenjahre | Bestehende einzelne historische Mitgliedschaftssemantik | Badge-Service prüft jede Mitgliedschaft separat. [VERIFIED: `badge_service.go`] |
| Badge-Artwork/Fallback | Zweiter Assetloader | Bestehende Artworkresolver + Katalog-Icon | Stabile Geometrie und vorhandene Assets. [VERIFIED: `MemberBadgeChain.tsx`, asset inventory] |
| Auth | Token-/Refreshlogik in Profilkomponenten | Bestehender SSR/API-Seam | Die Badgefläche ist read-only und public; Auth-Ownership bleibt zentral. [VERIFIED: `page.tsx`, `api.ts`, auth-api-client.md] |

**Key insight:** Badge-Erhalt und Fortschrittsmetrik sind zwei verschiedene Wahrheiten; der Plan muss sie getrennt transportieren und erst in einer kanonischen Familienprojektion zusammenführen. [VERIFIED: D-07/D-08 versus current repository behavior]

## Common Pitfalls

### Pitfall 1: Kategorien verschwinden unter der ersten Schwelle
**What goes wrong:** Punkte/Beiträge werden erst nach Erhalt des ersten Badge sichtbar, obwohl D-07 ein ausgegrautes Einstiegsziel fordert. [VERIFIED: current points/contribution catalogs and loaders]
**Why it happens:** Punkte- und Contribution-Stufen sind earned-only aus dem statischen Katalog ausgeschlossen. [VERIFIED: `memberBadgeLabels.ts`]
**How to avoid:** Vollständige Stufenkataloge unabhängig von earned state; Special bleibt earned-only. [VERIFIED: D-02/D-03/D-13]
**Warning signs:** `groups.filter(rows.length)` läuft vor Familienprojektion; 0-Punkte-Profil hat keinen Punktebereich. [VERIFIED: current code]

### Pitfall 2: Falscher Fortschrittswert zwischen Stufen
**What goes wrong:** 17 Anime-Projekte werden als 10 oder anhand sichtbarer Projekte dargestellt. [VERIFIED: tier code only provides lower bound]
**Why it happens:** persistierte productive-Badges tragen aktuell keinen `current_count`. [VERIFIED: `loadPublicBadges`]
**How to avoid:** exakten distinct-Anime-Zähler im bestehenden Read-Pfad ergänzen und Boundary-Tests 0/1/9/10/24/25/49/50. [VERIFIED: `computeProductiveTiers` thresholds]

### Pitfall 3: Mitgliedschaftsdauern werden addiert
**What goes wrong:** zwei kurze Mitgliedschaften ergeben fälschlich 5 Jahre. [VERIFIED: badge service uses one qualifying row]
**How to avoid:** maximale qualifizierende Dauer einer einzelnen Membership projizieren; Stichtag `left_date` oder `CURRENT_DATE`. [VERIFIED: `computeMembershipMilestone`]
**Warning signs:** `SUM` über Memberships oder Nutzung von `active_from_date`. [VERIFIED: codebase fields]

### Pitfall 4: Gründungsmitglied als zeitlich erreichbares Ziel
**What goes wrong:** Nicht-Gründer sehen „Noch X bis Gründungsmitglied“, obwohl dieser Status nur durch Beitritt im Gründungsjahr entsteht. [VERIFIED: `computeFoundingMember`]
**How to avoid:** Gründungsmitglied als optionale besondere Startstufe der Membership-Kette darstellen; zeitbasierte Progresscopy muss zum nächsten erreichbaren 5/7/10-Jahre-Ziel springen. Dies ist eine notwendige Interpretation von D-04/D-07 und sollte im Plan explizit als Verifikationsfall festgehalten werden. [ASSUMED]

### Pitfall 5: Doppelte Special-/Allrounder-Zuordnung
**What goes wrong:** `all_rounder` erscheint als Special und nochmals als Beitragsfamilie oder Grid-Duplikat. [VERIFIED: current presentation maps it to special]
**How to avoid:** zentrale Ownership-Map und exactly-once Unit-Test über alle Katalog- plus earned-only-Codes. [VERIFIED: D-06]

### Pitfall 6: Einzelkarte zeigt tote Carousel-Chrome
**What goes wrong:** Pfeile, `1 von 1` oder Positionspunkte erscheinen. [VERIFIED: D-15]
**How to avoid:** `FocalCarousel` um generischen Single-item quiet mode ergänzen; nicht consumerseitig CSS-verstecken. [VERIFIED: current `FocalCarousel` renders arrows for one item]

### Pitfall 7: Phase-118-Motionlücken werden weitergetragen
**What goes wrong:** Pointer-Drag aktualisiert Nähe/Skalierung nicht kontinuierlich; Reduced Motion snappt weiterhin smooth ohne deterministischen Test. [VERIFIED: 118-VERIFICATION.md, current `FocalCarousel.tsx`]
**How to avoid:** Wave 0 schließt oder testet die offenen globalen Carousel-Verträge vor der neuen Consumer-Komplexität. [VERIFIED: dependency Phase 118]

### Pitfall 8: Stage-Autozentrierung scrollt die Seite
**What goes wrong:** `scrollIntoView` verschiebt vertikal das Dokument. [ASSUMED]
**How to avoid:** `block:'nearest'`, stage-strip-only ref und Tests, dass nur der innere horizontale Container bewegt wird. [VERIFIED: 119-UI-SPEC.md]

## Code Examples

Verified project-aligned patterns:

```typescript
// Source: existing POINT_MILESTONES + Phase 119 family contract
const pointStages = [...POINT_MILESTONES]
  .sort((a, b) => a.threshold - b.threshold)
  .map(({ threshold, badge_code }) => ({
    badgeCode: badge_code,
    threshold,
    presentation: getMemberBadgePresentation(badge_code),
  }))
```
[VERIFIED: `memberBadgeLabels.ts`]

```typescript
// Source: 119-UI-SPEC; keep real current rank distinct from temporary selection
const heroCode = selectedEarnedCode ?? highestEarnedCode ?? stages[0]?.badgeCode
const isCurrent = stage.badgeCode === highestEarnedCode
const isSelected = stage.badgeCode === selectedEarnedCode
```
[VERIFIED: 119-UI-SPEC.md]

```go
// Source: existing public-profile projection composition
profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
// Add exact family metrics in this same repository seam; do not add a second endpoint.
profile.BadgeProgress, loadErr = r.loadBadgeFamilyProgress(ctx, row.memberID)
```
[VERIFIED: `member_profile_repository.go`; proposed name is [ASSUMED]]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Einzelbadge als große Carousel-Karte | Familie als große Karte mit Hero und Stufen | Phase 118, 2026-08-03 | Phase 119 muss Rollenkarte generalisieren. [VERIFIED: git log, phase 118 artifacts] |
| Lokale Carousel-Muster | Globales `FocalCarousel` | Phase 118 | Kein Parallel-Carousel zulässig. [VERIFIED: codebase grep] |
| Allgemeine Badge-Typen ohne exakte Familienmetrik | Rollen/Beiträge besitzen teilweise exakte synthetische Metadaten | Phasen 113/116/118 | Bestehendes DTO-Muster kann erweitert werden, aber below-threshold-Zustände brauchen getrennte Metriken. [VERIFIED: repository history/comments] |
| 920-px-Sektionskappung | 1480-px-Profilbreite und korrigierte Endzentrierung | Quick 260803-be5 | Phase-119-CSS darf die Kappung nicht reintroduzieren. [VERIFIED: git log, quick summary] |

**Deprecated/outdated:** `deriveMilestoneBadge` allein liefert nur die höchste Punktestufe und ist für eine vollständige Sammlung nicht ausreichend; die Funktion bleibt als kompatibler Resolver nutzbar, darf aber nicht die Stufenliste ersetzen. [VERIFIED: implementation]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Nicht-Gründer überspringen Gründungsmitglied als zeitliches „nächstes Ziel“, während die Stufe sichtbar gesperrt bleibt. | Pitfall 4 | D-04/D-07 sind sonst semantisch widersprüchlich; Nutzerentscheidung kann nötig sein. |
| A2 | Ein neues additives Feld `badge_progress` ist der sauberste DTO-Schnitt. | Pattern 2 / Code Example | Planner kann einen gleichwertigen expliziten bestehenden-DTO-Ausbau wählen, solange earned state nicht verfälscht wird. |
| A3 | Verschachtelte Stage-Buttons benötigen Event-Grenzen, damit Carousel-Pfeiltasten nicht ihre Interaktion übernehmen. | Anti-Patterns | Muss durch DOM-/Keyboard-Test bestätigt werden. |
| A4 | `scrollIntoView` kann ohne enges Scoping vertikalen Dokument-Scroll verursachen. | Pitfall 8 | Live-Browser-UAT muss tatsächliches Browserverhalten prüfen. |

## Open Questions

1. **Wie verhält sich „Gründungsmitglied“ für Nicht-Gründer im nächsten-Ziel-Text?**
   - What we know: Es ist laut D-04 die Startstufe; technisch wird es ausschließlich bei Beitritt im Gründungsjahr verliehen und kann durch Zeitablauf nicht erreicht werden. [VERIFIED: CONTEXT, `badge_service.go`]
   - What's unclear: D-07 „erste Stufe als Ziel“ ist für Nicht-Gründer wörtlich nicht erfüllbar. [VERIFIED: CONTEXT]
   - Recommendation: Stufe gesperrt sichtbar lassen, Progressziel aber auf 5 Jahre setzen; als Planannahme markieren und gezielt in UAT bestätigen. [ASSUMED]

2. **Soll das additive Familienmetrik-Feld ein Array oder benannte Felder verwenden?**
   - What we know: D-06 verlangt erweiterbare Familien; ein Array mit stabilem Family-Code unterstützt neue Familien/Stufen besser. [VERIFIED: CONTEXT]
   - What's unclear: Es existiert noch kein kanonischer Feldname. [VERIFIED: OpenAPI/Go/TS]
   - Recommendation: `badge_progress[]` mit `family`, `current_count`, `next_threshold`, `remaining_count`; Schwellen-/earned state bleiben im Katalog/Badges. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| SSH `team4s-linux` | Canonical repo | ✓ | Host erreichbar | — [VERIFIED: shell probe] |
| Docker Compose frontend | Tests/build/typecheck | ✓ | Service läuft | — [VERIFIED: `docker compose ps`] |
| Docker Compose backend/PostgreSQL | Repository-/Handler-Tests | ✓ | Backend läuft; PostgreSQL 16 healthy | — [VERIFIED: `docker compose ps`] |
| In-App-Browser-Tunnel | Live-UAT | ✓ laut Projektvertrag | `127.0.0.1:3300` | Linux-URL `192.168.235.196:3000` nur unterstützend. [VERIFIED: AGENTS.md] |
| GSD Graphify | Kontextgraph | ✗ deaktiviert | — | Code-/Dokumentgrep wurde verwendet. [VERIFIED: `gsd-linux.sh graphify status`] |

**Missing dependencies with no fallback:** keine für Planung/Implementierung festgestellt. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Graphify ist deaktiviert; Search-first-Codeinventar ersetzt den semantischen Graphen für diese eng begrenzte Phase. [VERIFIED: graphify status]

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest 3.2.4 + Testing Library 16.3.2; Go `testing`/testify im Backend [VERIFIED: Compose/package/codebase] |
| Config file | `frontend/vitest.config.ts`; Backend Go modules [VERIFIED: codebase inventory] |
| Quick run command | `docker compose exec -T team4sv30-frontend npm test -- MemberBadgeChain.test.tsx memberBadgeLabels.test.ts FocalCarousel.test.tsx` [VERIFIED: package script] |
| Full suite command | `docker compose exec -T team4sv30-frontend npm test` plus `docker compose exec -T team4sv30-backend go test ./...` [VERIFIED: project conventions] |

### Phase Behavior → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|
| Vollständige Familien, Reihenfolge, exactly-once | unit | `npm test -- memberBadgeLabels.test.ts MemberBadgeChain.test.tsx` | ✅ erweitern [VERIFIED: test inventory] |
| 0/exakte/terminale Schwellen aller fünf Bereiche | Go + unit | fokussierte repository tests + resolver tests | ⚠️ Wave 0 ergänzen [VERIFIED: coverage inventory] |
| Hero-Auswahl, `Aktuell`/`Ausgewählt`, Locks ohne Tabstop | component | `npm test -- MemberBadgeChain.test.tsx` | ✅ erweitern [VERIFIED: test inventory] |
| Single-card quiet mode, mehrere unabhängige Raster, Fokus-Rückgabe | global component | `npm test -- FocalCarousel.test.tsx MemberBadgeChain.test.tsx` | ✅ erweitern [VERIFIED: current FocalCarousel tests lack single mode] |
| Mobile stage-strip auto-center und Reduced Motion | component + live UAT | focused tests + browser | ❌ Wave 0 [VERIFIED: 118 verification/UI spec] |
| Public-profile contract parity | contract | `npm test -- v12-projection-contract.test.ts` + Go tests | ✅ erweitern [VERIFIED: test inventory] |
| 1480-px shell/no page overflow | CSS contract + live UAT | page/width tests + browser | ✅ regressiv [VERIFIED: quick 260803-be5] |

### Sampling Rate
- **Per task commit:** fokussierte Owner-Tests plus `git diff --check`. [VERIFIED: AGENTS.md]
- **Per wave merge:** Frontend Typecheck/Lint und betroffene Go-/Vitest-Suiten. [VERIFIED: AGENTS.md]
- **Phase gate:** vollständige relevante Suiten, Build soweit machbar und blockierende Desktop/Tablet/Mobile-In-App-Browser-UAT. [VERIFIED: 119-UI-SPEC.md]

### Wave 0 Gaps
- [ ] Backend-Tests für exakte Projekt-/Mitgliedschaftsmetriken einschließlich below-threshold und terminal. [VERIFIED: missing coverage]
- [ ] `memberBadgeLabels.test.ts`: Familienregistry, Sortierung, exactly-once und unbekannte earned special. [VERIFIED: missing coverage]
- [ ] `MemberBadgeChain.test.tsx`: 0/1/mehrere Specials, alle Kategorieformen, Auswahl/reset, zwei Raster offen, Singular/Plural. [VERIFIED: missing coverage]
- [ ] `FocalCarousel.test.tsx`: Single-item quiet mode und offene Phase-118 Pointer-/Reduced-Motion-Regressions. [VERIFIED: 118-VERIFICATION.md]
- [ ] Contract parity für additive Metrik. [VERIFIED: expected contract change]

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | begrenzt | Route bleibt optional-auth; keine neue Authlogik. [VERIFIED: server route] |
| V3 Session Management | nein für öffentliche Badgeanzeige | Keine Mutation/Client-Session. [VERIFIED: read-only UI spec] |
| V4 Access Control | ja | Bestehendes `members_only`-/Owner-Gate bleibt vor der Profilausgabe; Metriken nur im bereits freigegebenen DTO. [VERIFIED: handler] |
| V5 Input Validation | ja | Slug bleibt bestehend validiert/encoded; keine neuen Inputs. [VERIFIED: handler/api helper] |
| V6 Cryptography | nein | Keine Kryptografie in Scope. [VERIFIED: phase boundary] |

### Known Threat Patterns for Public Profile/React
| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Hidden-profile metric leak | Information Disclosure | Alle Metriken ausschließlich innerhalb des bestehenden sichtbaren Profilresponses und nach Handler-Gate liefern. [VERIFIED: existing access flow] |
| Earned/private badge leak | Information Disclosure | `public_badges` weiterhin auf `visibility='public' AND status='active'` begrenzen; progress metrics dürfen keine privaten Badgezeilen offenlegen. [VERIFIED: repository] |
| Badge-Code-Duplikat/unknown code | Tampering/Integrity | Zentrale Ownership-Map, defensive Fallbacks und exactly-once Tests. [VERIFIED: D-06] |
| Unbounded DOM/scroll work bei zukünftigen Stufen | Denial of Service | Katalog ist lokal und klein; scroll listeners bleiben im globalen Carousel/Stage-Strip und werden bereinigt. [ASSUMED] |

**Auth regression:** Die sichtbare Badgefläche liegt auf dem öffentlichen `/members/[slug]`-Profil und funktioniert anonym; daher ist der „fehlender/abgelaufener Access Token + gültiger Refresh Token“-Browserfall für diese read-only Fläche nicht neu anzuwenden. Die bestehende Owner-Vorschau für `members_only` liest serverseitig optional einen Access-Token und ist ein vorbestehender SSR-Sonderpfad, den Phase 119 weder gater noch verändert; ein regressiver Handler/Page-Test für public versus hidden owner/non-owner bleibt sinnvoll. [VERIFIED: `page.tsx`, `app_public_profile.go`, auth-api-client.md]

## Schema Push / Contract Status

Keine Datenbankschemaänderung und damit kein Schema-Push ist erforderlich. Eine additive Response-Vertragsänderung muss im selben Plan in Go DTO, Repository, `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts` und Paritätstests landen; im Repository existiert kein separater generierter Schema-Push-Schritt für diesen Public-Profile-Vertrag. [VERIFIED: migration inventory/search, api-contracts.md]

## Likely Plan / Wave Boundaries

| Wave | Planinhalt | Abhängigkeit |
|---|---|---|
| 0 / Plan 119-01 | Fehlende Tests zuerst; Familienregistry-/Resolververtrag; FocalCarousel Single-item plus Phase-118-Gapregressionen | keine [VERIFIED: validation gaps] |
| 1 / Plan 119-02 | Exakte Familienmetriken im bestehenden Public-Profile-Read; Go/OpenAPI/TS atomar, keine Migration | 119-01 [VERIFIED: data gaps] |
| 2 / Plan 119-03 | `MemberBadgeChain`-Familienkarten, temporäre Auswahl, Locks, stage-strip auto-center, Special-Filter, unabhängige Raster; CSS responsive | 119-01/02 [VERIFIED: UI spec] |
| 3 / Plan 119-04 | Vollständige Regressionen, FansubProjectsGrid, typecheck/lint/build, diff check und Live-UAT 1440/1024/390 + Reduced Motion | 119-03 [VERIFIED: UI spec/AGENTS] |

## Sources

### Primary (HIGH confidence)
- `119-CONTEXT.md`, `119-UI-SPEC.md` — gesperrter Produkt-/UI-Vertrag. [VERIFIED: planning docs]
- Phase-118 Context/UI-SPEC/Research/Verification und Quick 260803-be5 — direkte Referenz und bekannte Gaps. [VERIFIED: planning docs/git log]
- `MemberBadgeChain*`, `memberBadgeLabels*`, `FocalCarousel*`, public member page/tests — reale Frontendowner. [VERIFIED: codebase grep]
- Go Public-Profile-Modell/Repositories/Badge-Service/Tests — reale Daten- und Schwellenowner. [VERIFIED: codebase grep]
- `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts` — bestehender Vertrag/Transport. [VERIFIED: codebase grep]
- AGENTS.md und referenzierte Engineering/UI/API/Auth-Dokumente — Projektconstraints. [VERIFIED: project docs]
- npm registry + Compose `npm list` — installierte und aktuelle Registryversionen, geprüft 2026-08-03. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Keine externen Sekundärquellen benötigt; dies ist codebase-spezifische Forschung. [VERIFIED: research scope]

### Tertiary (LOW confidence)
- Keine unbestätigten Webquellen. Annahmen stehen ausschließlich im Assumptions Log. [VERIFIED: research record]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — laufender Compose-Stack und Registry wurden geprüft. [VERIFIED: environment/npm]
- Architecture: HIGH — reale Datenflüsse, Owner und Phase-118-Implementierung wurden gelesen. [VERIFIED: codebase grep]
- Pitfalls: HIGH mit einer markierten Produktinterpretation — Datenlücken und Regressionen sind direkt belegt; Gründungsmitglied-Zielcopy braucht Bestätigung. [VERIFIED: codebase/planning]

**Research date:** 2026-08-03
**Valid until:** 2026-09-02 (stabiler interner Stack; bei Änderungen an Phase 118, Profil-DTO oder Badge-Service früher neu prüfen). [ASSUMED]
