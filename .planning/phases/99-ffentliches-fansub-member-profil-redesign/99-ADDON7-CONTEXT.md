# Phase 99 – Add-on 7: Vollständige visuelle Umsetzung /fansubs/[slug] nach Variante-B-Mockup (inkl. Farbsystem) – Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Source:** Nutzer-Auftrag nach Design-Review — die abgestimmten Variante-B-Mockups sind die verbindliche Spec. Grund: Add-on 6 lieferte Daten/Struktur, aber NICHT die abgenommene Optik (Executoren haben die alten Sichtkomponenten behalten und nur Daten reingehängt).
**Scope note:** Als Pläne `99-27+` an Phase 99 angehängt. ID-Namespace `AO7-*`. Decision-Coverage-Gate: `AO7-*` in `must_haves.truths` zitieren.

<domain>
## Phase Boundary

Die öffentliche Fansub-Profilseite `/fansubs/[slug]` funktioniert und hat die Daten, sieht aber noch weitgehend wie das **alte** Design aus. Add-on 7 setzt die abgenommenen **Variante-B-Mockups pixelnah als echte Komponenten** um — inkl. eines **token-basierten Farbsystems** (Type-Tags, Link-/Logo-Farben, Avatar-Akzente) und der **Skalierungsfälle** (20 Mitglieder / 30 Projekte / 40 Medien).

**Referenz-Implementierung (bereits fertig, gilt als visuelle Baseline):** Der **Team-Bereich** wurde bereits umgebaut auf kompakte Avatar-Zeilen (`FansubTeamActiveGroup.tsx`, `FansubTeamHistoricalGroup.tsx`, `FansubTeamSection.module.css`, `fansubTeamInitials.ts`): Avatar-Kreis mit Initialen (`--surface-sunken` Fläche, `--accent-primary` bzw. `--text-faint` Text) + Name + Rolle/Zeitraum in dünnen, zweispaltigen Zeilen mit `--border-subtle`-Trennlinien. **Dieselbe visuelle Sprache (Dichte, Avatare, Token-Nutzung, dünne Trennlinien statt großer Karten) gilt für alle übrigen Sektionen.**

**Nur `/fansubs/[slug]`.** Keine anderen Seiten. Section-Reihenfolge (aus AO5-03): Hero → Geschichte → Projekte → Team → Meilensteine → Community → Medien.
</domain>

<decisions>
## Implementation Decisions (locked) — Mockup ist die Spec

### AO7-00 (Farbsystem als Tokens — NEU, ausdrücklich vom Nutzer gewünscht)
In `frontend/src/styles/globals.css` ein **benanntes, semantisches Kategorie-/Link-Farbsystem** als CSS-Variablen ergänzen (Light, und falls Dark-Mode existiert entsprechend). Diese Tokens sind ab jetzt Teil des Team4s-Systems (keine Ad-hoc-Hex-Werte in Komponenten mehr — immer über Tokens).

- **Medien-Kategorie-Tags** (Fläche + Textfarbe je `category`), gedämpfte Fläche + dunkler Text derselben Familie:
  - `gallery` → Blau, `history_screenshot` → Violett, `old_website` → Violett-Grau, `forum` → Amber, `irc_chat` → Teal, `event_meeting` → Teal/Grün, `artwork_fanart` → Coral/Pink, `other` → Neutral-Grau.
  - Je Kategorie ein Token-Paar, z.B. `--tag-history-bg` / `--tag-history-fg` etc. Textfarbe MUSS auf der Fläche lesbar sein (dunkler Ton derselben Farbfamilie, nicht Schwarz/Grau).
- **Link-Typ-Farben (Logos/Chips)** je `link_type`:
  - `discord` → Discord-Blurple, `irc` → Neutral, `website` → `--accent-primary`, `twitter` → Neutral/Blau, `github` → Neutral-Dunkel.
  - Icon-Farbe je Typ über Token; Chip-Rahmen/Fläche neutral (`--surface-card` + `--border-strong`).
- **Avatar-Akzent:** aktive Mitglieder `--accent-primary`, historische `--text-faint` (bereits im Team umgesetzt — als Muster übernehmen).
Die konkreten Hex-Werte dürfen aus der abgestimmten Mockup-Palette stammen (Blau #85B7EB/#0C447C, Violett #7F77DD/#3C3489, Teal #5DCAA5/#0F6E56, Amber #EF9F27/#633806, Coral #D85A30/#993C1D, Pink #D4537E/#993556, Neutral #B4B2A9/#444441), aber NUR als benannte Tokens definiert, nicht inline.

### AO7-01 (Hero flacher/aufgeräumt)
Hero nach Mockup: Banner-Streifen oben, überlappender runder/abgerundeter Avatar (Gruppenlogo, sonst Initiale), Name + `aktiv`-Badge, Meta-Zeile („gegründet 2002 · Deutschland"), und die **Kennzahlen als kompakte 3er-Stat-Zeile** (Projekte/Releases/Mitglieder) integriert. Ruhiger, flacher Look (Token-Flächen, dünne Border), keine schweren Schatten/Doppelrahmen. Redundante Tag-Chips reduzieren.

### AO7-02 (Geschichte — mehrere Blöcke, sauber)
Mehrere Geschichts-Blöcke gestapelt (schon vorhanden), jeder mit Titel + eigenem „Mehr anzeigen"-Clamp; ruhige Lesespalte, dezente linke Kante/Abstand je Block, Token-Typografie.

### AO7-03 (Projekte — Banner-Karten + Lazy-Karussell, sichtbar umgesetzt)
- **Laufende** Projekte als **16:9-Banner-Karten**: Bannerbild (`banner_url`, Fallback `cover_image`, sonst Skeleton/Platzhalter), Titel als Overlay-Leiste unten (lesbarer Scrim, solide Fläche — kein Verlauf), Status-Pill, darunter Meta (Jahr · N Releases).
- **Abgeschlossen/Archiviert** als **horizontales Karussell**: `scroll-snap-type:x`, Pfeil-Buttons (@/components/ui) + Tastatur (←/→ scrollt die Bahn, `tabindex=0`, `aria-label`), **Skeleton** beim Lazy-Load der Banner (`loading="lazy"`, `srcset`/`sizes`), **„X weitere anzeigen"-Endkachel**, die restliche Karten inline aus dem geladenen Datensatz einblendet. KEIN Auto-Infinite-Scroll, KEINE eigene Seite.
- Muss visuell erkennbar Banner-Karten zeigen (nicht die alten Textkacheln).

### AO7-04 (Meilensteine farblich abgesetzt)
Historie-/Erfolge-Einträge als **Akzent-Blöcke** (getönte Fläche + farbige linke Kante über Token, z.B. `--accent-*`), Jahr farblich hervorgehoben, klar abgesetzt vom Rest.

### AO7-05 (Community — einheitliche Chips mit Logo-Farben)
Community-Links als **einheitliche Chips**: je ein klickbarer Chip mit **markentypischem Icon (lucide) in Link-Typ-Farbe (AO7-00)** + Name, Chip-Fläche/Rahmen neutral, `rel="noreferrer noopener"`. Kein Chip-neben-Klartext.

### AO7-06 (Medien — vollständige Skalierung + Farb-Tags + Lightbox, SICHTBAR)
Der eigentliche Nachhol-Punkt. Medien-Sektion muss real:
- **Gekappte Vorschau auf 5 Thumbnails**; ist die Gesamtzahl > 5, ist die **6. Kachel eine Überlauf-Kachel „+N weitere"** (N = Gesamt − 5), die die Lightbox am ersten verborgenen Bild öffnet.
- **„Alle N anzeigen"-Button**, der das Grid **inline batchweise** erweitert (KEIN Auto-Scroll, KEINE eigene Seite).
- Pro Kachel: Thumbnail (`loading="lazy"`, Skeleton mit fester Aspect-Ratio, `srcset`/`sizes`), **Titel**, **farbiger Typ-Tag** (deutsches Label + Kategorie-Farbe aus AO7-00), **2-Zeilen-Beschreibungs-Snippet** (`line-clamp: 2`), Maximize-Indikator.
- **Lightbox:** Klick auf ein Thumbnail ODER die Überlauf-Kachel öffnet die Lightbox mit **Originalbild** groß, **Weiter/Zurück durch ALLE** Medien (globaler Index), **voller** Titel + Beschreibung + farbiger Typ-Tag, Positions-Zähler „n / N", Esc/←/→, Fokus-Falle/-Rückgabe.
- **40-Bilder-Verhalten explizit:** Grid zeigt 5 + „+35 weitere"; „Alle 40 anzeigen" enthüllt inline; Lightbox blättert durch alle 40. Muss im UAT (mit ausreichend Seed- oder Testdaten) sichtbar geprüft werden.

### AO7-08 (Backend-Bugfix: Claim verknüpft members.user_id) — UMGESETZT
`VerifyClaim` setzt beim Bestätigen `members.user_id = legacy_user_id` des **claimenden** App-Users (`member_claims.app_user_id`), in der Verify-Tx, nur wenn noch NULL. Behebt den systemischen Bug, dass neu geclaimte Mitglieder dauerhaft `members.user_id=NULL` behielten → Domain-Projektion konnte Profil-Link/Slug/Zählung nie auflösen. Flow: Admin legt his an → User registriert sich als App-User → Claim → Admin bestätigt (hier wird verknüpft). Kein Backfill (Testdaten). Datei: `backend/internal/repository/member_claims_repository.go` `VerifyClaim`. Regressionstest: `TestMemberClaimsRepositoryVerifyLinksUserID`. **Status: fertig + live.**

### AO7-07 (Konsistente Dichte/Typografie über alle Sektionen)
Einheitliche Sektions-Header (klein/gedämpft wie im Team `subgroupTitle`), konsistente Kachel-/Zeilen-Abstände, keine überdimensionierten leeren Kästen, keine Doppel-Header — durchgehend im Team4s-Tokensystem, `@/components/ui`-Primitives für alle interaktiven Elemente (kein natives select/input/textarea/button).
</decisions>

<canonical_refs>
## Canonical References
- **Visuelle Baseline (bereits umgesetzt):** `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx`, `FansubTeamHistoricalGroup.tsx`, `FansubTeamSection.module.css`, `fansubTeamInitials.ts` — Avatar-Zeilen-Muster, Token-Nutzung.
- **Farb-/Label-Basis:** `frontend/src/lib/fansub-labels.ts` (category/link_type deutsche Labels aus Add-on 5) — hier die Farb-Token-Zuordnung ergänzen/nutzen.
- **Tokens:** `frontend/src/styles/globals.css` (`--color-primary`=#5f84dd, `--surface-sunken/-card/-card-muted`, `--text-primary/secondary/muted/faint`, `--border-subtle/-strong`, `--accent-primary/-soft/-dark`) — hier die AO7-00-Farb-Tokens definieren.
- **Sektionskomponenten (umzubauen):** `FansubHeroSection.tsx`, `FansubStorySection.tsx`/`FansubStoryBlock.tsx`, `FansubProjectsSection.tsx`/`FansubProjectBannerCard.tsx`/`FansubProjectsCarousel.tsx`, `FansubHistorySection.tsx`, `FansubCommunityLinksSection.tsx`, `FansubMediaSection.tsx`/`FansubGroupMediaBlock.tsx`/`FansubMediaLightbox.tsx`, `FansubPublicSections.module.css`, Route `frontend/src/app/fansubs/[slug]/page.tsx` + `page.module.css`.
- **Daten:** `PublicFansubProject.banner_url`, `PublicFansubMediaItem.{title,description,category,original_url}`, `stories[]`, `community_links[]`, `DomainProjectionHistoricalRow.{role_labels,joined_year,left_year,member_slug}` — alle im DTO vorhanden (Add-on 5/6).
- Design-System-Showcase: `/dev/ui-system`.
</canonical_refs>

<scope_fence>
## Scope Fence
**Erlaubt / Pflicht:** nur `/fansubs/[slug]`; `@/components/ui`-Primitives; ≤450 Zeilen (splitten); korrekte deutsche Umlaute; **neues Farbsystem als benannte Tokens** in globals.css (AO7-00) — danach nur noch Token-Referenzen, keine Inline-Hex in Komponenten; Bilder `loading="lazy"` + Skeleton + `srcset`/`sizes`; Karussell/Medien nur manuelle Enthüllung (kein Auto-Infinite-Scroll).
**Ausgeschlossen:** keine anderen Seiten; keine eigene Unteransichts-Seite; keine DB-Migration (Daten sind da); keine Änderung der Public-DTO-Struktur (nur Konsum); kein Video-Player.
</scope_fence>

<success_criteria>
## Success Criteria — VISUELL & konkret (nicht nur Tests)

- **Farbsystem** als Tokens in globals.css definiert; Type-Tags und Link-Chips nutzen ausschließlich diese Tokens (Grep: keine neuen Inline-Hex in fansub-Komponenten). [AO7-00]
- **Hero** flach/aufgeräumt mit integrierter Stat-Zeile, ohne schwere Doppelrahmen. [AO7-01]
- **Projekte** zeigen sichtbar **Banner-Karten**; viele Projekte → Karussell mit Pfeilen/←→ + „weitere anzeigen" + Skeleton (im UAT mit ≥ mehreren Test-Projekten gezeigt). [AO7-03]
- **Team** entspricht der bereits gelieferten Avatar-Zeilen-Baseline (Referenz). [AO7-07]
- **Meilensteine** farblich abgesetzt. [AO7-04]
- **Community-Chips** einheitlich mit farbigem Logo-Icon je Typ. [AO7-05]
- **Medien**: Vorschau exakt 5 + „+N weitere"-Kachel; „Alle N anzeigen" enthüllt inline; farbige Typ-Tags + 2-Zeilen-Snippet; **Lightbox** öffnet Original, blättert durch **alle**, voller Text + Zähler. **40-Bilder-Fall im UAT sichtbar demonstriert.** [AO7-06]
- Keine Doppel-Header, keine überdimensionierten leeren Kacheln; alles Team4s-Tokens + @/components/ui. [AO7-07]
- **Verifikation ist VISUELL** (Screenshot-Abgleich mit Mockup, Desktop + ≤390px) — Tests allein genügen NICHT für die Abnahme. Wo Seed-Daten fehlen (viele Projekte/Medien), werden Testdaten angelegt oder ehrlich als nicht-demonstriert vermerkt.
</success_criteria>

<verification_note>
Jeder Sektions-Plan MUSS im UAT einen **visuellen** Nachweis erbringen (Live-Screenshot-Abgleich mit dem Mockup, Desktop und mobil ≤390px). „typecheck/vitest grün" ist NUR ein Nebengate, KEINE Design-Abnahme — genau dieser Fehler ist in Add-on 6 passiert. Für die Skalierungsfälle (30 Projekte, 40 Medien) sind bei Bedarf temporäre Testdaten/Seeds anzulegen, damit Karussell-Überlauf, „+N weitere" und Lightbox-Durchlauf real gezeigt werden.
</verification_note>

---

*Phase: 99 – Add-on 7 (angehängt)*
*Context gathered: 2026-07-09 (Nutzer-Auftrag: Mockup als Spec, inkl. Farbsystem)*
