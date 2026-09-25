# Quick Task Context

## Ziel

Die Mapping-Workbench im Episode-Import soll die Aktionen rechtsbündig und den Episodentitel kompakter darstellen. Die bisherige große Titel-Textarea und die doppelte Dateipfad-Anzeige sollen entfallen.

## Entscheidungen

- Die globalen Aktionen bleiben erhalten: „Alle Vorschläge überspringen“, „Alle Vorschläge bestätigen“ und „Mapping anwenden“.
- „Titel (DE)“ wird zu „Episodentitel“.
- Episodentitel werden mit dem vorhandenen `Input` statt einer großen `Textarea` bearbeitet.
- Ein vorhandener `Select` wird als Sprachfeld vorbereitet; zunächst gibt es nur die Option „Deutsch“, weil der Import aktuell nur deutsche Titel verarbeitet.
- Dateiname und kurzer Pfad bleiben in der unteren Mapping-Zeile; die Wiederholung rechts im Episodenkopf entfällt.
- Keine API-, Datenmodell- oder Persistenzänderung.
