#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/09-anime-anlegen-importieren.md
# (Fachaufgabe 9: Anime anlegen / importieren). Grep-/Existenz-basiert, rein
# lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CREATE_PAGE="frontend/src/app/admin/anime/create/page.tsx"
INTAKE_API="frontend/src/lib/api/admin-anime-intake.ts"
CORE_API="frontend/src/lib/api/admin/anime-core.ts"
ROUTES="backend/cmd/server/admin_routes.go"

# --- Anlege-Wege für Anime: 3 (je ein UI-Kartenbeleg auf derselben Seite) ---
declare -a CREATE_WAY_MARKERS=(
  "CreateAniSearchIntakeCard"
  "CreateJellyfinCard"
)
# Manuell hat keine eigene Karte (Formularfelder direkt) -- gezählt über die
# Pflichtfeld-Pruefung im Submit-Hook statt über eine Karten-Komponente.
create_way_count=0
for marker in "${CREATE_WAY_MARKERS[@]}"; do
  if grep -q "$marker" "$CREATE_PAGE" 2>/dev/null; then
    create_way_count=$((create_way_count + 1))
  else
    echo "WARN: UI-Karten-Beleg nicht gefunden: $marker in $CREATE_PAGE" >&2
  fi
done
if grep -q "manualDraftCanSubmit" frontend/src/app/admin/anime/create/internal/admin-anime-create/useCreateSubmitAction.ts 2>/dev/null; then
  create_way_count=$((create_way_count + 1))
else
  echo "WARN: manueller Anlege-Weg (manualDraftCanSubmit) nicht gefunden" >&2
fi

# --- Gemeinsamer Speicher-Endpunkt: beide Create-Funktionen POSTen an /admin/anime ---
shared_endpoint_ok=0
if grep -q "'/api/v1/admin/anime'" "$INTAKE_API" 2>/dev/null \
  && grep -q "\`\${API_BASE_URL}/api/v1/admin/anime\`" "$CORE_API" 2>/dev/null; then
  shared_endpoint_ok=1
else
  echo "WARN: gemeinsamer POST /admin/anime Beleg in einer der beiden API-Dateien fehlt" >&2
fi

# --- Sub-Hooks im Create-Controller: 4 ---
declare -a SUB_HOOKS=(
  "useJellyfinIntakeActions"
  "useAniSearchIntakeActions"
  "useAssetStagingActions"
  "useCreateSubmitAction"
)
IMPL="frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts"
sub_hook_count=0
for hook in "${SUB_HOOKS[@]}"; do
  if grep -q "import { $hook }" "$IMPL" 2>/dev/null; then
    sub_hook_count=$((sub_hook_count + 1))
  else
    echo "WARN: Sub-Hook-Import nicht gefunden: $hook in $IMPL" >&2
  fi
done

# --- Episoden-bezogene Endpunkte: 4 (3 Import + 1 einfacher Anlege-Endpunkt) ---
declare -a EPISODE_ROUTE_PATTERNS=(
  "/admin/anime/:id/episode-import/context"
  "/admin/anime/:id/episode-import/preview"
  "/admin/anime/:id/episode-import/apply"
  "/admin/episodes\", auth, deps.adminContentHandler.CreateEpisode"
)
episode_route_count=0
for pattern in "${EPISODE_ROUTE_PATTERNS[@]}"; do
  if grep -qF "$pattern" "$ROUTES" 2>/dev/null; then
    episode_route_count=$((episode_route_count + 1))
  else
    echo "WARN: Episoden-Route nicht gefunden: $pattern in $ROUTES" >&2
  fi
done

# --- Rechte-Vergleichspunkte: 2 (Seiten-Gate vs. Handler-Durchsetzung), 0 Abweichungen ---
rights_points=0
if grep -q "currentUser?.is_platform_admin" frontend/src/components/auth/PlatformAdminGate.tsx 2>/dev/null; then
  rights_points=$((rights_points + 1))
else
  echo "WARN: Anzeige-Rechte-Beleg (is_platform_admin) nicht gefunden" >&2
fi
if grep -q "AppUserHasGlobalRole(c.Request.Context(), identity.AppUserID, models.AppGlobalRolePlatformAdmin)" backend/internal/handlers/platform_admin_authz.go 2>/dev/null; then
  rights_points=$((rights_points + 1))
else
  echo "WARN: Durchsetzungs-Rechte-Beleg (AppGlobalRolePlatformAdmin) nicht gefunden" >&2
fi

echo "Anlege-Wege für Anime (ein gemeinsamer Speicher-Endpunkt): $create_way_count von 3"
echo "Gemeinsamer POST /admin/anime Speicher-Endpunkt bestätigt: $shared_endpoint_ok (1 = ja)"
echo "Sub-Hooks im Create-Controller: $sub_hook_count von 4"
echo "Episoden-bezogene Endpunkte (3 Import + 1 einfach): $episode_route_count von 4"
echo "Rechte-Vergleichspunkte (Anzeige vs. Durchsetzung): $rights_points von 2 -- 0 Abweichungen (siehe data/09-anime-anlegen-importieren.md Abschnitt (d))"
