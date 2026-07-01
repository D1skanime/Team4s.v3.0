# Phase 97 — Discussion Log

**Date:** 2026-07-01
*Human reference only — not consumed by downstream agents.*

## Reframe
Ursprünglich als „Revoke" (aktiv→historisch) angelegt. Im Gespräch stellte der Nutzer klar: die Umkehrrichtung (Entzug/Auto-Archivierung) ist bereits in Phase 95 gebaut (D-10). Phase 97 ist **historisch → aktiv**: Historie-Authoring + Claim-Aktivierung. Phase entsprechend umbenannt.

## Diskutierte Bereiche (alle 4 gewählt)

### Revoke-UI-Surface
- Vorschlag „Entzieh-Button" → vom Nutzer verworfen („Unsinn"). Es gibt keinen Entzug; der Zustand ergibt sich aus dem **Enddatum** der historischen Rolle.

### Automatik vs. Admin-Kontrolle
- Klare Regel statt Dialog: hist-Rolle **ohne** Enddatum → wird beim Claim aktive App-Rolle; **mit** Enddatum → bleibt historisch, Admin weist neue aktive Rolle zu.

### Datumsgranularität
- Entscheidung: **tagesgenau (DATE)**. Migration `hist_group_member_roles` Jahr→DATE + Tenure-Startdatum für aktive Rollen.

### Sichtbarkeit der Historie
- Historische Rollen mit Start+Enddatum **müssen sichtbar** sein — im Member-Profil, später public. **UI-Aussehen noch offen**; Priorität = korrekte DB-Abbildung. Lockert D-11 aus Phase 95.

## Weitere Nutzer-Eingaben
- **Mehrere historische Rollen pro Person** müssen unterstützt sein.
- Rollenauswahl **direkt im „Historisches Mitglied anlegen"-Dialog** (Screenshot): heute nur Anzeigename + Beitritts-/Austrittsjahr + Sichtbarkeit — Rolle fehlt.
- Capability braucht keine historischen Rollen (historische Rolle = keine Rechte) — konsistent mit G4.

## Deferred
- Polierte/öffentliche Historie-Timeline-UI (eigene Folge-Phase).
- G3 Mobile (Phase 96 in Arbeit).
