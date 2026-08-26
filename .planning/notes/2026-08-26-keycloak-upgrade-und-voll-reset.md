# Keycloak-Upgrade 26.0.8 → 26.7.2 und Voll-Reset des Datenbestands

**Ausgeführt:** 2026-08-26
**Grundlage:** `HANDOFF-2026-08-26.md` Vorhaben (a) und (b), `todo-nach-phase-141.md` Punkte 1 und 2.
**Ausgangsstand:** `main` = `fd523021`

---

## Was gemacht wurde

### Keycloak 26.0.8 → 26.7.2 (CVE-2026-18963)

Image-Pin in `docker-compose.yml` an beiden Stellen (Dienste `keycloak` und
`keycloak-profile-config`) von `quay.io/keycloak/keycloak:26.0` auf `:26.7.2`.

Belegt nach dem Hochfahren:

- `kc.sh --version` meldet 26.7.2, Container `healthy`, **null `ERROR`** im Log.
- Modell-Migration lief durch: 26.1.0 → 26.2.0 → 26.3.0 → 26.4.0 → 26.4.3 → 26.6.1 → 26.7.x,
  jeweils für Realm `master` **und** `team4s`.
- Realm unverändert: vier Konten (`admin`, `coleader`, `d1sk`, `founder`), Realm-Rolle
  `platform_admin` weiterhin auf `admin`.
- `keycloak-profile-config` erneut gelaufen, Exit 0 — User-Profile-Kontrakt liegt an.
- Login-Seite rendert mit Theme `team4s` und deutschem Text (`<title>Anmeldung bei Team4s</title>`),
  PKCE wird erzwungen (Aufruf ohne `code_challenge_method` wird abgewiesen).

**Die Keycloak-Datenbank wurde bewusst NICHT geleert.** Sie trägt Realm-Rolle, Theme,
Redirect-URIs, User-Profile und SMTP-Konfiguration; ein Wipe hätte vier Konten samt Passwörtern
und die Rollenzuweisung zu Handarbeit gemacht. Die App-Nutzer entstehen ohnehin per JIT-Sync neu.

### Voll-Reset von `team4s_v2`

**Nicht per `TRUNCATE` — das wäre falsch gewesen.** Ein pauschales
`session_replication_role = replica` + `TRUNCATE … CASCADE` (so in der ursprünglichen Notiz)
hätte auch die von Migrationen geseedeten Referenzdaten mitgenommen: `role_capabilities` (103),
`action_definitions` (35), `role_definitions` (17) und rund 20 Lookup-Tabellen — also genau die
Rechte-Matrix, um die es in v1.4 geht.

Stattdessen: `DROP DATABASE` → `CREATE DATABASE` → alle Migrationen frisch. Damit entfallen die
7 `reject_truncate`-Trigger und `session_replication_role` vollständig, weil nichts truncatet wird.

**Nebenergebnis mit eigenem Wert:** Die 151 Migrationen wurden erstmals seit langem *from scratch*
bewiesen — 151/151 angewandt, 114 Tabellen, keine Fehler. Das ist ein Baustein für das
Release-Gate in Phase 142.

`media/` vollständig geleert (28 Dateien, 11 MB; die vom Container als `root` geschriebenen
Dateien brauchten `sudo`).

---

## Neuer Bestand

Inhalts- und Identitätstabellen alle bei 0: `anime`, `episodes`, `members`, `users`,
`app_users`, `fansub_groups`, `media_assets`, `release_versions`, `anime_contributions`,
`audit_logs`.

Referenzdaten vollständig, gegen den Vorzustand abgeglichen — **alle identisch bis auf eine
erklärte Abweichung** (siehe Befund 2).

Zwei Zeilen sind Bootstrap, kein Restbestand: `roles` = 1 (`admin`) und `user_roles` = 1
(`user_id=1`), vom Backend beim Start aus `AUTH_ADMIN_BOOTSTRAP_USER_IDS=1` angelegt. Der erste
per JIT-Sync entstehende Nutzer bekommt damit `id=1` und die Legacy-Admin-Rolle — beim Anlegen
der Phase-142-Fixtures beachten.

---

## Befund 1 — Backups sind mit `pg_restore` NICHT wiederherstellbar

**Das ist ein echter Defekt, kein Rauschen.** Ein Probe-Restore des frisch gezogenen Backups in
eine leere Datenbank scheiterte mit **89 Fehlern**: 1 Ursache, 85 Folgefehler, 4 Wiederholungen.

**Ursache:** `database/migrations/0140_search_foundation.up.sql:19-27` definiert

```sql
CREATE OR REPLACE FUNCTION f_unaccent(text) … IMMUTABLE … AS $$
    SELECT unaccent('unaccent', $1)
$$;
```

ohne `SET search_path` und mit unqualifiziertem `unaccent`. `pg_dump` schreibt aber
`SELECT pg_catalog.set_config('search_path', '', false)` an den Anfang. Beim Restore ist
`unaccent` damit nicht auflösbar, der funktionale GIN-Trigram-Index auf `anime` scheitert,
`anime` entsteht nicht — und 85 abhängige Objekte fallen nach.

`CREATE EXTENSION unaccent` vorab **hilft nicht**; der leere `search_path` ist das Problem.

**Funktionierender Restore-Weg (verifiziert, 0 Fehler, Zeilenzahlen exakt getroffen):**

```bash
sed "s|^SELECT pg_catalog.set_config('search_path', '', false);|SELECT pg_catalog.set_config('search_path', 'public', false);|" \
  team4s_v2.sql > team4s_v2_fixed.sql
docker exec -i team4sv30-db psql -U team4s -d <zieldb> -q < team4s_v2_fixed.sql
```

Deshalb liegt im Backup **beides**: `.dump` (custom) und `.sql` (plain). Nur der `.sql`-Weg
funktioniert derzeit.

**Offener Fix:** `f_unaccent` per neuer Migration auf `SET search_path = public` bzw.
`public.unaccent('public.unaccent'::regdictionary, $1)` umstellen. Solange das offen ist, ist
jedes Backup dieser Datenbank nur mit dem Workaround nutzbar. Gehört in Phase 142 (Release-Gate).

---

## Befund 2 — drei Rechte auf `fansub_lead` waren Laufzeit-Drift

Beim Abgleich alt gegen neu fiel `role_capabilities` von **103 auf 100**. Die Differenz ist
vollständig aufgeklärt — es fehlen genau:

| Rolle | Action |
|---|---|
| `fansub_lead` | `fansub_group_media.reorder` |
| `fansub_lead` | `fansub_group_page.general_edit` |
| `fansub_lead` | `release_version_media.delete_own` |

Keine Migration vergibt diese drei an `fansub_lead`: `0108_capability_registry` seedet 16 Actions,
`0150_effective_rights_overrides` ergänzt `user_group_capability_override.manage`.
`0146_capability_policy_catalog` vergibt `fansub_group_media.reorder` an `gfxler`, `techadmin`,
`founder` und `co_leader` — aber nicht an `fansub_lead`.

Die drei Zeilen wurden also zur Laufzeit über die Rechte-Verwaltung aus Phase 138 gesetzt.
**Das ist der erste konkrete Beleg für Vorhaben (c) „Rollen-Defaults definieren":** der Ist-Zustand
der Rechte-Matrix war nachweislich von der Migrations-Soll-Belegung abgewichen, ohne dass das
irgendwo festgehalten war. Für (c) ist damit auch die Frage gestellt, ob diese drei Rechte
Default für `fansub_lead` **werden sollen** (dann Migration) oder Einzelfall bleiben.

---

## Backup

`/home/d1sk/backups/2026-08-26-kc-upgrade-reset/`

| Datei | Inhalt |
|---|---|
| `team4s_v2.sql` | Plain-Dump — **der funktionierende Restore-Weg**, siehe Befund 1 |
| `team4s_v2.dump` | Custom-Dump — scheitert derzeit an Befund 1 |
| `keycloak.sql` / `keycloak.dump` | Keycloak-DB vor dem Upgrade |
| `media.tar.gz` | die 28 gelöschten Mediendateien, 11 MB |
| `docker-compose.yml.bak` | Compose-Stand vor dem Image-Bump |
| `git-head.txt` | `fd523021` |

---

## Was als Nächstes nötig ist

1. **Anmeldung durch den Nutzer** über den Tunnel `http://127.0.0.1:3300` — erst der erste Login
   löst den JIT-Sync aus und legt die App-Nutzer neu an. Vorher ist `users` leer.
   Reihenfolge beachten: der erste Login bekommt `id=1` und damit die Bootstrap-Admin-Rolle.
2. **Vorhaben (c) Rollen-Defaults** — jetzt mit Befund 2 als konkretem Einstieg.
3. **Phase 142** mit den Fixtures aus `uat-fixture-plan-v14-close.md` auf diesem frischen Bestand.
