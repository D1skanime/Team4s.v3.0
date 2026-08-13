# Phase 70: TipTap-Bilder fuer Member-Profilgeschichte - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 70-tiptap-bilder-fuer-member-profilgeschichte
**Areas discussed:** Bild-Referenz & Datenvertrag, Upload-Flow & Speicher-Seam, Editor- & Reader-UX, Validierungsgrenzen, Orphan-Handling, Public-Profil-Integration, Test- & UAT-Kriterien, Sanitizing-Details

---

## Bild-Referenz & Datenvertrag

| Option | Description | Selected |
|--------|-------------|----------|
| media_asset_id, URL serverseitig | Node speichert nur media_asset_id; Backend loest URL beim Render auf | ✓ |
| Relative /media-URL als src | URL direkt als src im JSON | |
| Beides: ID + abgeleitete URL | ID als Wahrheit + gecachte src | |

**User's choice:** media_asset_id, URL serverseitig

| Option | Description | Selected |
|--------|-------------|----------|
| Alt + Caption | alt + optionale Caption | |
| Nur Alt-Text | nur alt | |
| Alt + Caption + Layout | alt/caption + Layout-Attribut | ✓ |

**User's choice:** Alt + Caption + Layout (Layout-Werte in Bereich 3; Alt/Caption spaeter doch gestrichen — siehe UX)

| Option | Description | Selected |
|--------|-------------|----------|
| Existenz + Eigentuemer | existiert + gehoert dem Member | ✓ |
| Nur Existenz | existiert + Bildtyp | |
| Format-Validierung only | nur Struktur | |

**User's choice:** Existenz + Eigentuemer

| Option | Description | Selected |
|--------|-------------|----------|
| Node still ueberspringen | fehlendes Asset → Node auslassen | ✓ |
| Platzhalter rendern | "Bild nicht verfuegbar" | |
| Save-Zeit garantieren | keine Sonderbehandlung | |

**User's choice:** Node still ueberspringen

---

## Upload-Flow & Speicher-Seam

| Option | Description | Selected |
|--------|-------------|----------|
| Sofort bei Dateiauswahl | Upload sofort, ID-Insert | |
| Gesammelt beim Profil-Save | Batch-Upload beim Save | ✓ |

**User's choice:** Gesammelt beim Profil-Save

| Option | Description | Selected |
|--------|-------------|----------|
| Lokale Vorschau (Object-URL) | Object-URL bis Save, dann ID-Tausch | ✓ |
| Platzhalter bis Save | nur Platzhalter | |
| Du entscheidest | Planner waehlt | |

**User's choice:** Lokale Vorschau (Object-URL)

| Option | Description | Selected |
|--------|-------------|----------|
| Member-Profil-Upload erweitern | /media/profile/{memberID}/story/{mediaID} | ✓ |
| Generischer media_service | zentraler SaveUpload | |
| Release-Version-Media-Service | release-zentriert | |

**User's choice:** Member-Profil-Upload erweitern

| Option | Description | Selected |
|--------|-------------|----------|
| media_assets-Zeile mit Member-Owner | bestehende Tabelle + Owner | ✓ |
| Eigene Story-Image-Tabelle | dedizierte Tabelle | |
| Du entscheidest | Planner waehlt | |

**User's choice:** media_assets-Zeile mit Member-Owner

---

## Editor- & Reader-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog beim Einfuegen | Alt/Caption-Dialog | |
| Inline-Caption unter Bild | figcaption inline | |
| Du entscheidest / Freitext | — | ✓ (Freitext) |

**User's choice (Freitext):** Bild-Icon im TipTap-Editor → Bild auswaehlen → an der Textstelle eingefuegt → dort verkleinern/groesser ziehen oder an andere Stelle ziehen.
**Notes:** Auf Rueckfrage zu Alt/Caption → **Option 1: beide weglassen**. Bewusste Reduktion ggue. ROADMAP-SC1 (Contract-Gap, kein Alt fuer Barrierefreiheit).

| Option | Description | Selected |
|--------|-------------|----------|
| Breite in % des Textbereichs | relativ, responsiv | ✓ |
| Breite in Pixeln | absolut | |
| Diskrete Groessenstufen | klein/mittel/voll | |

**User's choice:** Breite in % des Textbereichs

| Option | Description | Selected |
|--------|-------------|----------|
| Links/Mitte/Rechts (Block) | Block + Ausrichtung | ✓ |
| Immer Block, zentriert | nur zentriert | |
| Mit Textumfluss (float) | float | |

**User's choice:** Links/Mitte/Rechts (Block)

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Profil-Story (opt-in) | per Prop/Flag nur Story | ✓ |
| Ueberall aktiv | global | |
| Du entscheidest | Planner waehlt Mechanismus | |

**User's choice:** Nur Profil-Story (opt-in)

---

## Validierungsgrenzen

| Option | Description | Selected |
|--------|-------------|----------|
| JPG/PNG/WebP, kein GIF | statische Formate | ✓ |
| JPG/PNG/WebP/GIF | inkl. GIF | |
| Du entscheidest | zentrale MIME-Validierung | |

**User's choice:** JPG/PNG/WebP, kein GIF

| Option | Description | Selected |
|--------|-------------|----------|
| An Avatar-Konvention anlehnen | gleiches Limit wie Avatar | |
| 5 MB | festes 5-MB-Limit | |
| 10 MB | festes 10-MB-Limit | ✓ |

**User's choice:** 10 MB

| Option | Description | Selected |
|--------|-------------|----------|
| Moderates Limit (z.B. 10) | serverseitig gepruefte Obergrenze | |
| Kein hartes Limit | nur Groesse/Format | ✓ |
| Du entscheidest | sinnvolle Obergrenze | |

**User's choice:** Kein hartes Limit

| Option | Description | Selected |
|--------|-------------|----------|
| Optimieren + Sicherheits-Hardening | govips-Downscale + EXIF/Bomb-Schutz | ✓ |
| Original behalten + nur Hardening | volle Aufloesung + Hardening | |
| Du entscheidest | Planner waehlt | |

**User's choice:** Optimieren + Sicherheits-Hardening

---

## Orphan-Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Kein Upload, kein Orphan | Pre-Save-Entfernung → nie hochgeladen | ✓ |
| Du entscheidest | nur referenzierte Bilder hochladen | |

**User's choice:** Kein Upload, kein Orphan

| Option | Description | Selected |
|--------|-------------|----------|
| Dokumentieren, nicht loeschen | SC5 wie ROADMAP (deferren) | |
| Soft-Delete-Markierung | detached_at-Markierung | |
| Du entscheidest | — | |
| **Freitext (gewaehlt)** | **Beim Bearbeiten+Loeschen+Save physisch aus Store UND DB entfernen** | ✓ |

**User's choice (Freitext):** Wenn der User die Story bearbeitet, dabei das Bild loescht und speichert, muss das Bild sauber aus Store und DB entfernt werden.
**Notes:** Auf Rueckfrage bestaetigt → **Option 1: SC5 ueberschreiben**, Cleanup-on-Save in Phase 70. ROADMAP-SC5-Formulierung muss angepasst werden.

---

## Public-Profil-Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, Public muss Bilder zeigen | Phase 70 verifiziert Public-Darstellung | ✓ |
| Nur /me/profile in Scope | nur eigener Lesemodus | |
| Du entscheidest | nur wenn ohne Mehraufwand | |

**User's choice:** Ja, Public muss Bilder zeigen

---

## Test- & UAT-Kriterien

| Option | Description | Selected |
|--------|-------------|----------|
| Round-Trip Save/Reload | Bild/Breite/Ausrichtung bleiben erhalten | ✓ |
| Cleanup-on-Save | Datei + DB-Zeile physisch weg | ✓ |
| Sicherheit/IDOR + Sanitizing | Fremd-ID abgelehnt, HTML verworfen | ✓ |
| Public-Darstellung | sanitisiert im Public-Profil | ✓ |

**User's choice:** Alle vier (Mehrfachauswahl)

---

## Sanitizing-Details Image-Node

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: src + width% + align-Klasse | strengste Allowlist | ✓ |
| Zusaetzlich loading/decoding | + Performance-Attribute | |
| Du entscheidest | minimale sichere Allowlist | |

**User's choice:** Minimal: src + width% + align-Klasse

---

## Claude's Discretion

- Opt-in-Aktivierungsmechanismus (Prop/Flag/Extension-Konfiguration) fuer den geteilten Editor.
- Konkrete Maximalbreite der serverseitigen Optimierung; exaktes 10-MB-Hardening-Detail aus bestehender Validierung.
- DB-/Migrationsdetail der Member-Owner-Bindung auf media_assets (append-only, reversibel).
- Optionale grosszuegige technische Schutzgrenze trotz "keine harte Bildanzahl-Grenze".

## Deferred Ideas

- Alt-/Caption-Text fuer Story-Bilder (Barrierefreiheits-/Rich-Media-Erweiterung).
- Textumfluss (float) um Bilder.
- Animierte GIFs in der Profilgeschichte.
- Reviewed Todos (nicht gefaltet): profile-hub-content-activity-redesign (0.9), contributor-owned-media-note-edit-delete (0.6).
