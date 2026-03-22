# Cover-Inventar

## Statistiken

```
Total Cover-Dateien: 2377
Groesse gesamt: ~168 MB
```

## Datei-Naming Pattern

Alle Cover folgen dem Pattern: `{8-stelliger-hex}.jpg`

Beispiele:
```
542306a2.jpg
542312ae.jpg
5427a71a.jpg
542c6ee8.jpg
...
```

## Datei-Groessen

Typische Groessen zwischen 40-80 KB pro Cover.

Beispiele:
```
542306a2.jpg - 50 KB
542312ae.jpg - 59 KB
5427a71a.jpg - 61 KB
542c6ee8.jpg - 67 KB
```

## Anime-Zuordnung

Die Zuordnung erfolgt ueber die `anime.cover_image` Spalte in der Datenbank:

```sql
SELECT id, title, cover_image
FROM anime
WHERE cover_image IS NOT NULL
LIMIT 5;
```

Beispiel-Resultat:
```
id  | title              | cover_image
----+--------------------+---------------
1   | Naruto             | 542306a2.jpg
2   | One Piece          | 542312ae.jpg
3   | Bleach             | 5427a71a.jpg
...
```

## Erwartetes Ergebnis nach Migration

Jedes Cover wird zu:
```
media/anime/{anime_id}/poster/{uuid}/
  ├── original.webp  (~15-25 KB, konvertiert von JPEG)
  └── thumb.webp     (~8-12 KB, 300px breit)
```

Groessen-Reduktion durch WebP:
- Original JPEG: ~50-80 KB
- Original WebP: ~15-25 KB (70% kleiner)
- Thumbnail WebP: ~8-12 KB

Gesamt-Speicher nach Migration: ~55-90 MB (statt 168 MB)

## Nicht zugeordnete Cover

Circa 854 Cover-Dateien (2377 - 1523) haben keine Zuordnung zu Anime-IDs in der Datenbank.

Gruende:
- Geloeschte Anime
- Testdaten
- Veraltete Cover
- Cover fuer noch nicht angelegte Anime

Diese werden vom Migration-Script ignoriert und koennen manuell bereinigt werden.

## Pre-Migration Checklist

- [ ] Datenbank-Backup erstellen
- [ ] Cover-Verzeichnis sichern: `cp -r frontend/public/covers /backup/covers`
- [ ] Dry-Run ausfuehren: `DRY_RUN=true ./migrate-covers`
- [ ] Logs pruefen auf Fehler
- [ ] Platz pruefen: ~100 MB frei benoetigt
- [ ] `media/` Verzeichnis erstellt: `mkdir -p media/anime`

## Post-Migration Checklist

- [ ] Logs pruefen: Anzahl erfolgreicher Migrationen
- [ ] Stichproben: 5-10 Anime-Cover im Browser pruefen
- [ ] DB-Konsistenz: `SELECT COUNT(*) FROM anime_media`
- [ ] Filesystem: `du -sh media/anime/*/poster`
- [ ] Frontend-Aenderungen deployen
- [ ] Cover-Fallback testen (alte URLs)
- [ ] Nach 1 Woche Stabilitaet: `frontend/public/covers` loeschen
