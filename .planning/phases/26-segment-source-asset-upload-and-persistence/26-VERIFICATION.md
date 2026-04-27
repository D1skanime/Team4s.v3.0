---
phase: 26
verified: "2026-04-27"
status: task1-complete
score: 8/8 smoke-checks verified
re_verification: false
---

# Phase 26 Verification Report

## Backend-Smoke-Test (Task 1) — PASSED

Ausgefuehrt gegen laufende Docker-Compose-Umgebung: `team4sv30-backend` auf Port `8092`, DB `team4s_v2`.

**Voraussetzung:** Migration 0051 manuell applied (backend war zu diesem Zeitpunkt noch nicht neu gebaut), danach Backend-Image rebuilt und Container neu gestartet.

---

### Check 1: POST `/api/v1/admin/anime/:id/segments/:segmentId/asset`

```
POST http://localhost:8092/api/v1/admin/anime/4/segments/2/asset
Content-Type: multipart/form-data
file: test-segment.mp4 (32 bytes, video/mp4)
```

**HTTP 200 OK**

Response:
```json
{
  "data": {
    "id": 2,
    "source_type": "release_asset",
    "source_ref": "segments/anime_4/group_13/v1/op/test-segment.mp4",
    "source_label": "test-segment.mp4",
    ...
  }
}
```

---

### Check 2: DB — source_type = 'release_asset'

```sql
SELECT id, source_type, source_ref, source_label FROM theme_segments WHERE id = 2;
```

```
 id | source_type   | source_ref                                        | source_label
----+---------------+---------------------------------------------------+------------------
  2 | release_asset | segments/anime_4/group_13/v1/op/test-segment.mp4 | test-segment.mp4
```

**CONFIRMED:** `source_type = 'release_asset'`

---

### Check 3: DB — source_ref = segments/anime_{id}/group_{id}/...

Deterministischer Pfad: `segments/anime_4/group_13/v1/op/test-segment.mp4`

Pattern entspricht: `segments/anime_{animeId}/group_{groupId}/{version}/{segmentTypeLower}/{sanitizedFilename}`

**CONFIRMED**

---

### Check 4: DB — source_label = original filename

`source_label = 'test-segment.mp4'` — identisch mit hochgeladenem Dateinamen.

**CONFIRMED**

---

### Check 5: Datei existiert am erwarteten Pfad

```
/media/segments/anime_4/group_13/v1/op/test-segment.mp4
```

Auf dem Host-System unter `./media/segments/anime_4/group_13/v1/op/test-segment.mp4` verifiziert.

**CONFIRMED**

---

### Check 6: media_assets.file_path passt zu source_ref

```sql
SELECT ma.file_path,
       '/app/media/' || ts.source_ref AS expected_path,
       CASE WHEN ma.file_path = '/app/media/' || ts.source_ref THEN 'MATCH' ELSE 'MISMATCH' END
FROM theme_segments ts
JOIN media_assets ma ON ma.file_path = '/app/media/' || ts.source_ref
WHERE ts.id = 2;
```

```
 file_path                                             | path_check
-------------------------------------------------------+------------
 /app/media/segments/anime_4/group_13/v1/op/test...   | MATCH
```

**CONFIRMED**

---

### Check 7: DELETE `/api/v1/admin/anime/:id/segments/:segmentId/asset`

```
DELETE http://localhost:8092/api/v1/admin/anime/4/segments/2/asset
```

**HTTP 204 No Content**

---

### Check 8a: DB-Felder danach NULL

```sql
SELECT id, source_type, source_ref, source_label FROM theme_segments WHERE id = 2;
```

```
 id | source_type | source_ref | source_label
----+-------------+------------+--------------
  2 |             |            |
```

**CONFIRMED: alle source-Felder NULL**

---

### Check 8b: Datei ist weg

```bash
find ./media/segments/ -name "*.mp4"
# => keine Ausgabe
```

**CONFIRMED: Datei entfernt**

---

### Check 8c: media_assets-Eintrag ist weg

```sql
SELECT id, file_path FROM media_assets WHERE file_path LIKE '%segment%';
```

```
 id | file_path
----+-----------
(0 rows)
```

**CONFIRMED: media_assets-Objekt entfernt**

---

## Zusammenfassung Task 1

| Check | Ergebnis |
|-------|----------|
| POST upload route erreichbar | PASS |
| source_type = 'release_asset' in DB | PASS |
| source_ref deterministisch | PASS |
| source_label = Dateiname | PASS |
| Datei auf Disk | PASS |
| file_path = '/app/media/' + source_ref | PASS |
| DELETE route — HTTP 204 | PASS |
| DB-Felder NULL nach DELETE | PASS |
| Datei weg nach DELETE | PASS |
| media_assets-Eintrag weg nach DELETE | PASS |

**Smoke-Test: BESTANDEN (10/10 Einzelpruefungen)**

---

## Browser-UAT (Task 2) — ausstehend

Muss manuell durchgefuehrt werden — siehe Checkpoint-Details unten.

---

## Handoff fuer Fansub-Selbstpflege (Task 3) — ausstehend

Wird nach Browser-UAT dokumentiert.
