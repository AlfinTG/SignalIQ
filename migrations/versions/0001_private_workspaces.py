"""Apply the initial private-workspace schema from the reviewed SQL migration."""
from __future__ import annotations

from pathlib import Path

from alembic import op
from sqlalchemy import text

revision = "0001_private_workspaces"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql = (Path(__file__).with_suffix(".sql")).read_text(encoding="utf-8")
    for statement in sql.replace("BEGIN;", "").replace("COMMIT;", "").split(";"):
        if statement.strip():
            op.execute(text(statement))


def downgrade() -> None:
    raise RuntimeError("The initial SignalIQ schema is intentionally non-destructive; restore from backup for rollback.")
