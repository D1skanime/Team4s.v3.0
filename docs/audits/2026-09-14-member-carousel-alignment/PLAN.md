# Profil-Karussells an Anime-Projekte ausrichten

Basis: f40eb8a8. Referenz: Nutzer-Screenshot, bestehende AnimeProjectAchievementStage; Route /members/qc.

Vorher im gemeinsamen Browser bei 1280 px: Rollenkarte und Beitragskarte jeweils x=280.5 / Breite=720; Anime-Projektkarte x=77 / Breite=1127.

## Ziel / Ausführung

1. Bestehendes FocalCarousel um die fachlogikfreie Darstellung `full-width` ergänzen; Standard `focal` bleibt für andere Consumer erhalten. Profil-Karussells nutzen die neue Variante. Keine zweite Scroll-/State-/Navigationslogik.
2. Aktive Karte nutzt die ganze Abschnittsbreite. Medaille links, bestehender Text/Status/Fortschritt rechts, Stufen darunter. Gleiche 16px-Innenabstände und gemeinsame Artwork-Slots wie Anime-Projekte. Auf schmalen Containern bleibt das Artwork oberhalb des Texts. Farben, Medaillen, Schwellen, Texte und Abschnittsreihenfolge bleiben fachlich unverändert.
3. Pfeile bei mehreren Einträgen unter der Karte; bei einem Eintrag weiterhin keine Pfeile/Zähler/Disclosure. Seitenwechsel per Tastatur, Pointer und bestehendem Scroll-Snap. Kein globaler Overflow-Hack. Ausgeklappte Übersicht bleibt ein Grid.
4. Alte Profil-Breitenvorgaben entfernen, neue Variante im UI-System dokumentieren und im bestehenden Karussell-Stressbeispiel zeigen.
5. Vorhandene Tests, Typecheck, Lint, isolierter Build sofern möglich, diff --check. Browser: 390/768/1440, schmale Einbettung im breiten Viewport, bestehende 562/658px-Containergrenzen, Zoom/Reflow, mehrere Rollen und Beitragskarten, einzelne Rolle, Navigationszustand und kein Root-Overflow.

## Vorab gelesene Wiederverwendungsstellen

AGENTS.md, AI-HANDOFF.md (bereits im laufenden Auftrag gelesen), docs/engineering/implementation-contract.md, docs/frontend/ui-system.md, docs/agent-guidelines-ui.md; FocalCarousel.tsx/Internals.tsx/module.css/test.tsx; MemberBadgeChain.tsx/module.css/test.tsx; RoleAchievementCard.tsx und RoleBadgeCard-Styles; AnimeProjectAchievementStage.tsx und AnimeProjectStage.module.css; AchievementArtwork.module.css; ContributionAchievementStage.module.css; AchievementBadgeShowcase.tsx.

## Responsive Geometrie und Scope

FocalCarousel besitzt bereits seinen Inline-Container. Die neue volle Breite benötigt keinen zusätzlichen Breakpoint; 44px-Pfeile plus 8px-Abstand passen unter der Karte. Die vorhandenen achievement-card-Container entscheiden weiterhin bei 562px über zwei Spalten (216px Artwork + 24px Abstand + 288px Text + 34px Innenabstand/Border). Ab 658px wächst Artwork auf 240px. Diese bestehenden Regeln werden weder dupliziert noch verändert. Kleinere Einbettungen verwenden die vorhandene vertikale Komposition.

Keine Daten-/API-/Auth-/Routingänderungen; keine neuen GSD-Phasen oder Human-UAT-Sign-offs. Unversioniertes frontend/scripts/shot2.mjs bleibt unangetastet.
