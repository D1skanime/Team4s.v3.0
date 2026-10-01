---
sketch: 008
name: public-release-story
question: "Wie fühlt sich ein gemeinsamer Public-Story-Flow aus Bildern, Highlights und Kara an?"
winner: null
tags: [release, public, story-flow, media, karaoke, responsive]
---

# Sketch 008: Public Release Story

## Design Question

Wie werden `release_version_media` und vorhandene `theme_segment`-Daten als eine visuelle Geschichte erlebt, ohne fachlich vermischt zu werden?

## How to View

`index.html` im Browser öffnen. Der Sketch ist reines HTML/CSS/JS ohne Build-Schritt.

Das Beispiel verwendet die echten Thumbnail-URLs aus Release 27 (`release_version_id=27`): 10 Bilder, 3 davon mit `is_highlight=true`, sowie die drei vorhandenen Segmente `Buddy Opening Lied`, `test` und `Buddy Ending`. Da die aktuelle API für diese Segmente kein `preview_url` liefert, zeigt der Sketch ein vorhandenes Release-Bild als visuelles Default-Preview.

## Varianten

- **A: Editorial Rail** — vertikale Story mit Bild-/Kara-Beats und ruhiger Leseführung.
- **B: Cinematic Beats** — große Bildflächen und Karaoke als dramatischer Zwischenmoment.
- **C: Story Timeline** — sichtbare Story-Order als verbindende Orientierung.

## Was du vergleichen solltest

- Fühlt sich Kara wie ein echter Story-Moment und nicht wie ein Anhängsel an?
- Ist `is_highlight` ohne Badge verständlich?
- Bleiben Titel, Caption, Preview und technische Daten klar genug?
- Welche Variante bewahrt die aktuelle Team4s-Atmosphäre am besten?
