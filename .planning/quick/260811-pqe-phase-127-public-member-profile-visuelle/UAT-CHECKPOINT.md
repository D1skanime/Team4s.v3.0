# Quick 260811-pqe UAT Checkpoint

Status: awaiting human verification; not approved

## Live shared-browser result

The shared Codex in-app browser successfully opened `http://127.0.0.1:3300/members/csubs-leader` before the rebuild attempt. The populated DOM showed the hero, readable C-Subs membership name/status/period/link, current projects with count/load control, all achievement families, contributions, and the exact resolver-backed copy `14 von 15 Auszeichnungen freigeschaltet`.

No horizontal-overflow or six-viewport visual PASS is claimed from DOM inspection alone.

## Required screenshots

All nine required PNG files are missing. The first capture batch timed out without returning files. After the rebuild attempt, the in-app browser was unavailable. No screenshot or unavailable fixture was fabricated.

## Ephemeral frontend UAT runtime

The reproducible Docker image rebuild remains blocked because the runner installs Chromium while containerd/build storage exhausts the Linux root filesystem.

For UAT only, the running frontend container was inspected first. `/app` is the canonical frontend bind mount, `/app/node_modules` and `/app/.next` are Docker volumes, and the latter had sufficient space. Existing BUILD_ID/build/routes metadata was copied to `/tmp/pqe-next-metadata`. No source copy was necessary because `/app/src` already mapped the canonical source.

The first in-container build reproduced the inherited stale `.next/dev/types` failure. That generated directory was moved recoverably to `/app/.next/dev.pqe-incoming`; a second `NODE_ENV=production npm run build` completed successfully. Only `team4sv30-frontend` was restarted. It returned HTTP 200 for `/members/csubs-leader`, including `14 von 15 Auszeichnungen freigeschaltet`.

Keycloak, Keycloak DB, and Mailpit were inspected read-only and healthy. They were not restarted. This is an ephemeral UAT workaround, not a source or Dockerfile fix.

After the successful frontend restart, two fresh in-app-browser connection attempts still reported the browser unavailable. Therefore screenshot evidence remains missing.

## Approval gate

Human approval is not eligible. After a successful frontend-only rebuild/recreate and complete nine-image evidence capture, review the whole page and respond with the exact standalone word `approved`.
