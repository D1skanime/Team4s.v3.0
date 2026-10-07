#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/06-notizen-schreiben.md
# (Fachaufgabe 6: Notizen schreiben).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

HISTORY_FILE="frontend/src/lib/api/history.ts"

# --- history.ts Export-Zahl (muss mit 174-REPORT.md "30 Exporte" uebereinstimmen) ---
export_count=$(grep -c "^export " "$HISTORY_FILE" 2>/dev/null || echo 0)

# --- Notiz-Cluster: 5 (je ein repraesentativer Funktionsname pro Cluster) ---
declare -a CLUSTER_MARKERS=(
  "export async function listFansubGroupNotes("
  "export async function listGroupHistory("
  "export async function createMemberGroupStory("
  "export async function listReleaseVersionNotes("
  "export async function getAnimeFansubProjectNote("
)
cluster_count=0
for marker in "${CLUSTER_MARKERS[@]}"; do
  if grep -qF "$marker" "$HISTORY_FILE" 2>/dev/null; then
    cluster_count=$((cluster_count + 1))
  else
    echo "WARN: Cluster-Marker nicht gefunden: $marker" >&2
  fi
done

# --- Fehlplatzierte Funktion: searchArchive (keine Notiz, gehoert fachlich zu search.ts) ---
archive_in_history=0
if grep -qF "export async function searchArchive(" "$HISTORY_FILE" 2>/dev/null; then
  archive_in_history=1
fi

# --- Dead Feature: Member-Group-Story hat 0 .tsx-Konsumenten (Abwesenheits-Pruefung) ---
story_consumer_hits=$(grep -rl "createMemberGroupStory(\|updateMemberGroupStory(\|deleteMemberGroupStory(\|getMemberGroupStoryContext(" \
  --include="*.tsx" frontend/src 2>/dev/null | grep -v '\.test\.' | wc -l | tr -d ' ' || true)
story_consumer_hits="${story_consumer_hits:-0}"

# --- 5 verschiedene Rechte-Modelle (Datei:Pattern-Paare, je 1 Beleg pro Cluster) ---
declare -a RIGHTS_MODEL_PAIRS=(
  "backend/internal/handlers/admin_content_fansub_group_notes.go|permissions.ActionFansubGroupNotesWrite, fansubID"
  "backend/internal/handlers/fansub_group_history_handler.go|func requiredGroupHistoryAction(eventTypes ...string) permissions.Action"
  "backend/internal/handlers/admin_content_member_stories.go|h.requireAdmin(c)"
  "backend/internal/handlers/admin_content_release_version_notes.go|permissions.ActionReleaseVersionNotesViewAll"
  "backend/internal/handlers/admin_content_anime_project_notes.go|permissions.ActionReleaseView, fansubID"
)
rights_model_hits=0
for entry in "${RIGHTS_MODEL_PAIRS[@]}"; do
  file="${entry%%|*}"
  pattern="${entry#*|}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    rights_model_hits=$((rights_model_hits + 1))
  else
    echo "WARN: Rechte-Modell-Beleg nicht gefunden: $pattern in $file" >&2
  fi
done

# --- requireAdmin kommt in allen 5 Member-Story-Handlerfunktionen vor ---
member_story_admin_hits=$(grep -c "requireAdmin(c)" backend/internal/handlers/admin_content_member_stories.go 2>/dev/null || echo 0)

# --- D-05-Befund: Tab-ODER-Gate ohne Button-Einschraenkung bei NotesTab ---
tab_or_gate=0
if grep -qF "can_edit_notes || capabilities.can_edit_founding_history" frontend/src/app/admin/fansubs/\[id\]/edit/fansubEditAccess.ts 2>/dev/null; then
  tab_or_gate=1
fi
founding_only_on_history_section=0
if grep -qF "foundingOnly=" frontend/src/app/admin/fansubs/\[id\]/edit/FansubEditSecondaryTabs.tsx 2>/dev/null; then
  founding_only_on_history_section=1
fi
notes_tab_has_founding_prop=0
if grep -q "NotesTab fansubId={fansubID} foundingOnly" frontend/src/app/admin/fansubs/\[id\]/edit/FansubEditSecondaryTabs.tsx 2>/dev/null; then
  notes_tab_has_founding_prop=1
fi

echo "history.ts Export-Zahl: $export_count (erwartet 30, siehe 174-REPORT.md)"
echo "Notiz-Cluster gefunden: $cluster_count von 5"
echo "searchArchive fehlplatziert in history.ts: $([ "$archive_in_history" -eq 1 ] && echo ja || echo NEIN)"
echo "Member-Group-Story .tsx-Konsumenten (Nicht-Test): $story_consumer_hits (erwartet 0 -> Dead Feature)"
echo "Rechte-Modell-Belege: $rights_model_hits von 5 Clustern"
echo "requireAdmin-Vorkommen in admin_content_member_stories.go: $member_story_admin_hits (erwartet 5)"
echo "Tab-ODER-Gate (can_edit_notes || can_edit_founding_history) vorhanden: $([ "$tab_or_gate" -eq 1 ] && echo ja || echo NEIN)"
echo "GroupHistorySection bekommt foundingOnly-Flag: $([ "$founding_only_on_history_section" -eq 1 ] && echo ja || echo NEIN)"
echo "NotesTab bekommt dasselbe Flag NICHT (D-05-Befund bestaetigt): $([ "$notes_tab_has_founding_prop" -eq 0 ] && echo ja || echo NEIN)"
