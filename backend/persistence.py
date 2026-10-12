"""PostgreSQL repository for authenticated SignalIQ data."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator
from uuid import UUID, uuid4

import psycopg
from psycopg.rows import dict_row

from backend.config import get_settings


class PersistenceUnavailable(RuntimeError):
    pass


@contextmanager
def _connection() -> Iterator[psycopg.Connection[dict[str, Any]]]:
    url = get_settings().database_url.strip()
    if not url:
        raise PersistenceUnavailable("DATABASE_URL is not configured.")
    with psycopg.connect(url, row_factory=dict_row) as conn:
        yield conn


def ensure_workspace(owner_user_id: str) -> dict[str, Any]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO workspaces (id, owner_user_id) VALUES (%s, %s)
               ON CONFLICT (owner_user_id) DO UPDATE SET updated_at = workspaces.updated_at
               RETURNING id, name, created_at, updated_at""",
            (uuid4(), UUID(owner_user_id)),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("Workspace bootstrap did not return a workspace.")
        return row


def list_feedback(workspace_id: UUID, *, limit: int, offset: int, sentiment: str | None, query: str | None) -> tuple[list[dict[str, Any]], int]:
    filters: list[str] = ["workspace_id = %s"]
    params: list[Any] = [workspace_id]
    if sentiment:
        filters.append("sentiment = %s")
        params.append(sentiment)
    if query:
        filters.append("text ILIKE %s")
        params.append(f"%{query}%")
    where = " AND ".join(filters)
    with _connection() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT count(*) AS total FROM feedback_records WHERE {where}", params)
        total = int(cur.fetchone()["total"])
        cur.execute(f"SELECT * FROM feedback_records WHERE {where} ORDER BY submitted_at DESC NULLS LAST, created_at DESC LIMIT %s OFFSET %s", [*params, limit, offset])
        return list(cur.fetchall()), total


def create_feedback(workspace_id: UUID, values: dict[str, Any]) -> dict[str, Any]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO feedback_records (id, workspace_id, text, source, source_reference, submitted_at, rating)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""", (uuid4(), workspace_id, values["text"].strip(), values["source"].strip(), values.get("source_reference"), values.get("submitted_at"), values.get("rating")))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("Feedback creation did not return a record.")
        return row


def create_feedback_batch(workspace_id: UUID, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Atomically persist a validated, bounded import for the resolved workspace."""
    with _connection() as conn, conn.cursor() as cur:
        saved: list[dict[str, Any]] = []
        for values in records:
            cur.execute("""INSERT INTO feedback_records (id, workspace_id, text, source, source_reference, submitted_at, rating)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""", (uuid4(), workspace_id, values["text"].strip(), values["source"].strip(), values.get("source_reference"), values.get("submitted_at"), values.get("rating")))
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("Feedback import did not return a record.")
            saved.append(row)
        return saved


def get_feedback(workspace_id: UUID, record_id: UUID) -> dict[str, Any] | None:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM feedback_records WHERE id = %s AND workspace_id = %s", (record_id, workspace_id))
        return cur.fetchone()


def update_feedback(workspace_id: UUID, record_id: UUID, values: dict[str, Any]) -> dict[str, Any] | None:
    allowed = {key: value for key, value in values.items() if value is not None}
    if not allowed:
        return get_feedback(workspace_id, record_id)
    assignments = ", ".join(f"{column} = %s" for column in allowed)
    with _connection() as conn, conn.cursor() as cur:
        cur.execute(f"UPDATE feedback_records SET {assignments}, updated_at = now() WHERE id = %s AND workspace_id = %s RETURNING *", [*allowed.values(), record_id, workspace_id])
        return cur.fetchone()


def delete_feedback(workspace_id: UUID, record_id: UUID) -> bool:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM feedback_records WHERE id = %s AND workspace_id = %s", (record_id, workspace_id))
        return cur.rowcount == 1


def list_issue_states(workspace_id: UUID) -> list[dict[str, Any]]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT issue_key, status, notes, updated_at FROM issue_states WHERE workspace_id = %s ORDER BY updated_at DESC", (workspace_id,))
        return list(cur.fetchall())


def upsert_issue_state(workspace_id: UUID, issue_key: str, status: str, notes: str | None) -> dict[str, Any]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO issue_states (id, workspace_id, issue_key, status, notes) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (workspace_id, issue_key) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now()
            RETURNING issue_key, status, notes, updated_at""", (uuid4(), workspace_id, issue_key, status, notes))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("Issue update did not return an issue state.")
        return row


def feedback_by_ids(workspace_id: UUID, record_ids: list[UUID]) -> list[dict[str, Any]]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM feedback_records WHERE workspace_id = %s AND id = ANY(%s)", (workspace_id, record_ids))
        return list(cur.fetchall())


def save_analysis(workspace_id: UUID, record_id: UUID, values: dict[str, Any]) -> dict[str, Any] | None:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute(
            """UPDATE feedback_records SET sentiment=%s, category=%s, issue_key=%s, severity=%s, confidence=%s,
               analysis_explanation=%s, suggested_action=%s, analysis_mode=%s, model_name=%s, analysis_version=%s,
               analyzed_at=now(), updated_at=now() WHERE workspace_id=%s AND id=%s RETURNING *""",
            (values["sentiment"], values["category"], values["issue_key"], values["severity"], values.get("confidence"), values["explanation"], values.get("suggested_action"), values["mode"], values.get("model"), "v1", workspace_id, record_id),
        )
        return cur.fetchone()


def create_verified_example(workspace_id: UUID, user_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
    """Create a human-confirmed example only when its source belongs to the workspace."""
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, analysis_mode FROM feedback_records WHERE id=%s AND workspace_id=%s", (values["source_feedback_id"], workspace_id))
        source = cur.fetchone()
        if source is None:
            return None
        cur.execute("""INSERT INTO training_examples (id, workspace_id, source_feedback_id, instruction, input_text, target_output, provenance, label_status, verified_by, verified_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'verified',%s,now()) RETURNING *""", (uuid4(), workspace_id, values["source_feedback_id"], values["instruction"], values["input_text"], values["target_output"], source["analysis_mode"], UUID(user_id)))
        return cur.fetchone()


def list_training_examples(workspace_id: UUID) -> list[dict[str, Any]]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM training_examples WHERE workspace_id=%s ORDER BY created_at DESC", (workspace_id,))
        return list(cur.fetchall())


def verified_training_examples(workspace_id: UUID, limit: int) -> list[dict[str, Any]]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM training_examples WHERE workspace_id=%s AND label_status='verified' ORDER BY created_at ASC LIMIT %s", (workspace_id, limit))
        return list(cur.fetchall())


def create_adaption_job(workspace_id: UUID, user_id: str, *, dataset_id: str | None, status: str, phase: str, selected_count: int, row_cap: int, credits: float | None, minutes: float | None, error: str | None = None) -> dict[str, Any]:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO adaption_jobs (id, workspace_id, created_by, dataset_id, status, phase, selected_example_count, requested_row_cap, estimated_credits, estimated_minutes, error_summary, output_format)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'jsonl') RETURNING *""", (uuid4(), workspace_id, UUID(user_id), dataset_id, status, phase, selected_count, row_cap, credits, minutes, error))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("Adaption job creation did not return a job.")
        return row


def get_adaption_job(workspace_id: UUID, job_id: UUID) -> dict[str, Any] | None:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM adaption_jobs WHERE workspace_id=%s AND id=%s", (workspace_id, job_id))
        return cur.fetchone()


def update_adaption_job(workspace_id: UUID, job_id: UUID, *, status: str, phase: str, run_id: str | None = None, error: str | None = None, finished: bool = False) -> dict[str, Any] | None:
    with _connection() as conn, conn.cursor() as cur:
        cur.execute("""UPDATE adaption_jobs SET status=%s, phase=%s, run_id=COALESCE(%s, run_id), error_summary=%s,
            finished_at=CASE WHEN %s THEN now() ELSE finished_at END, updated_at=now() WHERE workspace_id=%s AND id=%s RETURNING *""", (status, phase, run_id, error, finished, workspace_id, job_id))
        return cur.fetchone()
