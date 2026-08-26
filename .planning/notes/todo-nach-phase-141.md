# Nach Phase 141 — drei vereinbarte Vorhaben

**Festgehalten:** 2026-08-26
**Reihenfolge:** direkt nach Abschluss von Phase 141, vor bzw. begleitend zu Phase 142.

---

## 1. Keycloak-Versionssprung (26.0.8 → 26.7.2)

**Anlass:** CVE-2026-18963, CVSS 9.1 — fehlerhafte Zustandsprüfung im `reset-credentials`-Ablauf,
unauthentifizierte Übernahme beliebiger Konten inklusive Administratoren. Behoben in Keycloak
26.7.2 (19.08.2026); Red-Hat-Build entsprechend 26.4.15 / 26.6.6.

**Bewertung für diese Instanz:** kein Notfall. Vier Testkonten, private LAN-Adresse, kein
bekannter Exploit zum Stand 24.08.2026. Keycloak ist hier ohnehin nicht das schwächste Glied —
`ufw` ist inaktiv, SSH und Postgres (5433) stehen ebenfalls offen. Es ist normale Wartung.

**Zu beachten:** 26.0 → 26.7 ist ein echter Upgrade-Schritt, kein Patch. Vorher Backup der
Keycloak-Datenbank; Realm-Migration prüfen. Image-Pin steht an zwei Stellen in `docker-compose.yml`
(Zeilen ~45 und ~86).

**Wichtiger als das Update selbst:** Diese Konfiguration nicht in eine öffentlich erreichbare
Instanz übernehmen — offener Reset-Flow, `0.0.0.0`-Binding und fehlende Firewall wären dort ernst.

---

## 2. Frischer Datenbestand für Phase 142

**Motiv:** Phase 142 ist das Fixtures- und Release-Gate; frische, bewusst konstruierte Testdaten
sind dort ohnehin nötig (siehe `uat-fixture-plan-v14-close.md`).

**Datenverlust ist vernachlässigbar** — Stand 2026-08-26:

| Tabelle | Zeilen |
|---|---:|
| anime | 1 |
| episodes | 13 |
| fansub_groups | 1 |
| members | 3 |
| media_assets | 12 |
| release_versions | 13 |
| anime_contributions | 14 |

**Der Mechanismus ist die eigentliche Arbeit, nicht der Verlust:**

- Append-only-`reject_truncate`-Trigger blockieren ein einfaches `TRUNCATE`. Ein Voll-Reset
  braucht `session_replication_role = replica`.
- `TRUNCATE members CASCADE` zieht über `media_assets`/`anime` die gesamte Content-Datenbank mit —
  das ist beim Voll-Reset erwünscht, darf aber nicht versehentlich passieren.
- **Vorher Backup**, beide Datenbanken (`team4s_v2` und die Keycloak-DB).
-  kann komplett geleert werden (Nutzer bestaetigt 2026-08-26: nur Testbilder, 11 MB in 28 Dateien). Kein selektives Aufraeumen noetig.
- Nach dem Keycloak-Reset: vier Konten neu anlegen, Realm-Rolle für `platform_admin` und den
  JIT-Sync wieder herstellen.

**Sinnvolle Kopplung:** Reset und Keycloak-Upgrade in einem Zug erledigen — die Keycloak-DB wird
ohnehin angefasst.

---

## 3. Rollen-Defaults definieren

**Offene Frage des Nutzers:** Welche Standardwerte gelten bei welcher Rolle?

**Warum das jetzt aufkommt:** Die Capability-Matrix ist inzwischen vollständig bedienbar
(Phase 138, Rollen-Arbeitsbereich), und Phase 140 hat mit der Review-Delegation einen zweiten,
bewusst getrennten Mechanismus danebengestellt. Damit wird sichtbar, dass die *Startbelegung* je
Rolle nie bewusst festgelegt wurde — sie ist historisch gewachsen.

**Beispiele aus dem Ist-Stand**, die eine Entscheidung verdienen:

- `fansub_lead` gewährt alle drei Review-Actions (`review.text.decide`, `review.image.decide`,
  `review.contribution.decide`) per Rolle — das ist der Grund, warum der persönliche Deny als
  Hebel erhalten bleiben musste (Option (d), Phase 140).
- `co_leader` hat weder `Gruppe bearbeiten` noch `Projektnotizen schreiben`, aber sämtliche
  Gruppenmedien-Rechte — plausibel, aber nie begründet.
- Etliche Gruppenrollen (Timing, Typesetting, Encoding …) tragen derzeit keine operativen Rechte.

**Vorschlag für das Format:** eine Tabelle Rolle × Capability mit Soll-Belegung und je einer
kurzen Begründung, abgeglichen gegen die reale `role_capabilities`. Ergebnis wäre entweder eine
Bestätigung des Ist-Zustands oder eine Migration — beides mit Impact-Vorschau prüfbar, die dafür
seit Phase 138 bereitsteht.

**Umfang:** eigenständig genug für eine eigene Phase oder einen größeren Quick; nicht nebenbei
zwischen 141 und 142 erledigen.
