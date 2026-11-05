---
id: 261105-ikx-mobilansicht-der-anime-episodenzeilen-ko
kind: quick
status: planned
created_at: 2026-11-05
waves: 1
---

# Quick-Plan: Mobile Ansicht der Anime-Episodenzeilen korrigieren

## Befund und Ziel

Auf `/anime/13` kollidieren bei `390x844` der Titel-/Metadatenblock einer
`EpisodeGlassCard` und der rechts ausgerichtete Versionszähler. Die Messung
zeigt nur `36.7px` für `.headerText`, während `.versionCounter` `93.3px`
beansprucht. Der Titelblock muss daher den verbleibenden Platz des bestehenden
globalen `Cluster` erhalten und darin umbrechen können; der Versionszähler
bleibt vollständig sichtbar.

## Scope und feste Grenzen

- Ausschließlich der Pilot-Baustein `EpisodeGlassCard` auf der öffentlichen
  Anime-Detailseite; keine API-, Daten-, Auth- oder Domain-Änderung.
- Die vorhandene globale `Cluster`-Fähigkeit `growFirstChild` verwenden;
  keine neue Primitive, keinen lokalen Flex/Grid-/Gap-/Padding-/Margin-CSS-
  Workaround und keine Änderung an `EpisodeGlassCard.module.css`.
- Den ausnahmslosen Layout-Purity-Guard weder abschwächen noch ändern. Der
  Plan nutzt absichtlich dessen konforme Grundbaustein-Nahtstelle statt
  Komposit-Lokal-CSS.
- Keine neuen Tests und keine Testsuiten (einschließlich des Guard-Tests).
  Die zwingende erste Verifikation ist die Live-Sichtprüfung; anschließend
  nur `git diff --check` als nicht-testende Diff-Prüfung.

## Read First

- `docs/engineering/implementation-contract.md`
- `docs/agent-guidelines-ui.md`
- `docs/FRONTEND_ARCHITEKTUR.md` (Abschnitt zu `Cluster` und
  `compositeLayoutPurity.guard.test.ts`)
- `frontend/src/components/ui/Cluster.tsx`
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts`
- `.planning/phases/192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig/192-VERIFICATION.md`

## Wave 1 — Live-first, minimale Bausteinverdrahtung und Abnahme

1. **Live-Basis vor jeder Test- oder Code-Aktion prüfen.** Öffne
   [http://127.0.0.1:3300/anime/13](http://127.0.0.1:3300/anime/13) im
   gemeinsamen Browser bei exakt `390x844`, klappe Episoden mit langen Titeln
   und Versionszähler auf und halte den tatsächlichen Überlappungsbefund fest.
   Prüfe denselben Zustand bei `1440x900` als Desktop-Basis. Keine Testsuite
   oder Guard-Ausführung vor dieser UAT.

2. **Bestehenden Kopf-Cluster in der Episodenkarte erweitern.** In
   `frontend/src/components/fansubs/EpisodeGlassCard.tsx` am bereits
   verwendeten `<Cluster gap="labelWithTrailingMeta" justify="between"
   align="center" wrap={false}>` ausschließlich `growFirstChild` aktivieren.
   Damit erhält das erste direkte Kind `.headerText` über den globalen
   `Cluster`-Vertrag `flex: 1 1 0%` und `min-width: 0`; der vorhandene,
   `flex-shrink: 0`/`white-space: nowrap` geschützte Versionszähler bleibt
   die zweite Spalte. Keine lokale CSS-Deklaration, kein eigenes Wrapper-
   Layout und keine Änderung der Desktop-Anordnung ergänzen.

3. **Dokumentation am sichtbaren Komposit nachziehen und live abnehmen.**
   Aktualisiere `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`
   so, dass die Story-Dokumentation die weiterhin verwendeten Bausteine
   `Cluster`/`growFirstChild` und den langen Titel plus Versionszähler als
   responsive Kopfzeilenfall beschreibt. Wiederhole danach die Live-Prüfung
   auf `/anime/13` bei `390x844` und `1440x900`; führe ausschließlich
   `git diff --check` aus. Keine Testdatei, keine Testsuite und keine
   Layout-Purity-Guard-Änderung/-Ausführung.

## Akzeptanzkriterien

- Bei `390x844` sind Episodennummer, langer Episodentitel, Klassifikations-
  Metadaten und Versionszähler lesbar; der Versionszähler überlappt oder
  verdeckt keinen Text und die Seite erzeugt keinen horizontalen Überlauf.
- Bei `1440x900` bleibt die vorhandene einzeilige Kopf-Anordnung mit
  Titelblock links und Versionszähler rechts visuell unverändert.
- `EpisodeGlassCard` verwendet nur die bestehende globale
  `Cluster.growFirstChild`-Nahtstelle; es entstehen weder neue Primitives
  noch Komposit-Lokal-CSS-Regressionsumgehungen.
- `compositeLayoutPurity.guard.test.ts` bleibt unverändert und die
  Episodenkarte behält ihre bestehende Guard-konforme CSS-Struktur.
- Keine Tests werden hinzugefügt oder ausgeführt; die Reihenfolge bleibt
  Live-Sichtprüfung vor jeder Testsuite.
- `git diff --check` endet fehlerfrei.

## Dateien der Umsetzung

- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`
