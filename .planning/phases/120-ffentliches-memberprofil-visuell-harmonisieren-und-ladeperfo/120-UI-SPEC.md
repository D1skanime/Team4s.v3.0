---
phase: 120
slug: ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-04
sources: 120-CONTEXT.md, 120-RESEARCH.md, 120-VALIDATION.md, Sketch 004 Hero B and Rhythm C, Phase 118/119 contracts, live code inspection
---

# Phase 120 — UI Design Contract

> Verbindlicher visueller, responsiver und interaktiver Vertrag für das öffentliche Memberprofil. `120-CONTEXT.md` und Sketch 004 sind gesperrt: Hero B bleibt exakt die Hero-Richtung; Rhythmus C regelt alle Bereiche darunter. Phase 118/119 bleiben für Badge-Sammlungen und `FocalCarousel` fachlich und visuell autoritativ.

## Design System

| Eigenschaft | Vertrag |
|---|---|
| Tool | Projektinternes Team4s-UI-System; kein shadcn und kein zweites Designsystem |
| Preset | nicht anwendbar |
| Komponenten | Bestehende `Card`, `Badge`, `Button`, `SectionHeader`, `AccentRule`, `EmptyState`, `ErrorState` und genau die globale `FocalCarousel`-Seam |
| Icons | `lucide-react`; bestehende Icons weiterverwenden, keine neue Iconbibliothek |
| Font | `var(--font-sans)`: Inter, Segoe UI, system-ui, sans-serif |
| Styling | CSS Modules plus globale Tokens aus `frontend/src/styles/globals.css`; `--ui-line: #82122c` wird konsumiert, nicht lokal dupliziert |
| Bildauslieferung | `next/image` für statische Badge-Assets; bestehende Upload-/`media_files`-Varianten-Seams für Member-/Gruppenmedien, sofern der technische WebP-Suitability-Gate bestanden ist |

`components.json`, Tailwind- und shadcn-Konfiguration fehlen; das produktive Team4s-UI-System ist bereits vorhanden. shadcn-Initialisierung und Drittanbieter-Blocks sind in dieser Harmonisierung unzulässig.

## Quellenpriorität und Scope

1. `120-CONTEXT.md` und Sketch 004 Hero B/Rhythmus C sind gesperrt.
2. Für Rollen-, Fortschritts-, Punkte-, Beitrags-, Mitgliedschafts- und Spezial-Sammlungen gelten Phase 118/119; diese Phase ändert weder Schwellen, Reihenfolge noch Earned-/Locked-Semantik.
3. Globale Tokens und Komponenten schlagen lokale Neudefinitionen.
4. Die Phase ist eine visuelle und Rendering-Harmonisierung. Keine neuen Profilinhalte, Filter, Tabs, Punktequellen, Badges, Uploadfunktionen, Endpunkte oder parallelen Carousels.

## Seitenkomposition und Informationshierarchie

Die Seite verwendet weiterhin `--public-page-max-width` und `--public-page-gutter`. Die Reihenfolge ist verbindlich:

1. Schmale Werkzeugleiste mit Breadcrumb links und Owner-/Korrekturaktionen rechts.
2. Hero B über die volle Inhaltsbreite.
3. Hauptabschnitt `Profil und Mitgliedschaft` mit zwei gleichwertigen Cards: `Fansub-Geschichte` und `Gruppenzugehörigkeit`.
4. Vollbreiter Hauptabschnitt `Aktuelle Projekte`.
5. Badge-Hauptabschnitte in der Phase-119-Reihenfolge: `Rollenfortschritt`, `Fortschritt`, `Punkte-Meilensteine`, `Beiträge`, `Mitgliedschaft`, `Besondere Auszeichnungen`. Nicht vorhandene earned-only Bereiche bleiben vollständig ausgeblendet.
6. Hauptabschnitt `Beiträge` mit zwei Cards: `Letzte Beiträge` und `Frühere Mitwirkungen`.

Jeder sichtbare Hauptabschnitt besitzt genau eine semantische H2 und direkt darunter die globale Weinlinie. Card-Titel sind H3. Es gibt keine zusätzliche H2 `Auszeichnungen`, die die sechs Badge-Kategorien auf H3 herabstuft. Ein unsichtbarer Gruppierungscontainer darf die Badge-Bereiche zusammenhalten, aber keine konkurrierende sichtbare Überschrift einführen.

Desktop nutzt den kontrollierten Wechsel aus Paar, Vollbreite und Paar. Tablet und Mobile bleiben in derselben Lesereihenfolge. DOM-Reihenfolge entspricht der visuellen Reihenfolge; CSS-Grid darf keine semantische Umordnung erzeugen.

## Hero B — gesperrter visueller Vertrag

- Das gespeicherte, vom Member zugeschnittene `background_image.public_url` füllt die gesamte Hero-Fläche. `source_original_url` wird nie öffentlich gerendert.
- Der gespeicherte Zuschnitt wird respektiert: `object-fit: cover`, symmetrische Zentrierung, kein zusätzliches `center 42%`, kein automatisches Verschieben auf eine vermutete Motivseite.
- Die Lesbarkeitszone ist ein moderater, weich auslaufender horizontaler Verlauf ausschließlich hinter Avatar und Text. Sie beginnt links dunkel genug für AA-Lesbarkeit und läuft spätestens bei etwa 65% der Breite weitgehend transparent aus. Keine starke Vollflächenabdunklung, kein Blur über dem Motiv.
- Helle und dunkle Uploads müssen funktionieren. Weißer Text erhält einen ruhigen Textschatten; Status-Badges und Punktzahl liegen auf kompakten, halbtransparenten Flächen mit sichtbarer Kontur. Das Bild bleibt außerhalb der Copy-Zone unverfälscht erkennbar.
- Desktop: Mindesthöhe 230 px, 140 px runder Avatar, 24 px Gap, 32 px Innenabstand. Tablet: Mindesthöhe 220 px, 120 px Avatar, 24 px Innenabstand. Mobile: einspaltig, mindestens 100 px Avatar, 16 px Innenabstand; Höhe wächst mit vollständigem Text.
- Name ist H1 und dominante Information. Status steht ruhig in derselben flexiblen Titelzeile; Punktzahl folgt kompakt darunter; Bio und Aktivitätsmetadaten folgen in dieser Reihenfolge und werden nicht abgeschnitten oder mit Ellipse versehen.
- Bio darf umbrechen und wird nicht auf zwei Zeilen geklemmt. Sehr lange Wörter und Namen verwenden `overflow-wrap:anywhere`; alle flex/grid-Kinder erhalten `min-width:0`.
- Der Hintergrund reserviert die komplette Hero-Geometrie vor dem Netzwerkladen. Avatar und Hero-Hintergrund erhalten beide Ladepriorität gemäß D-19. Die Implementierung darf die konkreten `fetchPriority`-/Preload-Semantiken anhand der LCP-Messung abstimmen, aber keinem der beiden Bilder die priorisierte Auslieferung entziehen.
- Ohne Hintergrund bleibt dieselbe Geometrie mit dem bestehenden ruhigen Hero-Fallback erhalten. Ohne Avatar erscheint die Initiale in derselben runden Fläche.

## Rhythmus C und Flächen

- Nach dem Hero wechseln Hauptabschnitte zwischen Canvas und einem subtil abgesetzten Vollbreitenband. Das Band verwendet bestehende Flächen-Tokens, bevorzugt `--surface-card-muted` beziehungsweise eine tokenbasierte Mischung mit `--surface-sunken`; keine neue lokale Blau-/Rotfläche.
- Ein Band darf bis an die innere öffentliche Seitenkante reichen, niemals über den Viewport. Kein `100vw`, keine negativen Margins, kein horizontales Clipping als Reparatur.
- Abschnittspadding: Desktop 32 px block/32 px inline, Tablet 24 px, Mobile 24 px block/16 px inline. Zwischen Bandabschnitten liegen 16 px; die visuelle Gesamtkadenz beträgt 32–48 px.
- H2 und Weinlinie bleiben sichtbar, wenn tiefer Inhalt noch nicht interaktiv aktiviert ist. Die Linie ist 2 px stark, volle verfügbare Abschnittsbreite und nutzt ausschließlich `var(--ui-line)`.
- Cards verwenden `var(--surface-card)`, `var(--border-subtle)`, `var(--radius-lg)` und höchstens `var(--shadow-sm)`. Keine Card-in-Card-Hüllen, wenn Grid und Spacing reichen.

## Spacing Scale

| Token | Wert | Nutzung |
|---|---:|---|
| `xs` | 4 px | Icon-/Text-Mikroabstand |
| `sm` | 8 px | Chips, kompakte Inline-Gruppen |
| `md` | 16 px | Mobile-Innenabstand, Grid-Gap |
| `lg` | 24 px | Tablet-/Card-Padding, Hero-Gap |
| `xl` | 32 px | Desktop-Band-/Hero-Padding |
| `2xl` | 48 px | großer Abschnittsrhythmus |
| `3xl` | 64 px | oberes Seitenmaximum, nur wo bestehende Public-Gutter-Tokens es verlangen |

Alle neuen Abstände verwenden nur 4, 8, 16, 24, 32, 48 oder 64 px. Ausnahmen sind keine Spacingwerte: 2 px Weinlinie, 44 px Mindest-Touchziel, 100/120/140 px Avatar und durch Inhalte/Seitenverhältnisse bestimmte Medienmaße.

## Typography

Es gelten genau zwei Gewichte: 400 und 700. Bestehende 800/850/900-Gewichte in der betroffenen öffentlichen Profilfläche werden auf 700 vereinheitlicht.

| Rolle | Größe | Gewicht | Zeilenhöhe |
|---|---:|---:|---:|
| Body, Meta, Controls | 14 px | 400 oder 700 | 1.5 |
| H3/Card-Titel | 18 px | 700 | 1.2 |
| H2/Hauptabschnitt | 24 px | 700 | 1.2 |
| H1/Membername | 32 px auf allen Viewports | 700 | 1.05 |

Eyebrows verwenden die 14-px-Rolle, 700, 0.08–0.12 em Versalsperrung. Keine weitere lokale Textgröße wird für neue Phase-120-Komposition eingeführt; geerbte Badge-Mikrolabel aus Phase 118/119 bleiben unangetastet.

## Color

| Anteil | Token/Wert | Nutzung |
|---|---|---|
| Dominant 60% | `--surface-canvas` / `--bg-primary` | Seitenfläche und ruhige Zwischenräume |
| Secondary 30% | `--surface-card`, `--surface-card-muted`, `--surface-sunken`, `--border-subtle` | Cards, alternierende Bänder, Skeletonflächen |
| Accent 10% | `--ui-line: #82122c`, bestehende `--color-primary` und Badge-/Rollenakzente | Weinlinie unter H2; primäre Owneraktion/Fokus; aktuelle Badge-Stufe und bestehende Fortschrittsfüllung |
| Destructive | nicht verwendet | öffentliche Profilansicht enthält keine destruktive Aktion |

`--ui-line` ist ausschließlich für H2-Unterlinien und bereits etablierte Wine-Designsystemdetails reserviert. Es wird nicht als Hero-Overlay, Bandfüllung, Linkfarbe oder großflächiger Card-Hintergrund verwendet. Farbe allein kodiert keinen Status; Statuscopy, Schloss, `Aktuell`/`Ausgewählt` und semantische Attribute bleiben erhalten.

## Responsive Layout Contract

| Viewport | Seiten-/Hero-Verhalten | Abschnitte und Cards | Badge/Carousel |
|---|---|---|---|
| Mobile ≤760 px | 12 px Seitenrand über Public-Gutter-Vertrag; Werkzeugleiste stapelt; Hero einspaltig, 100 px Avatar | alle Paare eine Spalte; Bandpadding 24×16 px; Actions umbrechen ohne Überlauf | aktive Card 86–90%, kleiner Folgeanschnitt; große Medaille 248 px; kleine Badges 56–72 px beziehungsweise Phase-119-Strip horizontal scrollbar |
| Tablet 761–1099 px | Hero 120 px Avatar; Werkzeugleiste darf umbrechen | Profil-/Mitgliedschaftspaar nur zweispaltig, wenn beide Spalten ≥320 px bleiben, sonst eine Spalte; Beitrags-Paar gleich | aktive Card 72–76%; große Medaille 280 px; Controls 44 px |
| Desktop ≥1100 px | Hero 140 px Avatar; schmale einzeilige Werkzeugleiste wenn Platz reicht | beide festgelegten Paare `repeat(2,minmax(0,1fr))`; Projekte und jede Badge-Kategorie vollbreit | aktive Rollen-Card `min(60%,720px)`; große Medaille 320 px; Nachbarn sichtbar wie Phase 118 |

- Jede Ebene setzt `min-width:0`; Bilder verwenden feste intrinsische Maße oder `aspect-ratio`; Texte dürfen vertikal wachsen.
- Keine Seite, Bandfläche, Card, Stufenleiste oder Toolbar erzeugt globales horizontales Scrollen. Nur die in Phase 119 ausdrücklich erlaubte lange mobile Stufenleiste darf innerhalb ihrer eigenen Region horizontal scrollen.
- 390, 768 und 1440 px sind Pflichtabnahmen. Zusätzlich sind 320 px und 200% Zoom ohne Verlust von Information oder Aktion zu prüfen.

## Badge- und Carousel-Vertrag

- Jede sichtbare Badge-Kategorie erhält eine H2 plus Weinlinie. Darunter folgt das unveränderte Phase-118/119-Sammlungsmuster.
- Rang, aktueller Wert, nächstes Ziel und Restmenge sind ohne Interaktion sichtbar. Kategorien mit mehreren Sammlungen zeigen Card-H3 plus `{n} von {m} Sammlungen`; keine Dots, Tabs oder zweite Navigationsleiste.
- Genau `frontend/src/components/ui/FocalCarousel.tsx` besitzt Messung, Drag, Momentum, Wheel, Snap, Controls, Zähler, Fokus und Reduced Motion. `MemberBadgeChain` bleibt fachlicher Consumer. Kein lokaler Observer-Carousel, keine weitere Scroll-/Snap-Implementierung.
- SSR rendert alle sichtbaren Profil- und Badge-Inhalte in finaler Reihenfolge. Vor Aktivierung ist der Carousel-Track statisch lesbar; nur ResizeObserver, Messschleifen, Pointer-/Wheel-Handler, Momentum und Snap sind deaktiviert.
- Aktivierung geschieht einmalig über eine generische `interactionEnabled`-/Defer-Grenze am globalen `FocalCarousel`, Startwert `rootMargin: 600px 0px`. Nach Eintritt bleibt sie aktiv. Fehlt `IntersectionObserver`, wird sofort aktiviert.
- Controls sind vor Aktivierung entweder sichtbar deaktiviert oder werden geometrisch reserviert; ihr Erscheinen darf Track oder Cards nicht verschieben. Nach Aktivierung gelten alle Phase-118-Eingabe-, Endpunkt-, A11y- und Reduced-Motion-Verträge unverändert.
- Phase-119s derzeitige, nicht abgeschlossene und schmutzige Änderungen an `MemberBadgeChain`, `FocalCarousel`, `LatestContributionsSection`, CSS und Tests sind fremde Ownership. Umsetzung startet erst vom finalen Phase-119-Stand und darf diese Dateien weder resetten noch breit formatieren.

## Loading, Skeleton und CLS-Vertrag

### Above the fold

Werkzeugleiste, Hero und das Paar `Fansub-Geschichte`/`Gruppenzugehörigkeit` sind im initialen SSR vollständig vorhanden. Sie zeigen keine nachträgliche Client-Skeleton-Phase. Fehlende Inhalte verwenden den echten leeren/ausgeblendeten Zustand; kein künstliches Flackern.

### Tiefe Bereiche

- H2, Beschreibung und Weinlinie sind sofort sichtbar. Nur die Inhaltsfläche kann einen ruhigen Skeleton-Layer tragen.
- SSR-Inhalt bleibt im DOM und für Nicht-JS lesbar. Ein Skeleton ist `aria-hidden="true"`; der echte Inhalt wird nicht doppelt im Accessibility Tree exponiert. Kein `ssr:false` für `MemberBadgeChain` oder Profilsektionen.
- Skeleton und Endinhalt verwenden dieselbe Gridspaltenzahl, denselben Gap, dieselbe Card-Anzahl aus den bereits serverseitig bekannten Daten und dieselben `min-height`-/`aspect-ratio`-Variablen.
- Projekt-Skeleton: je realer initial sichtbarer Projektkarte dieselbe 2:3-Coverfläche und mindestens die bestehende 136-px-Cardhöhe; Mobile übernimmt die bestehende 102-px-Mindesthöhe.
- Badge-Skeleton: Carousel-Viewport, Controlszeile und aktive Card reservieren exakt die geerbte Phase-118/119-Geometrie. Rollen nutzen 320/280/248 px große Medaillenfläche; andere Sammlungen verwenden ihre finalen CSS-Custom-Properties und Mindesthöhen, keine pauschale Ersatzhöhe.
- Beitrags-Skeleton: dieselbe Anzahl initial sichtbarer Zeilen, 48 px Thumbnail-/Iconfläche, gleiche Card-Paddings; Desktop-Paar und Mobile-Stapel sind schon vor Austausch final.
- Wechsel Skeleton → Inhalt ausschließlich per sofortiger Sichtbarkeit oder Opacity ohne Änderung von `display`, Blockhöhe, Skalierung, Margin oder Padding. Keine Größenanimation, kein Crossfade, der währenddessen beide Höhen addiert.
- Bildbreite/-höhe oder `aspect-ratio` werden vor dem Request gesetzt. Fontmetriken bleiben Systemfont-basiert; keine späte Webfont darf den Profilfluss verschieben.
- Ziel: kein wahrnehmbares Ruckeln und im Trace kein durch Phase-120-Komponenten verursachter Layout Shift bei 390/768/1440 px. Ein beobachtbarer Shift ist ein Blocker, nicht nur eine Optimierungsempfehlung.

## Responsive Image Delivery und Renderer-Reuse

### Größen- und Ladevertrag

| Asset | CSS-Ziel | auszuliefernde Breiten | verbindliches `sizes`/Laden |
|---|---|---|---|
| kleine Badge-Stufe | 56–96 px | WebP 128 und 160 px | `(max-width: 520px) 72px, 96px`; lazy außer sichtbar priorisiertem Hero |
| große aktive Medaille | 248/280/320 px | WebP 512 und 640 px | `(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px`; lazy |
| Avatar | 100/120/140 px | WebP 128 und 256 px | `(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px`; priorisiert gemäß D-19 |
| Projektcover | 68–90 px | WebP 96 und 192 px | `(max-width: 720px) 68px, 90px`; lazy |
| Hero-Hintergrund | volle Public-Shell, gespeicherter 5:1-Crop | WebP 640, 1080, 1480 und 1920 px | shell-/viewport-basiertes `sizes`; priorisiert gemäß D-19 |
| Gruppenlogo im Profil | 52 px | WebP 64 und 128 px | `52px`; lazy |

Badge-PNG-Quellen unter `frontend/public/member-achievement-badges/` bleiben unverändert erhalten. Die normale Profilansicht liefert gecachte WebP-Varianten; Alpha, Farben und Kanten müssen bei 160/640 px gegen repräsentative Rollen-, Fortschritts-, Punkte-, Beitrags-, Mitgliedschafts- und Spezial-Assets visuell verglichen werden. Fehlendes oder fehlerhaftes Derivat fällt auf die Original-URL mit identischer reservierter Geometrie zurück; ein gebrochenes Bild oder Layoutwechsel ist unzulässig.

### Bestehende Renderer-Seams — verpflichtende Wiederverwendung

Die Codeprüfung bestätigt:

- `backend/internal/handlers/admin_content_release_version_media.go::generateRVMThumbnail` dekodiert reale Uploadformate und skaliert mit `imaging.Resize(..., imaging.Lanczos)`; Gruppenmedia nutzt dieselbe Funktion in `backend/internal/handlers/fansub_media_upload.go`.
- `backend/internal/handlers/app_profile.go::UploadOwnProfileAvatar` und `UploadOwnProfileBackground` dekodieren/re-samplen bereits Uploads, speichern den zugeschnittenen Display-Stand und bewahren `source_original`.
- `backend/internal/repository/member_profile_repository.go::AttachUploadedAvatar`/`AttachUploadedBackground` sowie `media_files.variant` bilden bereits die Variantenpersistenz.
- `backend/internal/services/media_service.go` ist die vorhandene generische Upload-/Speicher-Seam.

Diese vorhandenen Decode/Resize-, Speicher- und Variantenpfade müssen, wo fachlich passend, extrahiert beziehungsweise erweitert werden; eine zweite Profilbild-Pipeline ist verboten. Insbesondere sollen Hero-, Avatar- und Gruppenlogo-Derivate über denselben zentralen Renderer-/`media_files`-Variantenvertrag entstehen und gemeinsam Cache-, Cleanup- und Fallback-Regeln besitzen.

Technischer Suitability-Gate: Der aktuelle Go-Stand kann WebP nur dekodieren; `imaging.Save` und `saveAsWebP` liefern ohne einen echten WebP-Encoder kein garantiertes WebP. Vor Planung der Implementierung muss ein fokussierter Encode-Smoke-Test belegen, dass die gewählte Erweiterung echte `image/webp`-Bytes erzeugt, Alpha erhält und in Docker reproduzierbar läuft. Bis dieser Gate grün ist, bleiben Next Images bestehende Optimizer-Derivate für statische Badge-PNGs zulässig; Upload-Originale dürfen niemals destruktiv ersetzt oder falsch als WebP bezeichnet werden.

Derivate werden beim Upload oder in einem kontrollierten, idempotenten einmaligen Generate-on-miss-Pfad erzeugt und gecacht, niemals bei jedem Profilaufruf. Austausch/Löschung eines Assets entfernt oder invalidiert seine eigenen Derivate über die bestehende Asset-Cleanup-Grenze. Keine externen URL-Patterns oder offenen Bildproxy-Regeln; nur bekannte Team4s-Media- und statische Assetpfade sind erlaubt.

### Sicherer Fallback

1. Browser wählt passende WebP-Variante über `srcset`/`sizes` beziehungsweise `next/image`.
2. Fehlt die Variante oder schlägt die Optimierung kontrolliert fehl, wird exakt die gespeicherte Display-Original-URL verwendet.
3. Fehlt auch diese, greift die bestehende Initialen-/Artwork-Fallbackfläche in derselben Größe.
4. `source_original` ist nie öffentlicher Fallback.

## Daten-zu-Komponenten-Mapping

| Datenfeld | Darstellung/Komponente | Vertrag |
|---|---|---|
| `fansub_name` | semantisches H1 im Hero | vollständig, dominante Copy, sicherer Umbruch |
| `is_verified`, `profile_status` | bestehende `VerifiedBadge`, `MemberStatusPill` | neben H1, keine neue Statuslogik |
| `total_points` | bestehende `HeroMetrics` oder kompakte gleichwertige globale Komposition | Label `Punkte`, kein editierbares Control |
| `bio`, Aktivitätsdaten, Rollen | Body/Metazeile | vollständig lesbar, serverseitig vorhanden |
| `avatar.public_url`, `background_image.public_url` | responsive Bildkomponente | Display-Crop, feste Geometrie, Original-Fallback |
| `member_story_html` | bestehender `MemberStorySection`/sanitized renderer | H3 `Fansub-Geschichte` innerhalb des H2-Paars |
| `memberships` | bestehende `MembershipsSection`, globale `Card` | H3 `Gruppenzugehörigkeit`; Logo 52 px responsiv |
| `current_projects` | bestehende `MemberCurrentProjectsSection` | vollbreiter H2-Abschnitt, projektinterne Titel H3 |
| `public_badges`, `badge_progress` | bestehende `MemberBadgeChain` + globales `FocalCarousel` | sechs H2-Kategorien, Phase-118/119-Semantik unverändert |
| `latest_contributions`, `previous_contributions` | bestehende Sections im gemeinsamen H2 `Beiträge` | zwei H3-Cards auf Desktop, eine Spalte mobil |
| Owner-/Report-Rechte | bestehende `OwnProfileEditLink`, `CorrectionReportModal` | Werkzeugleiste; keine neue Berechtigungs- oder Authlogik |

Die Fläche ist read-only. Es werden keine neuen Form Controls eingeführt. Auth bleibt serverseitig/request-scoped; ein fehlendes Access-Token bei gültiger Refresh-Session darf Owneraktionen nicht fälschlich als ausgeloggt behandeln.

## Copywriting Contract

| Element | verbindliche Copy |
|---|---|
| Owner-CTA | `Profil bearbeiten` |
| Sekundäraktion | `Korrektur melden`; visuell zurückhaltend beziehungsweise im Overflow, nie Hero-dominant |
| Hauptabschnitte | `Profil und Mitgliedschaft`, `Aktuelle Projekte`, `Rollenfortschritt`, `Fortschritt`, `Punkte-Meilensteine`, `Beiträge`, `Mitgliedschaft`, `Besondere Auszeichnungen`, `Beiträge` |
| Card-Titel | `Fansub-Geschichte`, `Gruppenzugehörigkeit`, `Letzte Beiträge`, `Frühere Mitwirkungen` |
| Sammlungszähler | `{n} von {m} Sammlungen` |
| Profilfehler | `Profil konnte nicht geladen werden.` plus Aktion `Erneut laden` |
| Nicht gefunden | `Mitglied nicht gefunden.`; bestehender Rückweg bleibt verfügbar |
| Projektleerstand | `Keine aktuellen Projekte.`; keine Fake-Projektkarte |
| Leere Badge-Kategorie | gesamter Abschnitt ausgeblendet; keine Null-/Lock-Platzhalter |
| Leere Beiträge | jeweilige leere Card ausblenden; wenn beide leer sind, gesamter H2-Bereich ausblenden |
| Destruktiv | keine destruktive Aktion und keine Bestätigung in dieser Phase |

Alle sichtbaren deutschen Texte verwenden korrekte Umlaute. Interne ASCII-Bezeichner bleiben davon unberührt.

## Accessibility und Motion

- Ein H1 pro Seite; Hauptabschnitte H2; Card-Titel H3. `aria-label` ergänzt, ersetzt aber keine sichtbare Überschrift.
- Textkontrast mindestens WCAG AA auf repräsentativen sehr hellen und sehr dunklen Hero-Uploads. Status bleibt ohne Farbe verständlich.
- Interaktive Ziele mindestens 44×44 px; sichtbarer globaler Fokusrahmen; logische Tabreihenfolge aus DOM-Reihenfolge.
- Skeletons sind nicht fokussierbar, nicht live und `aria-hidden`. SSR-Inhalt bleibt zugänglich.
- `prefers-reduced-motion: reduce`: keine Momentum-Projektion, keine Scale-/Glow-Übergänge, keine Skeleton-Crossfades; Aktivierung sofort oder höchstens 80–120 ms wie Phase 118.
- Bildfehler dürfen keine wiederholte Live-Region oder Endlosschleife auslösen. Fallback wird höchstens einmal pro Asset gewählt.

## Zustandsmatrix

| Zustand | Ausgabe |
|---|---|
| öffentliches Profil | vollständige gesperrte Reihenfolge, SSR-Inhalt, gestaffelte Interaktion |
| `members_only`, fremder/anon Viewer | bestehende Hidden-Ansicht; keine öffentlichen Badge-/Bilddaten leaken |
| Owner-Preview | bestehende autorisierte Preview; Owneraktion in Werkzeugleiste |
| fehlendes Hintergrundbild | identische Hero-Geometrie mit bestehendem neutralem Fallback |
| sehr helles/sehr dunkles Hintergrundbild | lokale Copy-Zone hält AA; Motiv außerhalb bleibt sichtbar |
| fehlendes Derivat | Display-Original mit identischen Maßen; nie `source_original` |
| JS deaktiviert/Observer fehlt | vollständiger SSR-Inhalt; bei fehlendem Observer Interaktion sofort aktiv |
| eine Sammlung | ruhige Einzelkarte ohne Pfeile/Dots |
| mehrere Sammlungen | globales FocalCarousel, Zähler `{n} von {m} Sammlungen` |
| keine earned-only Auszeichnung | zugehöriger Bereich vollständig ausgeblendet |
| Daten-/Netzwerkfehler | auf Profil beziehungsweise betroffene Entity begrenzter `ErrorState`; keine Null-Daten als Erfolg darstellen |

## Planer- und Ownership-Grenze

Jeder Phase-120-Plan muss vor Änderungen mindestens folgende `read_first`-Dateien nennen:

- `.planning/phases/120-*/120-CONTEXT.md`, `120-RESEARCH.md`, Sketch 004 README/index.
- Phase-118 `118-CONTEXT.md`/`118-UI-SPEC.md`, Phase-119 `119-CONTEXT.md`, finaler Summary/Diff und die aktuell schmutzigen Ownership-Dateien.
- `frontend/src/app/members/[slug]/page.tsx`, `page.module.css`, Route-Tests.
- `MemberProfileHero.tsx`, `profile.module.css`, `MemberBadgeChain.tsx/.module.css`, `FocalCarousel.tsx/.module.css`, Projekt-/Mitgliedschafts-/Story-/Beitragssektionen und Tests.
- `frontend/src/styles/globals.css`, `frontend/src/components/ui/SectionHeader.tsx`, `ui.module.css`, `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`, `docs/engineering/implementation-contract.md`, `docs/frontend/auth-api-client.md`.
- Für Bildarbeit: `frontend/next.config.mjs`, `frontend/src/app/media/[...path]/route.ts`, `backend/internal/services/media_service.go`, `backend/internal/handlers/admin_content_release_version_media.go::generateRVMThumbnail`, `backend/internal/handlers/fansub_media_upload.go`, `backend/internal/handlers/app_profile.go`, `backend/internal/repository/member_profile_repository.go`, relevante Media-/Profile-Tests und Vertragsdateien.

Kein Plan darf `MemberBadgeChain`, `FocalCarousel` oder `LatestContributionsSection` gegen den aktuellen HEAD zurücksetzen. Neue Arbeit erweitert den finalen Phase-119-Stand in kleinen zielgerichteten Diffs.

## Verification Matrix

| Viewport/Zustand | Pflichtprüfung |
|---|---|
| 1440×900 Desktop | Hero B, zwei festgelegte Paare, Vollbreitenprojekte/-badges, Rhythmus-C-Bänder, 140-px-Avatar, keine leere Fläche oder Überbreite |
| 768×1024 Tablet | kontrollierter Pair-Fallback, 120-px-Avatar, Carousel-Geometrie, Actions und H2-Linien ohne Clipping |
| 390×844 Mobile | Werkzeugleiste wrappt, Hero einspaltig mit 100-px-Avatar, vollständige Bio/Meta, jede Section eine Spalte, keine globale X-Achse |
| 320 px / 200% Zoom | vollständige Texte und Controls, keine Überlagerung oder verlorene Aktion |
| heller/dunkler sowie links/rechts markanter Crop | gespeicherter Zuschnitt sichtbar, lokale Lesbarkeitszone, AA-Kontrast |
| langsames Netz/CPU | reservierte Maße, strukturgleiche Skeletons, kein sichtbarer Shift/Jank |
| JS off / Observer fehlt | SSR-Inhalt lesbar; no-observer fallback aktiviert Interaktion |
| Reduced Motion | kein Momentum/Scale/Glow; kurzer oder sofortiger Snap |
| Bildnetzwerk | WebP 128/160 und 512/640 für Badges, passende Hero/Avatar/Logo/Cover-Breiten, Cache-Hit, Original-Fallback |
| Authvarianten | anonymous/public, hidden/fremd, owner-preview, gleicher slug mit verschiedener Auth; keine request-übergreifende Leckage |

Automatisierte Gates: Route-Loader-Dedupe und Auth-Isolation, SSR-Inhalt vor Aktivierung, Mock-IntersectionObserver/no-observer, Bildprops/`sizes`/Priority/Lazy, echter WebP-MIME-/Alpha-Smoke, Original-Fallback, Carousel-Regressionen und `git diff --check`. Live UAT nutzt die sichtbare Navigation zur echten `/members/{slug}`-Route im gemeinsamen In-App-Browser; Headless-Tests ersetzen diese Abnahme nicht.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | keine | nicht anwendbar; shadcn nicht initialisiert |
| Drittanbieter | keine | keine Registry-Nutzung zulässig |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
