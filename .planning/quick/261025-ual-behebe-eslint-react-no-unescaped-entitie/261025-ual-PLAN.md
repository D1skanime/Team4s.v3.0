---
phase: quick-261025-ual
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Der Hinweistext zu Prüf-/Freigabe-Rechten wird mit korrekten deutschen typografischen Anführungszeichen angezeigt (öffnend „, schließend “), ohne sichtbare Verhaltensänderung sonst."
    - "ESLint meldet für die Datei keinen react/no-unescaped-entities-Fehler mehr."
  artifacts:
    - path: "frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx"
      provides: "JSX-Textzeile mit korrektem schließendem Anführungszeichen „Prüf-/Freigabe-Rechte“"
      contains: "Prüf-/Freigabe-Rechte“"
  key_links:
    - from: "frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx:77"
      to: "react/no-unescaped-entities ESLint rule"
      via: "JSX text node containing a literal double-quote character"
      pattern: "Prüf-/Freigabe-Rechte“"
---

<objective>
Beheben des vorbestehenden ESLint-Fehlers `react/no-unescaped-entities` in
`frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` (Zeile 77), ausgelöst
durch ein unescaptes ASCII-Anführungszeichen `"` als schließendes Zeichen nach dem
korrekten öffnenden deutschen Anführungszeichen „ (U+201E).

Purpose: Der Linter blockiert fehlerfrei durchlaufende CI/Checks wegen eines reinen
Zeichenfehlers; gleichzeitig verstößt das ASCII-`"` gegen die Projektregel, dass
deutscher UI-Text ausschließlich korrekte typografische Anführungszeichen verwendet
(kein ASCII-Ersatz).

Output: Zeile 77 verwendet das korrekte schließende deutsche Anführungszeichen "
(U+201C) statt `"`. Keine weitere Zeile, kein weiteres sichtbares Verhalten, keine
andere Datei wird verändert.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
</context>

<interfaces>
Keine neuen Interfaces. Reine Textkorrektur innerhalb eines bestehenden JSX-Textknotens
in Zeile 77:

```
Gewähren nur über „Prüf-/Freigabe-Rechte" oben.
```

wird zu:

```
Gewähren nur über „Prüf-/Freigabe-Rechte“ oben.
```

Nur das letzte Zeichen vor " oben." ändert sich (ASCII `"` U+0022 → deutsches
schließendes Anführungszeichen " U+201C). Das öffnende „ (U+201E) bleibt unverändert.
Keine Props, Typen, Imports oder Logik sind betroffen.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Schließendes Anführungszeichen korrigieren</name>
  <files>frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx</files>
  <action>
    In Zeile 77 das ASCII-Anführungszeichen `"` direkt nach "Prüf-/Freigabe-Rechte"
    durch das deutsche typografische schließende Anführungszeichen " (U+201C)
    ersetzen. Das öffnende „ (U+201E) vor "Prüf-/Freigabe-Rechte" bleibt unverändert.
    Kein anderer Text, keine andere Zeile, keine andere Datei wird angefasst. Keine
    Logik-, Props- oder Import-Änderung.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend &amp;&amp; grep -n 'Prüf-/Freigabe-Rechte' src/app/admin/users/tabs/CapabilityDetailRow.tsx</automated>
  </verify>
  <done>Zeile 77 zeigt „Prüf-/Freigabe-Rechte" mit korrektem öffnendem „ und schließendem " Zeichen; kein ASCII-`"` mehr in der Zeile.</done>
</task>

<task type="auto">
  <name>Task 2: ESLint-Fehlerfreiheit im Frontend-Container verifizieren</name>
  <files>frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx</files>
  <action>
    Den ESLint-Lauf gegen die geänderte Datei im laufenden Frontend-Container
    ausführen, um zu bestätigen, dass `react/no-unescaped-entities` nicht mehr
    greift und kein neuer Lint-Fehler durch die Änderung entstanden ist. Falls der
    Container nicht läuft, zuerst `docker compose ps` prüfen und bei Bedarf über
    `docker compose up -d team4sv30-frontend` starten (keine sonstigen Compose-Änderungen).
  </action>
  <verify>
    <automated>docker compose exec team4sv30-frontend npx eslint src/app/admin/users/tabs/CapabilityDetailRow.tsx --quiet; echo "exit_code=$?"</automated>
  </verify>
  <done>Der ESLint-Lauf gegen die Datei beendet mit Exit-Code 0 und ohne Ausgabe eines react/no-unescaped-entities-Fehlers.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Keine | Reine clientseitige UI-Textkorrektur; keine neue Eingabe-, Trust- oder Datenflussgrenze betroffen. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261025ual-01 | Tampering | CapabilityDetailRow.tsx JSX-Textknoten | accept | Statischer, hartkodierter UI-Text ohne Benutzereingabe oder dynamische Interpolation; kein Injection-Vektor. |
</threat_model>

<verification>
1. `grep -n 'Prüf-/Freigabe-Rechte' frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` zeigt die Zeile mit korrektem „...“ Paar.
2. `docker compose exec frontend npx eslint src/app/admin/users/tabs/CapabilityDetailRow.tsx --quiet` liefert Exit-Code 0, kein react/no-unescaped-entities-Fehler.
3. `git diff --stat` zeigt ausschließlich `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` als geänderte Datei, mit genau einer geänderten Zeile (Zeile 77).
</verification>

<success_criteria>
- ESLint meldet für `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` keinen Fehler mehr.
- Das sichtbare Verhalten und der sichtbare Text der Komponente bleiben inhaltlich identisch — nur das Anführungszeichen-Zeichen ändert sich.
- Keine andere Produktionsdatei wurde verändert.
</success_criteria>

<output>
Create `.planning/quick/261025-ual-behebe-eslint-react-no-unescaped-entitie/261025-ual-SUMMARY.md` when done
</output>
