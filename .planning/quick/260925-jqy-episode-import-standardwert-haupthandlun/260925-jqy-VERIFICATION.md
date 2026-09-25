# Quick Task Verification

- `docker compose exec -T team4sv30-backend go test ./internal/repository -run 'TestEpisodeImport(Source|Repository)' -count=1` — bestanden.
- `git diff --check` — bestanden.
- Der Browser-UAT ist für diese Backend-Änderung nicht erforderlich; die betroffene Episode-Anlage sollte beim nächsten Import erneut geprüft werden.
