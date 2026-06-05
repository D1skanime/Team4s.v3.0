# Team4s – DB-Schema-Referenz für Fansub-/Anime-Domain

Quelle: `team4s_v2_20260502-214428.sql` plus Repository-Migrationen
Stand des Dumps: 02.05.2026  
Repository-/Live-DB-Abgleich: 04.06.2026, bis Migration `0096_hist_group_members_confirmation_audit`
DB: PostgreSQL 16

Diese Datei ist als fachliche und technische Referenz für GSD-/Codex-Agenten gedacht. Sie ersetzt nicht die Prüfung des aktuellen Repository-Codes oder neuer Migrationen, definiert aber die stabile Kernlogik der Anime-/Fansub-Domain. Die ursprüngliche Basis war ein Dump vom 02.05.2026; die späteren Abschnitte wurden gegen `database/migrations` und die lokale Docker-DB `team4s_v2` abgeglichen.

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
 ├── fansub_group_notes
 ├── member_group_stories
 ├── fansub_group_history
 ├── fansub_group_members
 │    └── fansub_group_member_roles
 ├── fansub_group_invitations
 ├── fansub_group_media
 │    └── media_assets
 │         └── media_files
 ├── logo_id -> media_assets.id
 └── banner_id -> media_assets.id

members
 ├── hist_fansub_group_members
 │    ├── hist_group_member_roles
 │    └── anime_contributions
 │         └── anime_contribution_roles
 ├── member_claims
 ├── member_claim_invitations
 └── member_badges

app_users
 ├── app_user_global_roles
 ├── fansub_group_members
 ├── fansub_group_invitations
 ├── member_claims
 └── confirmation/audit columns on historical tables
```

Für die Admin-UI `/admin/fansubs/:id/edit` bedeutet das:

```txt
Fansub-Gruppe
 ├── Basic Information -> fansub_groups
 ├── Media / Gruppenmedia -> fansub_groups.logo_id, banner_id, fansub_group_media
 ├── Anime & Releases -> anime_fansub_groups + anime + episodes + fansub_releases
 ├── Release-Detail -> fansub_releases + release_versions
 ├── Release-Version-Media -> release_version_media + media_assets + media_files
 ├── Rollen-/Beitragsdaten -> release_member_roles, member_episode_notes, member_anime_notes
 ├── Gruppen-/Kontexttexte -> fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes
 ├── App-Mitglieder -> fansub_group_members + fansub_group_member_roles + fansub_group_invitations
 └── Historie/Beiträge -> hist_fansub_group_members, hist_group_member_roles, fansub_group_history, anime_contributions
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
- Nicht mehr für Langtexte verwenden: `description`, `history` und `history_description` wurden mit Migration `0071_drop_fansub_legacy_text_fields` entfernt.
- Gruppen-, Historien- und Kontexttexte liegen jetzt in eigenen Tabellen, siehe `fansub_group_notes`, `member_group_stories`, `anime_fansub_project_notes`, `release_version_notes` und `fansub_group_history`.

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
- Geeigneter fachlicher Kontextanker für gruppenspezifische Anime-Notizen.

Aktueller Stand:

- `anime_fansub_groups.notes` bleibt ein einfacher Legacy-/Kurznotizanker.
- Strukturierte oder editorbasierte Anime-Kontexttexte einer Gruppe gehören in `anime_fansub_project_notes`.
- Seit Migration `0066_anime_fansub_project_notes_context_guard` erzwingt die DB, dass ein Projekttext nur für ein existierendes `(anime_id, fansub_group_id)`-Paar in `anime_fansub_groups` existieren kann.

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

### `contributor_roles`

Fachliche Bedeutung: Legacy-/Release-Rollenkatalog für releasebezogene Rollenbeiträge.

Wichtige Spalten:

```txt
id bigint NOT NULL
name varchar(80)
created_at timestamptz
label varchar(100) NOT NULL
description text NOT NULL
```

Phase-65-Hinweis:

- Migration `0065_seed_contributor_roles_kernrollen` ergänzt `label` und `description`.
- Die Migration seedet die Kernrollen `translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `project_lead`, `designer`, `admin`, `other`.
- Diese Tabelle wird weiterhin von älteren Release-Notizstrukturen wie `release_member_roles`, `member_episode_notes`, `member_group_stories` und `release_version_notes` referenziert.
- Neue historische Gruppenrollen und Anime-Contribution-Rollen verwenden zusätzlich `role_definitions`.

---

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
- Für gruppenspezifische Anime-Hauptbeschreibungen ist sie nicht der primäre Anker; dafür existiert seit Phase 60+ `anime_fansub_project_notes`.

---

## 3.14 Text-/Notiztabellen aus Phase 60-71

Diese Tabellen ersetzen die alten freien Textfelder im Gruppendatensatz und trennen die fachlichen Kontexte sauber. Alle vier Tabellen verwenden denselben Status-/Sichtbarkeitsrahmen:

```txt
visibility IN ('public', 'internal')
status IN ('draft', 'published', 'archived', 'deleted')
```

Gemeinsame Editor-/Content-Spalten seit den Tiptap-Migrationen `0067` bis `0070`:

```txt
body_markdown text NOT NULL DEFAULT ''
body_html text NOT NULL DEFAULT ''
body_json jsonb NULL
body_text text NOT NULL DEFAULT ''
editor_type text NOT NULL DEFAULT 'tiptap'
content_schema_version int NOT NULL DEFAULT 1
```

Gemeinsame Audit-/Lifecycle-Spalten:

```txt
created_by_user_id bigint NULL -> users.id
updated_by_user_id bigint NULL -> users.id
created_at timestamptz NOT NULL DEFAULT NOW()
updated_at timestamptz
deleted_at timestamptz NULL
deleted_by_user_id bigint NULL -> users.id
sort_order int NOT NULL DEFAULT 0
```

### `fansub_group_notes`

Fachliche Bedeutung: Allgemeine Notizen und Langtexte direkt im Kontext einer Fansubgruppe.

Wichtige Beziehung:

```txt
fansub_group_notes.fansub_group_id -> fansub_groups.id ON DELETE CASCADE
```

Verwendung:

- Gruppenbeschreibung, interne Notizen oder veröffentlichbare Gruppentexte.
- Nicht für Anime-spezifische Projekttexte verwenden.
- Nicht für release-version-spezifische Prozessnotizen verwenden.

---

### `member_group_stories`

Fachliche Bedeutung: Story-/Historientexte eines konkreten Members im Kontext einer Fansubgruppe.

Wichtige Beziehungen:

```txt
member_group_stories.fansub_group_id -> fansub_groups.id ON DELETE CASCADE
member_group_stories.member_id -> members.id ON DELETE CASCADE
member_group_stories.role_id -> contributor_roles.id ON DELETE SET NULL
```

Verwendung:

- Mitgliederbezogene Gruppenhistorie.
- Rollenbezogene Erzähltexte, wenn die Rolle noch über `contributor_roles` geführt wird.
- Nicht als Ersatz für aktuelle App-Mitgliedschaften in `fansub_group_members` verwenden.

---

### `anime_fansub_project_notes`

Fachliche Bedeutung: Anime-/Projekttext im konkreten Kontext einer Fansubgruppe.

Wichtige Beziehungen:

```txt
anime_fansub_project_notes.anime_id -> anime.id ON DELETE CASCADE
anime_fansub_project_notes.fansub_group_id -> fansub_groups.id ON DELETE CASCADE
(anime_id, fansub_group_id) -> anime_fansub_groups(anime_id, fansub_group_id) ON DELETE CASCADE
```

Unique/Context-Regel:

```txt
UNIQUE (anime_id, fansub_group_id) WHERE deleted_at IS NULL
```

Verwendung:

- Gruppenspezifische Anime-/Projektbeschreibung.
- Der DB-Guard aus Migration `0066` verhindert Projekttexte ohne existierende Anime-Fansub-Zuordnung.
- Diese Tabelle ist der bevorzugte strukturierte Anker statt `anime_fansub_groups.notes`, wenn Editorinhalt, Status oder Sichtbarkeit gebraucht werden.

---

### `release_version_notes`

Fachliche Bedeutung: Rollen-/Member-Notiz zu einer konkreten Release-Version.

Wichtige Beziehungen:

```txt
release_version_notes.release_version_id -> release_versions.id ON DELETE CASCADE
release_version_notes.member_id -> members.id ON DELETE CASCADE
release_version_notes.role_id -> contributor_roles.id ON DELETE RESTRICT
```

Unique-Regel:

```txt
UNIQUE (release_version_id, member_id, role_id) WHERE deleted_at IS NULL
```

Verwendung:

- Versionierte Prozess-/Rollenbeiträge.
- Präziser als `member_episode_notes`, wenn ein Beitrag an einer echten `release_version_id` hängt.
- Nicht als Media-Ersatz verwenden; Bilder/GIFs bleiben über `release_version_media`.

---

## 3.15 App-User, aktuelle Gruppenmitgliedschaften und Einladungen

### `app_users` und `app_user_global_roles`

Fachliche Bedeutung: Keycloak-gestützte App-Identität und globale Plattformrollen.

Wichtige Spalten `app_users`:

```txt
id bigint NOT NULL
legacy_user_id bigint NULL -> users.id
keycloak_subject varchar(255) NOT NULL UNIQUE
email varchar(255) NOT NULL
display_name varchar(120) NOT NULL
preferred_username varchar(120)
given_name varchar(120)
family_name varchar(120)
status varchar(20) NOT NULL
last_login_at timestamptz
last_logout_at timestamptz
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Checks:

```txt
app_users.status IN ('pending', 'active', 'disabled')
app_user_global_roles.role IN ('platform_admin', 'content_admin', 'user')
```

Wichtig:

- `app_users` ist die aktuelle Login-/Account-Identität.
- `members` bleibt die historische/personenbezogene Fansub-Identität.
- Nicht blind `app_users.id` und `members.id` gleichsetzen.

---

### `fansub_group_members` und `fansub_group_member_roles`

Fachliche Bedeutung: Aktuelle App-User-Mitgliedschaft in einer Fansubgruppe samt administrativer Rollen.

Wichtige Spalten `fansub_group_members`:

```txt
id bigint NOT NULL
fansub_group_id bigint NOT NULL -> fansub_groups.id
app_user_id bigint NOT NULL -> app_users.id
status varchar(20) NOT NULL
created_by_app_user_id bigint NULL -> app_users.id
updated_by_app_user_id bigint NULL -> app_users.id
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Unique/Checks:

```txt
UNIQUE (fansub_group_id, app_user_id)
status IN ('active', 'disabled')
fansub_group_member_roles PRIMARY KEY (fansub_group_member_id, role)
role IN ('fansub_lead', 'project_lead', 'translator', 'timer', 'typesetter', 'editor', 'encoder', 'raw_provider', 'quality_checker', 'designer')
```

Wichtig:

- Diese Tabellen steuern aktuelle App-Mitgliedschaften und Rechte.
- Historische Mitgliedschaft gehört nicht hierhin, sondern in `hist_fansub_group_members`.
- Ein historischer Eintrag kann existieren, ohne dass ein App-User Mitglied ist.

---

### `fansub_group_invitations`

Fachliche Bedeutung: Einladung eines App-Users per E-Mail in eine Fansubgruppe.

Wichtige Spalten:

```txt
id bigint NOT NULL
fansub_group_id bigint NOT NULL -> fansub_groups.id
email text NOT NULL
normalized_email text NOT NULL
invited_role_codes text[] NOT NULL
token_hash varchar(64) NOT NULL
status varchar(20) NOT NULL
expires_at timestamptz NOT NULL
created_by_app_user_id bigint NULL -> app_users.id
accepted_by_app_user_id bigint NULL -> app_users.id
cancelled_by_app_user_id bigint NULL -> app_users.id
accepted_at timestamptz NULL
cancelled_at timestamptz NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Checks/Indexes:

```txt
status IN ('pending', 'accepted', 'cancelled', 'expired')
char_length(token_hash) = 64
invited_role_codes non-empty
UNIQUE (fansub_group_id, normalized_email) WHERE status = 'pending'
UNIQUE (token_hash)
```

---

## 3.16 Historische Gruppenmitglieder, Rollen und Meilensteine

### `hist_fansub_group_members`

Fachliche Bedeutung: Historische/personenbezogene Mitgliedschaft eines `members`-Datensatzes in einer Fansubgruppe.

Wichtige Spalten:

```txt
id bigint NOT NULL
fansub_group_id bigint NOT NULL -> fansub_groups.id
member_id bigint NOT NULL -> members.id
joined_year int NULL
left_year int NULL
status varchar(20) NOT NULL DEFAULT 'historical'
visibility varchar(20) NOT NULL DEFAULT 'internal'
created_by bigint NULL -> app_users.id
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
confirmed_by bigint NULL -> app_users.id
confirmed_at timestamptz NULL
```

Checks/Unique:

```txt
UNIQUE (fansub_group_id, member_id)
UNIQUE (fansub_group_id, id)
status IN ('draft', 'historical', 'confirmed', 'disputed')
visibility IN ('internal', 'public')
left_year >= joined_year, falls beide gesetzt sind
```

Wichtig:

- Diese Tabelle ist member-basiert, nicht app-user-basiert.
- `confirmed_by`/`confirmed_at` wurden mit Migration `0096` ergänzt.
- `confirmed_by` zeigt auf den App-User, der den historischen Eintrag bestätigt hat; alte bestätigte Einträge können hier NULL haben.

---

### `hist_group_member_roles`

Fachliche Bedeutung: Historische Rollenperioden eines historischen Gruppenmitglieds.

Wichtige Spalten:

```txt
id bigint NOT NULL
hist_fansub_group_member_id bigint NOT NULL -> hist_fansub_group_members.id
role_code text NOT NULL -> role_definitions.code
started_year int NULL
ended_year int NULL
status varchar(20) NOT NULL DEFAULT 'historical'
visibility varchar(20) NOT NULL DEFAULT 'internal'
confirmed_by bigint NULL -> app_users.id
confirmed_at timestamptz NULL
source_note text NULL
created_by bigint NULL -> app_users.id
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Verwendung:

- Rollen wie Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement.
- Status-/Sichtbarkeitslogik entspricht `hist_fansub_group_members`.
- Rollen-Codes kommen aus `role_definitions` mit passendem Kontext `group_history`.

---

### `fansub_group_history`

Fachliche Bedeutung: Meilensteine und wichtige Ereignisse einer Fansubgruppe.

Wichtige Spalten:

```txt
id bigint NOT NULL
fansub_group_id bigint NOT NULL -> fansub_groups.id
year int NULL
event_type text NOT NULL
title text NULL
note text NULL
status varchar(20) NOT NULL DEFAULT 'historical'
created_by bigint NULL -> app_users.id
created_at timestamptz NOT NULL
```

Checks:

```txt
event_type IN ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other')
status IN ('draft', 'historical', 'confirmed', 'disputed')
```

---

### `role_definitions`

Fachliche Bedeutung: Neuer kontextfähiger Rollenkatalog für historische Gruppenrollen und Anime-Contributions.

Spalten:

```txt
code text PRIMARY KEY
label_de text NOT NULL
contexts text[] NOT NULL
sort_order int NOT NULL
```

Wichtige Kontexte:

```txt
anime_contribution
group_history
```

Wichtig:

- `hist_group_member_roles.role_code` und `anime_contribution_roles.role_code` referenzieren `role_definitions.code`.
- `project_lead` und `project_manager` können in mehreren Kontexten vorkommen.

---

## 3.17 Anime-Contributions, Rollen und Badges

### `anime_contributions`

Fachliche Bedeutung: Historisches Faktenregister für Beteiligungen eines Gruppenmitglieds an einem Anime oder einer konkreten Release-Version.

Wichtige Spalten:

```txt
id bigint NOT NULL
fansub_group_id bigint NOT NULL -> fansub_groups.id
anime_id bigint NOT NULL -> anime.id
fansub_group_member_id bigint NOT NULL -> hist_fansub_group_members.id
release_version_id bigint NULL -> release_versions.id ON DELETE SET NULL
status varchar(20) NOT NULL DEFAULT 'draft'
note text NULL
review_note text NULL
started_year int NULL
ended_year int NULL
is_public_on_anime_page boolean NOT NULL DEFAULT false
is_public_on_member_profile boolean NOT NULL DEFAULT false
confirmed_by bigint NULL -> app_users.id
confirmed_at timestamptz NULL
created_by bigint NULL -> app_users.id
updated_by bigint NULL -> app_users.id
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Checks/Unique:

```txt
status IN ('draft', 'proposed', 'confirmed', 'disputed', 'hidden')
ended_year >= started_year, falls beide gesetzt sind
UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)
(fansub_group_id, fansub_group_member_id) -> hist_fansub_group_members(fansub_group_id, id)
```

Wichtig:

- Der Composite-FK aus Migration `0088` verhindert Cross-Group-Contributions.
- `release_version_id` ist optional; NULL bedeutet anime-weit.
- Wenn eine Release-Version gelöscht wird, bleibt die Contribution als historisches Faktum erhalten und fällt auf NULL zurück.

---

### `anime_contribution_roles`

Fachliche Bedeutung: Rollenliste zu einer Anime-Contribution.

Spalten:

```txt
id bigint NOT NULL
anime_contribution_id bigint NOT NULL -> anime_contributions.id ON DELETE CASCADE
role_code text NOT NULL -> role_definitions.code
```

Unique:

```txt
UNIQUE (anime_contribution_id, role_code)
```

---

### `member_badges`

Fachliche Bedeutung: Abgeleitete oder vergebene Badges für Member-Profile.

Wichtige Spalten:

```txt
id bigint NOT NULL
member_id bigint NOT NULL -> members.id
badge_code text NOT NULL
badge_category varchar(30) NOT NULL
derived_from_type text NULL
derived_from_id bigint NULL
status varchar(20) NOT NULL DEFAULT 'active'
visibility varchar(20) NOT NULL DEFAULT 'public'
awarded_at timestamptz NOT NULL
```

Checks:

```txt
UNIQUE (member_id, badge_code)
badge_category IN ('historical_achievement', 'supporter', 'platform')
status IN ('active', 'revoked', 'pending')
visibility IN ('public', 'internal', 'hidden')
```

---

## 3.18 Member-Claims

### `member_claims`

Fachliche Bedeutung: Verknüpfung oder Anfrage, mit der ein App-User eine historische `members`-Identität beansprucht.

Wichtige Spalten:

```txt
id bigint NOT NULL
member_id bigint NULL -> members.id
app_user_id bigint NULL -> app_users.id
claim_status varchar(20) NOT NULL DEFAULT 'pending'
verification_method text NULL
verified_by bigint NULL -> app_users.id
verified_at timestamptz NULL
note text NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Checks/Unique:

```txt
claim_status IN ('pending', 'verified', 'rejected')
UNIQUE (member_id, app_user_id)
UNIQUE (app_user_id) WHERE member_id IS NULL AND claim_status = 'pending' AND app_user_id IS NOT NULL
```

Wichtig:

- Seit Migration `0094` darf `member_id` NULL sein. Das bildet offene Claim-Anfragen ab, bei denen noch kein konkreter Member-Datensatz ausgewählt ist.

---

### `member_claim_invitations`

Fachliche Bedeutung: Einladungslink, mit dem ein App-User eine bestimmte historische Member-Identität claimen kann.

Wichtige Spalten:

```txt
id bigint NOT NULL
member_id bigint NOT NULL -> members.id
fansub_group_id bigint NOT NULL -> fansub_groups.id
token_hash varchar(64) NOT NULL
status varchar(20) NOT NULL DEFAULT 'pending'
expires_at timestamptz NOT NULL
created_by_app_user_id bigint NULL -> app_users.id
accepted_by_app_user_id bigint NULL -> app_users.id
cancelled_by_app_user_id bigint NULL -> app_users.id
accepted_at timestamptz NULL
cancelled_at timestamptz NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Checks/Indexes:

```txt
status IN ('pending', 'accepted', 'cancelled', 'expired')
char_length(token_hash) = 64
UNIQUE (member_id) WHERE status = 'pending'
UNIQUE (token_hash)
```

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
fansub_group_notes
member_group_stories
anime_fansub_project_notes
release_version_notes
fansub_group_history
```

Wichtig:

- Legacy-Gruppentexte in `fansub_groups.description/history/history_description` wurden entfernt.
- Gruppentexte direkt zur Gruppe gehören in `fansub_group_notes`.
- Mitgliederbezogene Gruppenstorys gehören in `member_group_stories`.
- Anime-Kontexttexte einer Gruppe gehören in `anime_fansub_project_notes`; `anime_fansub_groups.notes` bleibt nur ein einfacher Kurznotiz-/Legacy-Anker.
- Release-Version-/Rollenbeiträge gehören bevorzugt in `release_version_notes`, wenn eine konkrete `release_version_id` existiert.
- Gruppenmeilensteine gehören in `fansub_group_history`.

Legacy-/Altanker:

- `member_episode_notes` hängt an `release_id`, nicht direkt an `episode_id`, und bleibt fachlich ein älterer Release-Rollenbeitrag.
- `member_anime_notes` hängt an `anime`, aber nicht an `fansub_group_id`; für gruppenspezifische Anime-Texte nicht als Primäranker verwenden.

---

## 4.5 App-Mitglieder und Einladungen

Aktive Anker:

```txt
fansub_group_members
fansub_group_member_roles
fansub_group_invitations
app_users
```

Verwendung:

- Aktuelle Gruppenmitglieder mit App-Konto.
- Rechte-/Rollensteuerung für Leader- und Bearbeitungsflows.
- Einladungen per E-Mail mit Token-Hash.

Nicht hier hinein:

- Historische Mitgliedschaft ohne App-Konto.
- Frühere Rollenperioden oder Gruppenhistorie.

---

## 4.6 Hist. Mitglieder und Rollen/Timeline

Aktive Anker:

```txt
hist_fansub_group_members
hist_group_member_roles
role_definitions
fansub_group_history
```

Verwendung:

- Tab `Hist. Mitglieder`: historische `members`-Identitäten in der Gruppe.
- Status `confirmed` speichert seit Migration `0096` den bestätigenden App-User in `confirmed_by` und den Zeitpunkt in `confirmed_at`.
- Tab `Rollen/Timeline`: historische Rollenperioden über `hist_group_member_roles`.
- Gruppengeschichte/Meilensteine über `fansub_group_history`.

Nicht hier hinein:

- Aktuelle App-Rechte. Diese bleiben in `fansub_group_members`/`fansub_group_member_roles`.
- Anime-spezifische Beitragslisten. Diese gehören in `anime_contributions`.

---

## 4.7 Claims, Vorschläge und Anime-Beiträge

Aktive Anker:

```txt
member_claims
member_claim_invitations
anime_contributions
anime_contribution_roles
member_badges
```

Verwendung:

- Claims verbinden oder beantragen die Verbindung zwischen `app_users` und historischen `members`.
- Claim-Einladungen werden über `member_claim_invitations` abgebildet.
- Anime-Beiträge hängen immer an `anime_contributions` und damit an einer konkreten historischen Gruppenmitgliedschaft.
- Rollen pro Anime-Beitrag liegen in `anime_contribution_roles`.
- Sichtbarkeit auf Anime-Seite und Member-Profil wird über Flags auf `anime_contributions` gesteuert.

Nicht hier hinein:

- Release-Media oder Version-Media.
- Gruppenweite Langtexte oder Projekttexte.

---

## 5. Technische Regeln für Agenten

### 5.1 Keine parallele Media-Logik erfinden

Agenten dürfen nicht einfach neue Upload- oder Media-Tabellen einführen, wenn bestehende Strukturen nutzbar sind.

Das gilt auch für Frontend- und API-Flows: Vor neuen Upload-Komponenten, Upload-Hooks, Upload-Endpunkten oder Upload-Tabellen müssen die bestehenden Flows geprüft und wiederverwendet werden, sofern sie fachlich passen.

Bestehende Upload-Flows:

```txt
Fansub-/Group-Media:
- frontend/src/components/admin/MediaUpload.tsx

Release-Version-Media:
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts

Anime-Media:
- frontend/src/app/admin/anime/create/createAssetUploadPlan.ts
- frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx

Browser upload transport/progress:
- frontend/src/lib/api.ts
```

Shared UI darf kleine Primitives wie Dropzone, Progress, Error oder Preview extrahieren. Diese Primitives dürfen aber keine Domain-Flows zusammenlegen und keine kanonischen Tabellen umgehen.

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

### 5.5 App-User, Member und historische Mitglieder nicht vermischen

Agenten müssen die drei Identitätsebenen auseinanderhalten:

```txt
app_users -> aktuelles Login-/Account-Konto
fansub_group_members -> aktuelle App-Mitgliedschaft/Rechte in einer Gruppe
members -> historische/personenbezogene Fansub-Identität
hist_fansub_group_members -> historische Mitgliedschaft einer Person in einer Gruppe
```

Wichtige Regeln:

- Ein App-User kann aktuelle Rechte haben, ohne dass bereits eine historische `members`-Identität verknüpft ist.
- Eine historische Person kann in `hist_fansub_group_members` existieren, ohne App-Konto.
- Claims verbinden App-User und historische Members über `member_claims` oder `member_claim_invitations`; nicht über ad-hoc-Spalten.
- Bestätigungen historischer Einträge verwenden `confirmed_by`/`confirmed_at` auf der jeweiligen historischen Tabelle, nicht Gruppenname oder implizite Leader-Annahme.
- Anime-Contributions müssen über `fansub_group_member_id` an eine reale historische Gruppenmitgliedschaft gebunden bleiben.

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
4. Wie sollen `member_anime_notes` langfristig behandelt werden, da sie keinen `fansub_group_id`-Bezug haben und `anime_fansub_project_notes` der neue Gruppen-Kontextanker ist?
5. Ist die Legacy-Spalte `release_version_groups.fansubgroup_id` in allen Ziel-DBs bereits entfernt oder braucht es noch eine finale Cleanup-Migration?
6. Wird Media-Sortierung pro Release global oder pro Kategorie umgesetzt?
7. Welche Upload-Limits gelten für Bilder, GIFs und Videos?
8. Sind MP4/WebM Teil des aktuellen Scopes oder später?
9. Soll `episode_media` weiterhin für neutrale Episodenmedien genutzt werden und klar von Release-Media getrennt bleiben?
10. Welche historischen Statusübergänge sollen Bestätigungsdaten überschreiben dürfen, falls ein bestätigter Eintrag später erneut bestätigt wird?

---

## 8. Historische Phasenhinweise für Codex/GSD

Die folgenden Punkte stammen aus dem ursprünglichen Planungsstand dieser Referenz. Sie sind keine aktuelle Roadmap mehr, sondern erklären, warum bestimmte Tabellen/Regeln entstanden sind.

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
Aktuelle App-Mitgliedschaft, historische Person und Claim-Status nicht vermischen.
Gruppen-/Projekttexte gehören in die kontextspezifischen Notiztabellen, nicht zurück in fansub_groups.
Keine neue Media-Parallelstruktur erfinden.
Keine Schema-Entscheidungen raten.
```
