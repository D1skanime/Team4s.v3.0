# Phase 97 UAT-Follow-up: Historische Rollen bei aktiven Mitgliedern pflegen

**Captured:** 2026-07-01
**Source:** Human UAT / product discussion after Phase 97 rights split
**Status:** Follow-up Auftrag, not yet implemented

## Problem

Leader bearbeiten aktive App-Mitglieder heute im Mitglieder-Tab über den bestehenden Mitglied-Editor. Dort werden aktive Gruppenrollen und Medienrechte gesetzt. Wenn ein aktuell aktives Mitglied früher eine andere Funktion hatte, z. B. Ema Encoder war von 2009 bis 2013 im Qualitätscheck, muss diese historische Rolle nachträglich an derselben Person dokumentiert werden können.

Der richtige Ort ist der bestehende aktive Mitglied-Editor, nicht die separate historische Mitgliederliste. Der Leader denkt in diesem Moment: "Ich bearbeite Ema", nicht: "Ich lege einen zweiten historischen Eintrag an."

## Fachliche Entscheidung

- Aktive App-Mitgliedschaft bleibt in `fansub_group_members`.
- Aktive Rechte bleiben ausschließlich aktive Gruppenrollen.
- Historische Rollen bleiben reine Credits und geben keine Rechte.
- Historische Rollen für aktive Mitglieder hängen an derselben `member_id` wie das App-Mitglied.
- Falls noch kein `hist_fansub_group_members`-Anker für diese `member_id` und Fansub-Gruppe existiert, muss er beim Speichern automatisch angelegt oder serverseitig bereitgestellt werden.
- In Public-/Profilansichten sollen diese Credits später gemeinsam mit der Person angezeigt werden, nicht als zweite Person.

## Anforderungen

1. **UI-Ort**
   - Im bestehenden aktiven Mitglied-Editor einen weiteren Tab oder klaren Button `Historische Rollen`.
   - Neben den bestehenden Bereichen `Aktive Rollen` und `Medienrechte`.
   - Kein separater Umweg über die historische Mitgliederliste.

2. **Historische Rollen erfassen**
   - Rolle wählen aus den historischen Rollenoptionen.
   - Startdatum mit Team4s-DatePicker.
   - Enddatum mit Team4s-DatePicker.
   - Enddatum darf nicht vor Startdatum liegen.
   - Mehrere historische Rollen pro aktivem Mitglied erfassbar.

3. **Persistenz**
   - Speichern schreibt `hist_group_member_roles`.
   - Der `hist_fansub_group_members`-Eintrag nutzt dieselbe `member_id` wie das aktive App-Mitglied.
   - Es darf kein zweiter Member/Name für dieselbe Person entstehen.

4. **Anzeige im Admin**
   - Aktives Mitglied bleibt in der normalen Mitgliederliste.
   - Abgeschlossene historische Rollen können zusätzlich in der historischen Übersicht sichtbar sein.
   - Offene historische Rollen dürfen bei aktiven Mitgliedern nicht zu doppelter Anzeige führen, sofern sie bereits als aktive Rolle übernommen wurden.

5. **Rechte**
   - Bearbeitung benötigt aktive Capabilities:
     - `fansub_group.historical_roles.manage`
     - falls ein Hist-Anker automatisch angelegt wird zusätzlich `fansub_group.historical_members.manage`
   - Historische Rollen selbst bekommen weiterhin keine Rechte.

## Akzeptanzkriterien

- [ ] Ein Leader kann bei einem aktiven App-Mitglied eine historische Rolle mit Start-/Enddatum nachtragen.
- [ ] Das aktive Mitglied bleibt aktiv sichtbar und bekommt dadurch keine neue aktive Berechtigung.
- [ ] Die historische Rolle hängt an derselben `member_id`.
- [ ] Es entsteht kein doppelter historischer Member für dieselbe Person.
- [ ] Mehrere historische Rollen lassen sich pflegen.
- [ ] Enddatum < Startdatum wird verhindert.
- [ ] Backend-Tests decken Anker-Erstellung/Reuse und Rechte-Gating ab.
- [ ] Frontend-Test deckt den neuen Tab/Button im aktiven Mitglied-Editor ab.

## Nicht Teil Dieses Follow-ups

- Keine finale Public-Profil- oder Public-Gruppen-Timeline.
- Keine neue Capability für historische Rollen selbst.
- Keine Änderung daran, dass aktive Rechte nur aus aktiven Gruppenrollen kommen.
