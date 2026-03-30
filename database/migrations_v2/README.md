# Team4s v2 Bootstrap Migrations

Separate bootstrap chain for the clean-slate v2 schema.

Why this exists:
- the legacy `database/migrations/` chain still models the hybrid runtime schema
- v2 needs a fresh bootstrap path that can be applied to a brand-new database without carrying legacy columns forward

Current scope:
- anime core
- normalized titles / genres / relations
- media asset core
- anime media joins
- placeholder parent anchors for `episode_media`, `fansub_group_media`, `release_media`

Apply with:

```powershell
cd backend
go run ./cmd/migrate up -dir ../database/migrations_v2 -database-url "postgres://team4s:team4s_dev_password@localhost:5433/team4s_v2?sslmode=disable"
```
