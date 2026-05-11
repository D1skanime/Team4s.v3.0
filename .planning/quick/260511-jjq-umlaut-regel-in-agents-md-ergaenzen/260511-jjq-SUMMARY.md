---
id: 260511-jjq
date: 2026-05-11
commit: 58fd4fca
---

# Quick 260511-jjq — Umlaut-Regel in AGENTS.md ergaenzen

## Was wurde gemacht

Datei: `AGENTS.md`

Neue Untersektion unter `## UI Rules` ergaenzt:

```
### Deutsche UI-Texte: Korrekte Umlaute verwenden
- User-facing deutsche Strings verwenden immer korrekte Umlaute: ä, ö, ü, Ä, Ö, Ü, ß
- Niemals ASCII-Ersetzungen in UI-Text (ae/oe/ue/ss verboten)
- Code-Bezeichner bleiben ASCII-sicher
- Gilt fuer Frontend TSX/TS und Go Backend Strings die in HTTP-Responses landen
```

## Warum

Codex liest AGENTS.md statt CLAUDE.md. Phase 39 plant die gleiche Regel in CLAUDE.md
einzutragen. Damit beide Agenten (Claude und Codex) die Konvention einhalten,
wurde die Regel in beiden Dateien verankert.

## Commit

`58fd4fca`
