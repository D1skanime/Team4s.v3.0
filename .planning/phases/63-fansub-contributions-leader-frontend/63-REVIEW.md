---
phase: 63-fansub-contributions-leader-frontend
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - frontend/src/types/fansub.ts
  - frontend/src/lib/api.ts
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionsTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 63: Code Review Report

**Reviewed:** 2026-06-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Die Phase implementiert drei neue Admin-Tabs (Gruppenmitglieder, Rollen/Timeline, Anime-Beiträge) für die Fansub-Bearbeitung sowie die dazugehörigen API-Funktionen in `api.ts` und Typen in `fansub.ts`. Die grundlegende Struktur ist solide, aber es gibt zwei blockierende Probleme: eine fehlgeschlagene sequenzielle Speicherstrategie ohne Rollback in `AnimeContributionModal` und ein doppelter Tab-Label in `page.tsx` der die Navigation unbrauchbar macht. Weitere Warnungen betreffen Jahr-Validierungen, Fehlerdarstellung und einen race condition in `AnimeContributionsTab`.

## Critical Issues

### CR-01: Sequenzielles Upsert ohne Rollback — teilweise gespeicherter Zustand möglich

**File:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx:132-163`

**Issue:** `handleSave` iteriert sequenziell über `selectedMemberIds` mit `for...of` und aufeinanderfolgenden `await upsertAnimeContribution`-Aufrufen, dann über zu löschende Einträge mit `await deleteAnimeContribution`. Wenn ein mittlerer Aufruf fehlschlägt, wurden die vorherigen Upserts bereits committet, die nachfolgenden aber nicht — der Datensatz bleibt in einem inkonsistenten Halbzustand. Der Fehler wird angezeigt, aber es gibt keine Möglichkeit für den Nutzer zu erkennen, welche Mitglieder gespeichert wurden und welche nicht. Das Modal bleibt geöffnet, aber ein erneutes Speichern würde die bereits gespeicherten Einträge nochmals upserten (was bei einer Upsert-Semantik unkritisch ist), doch die Löschungen werden nicht wiederholt — gelöschte Mitglieder bleiben möglicherweise bestehen.

Konkret: wenn 5 Mitglieder gespeichert werden und der 3. Aufruf mit einem Netzwerkfehler scheitert, zeigt das Modal einen Fehler, aber Mitglieder 1 und 2 wurden gespeichert, 3–5 nicht. Beim Erneut-Speichern werden alle 5 nochmals versucht, was meist korrekt ist — aber die nachgelagerten `deleteAnimeContribution`-Aufrufe wurden nicht ausgeführt und werden jetzt wieder versucht, ohne zu wissen ob die vorherigen schon gelöscht wurden.

**Fix:** Entweder alle Requests parallel mit `Promise.all` starten (schlägt atomar fehl, aber idempotentes Upsert bedeutet dass Wiederholung sicher ist) und den Fehler sauber kommunizieren; oder zumindest den Nutzer im Fehlerfall darüber informieren, dass der Zustand teilweise gespeichert wurde:

```typescript
async function handleSave() {
  setSaving(true)
  setError(null)
  try {
    // Upserts parallel — idempotent, sicher bei Wiederholung
    await Promise.all(
      [...selectedMemberIds].map((memberId) => {
        const existingC = existingContributions.find(
          (c) => c.fansub_group_member_id === memberId
        )
        return upsertAnimeContribution(fansubId, animeId, {
          fansub_group_member_id: memberId,
          role_codes: rolesByMemberId[memberId] ?? [],
          started_year: existingC?.started_year ?? null,
          ended_year: existingC?.ended_year ?? null,
          note: existingC?.note ?? null,
          is_public_on_anime_page: visibilityByMemberId[memberId]?.anime ?? false,
          is_public_on_member_profile: visibilityByMemberId[memberId]?.profile ?? false,
          status: statusByMemberId[memberId] ?? 'draft',
        })
      })
    )

    // Löschungen parallel
    const toDelete = existingContributions.filter(
      (c) => !selectedMemberIds.has(c.fansub_group_member_id)
    )
    await Promise.all(
      toDelete.map((c) => deleteAnimeContribution(fansubId, animeId, c.id))
    )

    onSaved()
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
  } finally {
    setSaving(false)
  }
}
```

---

### CR-02: Doppelter Tab-Label "Mitglieder" macht Navigation visuell unbrauchbar

**File:** `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:183-186`

**Issue:** Das `MAIN_TABS`-Array enthält zwei Einträge mit dem identischen Label `"Mitglieder"` für zwei verschiedene Keys (`"collaboration"` und `"mitglieder"`). In der gerenderten Tab-Leiste erscheinen zwei Tabs mit gleichem Text nebeneinander — ein Admin kann nicht unterscheiden, welcher Tab welche Funktion hat. Das ist ein funktionaler UI-Defekt der die Navigation der neuen Tabs unbrauchbar macht.

```typescript
// Zeile 183-186 — beide haben label: "Mitglieder"
{ key: "collaboration", label: "Mitglieder" },
{ key: "mitglieder", label: "Mitglieder" },
```

**Fix:** Den Tab `"mitglieder"` mit einem eindeutigen deutschen Label benennen:

```typescript
{ key: "collaboration", label: "Mitglieder" },
{ key: "mitglieder", label: "Hist. Mitglieder" },
// oder:
{ key: "mitglieder", label: "Mitgliederliste" },
```

---

## Warnings

### WR-01: Keine Validierung ob Austrittsjahr >= Beitrittsjahr in GroupMembersTab

**File:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx:123-163`

**Issue:** `handleSave` prüft nur ob `displayName` nicht leer ist. Es fehlt eine Validierung ob `leftYear >= joinedYear` wenn beide gesetzt sind. Die API könnte das ablehnen, aber der Fehler erscheint dann erst nach einem Serverroundtrip ohne dem Nutzer zu erklären was falsch war. Ebenso fehlt eine Prüfung ob die eingegebene App-Nutzer-ID eine positive ganze Zahl ist (das Formularfeld gibt einen String zurück, der über `Number()` konvertiert wird — `Number("")` = 0, was eine fehlerhafte ID ist).

**Fix:**
```typescript
const appUserId = form.appUserId ? Number(form.appUserId) : null
if (appUserId !== null && (!Number.isInteger(appUserId) || appUserId <= 0)) {
  setModalError('App-Nutzer-ID muss eine positive ganze Zahl sein.')
  return
}
if (joinedYear !== null && leftYear !== null && leftYear < joinedYear) {
  setModalError('Austrittsjahr darf nicht vor dem Beitrittsjahr liegen.')
  return
}
```

---

### WR-02: Keine Validierung ob Endjahr >= Startjahr in MemberRolesTab

**File:** `frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx:141-185`

**Issue:** Analog zu WR-01: `handleSave` prüft nicht ob `endedYear >= startedYear`. Ein Admin kann unbemerkt einen Roleintrag mit `ended_year < started_year` speichern.

**Fix:**
```typescript
if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
  setModalError('Bis-Jahr darf nicht vor dem Von-Jahr liegen.')
  return
}
```

---

### WR-03: Race condition in AnimeContributionsTab — Zähler können inkonsistent sein

**File:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionsTab.tsx:42-55`

**Issue:** Beim initialen Laden werden zuerst alle Anime geladen, dann für jedes Anime parallel `listAnimeContributions` aufgerufen, um die Zähler zu befüllen. Das `counts`-Objekt wird am Ende gesetzt (`setContributionCountByAnimeId(counts)`). Wenn eine dieser `listAnimeContributions`-Anfragen fehlschlägt, wird `counts[anime.id] = 0` gesetzt. Kritischer ist aber: wenn der Nutzer schnell navigiert und der `fansubId` sich ändert, kann der `useEffect` nochmals starten während noch Anfragen laufen — die `counts`-Closure in `Promise.all` bezieht sich auf die Version aus dem vorherigen Render. Das kann dazu führen, dass `setContributionCountByAnimeId` aus einem alten Effekt-Aufruf den State überschreibt. Der `useEffect` hat keine Cleanup-Funktion mit Abbruchmechanismus.

**Fix:** Cancellation-Flag hinzufügen:
```typescript
useEffect(() => {
  let cancelled = false
  async function load() {
    // ... bestehender Code ...
    setContributionCountByAnimeId(counts)  // <- prüfen ob cancelled
    // Ersetzen mit:
    if (!cancelled) setContributionCountByAnimeId(counts)
  }
  void load()
  return () => { cancelled = true }
}, [fansubId])
```

---

### WR-04: Fehler beim Öffnen des Modals in AnimeContributionsTab werden stillschweigend ignoriert

**File:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionsTab.tsx:63-74`

**Issue:** `openModal` fängt Fehler von `listAnimeContributions` und setzt `setModalContributions([])` — das Modal öffnet sich dann mit einer leeren Liste, ohne dem Nutzer mitzuteilen, dass ein Ladefehler aufgetreten ist. Ein Admin könnte unbemerkt alle bestehenden Contributions auf leer überschreiben.

**Fix:** Einen sichtbaren Fehlerzustand im Modal hinzufügen oder das Öffnen des Modals bei Fehler verhindern:
```typescript
async function openModal(animeId: number) {
  setModalLoading(true)
  setModalAnimeId(animeId)
  try {
    const resp = await listAnimeContributions(fansubId, animeId)
    setModalContributions(resp.contributions ?? [])
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Mitwirkende konnten nicht geladen werden.')
    setModalAnimeId(null)  // Modal nicht öffnen
    setModalContributions([])
  } finally {
    setModalLoading(false)
  }
}
```

---

## Info

### IN-01: `formatApiError`-Hilfsfunktion in GroupMembersTab und MemberRolesTab dupliziert

**File:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx:31-34` und `frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx:36-39`

**Issue:** Beide Dateien definieren identisch die lokale Funktion `formatApiError`. Diese Funktion ist trivial (2 Zeilen), aber sie ist ein Kandidat für eine gemeinsame Utility-Funktion.

**Fix:** Gemeinsame Hilfsfunktion in `FansubEdit.module.css`-Nachbar oder eine dedizierte Datei auslagern, z.B. `frontend/src/app/admin/fansubs/[id]/edit/utils.ts`.

---

### IN-02: `YEAR_OPTIONS`-Array wird in GroupMembersTab und MemberRolesTab dupliziert

**File:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx:25-29` und `frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx:30-34`

**Issue:** Die `YEAR_OPTIONS`-Generierung (`for y = CURRENT_YEAR downTo 1980`) ist in beiden Dateien identisch. Gleiche Code-Duplikation wie IN-01.

**Fix:** In eine gemeinsame Konstantendatei auslagern.

---

### IN-03: Inline-Styles in AnimeContributionModal und AnimeContributionsTab — inkonsistent mit anderen Tabs

**File:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (gesamte Datei), `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionsTab.tsx` (gesamte Datei)

**Issue:** Beide neuen Komponenten verwenden ausschließlich Inline-`style`-Attribute anstatt das vorhandene CSS-Module-Muster (`FansubEdit.module.css` / `admin.module.css`) zu nutzen, das alle anderen Tabs in dieser Seite verwenden (`GroupMembersTab`, `MemberRolesTab`, `page.tsx`). Das führt zu inkonsistenter Theming-Fähigkeit und erschwerter Wartung. Hardcodierte Farben wie `#dc2626`, `#3b82f6`, `#e5e7eb` können bei einem Dark-Mode- oder Theme-Wechsel nicht zentral geändert werden.

**Fix:** CSS-Module-Klassen für das Basislayout der neuen Komponenten definieren; zumindest strukturelle Styles (margin, padding, border, layout) migrieren.

---

_Reviewed: 2026-06-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
