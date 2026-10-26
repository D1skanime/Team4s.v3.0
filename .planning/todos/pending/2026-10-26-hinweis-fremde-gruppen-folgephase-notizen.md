---
created: 2026-10-26T00:00:00+00:00
title: "Hinweis senden an fremde Gruppen" — drei Notizen für eine spätere Phase
area: contributions-proposals
status: deferred
files:
  - frontend/src/components/contributions/ProposalForm.tsx
  - frontend/src/components/contributions/ReportHintEntryPoint.tsx
  - frontend/src/components/profile
  - backend/internal/handlers/fansub_group_hints_decide.go
---

## Herkunft

Während der Live-Abnahme von Phase 191 ("Hinweis senden" auch an andere Fansub-Gruppen, 2026-10-24
bis 2026-10-26) hat der Nutzer drei konzeptionelle Punkte benannt, die NICHT Teil dieser Phase
sind und bewusst nicht umgesetzt wurden — zur späteren Planung vorgemerkt.

## 1) Konzept „Hinweis" vs. „Fehlermeldung"

Der „Fehler melden"-Einstiegspunkt (D-12) erzeugt heute zwingend einen Rollenanspruch im
Hinweis-Formular (Schritt „Rolle" ist Pflicht, auch für eine reine Fehlermeldung ohne eigenen
Beteiligungswunsch). Zu klären: Soll eine reine Fehlermeldung ("hier ist etwas falsch") konzeptuell
von einer Rollen-/Beitragsmeldung ("ich sollte hier als X stehen") getrennt werden, oder bleibt das
bewusst vereinheitlicht?

## 2) Release-/Folgen-Rollen im Mitgliederprofil unsichtbar

Das öffentliche Mitgliederprofil zeigt aktuell nur projektweite Rollen, keine release-/
episodenspezifischen Rollenzuweisungen — auch nach Einführung des optionalen Release-Bezugs in
Phase 191 (D-29 ff.) bleibt diese Lücke unverändert. Zu prüfen: Soll das Profil künftig auch
release-genaue Mitwirkung zeigen?

## 3) Hinweis-Bestätigung trägt bewusst niemanden ein

Bestätigt eine Gruppenleitung bzw. ein Plattform-Admin einen Hinweis (D-03), passiert absichtlich
keine automatische Mitgliedschaft oder Crew-Zuweisung — das bleibt vollständig manuell über die
bestehenden Wege (Mitglied hinzufügen, Crew-/Rollenzuweisung), die wiederum eine bestehende
Gruppenmitgliedschaft voraussetzen. Zu prüfen: Ist der heutige, vollständig getrennte Drei-Schritt-
Ablauf (Hinweis bestätigen → Mitglied hinzufügen → Crew zuweisen) für Leiter ausreichend
nachvollziehbar, oder lohnt sich eine engere Verzahnung in einer späteren Phase?

## Vorgaben für später

Keine der drei Fragen hat eine vorab festgelegte Lösung — bei Aufnahme in eine künftige Phase mit
Ist-Analyse und Nutzerentscheidungen wie gewohnt beginnen.
