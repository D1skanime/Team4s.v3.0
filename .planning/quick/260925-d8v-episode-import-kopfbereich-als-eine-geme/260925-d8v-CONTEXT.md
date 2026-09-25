# Quick Task Context

## Task

Die bisher getrennte Anime-Import-Kopfkarte und der Kontextstreifen sollen auf `/admin/anime/[id]/episodes/import` als eine gemeinsame Karte erscheinen.

## Entscheidungen

- Anime-Titel, Rücknavigation und die drei Import-Identitäten gehören in einen gemeinsamen visuellen Kopfbereich.
- Die drei Identitäten bleiben als kompakte, getrennte Felder mit Divider lesbar.
- Die Auswahl zwischen mehreren Jellyfin-Ordnern bleibt eine separate Karte, weil sie eine aktive Auswahl ist und nicht nur Kontext darstellt.
- Keine API-, Datenmodell- oder Importlogik-Änderung.

## Scope

- `page.tsx`: gemeinsames semantisches Wrapper-Element.
- `page.module.css`: gemeinsame Karte, interner Trenner und responsive Spaltenanpassung.
- Keine Änderungen an Backend oder Persistenz.
