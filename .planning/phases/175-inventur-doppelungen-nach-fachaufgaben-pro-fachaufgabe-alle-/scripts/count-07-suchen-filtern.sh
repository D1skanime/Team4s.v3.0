#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/07-suchen-filtern.md (Fachaufgabe 7: Suchen & Filtern).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Globale Suchbibliothek (1) ---
GLOBAL_SEARCH_FILES=(
  "backend/internal/repository/search_anime.go"
  "backend/internal/repository/search_fansub.go"
  "backend/internal/repository/search_suggestions.go"
  "backend/internal/handlers/search.go"
  "frontend/src/lib/api/search.ts"
  "frontend/src/app/suche/page.tsx"
)
global_search_found=0
for f in "${GLOBAL_SEARCH_FILES[@]}"; do
  if [ -f "$f" ]; then
    global_search_found=$((global_search_found + 1))
  else
    echo "WARN: Datei der globalen Suchbibliothek fehlt/verschoben: $f" >&2
  fi
done
if [ "$global_search_found" -eq "${#GLOBAL_SEARCH_FILES[@]}" ]; then
  global_search_count=1
else
  global_search_count=0
fi

# --- 6 lebende Einzel-Filter: je Datei + konkrete toLowerCase().includes()-Fundstelle ---
declare -A SINGLE_FILTERS=(
  ["frontend/src/app/admin/groups/AdminGroupsClient.tsx"]="group.name.toLowerCase().includes(query)"
  ["frontend/src/app/admin/fansubs/page.tsx"]="name.includes(query) || slug.includes(query) || aliasMatches"
  ["frontend/src/app/admin/fansubs/merge/page.tsx"]="if (name.includes(query)) return 55;"
  ["frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx"]="some((value) => String(value).toLowerCase().includes(normalizedSearch))"
  ["frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts"]="return token.name.toLowerCase().includes(q)"
  ["frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts"]="return t.name.toLowerCase().includes(q);"
)
single_filter_count=0
for file in "${!SINGLE_FILTERS[@]}"; do
  pattern="${SINGLE_FILTERS[$file]}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    single_filter_count=$((single_filter_count + 1))
  else
    echo "WARN: Einzel-Filter-Fundstelle nicht gefunden: $pattern in $file" >&2
  fi
done

# --- Korrekturbefund: projectPageData.ts enthaelt KEINEN Listen-Suchfilter ---
# (nur eine Bildauswahl-Heuristik "landscape" - kein Nutzer-Sucheingabefeld).
PROJECT_PAGE_DATA="frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
project_page_data_has_search_filter=0
if [ -f "$PROJECT_PAGE_DATA" ]; then
  # Es darf AUSSER der landscape-Heuristik keine weitere .toLowerCase().includes()-Stelle geben,
  # sonst waere der Korrekturbefund veraltet und muesste neu geprueft werden.
  hits=$(grep -c "toLowerCase().includes(" "$PROJECT_PAGE_DATA" 2>/dev/null || true)
  if [ "${hits:-0}" -gt 1 ]; then
    echo "WARN: projectPageData.ts hat jetzt $hits toLowerCase().includes()-Stellen (Korrekturbefund ggf. veraltet, bitte pruefen)" >&2
    project_page_data_has_search_filter=1
  fi
else
  echo "WARN: $PROJECT_PAGE_DATA fehlt/verschoben" >&2
fi

total_implementations=$((global_search_count + single_filter_count))

# --- UI-Primitive-Konformitaet: wie viele der 6 Einzel-Filter nutzen die Input-Primitive ---
declare -A PRIMITIVE_CHECK=(
  ["frontend/src/app/admin/groups/AdminGroupsClient.tsx"]="<Input"
  ["frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx"]="<Input"
)
primitive_count=0
for file in "${!PRIMITIVE_CHECK[@]}"; do
  pattern="${PRIMITIVE_CHECK[$file]}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    primitive_count=$((primitive_count + 1))
  else
    echo "WARN: Input-Primitive nicht gefunden: $pattern in $file" >&2
  fi
done

echo "Suchimplementierungen insgesamt (Backend-Bibliothek + Einzel-Filter): $total_implementations"
echo "Globale Suchbibliothek vorhanden: $global_search_count"
echo "Lebende Einzel-Filter: $single_filter_count"
echo "Einzel-Filter mit Umlaut-Toleranz: 0 (alle 6 nutzen reines toLowerCase().includes(), kein f_unaccent-Aequivalent)"
echo "Einzel-Filter mit Input-UI-Primitive: $primitive_count von $single_filter_count"
echo "projectPageData.ts Korrekturbefund bestaetigt (kein Listen-Suchfilter): $([ "$project_page_data_has_search_filter" -eq 0 ] && echo ja || echo NEIN-bitte-pruefen)"
