# Team4s – DB-Schema-Referenz für Fansub-/Anime-Domain

Quelle: `team4s_v2_20260502-214428.sql`  
Stand des Dumps: 02.05.2026  
DB: PostgreSQL 16

Diese Datei ist als fachliche und technische Referenz für GSD-/Codex-Agenten gedacht. Sie ersetzt nicht die Prüfung des aktuellen Repository-Codes oder neuer Migrationen, definiert aber die stabile Kernlogik der Anime-/Fansub-Domain.

---

## 1. Fachliche Kernregeln

### 1.1 Anime bleibt neutral

Die Tabelle `anime` beschreibt den Anime als Werk bzw. Katalogeintrag. Sie darf nicht mit konkreten Fansub-Release-Informationen vermischt werden.

Typische Inhalte:

- Titel und Metadaten
- Typ / Content-Type / Status
- Jahr / maximale Episodenanzahl
- Beschreibung
- AniSearch-ID
- Cover-/Banner-Verweise
- Jellyfin-/Folder-Bezüge wie `folder_name`

**Regel:** Fansub-spezifische Release-Informationen gehören nicht direkt in `anime`.

---

### 1.2 Episode bleibt neutral

Die Tabelle `episodes` hängt an `anime` und beschreibt eine Folge neutral.

Wichtige Beziehung:

```txt
anime.id -> episodes.anime_id
```

Typische Inhalte:

- Episodennummer
- Titel
- Status
- Dateiname / Legacy-Informationen
- Sortierinformationen
- Episode-Type / Filler-Type

**Regel:** Eine Episode ist keine Fansub-Veröffentlichung. Fansub-Kontext entsteht erst über Releases.

---

### 1.3 Fansub-Kontext entsteht über Releases und Gruppen

Der eigentliche Fansub-Kontext entsteht über diese Tabellen:

```txt
fansub_groups
anime_fansub_groups
fansub_releases
release_versions
release_version_groups
```

Das bedeutet:

```txt
Fansub-Gruppe -> Anime-Zuordnung -> Episode -> Release -> Release-Version -> beteiligte Gruppen
```

Eine Gruppe „macht“ fachlich nicht den neutralen Anime, sondern ist an konkreten Releases bzw. Release-Versionen beteiligt.

---

### 1.4 Release-Media gehört in den Release-Kontext

Release-Media darf fachlich nicht direkt an `episodes` hängen.

Für Release-Prozess-Medien wie:

- Anime-Screenshots aus dem Release
- WIP-Bilder
- Tool-Screenshots
- GIFs
- Witzbilder
- Nostalgie-/Historienmaterial im Release-Kontext

ist die fachlich relevante Struktur:

```txt
release_versions
release_version_media
media_assets
media_files
```

**Pflichtregel:** Ein Release-Version-Media-Upload im Admin-/Fansub-Arbeitsfluss gilt erst als vollständig, wenn neben `media_assets` und `media_files` auch `release_version_media` mit einer echten `release_version_id` korrekt befüllt wurde.

`release_media` bleibt ein separater Release-Level-/Public-/Legacy-Asset-Pfad und ist kein Ersatz für versionierte Prozessmedien.

---

### 1.5 Gruppenmedia gehört in den Gruppenkontext

Für Gruppenmedia existiert:

```txt
fansub_group_media
```

Zusätzlich referenziert `fansub_groups` direkte Branding-Assets über:

```txt
logo_id
banner_id
```

Damit gilt:

```txt
Logo/Banner -> fansub_groups.logo_id / fansub_groups.banner_id
zusätzliche Gruppenbilder -> fansub_group_media -> media_assets -> media_files
```

---

## 2. Zentrales Domain-Mapping

```txt
anime
 └── episodes
      └── fansub_releases
           ├── release_versions
           │    └── release_version_groups
           └── release_media
                └── media_assets
                     └── media_files

fansub_groups
 ├── anime_fansub_groups
 ├── fansub_group_media
 │    └── media_assets
 │         └── media_files
 ├── logo_id -> media_assets.id
 └── banner_id -> media_assets.id
```

Für die Admin-UI `/admin/fansubs/:id/edit` bedeutet das:

```txt
Fansub-Gruppe
 ├── Basic Information -> fansub_groups
 ├── Media / Gruppenmedia -> fansub_groups.logo_id, banner_id, fansub_group_media
 ├── Anime & Releases -> anime_fansub_groups + anime + episodes + fansub_releases
 ├── Release-Detail -> fansub_releases + release_versions
 ├── Release-Version-Media -> release_version_media + media_assets + media_files
 └── Rollen-/Beitragsdaten -> release_member_roles, member_episode_notes, member_anime_notes
```

---

## 3. Wichtige Tabellen

## 3.1 `anime`

Fachliche Bedeutung: Neutraler Anime-/Werk-Datensatz.

Wichtige Spalten aus dem Dump:

```txt
id bigint NOT NULL
title text NOT NULL
type anime_type NOT NULL
content_type content_type NOT NULL
status anime_status NOT NULL
year smallint
max_episodes smallint
cover_image text
title_de text
title_en text
genre text
description text
folder_name varchar(255)
anisearch_id varchar(255)
banner_asset_id bigint
cover_asset_id bigint
anime_type_id bigint
slug varchar(255)
modified_by bigint
```

Wichtige Hinweise:

- `anime` darf nicht als Fansub-Release-Kontext missbraucht werden.
- `description` ist die neutrale Anime-Beschreibung, nicht zwingend eine Beschreibung aus Sicht einer bestimmten Fansub-Gruppe.
- Für gruppenspezifische Anime-Beschreibungen muss geprüft werden, ob `anime_fansub_groups.notes`, `member_anime_notes` oder eine neue Struktur verwendet werden soll.

---

## 3.2 `episodes`

Fachliche Bedeutung: Neutrale Episode eines Anime.

Wichtige Spalten:

```txt
id bigint NOT NULL
anime_id bigint NOT NULL
episode_number text NOT NULL
title text
status episode_status NOT NULL
filename varchar(255)
number integer
number_decimal numeric(5,1)
sort_index integer
episode_type_id bigint
filler_type_id bigint
modified_by bigint
```

Wichtige Beziehung:

```txt
episodes.anime_id -> anime.id
```

Wichtige Regel:

- Keine Release-Prozess-Medien direkt an `episodes` hängen.
- `episode_media` existiert zwar, sollte aber nicht für Fansub-Release-Prozessmedien verwendet werden.

---

## 3.3 `fansub_groups`

Fachliche Bedeutung: Fansub-Gruppe, Team oder Kollaboration.

Wichtige Spalten:

```txt
id bigint NOT NULL
slug varchar(120) NOT NULL
name varchar(120) NOT NULL
logo_url text
banner_url text
founded_year integer
dissolved_year integer
status varchar(20) NOT NULL
website_url text
discord_url text
irc_url text
country varchar(80)
group_type varchar(20) NOT NULL
logo_id bigint
banner_id bigint
closed_year integer
```

Checks:

```txt
status IN ('active', 'inactive', 'dissolved')
group_type IN ('group', 'collaboration')
dissolved_year >= founded_year, falls beide gesetzt sind
```

UI-Mapping:

- Basic Information -> `fansub_groups`
- Logo/Banner -> `logo_id`, `banner_id`
- Gruppen-Metadaten -> `status`, `country`, `founded_year`, `dissolved_year`

---

## 3.4 `anime_fansub_groups`

Fachliche Bedeutung: Verbindung zwischen Anime und Fansub-Gruppe.

Spalten:

```txt
anime_id bigint NOT NULL
fansub_group_id bigint NOT NULL
is_primary boolean DEFAULT false NOT NULL
notes text
created_at timestamptz NOT NULL
```

Primary Key:

```txt
(anime_id, fansub_group_id)
```

Foreign Keys:

```txt
anime_id -> anime.id ON DELETE CASCADE
fansub_group_id -> fansub_groups.id ON DELETE CASCADE
```

UI-Mapping:

- Grundlage für „Anime dieser Fansub-Gruppe“.
- Geeigneter fachlicher Anker für gruppenspezifische Anime-Notizen.

Offen:

- Ob `notes` für die Anime-Hauptbeschreibung im Kontext der Gruppe reicht.
- Ob dafür eine eigene Beschreibungstabelle nötig ist.

---

## 3.5 `fansub_releases`

Fachliche Bedeutung: Konkreter Release-Kontext zu einer Episode.

Spalten:

```txt
id bigint NOT NULL
episode_id bigint NOT NULL
source_id bigint
release_date timestamptz
source bigint
modified_by bigint
```

Primary Key:

```txt
id
```

Foreign Keys:

```txt
episode_id -> episodes.id ON DELETE CASCADE
source_id -> release_sources.id
source -> release_sources.id
```

UI-Mapping:

- Release-Zeilen unter einem Anime.
- Release-Drawer-Grundkontext.
- Release-Version-Media hängt über `release_versions` und `release_version_media` an.
- `release_media` bleibt ein separater Release-Level-/Public-/Legacy-Pfad.

Wichtige Regel:

- Release ist der fachliche Ort für fansubbezogene Veröffentlichungskontexte.

---

## 3.6 `release_versions`

Fachliche Bedeutung: Version eines Releases, z. B. `v1`, `v2`.

Spalten:

```txt
id bigint NOT NULL
release_id bigint NOT NULL
version varchar(20) DEFAULT 'v1' NOT NULL
legacy_episode_version_id bigint
release_date timestamptz
title varchar(255)
modified_by bigint
```

Primary Key:

```txt
id
```

Unique:

```txt
(release_id, version)
```

Foreign Key:

```txt
release_id -> fansub_releases.id ON DELETE CASCADE
```

UI-Mapping:

- Drawer-Tab „Versionen“.
- Spätere Versionierung von Releases.

---

## 3.7 `release_version_groups`

Fachliche Bedeutung: Beteiligte Fansub-Gruppen an einer Release-Version. Wichtig für Coop-Releases.

Spalten:

```txt
release_version_id bigint NOT NULL
fansub_group_id bigint NOT NULL
created_at timestamptz NOT NULL
```

Primary Key:

```txt
(release_version_id, fansub_group_id)
```

Foreign Keys:

```txt
release_version_id -> release_versions.id ON DELETE CASCADE
fansub_group_id -> fansub_groups.id ON DELETE CASCADE
```

Historische Auffälligkeit:

- Ältere Dumps/Dokumente erwähnten zusätzlich `fansubgroup_id`.
- Die live geprüfte lokale DB vom 2026-05-25 enthält diese Legacy-Spalte nicht mehr.
- `fansub_group_id` ist die einzige produktive Spalte für Fansub-Gruppen an Release-Versionen.
- Ein Agent darf `fansubgroup_id` nicht wieder einführen.

---

## 3.8 `media_assets`

Fachliche Bedeutung: Fachliches Medien-Asset.

Spalten:

```txt
id bigint NOT NULL
media_type_id bigint
file_path text NOT NULL
caption text
mime_type varchar(100) NOT NULL
format varchar(50)
uploaded_by bigint
modified_by bigint
```

Verwendung:

- Wird von Release-Media, Gruppenmedia, Anime-Media und Episode-Media referenziert.
- Kann über `media_files` technische Varianten besitzen.

---

## 3.9 `media_files`

Fachliche Bedeutung: Physische/technische Datei oder Variante eines Medien-Assets.

Spalten:

```txt
id bigint NOT NULL
media_id bigint NOT NULL
variant varchar(50)
storage_id varchar(255)
path text NOT NULL
width integer
height integer
size bigint
```

Beziehung:

```txt
media_files.media_id -> media_assets.id
```

Verwendung:

- Speicherung von Datei-Pfad, Größe, Breite/Höhe, Varianten.
- Technische Upload-/Thumbnail-Logik sollte hier andocken.

---

## 3.10 `release_media`

Fachliche Bedeutung: Verbindung zwischen Release und Media-Asset für Release-Level-/Public-/Legacy-Assets.

Spalten:

```txt
release_id bigint NOT NULL
media_id bigint NOT NULL
sort_order integer DEFAULT 0
created_at timestamptz NOT NULL
```

Primary Key:

```txt
(release_id, media_id)
```

Foreign Keys:

```txt
release_id -> fansub_releases.id ON DELETE CASCADE
media_id -> media_assets.id ON DELETE CASCADE
```

UI-Mapping:

- Release-Level-/Public-Asset-Reads.
- Legacy-/Aggregator-Pfade, solange sie noch existieren.
- Sortierung über `sort_order`.

Wichtige Regel:

- Versionierte Admin-/Fansub-Prozessmedien dürfen nicht in diese Tabelle zurückgebogen werden.
- Wenn der Kontext eine konkrete Release-Version ist, ist `release_version_media` zuständig.

Offen:

- Es gibt im Dump keine direkte Kategorie-Spalte für Bildtypen wie `anime_screenshot`, `history`, `fun`, `nostalgia`.
- Es gibt im Dump keine direkte Rollen-/Untertyp-Spalte in `release_media`.
- Für versionierte Admin-/Fansub-Prozessmedien ist diese Lücke durch `release_version_media.category` aufgelöst.
- Für echte Release-Level-/Public-Assets bleibt separat zu entscheiden, ob und wie Kategorien benötigt werden.

---

## 3.10a `release_version_media`

Fachliche Bedeutung: Verbindung zwischen einer konkreten Release-Version und Media-Assets für Admin-/Fansub-Prozessmedien.

Aktueller Runtime-Stand:

```txt
release_version_id -> release_versions.id
media_asset_id -> media_assets.id
category
caption
sort_order
is_preview_candidate
uploaded_by_user_id
created_at / updated_at
deleted_at / deleted_by_user_id
```

Wichtige Regel:

- Dieser Flow muss mit einer echten `release_version_id` arbeiten.
- Ein `release_id` darf nicht als Ersatz für `release_version_id` verwendet werden.
- Diese Struktur nutzt weiterhin `media_assets` und `media_files`.

---

## 3.11 `fansub_group_media`

Fachliche Bedeutung: Verbindung zwischen Fansub-Gruppe und Media-Asset.

Spalten:

```txt
group_id bigint NOT NULL
media_id bigint NOT NULL
created_at timestamptz NOT NULL
```

Primary Key:

```txt
(group_id, media_id)
```

Foreign Keys:

```txt
group_id -> fansub_groups.id ON DELETE CASCADE
media_id -> media_assets.id ON DELETE CASCADE
```

UI-Mapping:

- Gruppenbilder
- Historienbilder auf Gruppenebene
- Nostalgiebilder auf Gruppenebene
- allgemeine Gruppengalerie

Offen:

- Keine direkte Kategorie-/Sortierspalte im Dump ersichtlich.
- Für Kategorien wie `group_image`, `history`, `nostalgia`, `fun` braucht es entweder eine Erweiterung oder Nutzung vorhandener Media-Metadaten.

---

## 3.12 `anime_media` und `episode_media`

### `anime_media`

Spalten:

```txt
anime_id bigint NOT NULL
media_id bigint NOT NULL
sort_order integer DEFAULT 0
created_at timestamptz NOT NULL
```

### `episode_media`

Spalten:

```txt
episode_id bigint NOT NULL
media_id bigint NOT NULL
sort_order integer DEFAULT 0
created_at timestamptz NOT NULL
```

Hinweis:

- Diese Tabellen existieren.
- Sie sind nicht automatisch der richtige Ort für Fansub-Prozess-Medien.
- Release-Level-/Public-/Legacy-Assets können hier hängen.
- Versionierte Admin-/Fansub-Prozessmedien gehören fachlich zu `release_version_media`.

---

## 3.13 Rollen- und Beitragsstrukturen

### `release_member_roles`

Fachliche Bedeutung: Zuordnung eines Members mit Rolle zu einem Release.

Spalten:

```txt
release_id bigint NOT NULL
member_id bigint NOT NULL
role_id bigint NOT NULL
created_at timestamptz NOT NULL
```

Primary Key:

```txt
(release_id, member_id, role_id)
```

Foreign Keys:

```txt
release_id -> fansub_releases.id ON DELETE CASCADE
member_id -> members.id ON DELETE CASCADE
role_id -> contributor_roles.id ON DELETE CASCADE
```

UI-Mapping:

- Drawer-Tab „Mitglieder & Rollen“.
- Release-spezifische Rollenbeteiligung.

---

### `member_episode_notes`

Fachliche Bedeutung: Textbeitrag eines Members in einer Rolle zu einem Release.

Spalten:

```txt
id bigint NOT NULL
release_id bigint NOT NULL
member_id bigint NOT NULL
role_id bigint NOT NULL
text text NOT NULL
modified_by bigint
```

Foreign Keys:

```txt
release_id -> fansub_releases.id ON DELETE CASCADE
member_id -> members.id ON DELETE CASCADE
role_id -> contributor_roles.id ON DELETE CASCADE
```

Wichtiger Hinweis:

- Der Name `member_episode_notes` ist fachlich leicht irreführend, weil die Tabelle an `release_id` hängt, nicht direkt an `episode_id`.
- Für deine UI kann sie als Release-bezogener Rollenbeitrag interpretiert werden.

---

### `member_anime_notes`

Fachliche Bedeutung: Anime-bezogener Textbeitrag eines Members.

Spalten:

```txt
member_id bigint NOT NULL
anime_id bigint NOT NULL
text text NOT NULL
modified_by bigint
```

Primary Key:

```txt
(member_id, anime_id)
```

Foreign Keys:

```txt
member_id -> members.id ON DELETE CASCADE
anime_id -> anime.id ON DELETE CASCADE
```

Offen:

- Diese Tabelle hängt an `anime`, aber nicht an `fansub_group_id`.
- Für gruppenspezifische Anime-Hauptbeschreibungen ist zu prüfen, ob das ausreicht oder ob ein Bezug zu `anime_fansub_groups` nötig ist.

---

## 4. UI-Zuordnung für `/admin/fansubs/:id/edit`

## 4.1 Basic Information

Primäre Tabelle:

```txt
fansub_groups
```

Typische Felder:

```txt
name
slug
status
group_type
country
founded_year
dissolved_year
closed_year
website_url
discord_url
irc_url
```

Nicht hier hinein:

- Release-spezifische Daten
- Release-Media
- Rollenbeiträge pro Release

---

## 4.2 Media / Gruppenmedia

Branding:

```txt
fansub_groups.logo_id -> media_assets.id
fansub_groups.banner_id -> media_assets.id
```

Weitere Gruppenmedia:

```txt
fansub_group_media.group_id -> fansub_groups.id
fansub_group_media.media_id -> media_assets.id
media_files.media_id -> media_assets.id
```

Nicht hier hinein:

- Release-Prozessbilder
- Tool-Screenshots zu einem Release
- WIP-Bilder zu einem Release

---

## 4.3 Anime & Releases

Grundstruktur:

```txt
fansub_groups.id
 -> anime_fansub_groups.fansub_group_id
 -> anime_fansub_groups.anime_id
 -> anime.id
 -> episodes.anime_id
 -> fansub_releases.episode_id
```

Release-Versionen:

```txt
fansub_releases.id
 -> release_versions.release_id
 -> release_version_groups.release_version_id
```

Release-Media:

```txt
fansub_releases.id
 -> release_media.release_id
 -> media_assets.id
 -> media_files.media_id
```

---

## 4.4 Gruppen- und Kontexttexte

Aktive Anker nach dem Legacy-Cleanup:

```txt
anime_fansub_groups.notes
member_anime_notes
member_episode_notes
```

Wichtig:

- Legacy-Gruppentexte in `fansub_groups.description/history/history_description` wurden entfernt.
- Anime-Kontexttexte einer Gruppe sollten fachlich eher an `anime_fansub_groups` hängen als direkt an `anime`.
- Release-/Rollenbeiträge passen eher zu `member_episode_notes`, da diese an `release_id`, `member_id` und `role_id` hängt.

Offen:

- Ob `anime_fansub_groups.notes` für eine echte Anime-Hauptbeschreibung aus Sicht einer Gruppe ausreicht.
- Ob `member_anime_notes` um Gruppen-/Rollenbezug erweitert werden muss.
- Ob eine neue, explizitere Struktur für Beschreibungen nötig ist.

---

## 5. Technische Regeln für Agenten

### 5.1 Keine parallele Media-Logik erfinden

Agenten dürfen nicht einfach neue Upload- oder Media-Tabellen einführen, wenn bestehende Strukturen nutzbar sind.

Bestehende Media-Basis:

```txt
media_assets
media_files
release_media
fansub_group_media
anime_media
episode_media
```

---

### 5.2 Release-Version-Media-Upload Mindestablauf

Ein Release-Version-Media-Upload im Admin-/Fansub-Arbeitsfluss sollte mindestens:

```txt
1. Request validieren
2. Rechte prüfen
3. Release-Version-Kontext prüfen
4. Datei speichern
5. Datei analysieren
   - MIME-Type
   - Größe
   - Breite/Höhe
   - Hash, falls unterstützt
6. media_assets erstellen
7. media_files erstellen
8. release_version_media mit echter release_version_id erstellen
9. Response mit Asset/Media-Daten zurückgeben
```

Wichtig:

- DB-Schritte sollten transaktional sein.
- Bei Fehlern dürfen keine verwaisten Dateien/Assets entstehen.
- `release_version_media` ist Pflicht für versionierte Admin-/Fansub-Prozessmedien.
- `release_media` ist kein Ersatz für diesen Flow.

---

### 5.3 Gruppenmedia-Upload Mindestablauf

Ein Gruppenmedia-Upload sollte mindestens:

```txt
1. Request validieren
2. Rechte prüfen
3. Gruppe prüfen
4. Datei speichern
5. media_assets erstellen
6. media_files erstellen
7. fansub_group_media erstellen
```

Für Logo/Banner zusätzlich:

```txt
fansub_groups.logo_id aktualisieren
fansub_groups.banner_id aktualisieren
```

---

### 5.4 Kategorie-Metadaten sind offen

Für geplante Kategorien wie:

```txt
anime_screenshot
history
group_image
fun
nostalgia
other
```

ist im alten Dump keine eindeutige Zielspalte in `release_media` oder `fansub_group_media` ersichtlich.

Aktueller Stand:
Für versionierte Admin-/Fansub-Prozessmedien ist `release_version_media.category` die Zielspalte. Für echte Release-Level-/Public-Assets auf `release_media` und für `fansub_group_media` bleibt Kategorie-Metadaten-Design separat zu entscheiden.

Ein Agent muss vor Implementierung prüfen:

- Gibt es `media_types`, die dafür gedacht sind?
- Reicht `media_assets.caption` nicht aus, weil es nur Text ist?
- Muss `release_media` für echte Release-Level-/Public-Assets erweitert werden?
- Muss `fansub_group_media` erweitert werden?
- Braucht es eine allgemeine Media-Metadatenstruktur?

Nicht raten.

---

## 6. Race-Condition-Regel für Anime & Releases

Wenn Releases im UI pro Anime geladen werden, darf der State nicht global und kontextlos sein.

Riskant:

```txt
releases: Release[]
loading: boolean
error: string | null
```

Besser:

```txt
releasesByAnimeFansubKey: Record<string, Release[]>
loadingByAnimeFansubKey: Record<string, boolean>
errorByAnimeFansubKey: Record<string, string | null>
```

Geeignete Keys:

```txt
anime_fansub_groups: anime_id + fansub_group_id
oder ein stabiler API-seitiger Relation-Key, falls vorhanden
```

Bei TanStack Query/SWR muss der Query-Key den konkreten Kontext enthalten, z. B.:

```txt
['fansub-releases', fansubGroupId, animeId]
```

Nicht ausreichend:

```txt
['fansub-releases']
```

---

## 7. Offene Architekturentscheidungen

Diese Punkte dürfen Implementierungs-Agenten nicht stillschweigend raten:

1. Sollen versionierte Admin-/Fansub-Prozessmedien irgendwann öffentlich sichtbar werden oder intern bleiben?
2. Wo werden Kategorien für echte Release-Level-/Public-Assets auf `release_media` gespeichert, falls sie benötigt werden?
3. Wo werden Kategorien für `fansub_group_media` gespeichert?
4. Wird `anime_fansub_groups.notes` als Anime-Hauptbeschreibung im Gruppenkontext genutzt oder braucht es eine neue Struktur?
5. Wie sollen `member_anime_notes` gruppenspezifisch interpretiert werden, da sie aktuell keinen `fansub_group_id`-Bezug haben?
6. Ist die Legacy-Spalte `release_version_groups.fansubgroup_id` in allen Ziel-DBs bereits entfernt oder braucht es noch eine finale Cleanup-Migration?
7. Wird Media-Sortierung pro Release global oder pro Kategorie umgesetzt?
8. Welche Upload-Limits gelten für Bilder, GIFs und Videos?
9. Sind MP4/WebM Teil des aktuellen Scopes oder später?
10. Soll `episode_media` weiterhin für neutrale Episodenmedien genutzt werden und klar von Release-Media getrennt bleiben?

---

## 8. Empfohlene Phasen für Codex/GSD

### Phase 1: Anime-&-Releases-Liste stabilisieren

Ziel:

- Releases pro Anime/Fansub-Kontext korrekt laden.
- Race Conditions verhindern.
- Loading/Error pro Kontext führen.

Kein Upload, keine Rollenbeiträge, keine neue DB-Struktur.

---

### Phase 2: Release-Detail-Drawer

Ziel:

- Release aus Liste öffnen.
- Details im Drawer anzeigen.
- Tabs vorbereiten: Details, Media, Mitglieder & Rollen, Versionen, Historie.

---

### Phase 3: Release-Version-Media API/Mapping prüfen

Ziel:

- Bestehende Backend-Routen, Models, Repositories und Tabellen prüfen.
- Sicherstellen, dass Admin-/Fansub-Prozessmedien über `release_version_media` laufen.
- Entscheiden, ob `release_media` nur für echte Release-Level-/Public-Assets erweitert werden muss.

Keine geratenen Migrationen.

---

### Phase 4: Release-Version-Media Upload

Ziel:

- Upload in Release-Drawer einbauen.
- `media_assets`, `media_files`, `release_version_media` mit echter `release_version_id` korrekt befüllen.
- Grid nach Upload aktualisieren.

---

### Phase 5: Release-Version-Media verwalten

Ziel:

- Grid
- Bearbeiten
- Löschen
- Sortieren
- Kategorien anzeigen

---

### Phase 6: Gruppen- und Kontexttexte

Ziel:

- Datenmodell für Anime-, Rollen- und Release-Texte klären.
- UI mit Context Tree vorbereiten.

---

## 9. Kurze Agentenregel

Für alle Agenten gilt:

```txt
Prüfe zuerst das aktuelle Schema und bestehende Patterns.
Nutze bestehende Tabellen.
Anime und Episode bleiben neutral.
Release-Version-Media gehört in den konkreten Release-Version-Kontext.
Gruppenmedia gehört in den Gruppenkontext.
Keine neue Media-Parallelstruktur erfinden.
Keine Schema-Entscheidungen raten.
```
