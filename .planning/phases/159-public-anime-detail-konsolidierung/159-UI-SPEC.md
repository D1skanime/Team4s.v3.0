---
phase: 159
status: defined
source: explicit-user-repair-contract
---

# Phase159 — Konservativer UI-Vertrag

## Ziel und Umfang

Die bestehende öffentliche Anime-Detailseite konsolidieren, ohne strukturelles Redesign. Reihenfolge, Geometrie, Tokens, Icons und Controls erhalten, abgesehen von ausdrücklich beauftragten Fehlerkorrekturen. Kein neues Farb-/Rollenmapping. „Gruppenbereich“ bleibt die sichtbare Linkbeschriftung. Die unwahren Kennzahlen7.8 und0Views entfallen. [VERIFIED: Nutzerauftrag]

## Flächen, Typografie und Responsive

Weiße Episodenkarten behalten ihre Fläche und erhalten die vorhandene dunkle Textfarbe am lokalen Besitzer. Contributionüberschrift und Statusbereich sind auf dunkler Fläche hell. Vorhandene Schriftgrößen, Abstände, Radien, Border und Breakpoints nutzen; keine kosmetische Globalüberarbeitung. Nur den dekorativen Hero-Banner begrenzen. Controls, Fokus und Slider bleiben frei. Pflichtbreiten:360,390,767,768 und1440Pixel; Episode geöffnet und geschlossen; kein Rootscroll. [VERIFIED: FRONTEND-REPAIRS]

## Zustände und Interaktion

Contributions zeigen unterscheidbar Laden, fachlich leer oder Requestfehler mit bestehendem Fehler-/Retrypattern. Unbekannter, ladender oder fehlerhafter Watchliststatus erlaubt kein Add/Delete. Erfolgreich geladene Präsenz/Absenz bestimmt die Aktion. Aktionsfehler bleiben auch bei Custom-Styling sichtbar. Eine Refreshsession verhindert falsche Loginanzeigen. Deutsche Texte mit Umlauten und zugänglichen Labels. Alte Antworten dürfen keinen falschen Owner-/Sessionzustand anzeigen. [VERIFIED: Nutzerauftrag; FRONTEND-REPAIRS]

Story → Filter → Versionsliste bleibt erhalten. Gruppenwechsel wirkt über alle Consumer identisch und lädt keine zusätzlichen Fachdaten. Gridklick funktioniert auch bei laufendem Hoverrequest; Fehlerretry folgt dem bestehenden Design. Falls das begrenzte Inventar eine Fortsetzung braucht, vorhandenes Progressive-Disclosure-/Load-more-Control verwenden und den tatsächlichen Umfang kommunizieren; keine unbemerkte Trunkierung. Covergeometrie und Lesbarkeit bewahren, tatsächliche Delivery verkleinern und keinen Originalfallback zulassen. Fehlende Bilder verwenden den vorhandenen Fallback. Cache-, ID- und SQLdetails erscheinen nicht in Nutzertexten.

## Accessibility und Evidenz

Native Links/Buttons und globale UIprimitives verwenden. Sichtbare Fokusrahmen erhalten; keine verschachtelten interaktiven Elemente. Status und Fehler verständlich anzeigen. Berechnete Farben und reale DOMgeometrie messen; Screenshots mit Viewport, Route und State kennzeichnen. Automatisierte Browserevidenz ist kein Human-Sign-off156/157. [VERIFIED: AGENTS; Nutzerauftrag]
