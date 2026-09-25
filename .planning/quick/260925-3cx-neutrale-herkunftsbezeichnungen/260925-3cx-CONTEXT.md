# Quick Task 260925-3cx: Neutrale Herkunftsbezeichnungen im Fansub-Editor

## Ausgangslage

Fansubber können den Episode-Version-Editor und den Segment-Drawer bearbeiten. Sichtbare Hinweise wie „Jellyfin-Stream“, „Jellyfin Serien-Theme“ und „Jellyfin Media ID“ geben dabei die technische Herkunft der Medien preis.

## Entscheidung

Die sichtbare UI verwendet neutrale Bezeichnungen: „Stream“, „Serien-Theme“, „Media ID“ und „externe Medienanreicherung“. Technische Providerwerte, API-Felder und Quelltypen bleiben unverändert, damit Datenfluss und Playback funktionieren.

## Abgrenzung

- Scope ist der Episode-Version-Editor inklusive Segment-Drawer.
- Admin-Import- und Jellyfin-Verwaltungsseiten bleiben technisch explizit, weil sie der internen Quellenkonfiguration dienen.
