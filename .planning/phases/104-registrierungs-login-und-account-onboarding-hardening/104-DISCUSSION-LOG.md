# Phase 104: Registrierungs-, Login- und Account-Onboarding-Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 104-registrierungs-login-und-account-onboarding-hardening
**Areas discussed:** Registrierungsabschluss, Account ohne Member, Keycloak-Sicherheit, Accountverwaltung und Fehlerverhalten

---

## Registrierungsabschluss

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Verhalten nach Registrierung | Automatisch anmelden | erneuter Login; separate Erfolgsseite |
| Ziel | Mein Account | Anime-Liste; eigene Onboarding-Route |
| Bestätigung | neutrale Konto-/Login-Bestätigung | Fansub-Hinweis; nur sehr kurze Meldung |
| Sichtbarkeit | einmalig bis Schließen/Verlassen | Timer; dauerhaft bis Einrichtung |

**Hinweis:** Nicht jeder Nutzer ist Fansub-Member; die Bestätigung darf keine Fansub-Tätigkeit voraussetzen.

---

## Account ohne Member

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Navigation | Meine Projekte ausblenden | deaktiviert anzeigen; für alle anzeigen |
| Member-Verknüpfung | unaufdringlicher eigener Abschnitt | nur kleiner Link; prominenter Pflicht-Onboarding-Hinweis |
| Direkter Contributions-Aufruf | zu Mein Account zurückleiten | technischer 403; zugänglicher Projekt-Empty-State |
| Projekte-Navigation | erst bei echter Projekt-/Contribution-Zuordnung | bereits bei verifiziertem Member; Gruppenmitgliedschaft allein |

**Hinweis:** Auch ein verifizierter Member ohne Projekte sieht „Meine Projekte“ nicht.

---

## Keycloak-Sicherheit

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Passwort-Policy | noch keine; `123` lokal erlaubt | 10/12/14-Zeichen-Regeln |
| Brute-Force-Schutz | noch nicht aktivieren | Lockout jetzt aktivieren; nur Produktionsprofil vorbereiten |
| Direct Grants | für lokale Tests aktiviert lassen | sofort deaktivieren; getrennte Produktionsvorgabe in dieser Phase |
| E-Mail-Bestätigung | noch nicht erforderlich | eingeschränkter pending-Account; Login erst nach Verifikation |

**Hinweis:** Diese Produktionshärtungen werden bewusst vertagt und dürfen nicht stillschweigend in Phase 104 aktiviert werden.

---

## Accountverwaltung und Fehlerverhalten

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Accountdaten | Keycloak Account Console im neuen Tab | Team4s-eigene Verwaltung; Link entfernen |
| Navigation | nur Mein Account | doppelte Einträge; neue Account-&-Sicherheit-Seite |
| Initialisierung | einheitlicher neutraler Ladezustand | Navigation vorzeitig zeigen; alte Seite stehen lassen |
| Profilfehler bei gültiger Session | Erneut versuchen + Abmelden | Loginseite; endloser Loader |

---

## the agent's Discretion

- Technische Komponentenaufteilung und minimale Keycloak-Theme-Implementierung innerhalb der gelockten Verhaltensergebnisse.
- Konkrete Gestaltung vorhandener Loading-/Error-Primitives.

## Deferred Ideas

- Produktionspasswortregeln, Lockout, Direct-Grant-Produktionsprofil, E-Mail-Verifikation und E-Mail-Eindeutigkeit.
- Nicht authentifizierungsbezogene öffentliche Copy-/Demodatenbereinigung.
