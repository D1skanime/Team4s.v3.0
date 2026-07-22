# Mitglieder-Auszeichnungen und Gamification — Produkt- und Architekturentscheid

**Datum:** 2026-07-22
**Status:** VERBINDLICHE AUSGANGSBASIS FÜR PHASEN 106–110
**Ersetzt:** das vollständig verworfene Arbeitspaket „Medienmodell-Neubau“

## 1. Ziel

Team4s würdigt zwei Arten bestätigter Leistung:

1. **Historische Fansub-Leistung** — tatsächliche Mitarbeit an Projekten und Releases, zum Beispiel Editing, Übersetzung, Timing, Typesetting, Encoding, Karaoke oder Projektleitung.
2. **Plattformbeitrag** — heutige Arbeit an der Dokumentation und Pflege, zum Beispiel bestätigte Release-Texte, Notizen, Bilder, Credits und Metadaten.

Beide Kategorien dürfen zu einer nachvollziehbaren Gesamtwertung beitragen. Die Kategorieaufschlüsselung muss jedoch sichtbar bleiben, damit viele einfache Plattformaktionen nicht als größere Fansub-Erfahrung erscheinen als langjährige tatsächliche Release-Arbeit.

## 2. Identität und Begünstigter

- Verdienste gehören der stabilen historischen/personenbezogenen **Member-Identität** (`members`), nicht dem Login-Konto.
- Ein `app_user` ist optional der ausführende Akteur einer heutigen Aktion.
- Historische Mitglieder benötigen weder Account noch öffentliches Profil, um Punkte und Badges zu besitzen.
- Historische Mitglieder ohne Profil erscheinen in Ranglisten als gekennzeichnete historische Identitäten ohne Profil-Link.
- Ein später bestätigter Claim verbindet den Account mit derselben Member-Identität. Punkte und Badges werden weder kopiert noch neu erzeugt.

Beispiel: Eine historische Editorin mit 120 bestätigten Release-Mitwirkungen erhält die vollständige Anerkennung, auch wenn sie nie von Team4s erfährt. Ein aktives Mitglied mit drei Release-Mitwirkungen, einem bestätigten Bild und einem bestätigten Text erhält Punkte für alle diese Leistungen, aber berechtigterweise weniger Gesamtpunkte.

## 3. Punktebuch und Punktekatalog

- Punkte werden als auditierbare, idempotente Ereignisse beziehungsweise Buchungen geführt.
- Eine Buchung referenziert mindestens Member, fachliche Quelle, Beitragstyp, Regelversion, Punktewert, Wirksamkeitszeit und optional Gruppen-/Release-Kontext sowie ausführenden Account.
- Dieselbe fachliche Quelle darf nicht doppelt belohnt werden.
- Korrekturen erfolgen durch nachvollziehbare Gegen-/Stornobuchungen; historische Buchungen werden nicht still überschrieben oder gelöscht.
- Punktwerte sind zentral, fest und versioniert. Prüfer können keine individuellen Werte vergeben.
- Byte-Hash-Deduplizierung, Textlänge und Copy-and-paste-Erkennung sind keine Grundlage des Punktebuchs. Doppelpunkte werden über den fachlichen Quellen-/Regelschlüssel verhindert.

Die konkreten Zahlenwerte bleiben für die spätere Diskussion und Planung offen.

## 4. Bestätigung und Vier-Augen-Prinzip

Punkte entstehen ausschließlich nach Bestätigung:

- Plattform-Admins dürfen plattformweit bestätigen.
- Fansub-Admins dürfen innerhalb ihrer Gruppe bestätigen.
- Weitere Gruppenmitglieder dürfen bestätigen, wenn der Fansub-Admin ihnen dafür ausdrücklich eine Capability erteilt hat.
- Die bestehende Permission Engine bleibt die einzige Autorität; es entsteht kein paralleles Rollensystem.
- Eigene Beiträge dürfen nicht selbst bestätigt werden.
- Plattform-Admins dürfen in begründeten Ausnahmefällen übersteuern; der Vorgang muss auditierbar bleiben.

Prüfer können kleine feste Prüfpunkte erhalten:

- Bestätigung und Ablehnung geben gleich viele Prüfpunkte.
- Pro legitimer Prüfung kann höchstens einmal gebucht werden.
- Missbräuchliche oder aufgehobene Prüfungen können durch Gegenbuchung korrigiert werden.
- Mehr Punkte für Ablehnungen sind verboten, weil dies einen falschen Anreiz schaffen würde.

## 5. Abgelehnte Texte und Medien

- Abgelehnte Release-Beiträge werden nicht öffentlich und erzeugen keine Beitragspunkte.
- Begründung, Prüfer und Zeitpunkt bleiben für den Einreicher sichtbar.
- Der Beitrag kann überarbeitet und erneut eingereicht werden.
- Erneute Einreichung beendet den alten Bereinigungszyklus und startet einen neuen Review-Zustand.
- Abgelehnte Inhalte werden automatisch bereinigt:
  - Produktion: 90 Tage
  - lokale Testumgebung: 5 Stunden
  - automatisierte Tests: kontrollierte Uhr beziehungsweise unmittelbar überfällige Fixtures
- Nach der Bereinigung bleibt nur ein minimaler Audit-Tombstone ohne vollständigen Text oder vollständige Datei.
- Cleanup muss idempotent sein.

## 6. Historische Rückrechnung

- Bestehende bestätigte historische Release-/Projekt-Mitwirkungen erhalten rückwirkend dieselben Punkte wie neue gleichartige Beiträge.
- Unbestätigte, umstrittene oder fachlich ungeklärte Zuordnungen erhalten keine Punkte.
- Der Import ist einmalig, reproduzierbar und idempotent.
- Historische Importe dürfen Ranglisten für aktuelle Monats-/Jahresaktivität nicht künstlich dominieren; die genaue Zeitsemantik wird vor Phase 109 festgelegt.

## 7. Ranglisten

Vorgesehen sind:

- globale Rangliste
- Rangliste je Fansubgruppe
- Allzeit-Ansicht
- Kategorieansichten
- Monats-/Jahresansichten für tatsächlich in diesem Zeitraum wirksame Aktivität

Historische Mitglieder erscheinen ohne künstliches Profil. Aktive beziehungsweise geclaimte Member können auf ein vorhandenes öffentliches Profil verlinken.

## 8. Profilpflege

- Profilbearbeitung erzeugt keine Punkte.
- Mitglieder sind für ihre Profilangaben selbst verantwortlich; dafür ist kein Punkte-Review vorgesehen.
- Sinnvolle Profil-Meilensteine können automatische Badges erzeugen, zum Beispiel eine gepflegte Geschichte oder strukturierte Aktivitätsangaben.
- Wiederholtes Ändern derselben Profildaten darf keine wiederholbaren Belohnungen erzeugen.

## 9. Medienarchitektur

Gamification rechtfertigt keinen Umbau des bestehenden Mediensystems:

- `media_assets` und `media_files` bleiben kanonisch.
- Release-, Gruppen-, Anime-, Profil- und Story-Medien behalten ihre vorhandene Domain-Ownership.
- Bestehende Upload-, Crop-, Thumbnail-, Varianten-, Relations- und Cleanup-Flows werden nicht vereinheitlicht oder ersetzt.
- Für Gamification werden nur schmale Quellenadapter oder fehlende Attributionen ergänzt, wenn ein konkreter Code-/Datenbeleg dies verlangt.
- Anime-Cover, -Banner, -Logo und -Hintergrund bleiben Plattform-Stammdaten ohne Member-Punkte.

## 10. Bewusst offen

- konkrete Punktwerte und Gewichtung je Beitragstyp
- genaue Badge-Kategorien und Stufen
- Zeitsemantik historischer Quellen für Monats-/Jahresranglisten
- Grenzwerte, Pagination und Voraggregation der Ranglisten
- exakte Zuordnung jedes bestehenden Review-Status zu „punktfähig“
- Umgang mit aktiven Beitragenden oder Prüfern, deren `app_user` noch keiner bestätigten `members`-Identität zugeordnet ist
- UI-Platzierung außerhalb der bereits entschiedenen globalen und gruppenbezogenen Ranglisten

Diese Punkte werden phasenweise diskutiert und nicht von Implementierungs-Agenten geraten.
