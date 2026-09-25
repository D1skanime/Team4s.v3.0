# Quick Task 260925-7tb: Tab-Scrollbar im Episodenversionseditor entfernen

## Ausgangslage

Im Episodenversionseditor `/admin/episode-versions/66/edit` zeigt die Tab-Leiste am Rand einen störenden Scrollbalken.

## Entscheidung

Die Tab-Leiste darf auf kleinen Breiten weiterhin horizontal per Wischen/Trackpad scrollen, soll dabei aber keine sichtbare Browser-Scrollbar rendern. Vertikales Overflow wird explizit unterdrückt.

## Abgrenzung

- Keine Änderung an Tab-Reihenfolge, Routing oder Berechtigungen.
- Keine globale Scrollbar-Regel; nur die Editor-Tab-Leiste wird angepasst.
