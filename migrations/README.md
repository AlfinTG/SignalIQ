# SignalIQ database migrations

The application uses PostgreSQL (Supabase) as the durable store for authenticated workspaces. Apply the versioned SQL files in lexical order with a least-privilege migration role, for example:

```powershell
$env:DATABASE_URL = "postgresql://..."
.\.venv\Scripts\alembic.exe -c alembic.ini upgrade head
```

The runtime role must be able to read and write these tables but should not own them. The FastAPI API performs explicit owner/workspace checks on every request; if a Supabase secret key or table-owner connection is used elsewhere, Row Level Security does not protect that bypass role.

All timestamps are `timestamptz` in UTC. Alembic records migration state; the SQL itself is additive and the migration does not import prototype SQLite data.
