# Requirements: Team4s v1.4 Capability-, Review- und Benutzerverwaltung

**Defined:** 2026-08-20
**Core Value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.

## v1.4 Requirements

### Effektive Rechte und Capability-Verwaltung

- [x] **CAP-01**: Ein autorisierter Admin kann für einen Benutzer und eine Fansubgruppe die vollständige Liste seiner effektiven Capabilities sehen.
- [x] **CAP-02**: Ein autorisierter Admin kann für jede effektive Capability alle gewährenden Rollen, direkten Allows, direkten Denies und den entscheidenden Grund nachvollziehen.
- [x] **CAP-03**: Für normale Gruppenmitglieder gilt serverseitig dieselbe dokumentierte Präzedenz in Anzeige und Enforcement: Benutzer-Deny vor Benutzer-Allow vor rollenbasiertem Allow.
- [x] **CAP-04**: Der Plattform-Admin-Bypass bleibt oberhalb der gruppenbezogenen Präzedenz erhalten und wird als IdP-verwaltete, durch Gruppen-Toggles nicht veränderbare Herkunft erklärt.
- [x] **CAP-05**: Ein autorisierter Admin kann für einen aktiven Benutzer eine einzelne Capability ausschließlich innerhalb einer konkreten Fansubgruppe erlauben oder verweigern.
- [x] **CAP-06**: Override-Mutationen validieren Zielmitgliedschaft, Fansubgruppe und zulässige Capability serverseitig und lehnen gruppenfremde oder unzulässige Ziele neutral ab.
- [x] **CAP-07**: Grant und Revoke eines Benutzer-Overrides sind idempotent, atomar und mit Actor, Ziel, Kontext, Capability sowie Vorher-/Nachher-Zustand auditiert.
- [ ] **CAP-08**: Ein geführter Entzugs-Flow zeigt alle Quellen eines Rechts und empfiehlt den gezielten Benutzer-Deny, bevor breitere Rollen- oder Matrixänderungen angeboten werden.
- [ ] **CAP-09**: Vor einer Rolle-zu-Capability-Änderung sieht der Admin betroffene Rolleninhaber und die tatsächliche effektive Änderung, einschließlich Benutzer ohne Änderung wegen weiterer Quellen.
- [ ] **CAP-10**: Nach einer Rollenmatrix-Mutation unterscheidet die Oberfläche zwischen persistiert, im Permission-Cache aktiviert, ausstehend und fehlgeschlagen; sie meldet keinen falschen Enderfolg.
- [x] **CAP-11**: Rollen-Zuweisbarkeit wird aus genau einer kanonischen Quelle gelesen und in Rollen-Pickern, API-Projektionen und Admin-Badges konsistent dargestellt.
- [x] **CAP-12**: Capability-Kategorie, Reihenfolge, Bezeichnung und Hilfetext stammen aus einem kanonischen Katalog, der auch Review-Capabilities vollständig abbildet.
- [x] **CAP-13**: Aktive zuweisbare Rollen besitzen fachlich bestätigte Capability-Zuordnungen oder werden ausdrücklich als Rollen ohne operative Rechte gekennzeichnet.
- [x] **CAP-14**: Capability-Reverse-Lookups für Herkunft und Impact bleiben mit repräsentativen Daten performant und werden durch passende Datenbankindizes unterstützt.

### Benutzer-Administration

- [ ] **UADM-01**: Die vorhandene Gruppenrechte-Ansicht im Benutzer-Detail ist die kanonische Oberfläche für Inspektion und Änderung effektiver Gruppenrechte.
- [ ] **UADM-02**: Beiträge eines Benutzers werden serverseitig nach Anime und Projekt gruppiert und zeigen den Projektstandard als kompakte Zusammenfassung.
- [ ] **UADM-03**: Release-Versionen werden nur dann als Override bezeichnet und hervorgehoben, wenn sie tatsächlich vom Projektstandard abweichen.
- [ ] **UADM-04**: Identische Release-Version-Zuweisungen werden zu verständlichen Bereichen wie „Version 1–13 entspricht dem Projektstandard“ zusammengefasst.
- [ ] **UADM-05**: Medien eines Benutzers werden nach Anime, Projekt und Release-Kontext gruppiert und verlinken zielgenau zur bestehenden kanonischen Arbeitsfläche.
- [ ] **UADM-06**: Große Rechte-, Beitrags- und Medienbestände lassen sich serverseitig filtern und stabil paginieren; Zähler beziehen sich auf denselben gefilterten Datenbestand.
- [ ] **UADM-07**: Jeder Benutzer-Tab erklärt seinen Zweck und bietet passende nächste Aktionen oder kennzeichnet bewusst rein informative Daten eindeutig.
- [ ] **UADM-08**: Die berührten Admin-Oberflächen nutzen ein gemeinsames Desktop-first-Layoutmuster mit CSS-/Container-Queries, Tastaturbedienung und schmaler Graceful Degradation ohne Seitenoverflow.

### Review-Delegation

- [ ] **RDEL-01**: Ein autorisierter Gruppenleiter kann die bestehenden Review-Delegationen eines realen Fansubgruppen-Mitglieds über eine dokumentierte API lesen.
- [ ] **RDEL-02**: Ein autorisierter Gruppenleiter kann die delegierbaren Rechte für Medien/Bilder, Notizen/Texte und Mitwirkungen einzeln gewähren und entziehen.
- [ ] **RDEL-03**: Die Review-Delegation wird im vorhandenen Mitglieder-Editor unter „Prüf-/Freigabe-Rechte“ bedient und bleibt fachlich von Rollen und allgemeinen Benutzer-Overrides getrennt.
- [ ] **RDEL-04**: Delegationsmutationen verwenden die vorhandenen transaktionalen Review-Service- und Audit-Seams und sind idempotent.
- [ ] **RDEL-05**: Eine entzogene Delegation verliert unmittelbar und konsistent ihre Wirkung auf Entscheidung, Review-Liste und Zähler, ohne dem Mitglied eine breitere Leiterrolle zu entziehen.

### Entscheidbare Review-Arbeit

- [ ] **RQUE-01**: Die offene Review-Liste enthält serverseitig nur Einträge, deren Review-Art der aktuelle Benutzer in der betreffenden Fansubgruppe entscheiden darf.
- [ ] **RQUE-02**: Eigene Einreichungen erscheinen nicht in der entscheidbaren Review-Liste und erhöhen deren Actionable-Zähler nicht.
- [ ] **RQUE-03**: Eigene offene Einreichungen können getrennt als „wartet auf Fremdprüfung“ angezeigt werden und besitzen dort keine Entscheidungsaktion.
- [ ] **RQUE-04**: Review-Liste, Typ-Zähler, Detailzugriff und „Nächster Eintrag“ verwenden dieselben Actor-, Capability-, Gruppen- und Self-Review-Prädikate.
- [ ] **RQUE-05**: Direkter Zugriff und Entscheidungsversuche bleiben serverseitig geschützt, selbst wenn ein Eintrag durch manipulierte URL oder veralteten Clientzustand geöffnet wird.
- [ ] **RQUE-06**: Mitwirkungsprüfungen verwenden ihren bestehenden kanonischen Review-Workflow und werden nicht künstlich in die Text-/Bild-Release-Queue verschoben.

### Verträge, Sicherheit und Rollout

- [x] **QUAL-01**: Neue oder geänderte Permission-, Override-, Delegations- und Queue-Verträge sind in OpenAPI, Backend-DTOs, Frontend-Typen und zentralen API-Helfern synchron.
- [ ] **QUAL-02**: Geschützte v1.4-Ansichten und Aktionen funktionieren bei fehlendem oder abgelaufenem Access Token mit gültiger Refresh-Session über den zentralen API-Client.
- [x] **QUAL-03**: Automatisierte Negativtests decken Deny-Präzedenz, gruppenfremde Overrides, unzulässige Capability-Codes, BOLA/IDOR, Self-Review und Direktzugriffe ab.
- [x] **QUAL-04**: Erforderliche Schemaänderungen verwenden neue reversible Migrationen mit Fresh-Up/Down-Nachweis und ohne Kompatibilitäts- oder Backfill-Code für disposable Testdaten.
- [ ] **QUAL-05**: Reproduzierbare v1.4-Fixtures decken Mehrrollen-OR, Allow, Deny, Plattform-Admin, Cache-Fehler, Review-Grant/Revoke, Self-Review und große Benutzer-Projektionen ab.
- [ ] **QUAL-06**: Query- und UI-Gates verhindern N+1-Abfragen, ungebundene Flachlisten, inkonsistente Pagination sowie Client-only-Sicherheitsfilter.
- [ ] **QUAL-07**: Live-UAT prüft die echten Benutzer-, Gruppenmitglieder-, Capability- und Review-Routen bei 390×844, 768×1024 und 1440×900 sowie Tastaturbedienung und 400-%-Zoom.
- [ ] **QUAL-08**: Die Implementierung bewahrt Keycloak-verwaltete globale Rollen, den Plattform-Admin-Bypass, kanonische Medien-/Mitwirkungs-Eigentümer und das bestehende Review-Audit ohne parallele Systeme.

## Future Requirements

### Plattform-Dokumente

- **PDOC-01**: Plattform-Admins können gruppenübergreifende Dokumente und Community-Initiativen mit PDF und Metadaten verwalten.
- **PDOC-02**: Benutzer können eine plattformweite Dokumentenbibliothek mit Vorschau, Download und Versionen verwenden.

### Badge-Darstellung

- **BGUI-01**: Alle Badge-Fortschrittsfamilien verwenden nach Aufbau repräsentativer Daten dieselbe responsive Fortschrittskarte.

### Spätere Rechte-Evolution

- **CAPF-01**: Das Rollenmodell kann nach gesonderter Fachentscheidung in eine neue mehrstufige Taxonomie überführt werden.
- **CAPF-02**: Autorisierte Admins können Rechte mehrerer Benutzer in einem gesondert abgesicherten Bulk-Flow bearbeiten.
- **CAPF-03**: Das System kann hypothetische Organisationsänderungen simulieren und Rollenempfehlungen erzeugen.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Plattformweite Dokumenten-/Initiativen-Bibliothek (#33) | Eigener Plattform-Produkttrack mit Upload, Versionierung und Zugriff; ausdrücklich auf später verschoben |
| Einheitliche Badge-Fortschritts-UI (#34) | Erst nach Aufbau repräsentativer Daten aller betroffenen Badge-Familien |
| Zweite Capability-Registry oder paralleles Permission-System | Die DB-getriebene Registry und der zentrale Permission-Service sind bereits kanonisch |
| Globale Benutzer-Overrides | v1.4 beschränkt Overrides bewusst auf eine konkrete Fansubgruppe |
| Vollständiger Rollenmodell-Rework | Verwandt, aber ohne gesonderte Fachentscheidung nicht Voraussetzung für Findings #29–#32 |
| Umbau von Medien-, Mitwirkungs- oder Release-Eigentum | v1.4 projiziert und verlinkt bestehende kanonische Domain-Seams |
| Mobile-first-Neudesign der Admin-Flächen | Desktop-first mit verpflichtender Graceful Degradation genügt für den Back-Office-Anwendungsfall |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01 | Phase 137 | Complete |
| CAP-02 | Phase 137 | Complete |
| CAP-03 | Phase 137 | Complete |
| CAP-04 | Phase 136 | Complete |
| CAP-05 | Phase 137 | Complete |
| CAP-06 | Phase 137 | Complete |
| CAP-07 | Phase 137 | Complete |
| CAP-08 | Phase 138 | Pending |
| CAP-09 | Phase 138 | Pending |
| CAP-10 | Phase 138 | Pending |
| CAP-11 | Phase 136 | Complete |
| CAP-12 | Phase 136 | Complete |
| CAP-13 | Phase 136 | Complete |
| CAP-14 | Phase 136 | Complete |
| UADM-01 | Phase 138 | Pending |
| UADM-02 | Phase 139 | Pending |
| UADM-03 | Phase 139 | Pending |
| UADM-04 | Phase 139 | Pending |
| UADM-05 | Phase 139 | Pending |
| UADM-06 | Phase 139 | Pending |
| UADM-07 | Phase 139 | Pending |
| UADM-08 | Phase 139 | Pending |
| RDEL-01 | Phase 140 | Pending |
| RDEL-02 | Phase 140 | Pending |
| RDEL-03 | Phase 140 | Pending |
| RDEL-04 | Phase 140 | Pending |
| RDEL-05 | Phase 141 | Pending |
| RQUE-01 | Phase 141 | Pending |
| RQUE-02 | Phase 141 | Pending |
| RQUE-03 | Phase 141 | Pending |
| RQUE-04 | Phase 141 | Pending |
| RQUE-05 | Phase 141 | Pending |
| RQUE-06 | Phase 141 | Pending |
| QUAL-01 | Phase 136 | Complete |
| QUAL-02 | Phase 142 | Pending |
| QUAL-03 | Phase 137 | Complete |
| QUAL-04 | Phase 136 | Complete |
| QUAL-05 | Phase 142 | Pending |
| QUAL-06 | Phase 139 | Pending |
| QUAL-07 | Phase 142 | Pending |
| QUAL-08 | Phase 142 | Pending |

**Coverage:**
- v1.4 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0
- Duplicated: 0

---
*Requirements defined: 2026-08-20*
*Last updated: 2026-08-20 after v1.4 research and scope confirmation*
