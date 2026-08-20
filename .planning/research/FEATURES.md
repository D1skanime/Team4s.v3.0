# Feature Landscape

**Domain:** Capability-, Review- und Benutzerverwaltung für Team4s
**Researched:** 2026-08-20
**Milestone:** v1.4 — Findings #29–#32
**Overall confidence:** HIGH (bestehende Analysen, nutzervalidierte Live-UAT-Findings und aktueller Code abgeglichen)

## Ausgangslage im aktuellen Produkt

Team4s besitzt bereits die wesentlichen technischen Kerne, aber noch keine zusammenhängende Bedienoberfläche für den konkreten Admin-Auftrag „Was darf Benutzer X, warum darf er es und wie entziehe ich genau dieses Recht sicher?“:

- Die Rollenmatrix ist datengetrieben (`action_definitions`, `role_capabilities`) und das Enforcement kombiniert Rollen-Allows per OR. `backend/internal/permissions/permissions.go` löst die Rechte über den zentralen Service und Cache auf.
- Die vorhandene Benutzeransicht `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` zeigt pro Gruppe Rollen sowie nur zwei abgeleitete Ja/Nein-Spalten. Sie ist ausdrücklich read-only und verlinkt zurück zur Gruppenansicht.
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` und `RoleCapabilityDetail.tsx` bearbeiten Rolle→Capability global, nicht effektive Rechte eines einzelnen Benutzers. Diese Änderung betrifft alle Rolleninhaber.
- Direkte Review-Delegationen sind mit `fansub_group_member_review_capabilities`, `backend/internal/repository/review_delegation_repository.go` und `ReviewService.GrantDelegation/RevokeDelegation` bereits transaktional und auditiert. In `backend/cmd/server/admin_routes.go` existieren dafür jedoch keine Grant-/Revoke-Routen; `FansubAppMemberEditorPanel.tsx` bietet nur Rollen, Medienrechte und historische Rollen.
- Die Review-Queue autorisiert in `ReleaseReviewHandler.authorizedKinds` bereits Text/Bild je Benutzer und Gruppe. `releaseReviewQueuePredicates` filtert aber nicht nach `submitter_app_user_id`; eigene, nicht entscheidbare Einreichungen bleiben daher in der offenen Queue.
- `UserContributionsTab.tsx` rendert Projektstandards und jede Release-Zeile flach. `UserMediaTab.tsx` gruppiert nur nach technischem `owner_context` beziehungsweise Release-Version. Beide besitzen weder Anime-Gruppierung noch Filter/Pagination.

## Table Stakes — Muss in v1.4 geliefert werden

Fehlt eines dieser Features, bleibt der nutzervalidierte Kernauftrag aus Findings #29–#32 ungelöst.

| Feature | Warum erwartet | Komplexität | Abnahmekriterium / genaue Ausprägung |
|---|---|---:|---|
| Effektiv-Rechte-Inspektor im bestehenden Benutzer-Detail | Ein Admin muss bei Benutzer X sehen, was X tatsächlich darf, statt Rollen einzeln zu erraten. | Hoch | `UserGroupRightsTab` wird zur kanonischen Sicht ausgebaut: vollständige Capability-Liste je Kontext/Gruppe, effektiver Zustand und Herkunft pro Capability. |
| Rechte-Herkunft („Warum?“) | OR-Verknüpfung über mehrere Rollen ist sonst unsichtbar. | Hoch | Jede effektive Capability nennt alle gewährenden Rollen, direkten Allows und direkten Deny; mehrere Quellen bleiben sichtbar. Keine bloße Ja/Nein-Spalte. |
| Per-User Allow/Deny-Overrides | „X darf Y nicht“ darf weder Rollenentzug noch globale Änderung für alle Rolleninhaber erfordern. | Hoch | Persistente, kontextgebundene Benutzer-Overrides; Deny hat Vorrang vor Rollen-Allow und User-Allow. Mutation ändert nur Zielbenutzer und Zielkontext. |
| Einheitliche Auflösungsreihenfolge | UI, API und Enforcement dürfen keine unterschiedliche Wahrheit zeigen. | Hoch | Effektiver Zustand wird serverseitig aus Platform-Admin-Bypass, User-Deny, User-Allow und Rollen-Allows nach dokumentierter Präzedenz berechnet; die UI erfindet ihn nicht selbst. |
| Geführter Entzugs-Flow | Ein sicherer Entzug muss ohne Rollenmodellwissen möglich sein. | Hoch | Aktion „Recht entziehen“ zeigt alle gewährenden Quellen. Empfohlen ist gezielter User-Deny; Rollenentzug/-matrixänderung ist als breitere Alternative mit Folgen getrennt. Bestätigung nennt Benutzer, Capability, Kontext und Ergebnis. |
| Impact-Vorschau vor breiten Änderungen | Rolle→Capability-Toggle betrifft möglicherweise viele Benutzer. | Mittel/Hoch | Vor globaler Rollenmatrix-Änderung werden betroffene Rolle, Nutzerzahl, Kontexte und effektive Änderungen gezeigt. „Keine effektive Änderung“, etwa wegen einer zweiten gewährenden Rolle, wird explizit ausgewiesen. |
| Platform-Admin-Erklärung | Platform Admin umgeht die feine Matrix by design; Toggles dürfen keine falsche Wirkung versprechen. | Niedrig | Benutzeransicht und Mutationsdialog erklären `ReasonPlatformAdmin`: Plattform-Admin darf alles; Rollen-/User-Toggles ändern diesen Bypass nicht. IdP-verwaltete globale Rolle bleibt read-only gekennzeichnet. |
| Robustes Cache-Feedback | Eine erfolgreiche Mutation darf nicht wie eine wirkungslose Änderung aussehen. | Mittel | Response/Status unterscheidet gespeichert, Cache aktualisiert und fehlgeschlagen. UI bestätigt erst wirksamen Reload; bei Verzögerung bleibt ein sichtbarer Pending-/Retry-Zustand statt pauschalem Erfolg. |
| Auditierbare Overrides und Matrixänderungen | Rechteänderungen sind sicherheitsrelevant. | Mittel | Actor, Zielbenutzer/-rolle, Capability, Kontext, vorher/nachher und Zeitpunkt werden über bestehende Audit-Seams erfasst. Grant/Revoke sind idempotent und Fehler bleiben sichtbar. |
| Benutzer-Detail nach Anime/Projekt gruppiert | Release-Zeilen skalieren bei realen Projektgrößen nicht. | Mittel/Hoch | Beiträge und Medien werden primär nach Anime/Projekt gruppiert und einklappbar dargestellt; Projektstandard erscheint als Zusammenfassung, Release-Versionen als untergeordnete Details. |
| Nur echte Release-Abweichungen hervorheben | Identische Release-Rollen sind kein Override und erzeugen derzeit Rauschen. | Hoch | Backendprojektion oder kanonische Serverlogik vergleicht Release-Rollen mit Projektstandard. Nur echte Abweichungen heißen „Override“; identische Versionen werden zusammengefasst, z. B. „Version 1–13 entspricht Standard“. |
| Filter und Pagination der großen Benutzer-Tabs | Gruppierung allein reicht bei vielen Anime/Medien nicht. | Mittel | Servergestützte Pagination plus Filter mindestens nach Anime/Gruppe und relevanter Zustandsart. URL-/Cursorzustand ist stabil; Zähler beziehen sich auf gefilterte Daten. |
| Handlungsorientierte Tabs | Eine Adminansicht muss ihren Zweck und nächsten Schritt erklären. | Mittel | Rechte: direkt prüfen/ändern. Beiträge: Abweichung prüfen und passende Projekt-/Release-Arbeitsfläche öffnen. Medien: nach Anime/Release gruppieren und zielgenau zur bestehenden Arbeitsfläche öffnen. Read-only Bereiche benennen ihren Zweck klar. |
| Review-Delegation lesen, gewähren und entziehen | Der vorhandene chirurgische Mechanismus ist sonst nicht bedienbar. | Hoch | Dokumentierte GET- sowie idempotente Grant-/Revoke-API für ein echtes `fansub_group_member_id`; nur die drei delegierbaren Aktionen Text, Bild/Medien und Mitwirkung. Bestehender `ReviewService` bleibt Autoritäts- und Audit-Seam. |
| Review-Rechte im bestehenden Mitglieder-Editor | Delegation gehört zum Mitglied der Gruppe, nicht in eine parallele Adminroute. | Mittel | `FansubAppMemberEditorPanel.tsx` erhält „Prüf-/Freigabe-Rechte“ mit verständlichen Toggles für Medien, Notizen/Texte und Mitwirkungen; Rollen bleiben getrennt. Speichern zeigt Teilfehler und finalen Serverzustand. |
| Serverseitig entscheidbare Review-Queue | Nicht entscheidbare Einträge dürfen nicht als Arbeit erscheinen. | Hoch | Offene Queue, Next-Navigation und Counts berücksichtigen sowohl Review-Capability/Delegation als auch Self-Review-Verbot. Eigene Einreichungen sind nicht Teil der entscheidbaren Liste. Kein ausschließlich clientseitiger Filter. |
| Eigene Einreichungen separat sichtbar | Eigene offene Beiträge können informativ bleiben, sind aber keine Review-Aufgabe. | Mittel | Optionaler separater Bereich/Filter „Eigene Einreichungen – warten auf Fremdprüfung“ ohne Entscheidungs-CTA. Er beeinflusst Actionable-Counts nicht. |
| Konsistente Queue-Counts | Badges/Zähler dürfen keine unerledigbare Arbeit melden. | Mittel | Text/Bild/Mitwirkung-Zähler verwenden exakt dieselben serverseitigen Prädikate wie die Liste. `Next` kann keinen ausgefilterten oder eigenen Eintrag liefern. |
| Desktop-first mit Graceful Degradation | Rechteverwaltung ist Back-Office-Arbeit, muss aber auf schmalen Screens benutzbar bleiben. | Mittel | Breitbild nutzt Master/Detail, kompakte Tabellen und parallele Kategorien. Schmale Breiten haben keinen Seiten-Overflow; breite Tabellen liegen in eigenem `overflow-x`-Container. Tastatur, Fokus, Labels und 400%-Zoom bleiben funktionsfähig. CSS/Container Queries statt JS-Breakpoint/Hydration-Flash. |

## Differenzierende Qualitätsmerkmale

Diese Merkmale machen die Rechteverwaltung nicht nur vollständig, sondern deutlich sicherer und verständlicher als ein gewöhnlicher Rollenmatrix-Editor.

| Feature | Wert | Komplexität | Empfehlung |
|---|---|---:|---|
| „X soll Y nicht können“-Assistent | Übersetzt eine fachliche Absicht in einen sicheren Deny statt den Admin mit Rollenmatrizen allein zu lassen. | Hoch | In v1.4 integrieren; dies ist der nutzervalidierte Kern von #29. |
| Effekt-Diff vor/nach Mutation | Zeigt nicht nur gespeicherte Daten, sondern die tatsächliche Änderung der effektiven Rechte. | Mittel/Hoch | Für User-Override und globale Matrixmutation liefern. |
| Provenance als erklärbare Kette | Zeigt Rolle, direkte Ausnahme und Bypass in einer einheitlichen Erklärung. | Mittel | Backend DTO explizit modellieren; nicht aus UI-Labels rekonstruieren. |
| Abweichungsfokus in Beiträgen | Macht aus einer Datenablage ein Prüfwerkzeug für ungewöhnliche Rollenzuordnungen. | Mittel/Hoch | Echte Overrides zuerst, Standardblöcke eingeklappt. |
| Berechtigungsbewusste Arbeitslisten | Queue und Counts spiegeln die konkrete Handlungsmöglichkeit des eingeloggten Prüfers. | Hoch | Als gemeinsames serverseitiges Scope-/Predicate-Konzept umsetzen. |

## Supporting Cleanup — innerhalb der betroffenen Seams

Diese Punkte stammen aus der vorhandenen Codeanalyse und sollten mit den Feature-Phasen erledigt werden, weil sie sonst die neue Funktion auf widersprüchliche Grundlagen stellen:

| Cleanup | Warum jetzt | Evidenz |
|---|---|---|
| `assignable` auf eine Quelle reduzieren | Rollen-Picker und Admin-Badges müssen denselben Katalog lesen. | Analyse nennt Divergenz zwischen `role_definitions.assignable` und `IsKnownFansubGroupRole`; `FansubAppMemberEditorPanel.tsx` baut aktuell auf statischen `FANSUB_GROUP_ROLE_OPTIONS`. |
| Capability-Kategorien zentralisieren | Effektiv-Sicht und Rollenmatrix benötigen identische Gruppierung inklusive `review`. | `capabilityCategories.ts` und zusätzliche Kategorieordnung duplizieren Fachwissen. |
| Leere assignable Führungsrollen klären/seeden | Neue Rolle ohne Capability täuscht Rechte vor. | Audit: `founder`, `co_leader`, `techadmin`, `gfxler` sind zuweisbar, aber ohne Capability-Zuordnungen. Vor Seed fachlich bestätigen. |
| Reverse-Lookup-Index ergänzen | Impact-Vorschau fragt „welche Rollen/Benutzer haben Capability X?“ häufig ab. | PK von `role_capabilities` beginnt mit `role_code`; Index auf `action_code` fehlt laut Analyse. |
| Hilfetext für Capabilities | Code/Label allein erklärt Sicherheitswirkung nicht ausreichend. | `action_definitions` besitzt laut Analyse keinen Beschreibungstext. |
| Toten Capability-UI-Code entfernen | Neue Flows dürfen nicht auf ungenutzten Parallelkomponenten entstehen. | `RoleCapabilityTable.tsx`, `GrantCapabilityModal.tsx`, `RevokeCapabilityModal.tsx` werden laut Analyse nicht importiert. |
| Admin-Layouts vereinheitlichen | Neue Tabellen/Inspektoren verschärfen heutige Inline-Style-/Breakpoint-Probleme. | `UserGroupRightsTab.tsx`, `UserContributionsTab.tsx`, `UserMediaTab.tsx` enthalten umfangreiche Inline-Layouts; Role-Capability-Analyse nennt JS 759 px vs. CSS 860 px. |

## Anti-Features — ausdrücklich nicht bauen

| Anti-Feature | Warum vermeiden | Stattdessen |
|---|---|---|
| Zweite Capability-Registry | Die DB-getriebene Registry und zentrale Permission-Seam existieren bereits. | Bestehende `action_definitions`, `role_capabilities` und Permission-Service erweitern. |
| Rechte ausschließlich im Browser berechnen | Sicherheitslogik würde driften und könnte umgangen werden. | Server liefert effektiven Zustand samt Provenance und erzwingt dieselbe Präzedenz. |
| Deny durch Entfernen sämtlicher Rollen simulieren | Grob, schwer nachvollziehbar und beschädigt fachliche Rollen. | Gezielter, kontextgebundener User-Deny. |
| Globale Rolle→Capability-Änderung als Standard-Entzug | Trifft alle Rolleninhaber. | User-Deny als empfohlene chirurgische Aktion; globale Änderung nur mit Impact-Vorschau. |
| Platform-Admin über App-UI überschreiben | Globale Adminrolle ist IdP-getrieben und umgeht die feine Matrix. | Read-only Herkunft und Bypass erklären. |
| Review-Delegation als neue Universal-Override-Tabelle neu erfinden | Review besitzt bereits eine fachlich begrenzte Mitglieds-Delegation mit Audit. | Bestehenden ReviewService/API-seitig anbinden; allgemeine Overrides separat halten. |
| Review-Queue nur clientseitig ausblenden | Counts, Pagination, Next und Direktzugriff würden weiterhin falsche Arbeit liefern. | Identische serverseitige Prädikate für List/Counts/Detail/Next. |
| Contribution-/Media-Eigentum umbauen | v1.4 ist eine Adminprojektion, kein Domain-Rework. | Bestehende kanonische Anime-, Release-Version-, Media- und Contribution-Seams nur korrekt projizieren/verlinken. |
| Adminseiten mobile-first redesignen | Hoher Aufwand ohne Kernnutzen. | Desktop-first plus verpflichtende Graceful Degradation. |
| Plattform-Dokumente (#33) | Eigener Plattform-Produkttrack mit Upload, Versionierung und Zugriff. | Auf späteren Milestone verschieben. |
| Badge-UI-Vereinheitlichung (#34) | Benötigt repräsentative Daten aller Badge-Familien und ist visueller Querschnitt. | Nach Datenaufbau in eigenem späteren Milestone durchführen. |

## Feature-Abhängigkeiten

```text
Registry-/Katalog-Konsistenz
  → serverseitiger Effective-Capability-Resolver mit Provenance
    → User-Allow/Deny-Enforcement
      → Effektiv-Rechte-Inspektor
      → geführter Entzug + Effekt-Diff

Effective-Capability-Resolver
  → Rollenmatrix-Impact-Vorschau
  → verlässliches Cache-Feedback

Bestehender ReviewService + Delegation Repository
  → GET/Grant/Revoke-Verträge
    → Mitglieder-Editor-Toggles
    → Capability-bewusste Queue

Serverseitiges Queue-Scope (Actor + Self-Review-Prädikat)
  → Liste + Counts + Next + Detail konsistent

Kanonische Projekt-/Release-Differenzlogik
  → Anime-Gruppierung
    → Filter/Pagination + actionable User-Tabs

Admin-Layout-Grundmuster
  → Rechte-Inspektor, Benutzer-Tabs und Capability-Matrix ohne parallele Responsive-Logik
```

## Empfohlener MVP-/Phasenschnitt

1. **Rechte-Wahrheit und Verträge**
   - Override-Schema und Präzedenz festlegen.
   - Serverseitigen Resolver mit Provenance, Platform-Admin-Erklärung und Audit etablieren.
   - Katalog-/`assignable`-Doppelquellen sowie erforderlichen Reverse-Index bereinigen.

2. **Benutzerzentrierte Rechteverwaltung**
   - Vorhandenen `UserGroupRightsTab` zum vollständigen Inspektor ausbauen.
   - Allow/Deny und geführten Entzug mit Effekt-Diff implementieren.
   - Rollenmatrixänderungen um Impact-Vorschau und belastbares Cache-Feedback ergänzen.

3. **Review-Delegation vervollständigen**
   - Vorhandenen Service über dokumentierte Read/Grant/Revoke-Verträge anbinden.
   - Delegations-Toggles in den vorhandenen Gruppen-Mitglieder-Editor integrieren.

4. **Entscheidbare Review-Arbeitsliste**
   - Actor- und Self-Review-Filter serverseitig vereinheitlichen.
   - Liste, Counts, Detail und Next konsistent machen; eigene Einreichungen separat darstellen.

5. **Handlungsorientierte Benutzer-Tabs und Admin-Layout**
   - Beiträge/Medien nach Anime und Projekt gruppieren, echte Abweichungen ableiten.
   - Filter/Pagination und zielgenaue Aktionen ergänzen.
   - Desktop-first CSS-/Container-Muster mit Graceful Degradation auf alle berührten Flächen anwenden.

6. **Fixture-UAT und Rollout-Gate**
   - Mindestens: Mehrrollen-OR, Deny-Vorrang, Allow ohne Rollen-Grant, Platform-Admin-Bypass, Cache-Fehler, Delegation Grant/Revoke, Self-Review, Queue-Counts/Next, große Projektliste.
   - Desktop/Laptop/Breitbild plus schmaler Degradations-Sockel, Tastatur und 400%-Zoom.

## Später, nicht v1.4

- Finding #33: plattformweite Dokumenten-/Initiativen-Bibliothek.
- Finding #34: einheitliche Badge-Fortschritts-UI; erst mit repräsentativen Daten aller Familien.
- Vollständiger Rollenmodell-Rework beziehungsweise neue Zwei-Ebenen-Taxonomie, sofern er nicht zwingend für die oben beschriebenen korrekten Rechte nötig ist.
- Plattformweite Bulk-Rechtebearbeitung über viele Benutzer; zuerst Einzelbenutzer-Flow sicher machen.
- Automatische Rollenempfehlungen oder Policy-Simulationen über hypothetische Organisationsänderungen.

## Verifikationsfälle für die spätere Requirements-/Plan-Erstellung

| Fall | Erwartung |
|---|---|
| Benutzer hat zwei Rollen, nur eine gewährt Y | Y ist erlaubt; Provenance nennt genau die gewährende Rolle. |
| Benutzer erhält Deny für Y, Rolle gewährt Y | Y ist verweigert; Deny wird als gewinnende Quelle erklärt. |
| Benutzer erhält Allow für Y, keine Rolle gewährt Y | Y ist im passenden Kontext erlaubt und auditiert. |
| Platform Admin hat Deny/keine Rollen-Allows | Bypass bleibt erlaubt und UI erklärt, dass Toggles ihn nicht beeinflussen. |
| Rollenmatrix verliert Y, zweite Rolle gewährt weiter Y | Impact-Vorschau zeigt für diesen Benutzer keine effektive Änderung. |
| Cache-Reload schlägt nach Mutation fehl | UI meldet keinen falschen Enderfolg und bietet Status/Retry. |
| Editor erhält Text- und Bild-Delegation | Kann genau diese Review-Arten entscheiden, ohne `fansub_lead` zu erhalten. |
| Delegation wird entzogen | Queue, Counts und Direktentscheidung verlieren die Berechtigung konsistent. |
| Prüfer hat eigenen offenen Beitrag | Nicht in „entscheidbar“/Counts/Next; optional separat als wartend sichtbar. |
| 13 identische Release-Rollen entsprechen Projektstandard | Keine 13 falschen Override-Zeilen; kompakte Standard-Zusammenfassung. |
| Eine Release-Version weicht ab | Nur diese Abweichung wird hervorgehoben und zur richtigen Arbeitsfläche verlinkt. |

## Sources / Evidence

### Projekt- und Nutzerentscheidungen — HIGH

- `.planning/PROJECT.md` — aktiver v1.4-Scope und explizite Out-of-Scope-Liste.
- `.planning/notes/live-uat-ux-findings.md`, Findings #29–#32 — nutzervalidierte Probleme und Zielrichtung.
- `.planning/notes/milestone-intent-rechte-benutzerverwaltung.md` — Code-/DB-Audit und Desktop-first-Entscheidung.
- `.planning/notes/capability-registry-design.md` — Registry-Zielbild; durch aktuellen Code als bereits realisierte Grundlage eingeordnet.

### Aktueller Codeabgleich — HIGH

- `backend/internal/permissions/permissions.go` — zentrale Rollen-/Review-Auflösung und Platform-Admin-Reason.
- `backend/internal/repository/authz_permissions.go` — Review-Grant-Kontext.
- `backend/internal/repository/review_delegation_repository.go` — existierende direkte Grant-/Revoke-Persistenz.
- `backend/internal/services/review_service.go` — Autorisierung, Transaktion und Audit für Delegationsänderungen.
- `backend/cmd/server/admin_routes.go` — Review-Queue-Routen vorhanden, Delegationsrouten fehlen.
- `backend/internal/handlers/release_review_handler.go` — Typ-Autorisierung bereits vorhanden.
- `backend/internal/repository/release_review_query_repository.go` — Queue-Prädikate ohne Actor-/Self-Submission-Ausschluss.
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` — vorhandene read-only Keimzelle mit zwei Effektivspalten.
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` — flache Release-Override-Tabelle ohne semantischen Vergleich.
- `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` — Gruppierung nach technischem Release-Kontext, ohne Anime-/Projektprojektion.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx` — bestehende Rollen-/Medien-/Historien-Tabs, noch ohne Review-Rechte.
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` und `RoleCapabilityDetail.tsx` — heutige globale Rolle→Capability-Oberfläche.

## Confidence Assessment

| Bereich | Confidence | Begründung |
|---|---|---|
| Findings #29–#32 / Nutzerbedarf | HIGH | Direkt im Live-UAT entdeckt und anschließend vom Nutzer als Milestone-Scope bestätigt. |
| Bestehende Rechte-/Review-Seams | HIGH | Gegen aktuellen Backend-/Frontend-Code geprüft. |
| Feature-Abhängigkeiten | HIGH | Folgen direkt aus Serverautorität, Persistenz und bestehenden Komponenten. |
| Exakte spätere UX-Anordnung | MEDIUM | Desktop-first und Zieloberflächen sind entschieden; Detaillayout sollte in Phase-UI-Spec konkretisiert werden. |
| Datenmenge/Performancegrenzen | MEDIUM | Skalierungsproblem ist real, konkrete Seitengrößen und Indexbedarf müssen mit Fixtures/EXPLAIN validiert werden. |
