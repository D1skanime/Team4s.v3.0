# Team4s – Dokumentations-Wegweiser

Dieser Ordner enthält die technische Dokumentation des Team4s-Projekts. Diese Seite zeigt, welche Datei wofür zuständig ist.

## Architektur (Hauptreferenz)

| Datei | Inhalt |
| --- | --- |
| [FRONTEND_ARCHITEKTUR.md](FRONTEND_ARCHITEKTUR.md) | Next.js-Frontend: Routing, Komponenten, API-Schicht, UI-Primitives, Seiten nach Fachbereich |
| [BACKEND_ARCHITEKTUR.md](BACKEND_ARCHITEKTUR.md) | Go-Backend: Schichten, Datenflüsse, Rechte/Capabilities, Medienspeicher, Import-Flows |

Diese beiden Dokumente sind der aktuelle, gegen den Code verifizierte Gesamtüberblick. Bei Widerspruch zu einer der unten gelisteten Einzeldateien gilt die Architektur-Referenz.

## Agenten-Arbeitsweise

| Datei | Inhalt |
| --- | --- |
| [agent-guidelines-ui.md](agent-guidelines-ui.md) | Regeln für Agenten bei visuellen UI-Implementierungsaufgaben |
| [engineering/implementation-contract.md](engineering/implementation-contract.md) | Agenten-Policy gegen wiederkehrende Drift-Probleme (Wiederverwendung, Suche-zuerst) |
| [api/api-contracts.md](api/api-contracts.md) | Workflow zur Pflege der API-Contracts unter `shared/contracts/` |

## Fachspezifische Vertiefungen

| Datei | Inhalt |
| --- | --- |
| [frontend/member-achievement-artwork.md](frontend/member-achievement-artwork.md) | How-To: Artwork-Strategien für Mitglieder-Erfolge/Abzeichen |
| [operations/jellyfin-timeout-diagnostics.md](operations/jellyfin-timeout-diagnostics.md) | Betriebs-Runbook: Jellyfin-Timeout-Diagnose |
| [operations/mail-delivery.md](operations/mail-delivery.md) | Betriebs-Runbook: Mailpit lokal, Mailjet in Produktion |

## Historische Berichte

`docs/audits/` enthält abgeschlossene Audit-Berichte und bleibt unverändert — das sind historische Nachweise, keine laufend gepflegte Dokumentation.

`docs/archiv/` enthält Dokumente, die veraltet oder abgeschlossen sind (z. B. einmalige Migrationsphasen, überholte Entwürfe). Jede Datei dort trägt oben eine Zeile mit Archivierungsdatum und Grund.

## Planungs-Artefakte

Laufende Planung, Entscheidungen und Status liegen außerhalb von `docs/` in `.planning/` sowie in `CONTEXT.md`, `DECISIONS.md`, `STATUS.md`, `TODO.md`, `RISKS.md` im Repo-Root.
