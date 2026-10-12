from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Sentiment = Literal["positive", "neutral", "negative", "unclassified"]
IssueStatus = Literal["Open", "In progress", "Resolved"]


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime


class MeOut(BaseModel):
    user_id: UUID
    email: str | None
    workspace: WorkspaceOut


class FeedbackCreate(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    source: str = Field(default="manual", min_length=1, max_length=80)
    source_reference: str | None = Field(default=None, max_length=255)
    submitted_at: datetime | None = None
    rating: float | None = Field(default=None, ge=0, le=5)


class FeedbackUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=8000)
    source: str | None = Field(default=None, min_length=1, max_length=80)
    rating: float | None = Field(default=None, ge=0, le=5)
    sentiment: Sentiment | None = None
    category: str | None = Field(default=None, max_length=120)
    issue_key: str | None = Field(default=None, max_length=120)
    severity: str | None = Field(default=None, max_length=20)


class FeedbackOut(BaseModel):
    id: UUID
    text: str
    source: str
    source_reference: str | None
    submitted_at: datetime | None
    rating: float | None
    sentiment: Sentiment
    category: str | None
    issue_key: str | None
    severity: str | None
    confidence: float | None
    analysis_explanation: str | None
    suggested_action: str | None
    analysis_mode: str
    analyzed_at: datetime | None
    is_sample: bool
    created_at: datetime
    updated_at: datetime


class FeedbackPage(BaseModel):
    items: list[FeedbackOut]
    total: int
    limit: int
    offset: int


class IssueUpdate(BaseModel):
    status: IssueStatus
    notes: str | None = Field(default=None, max_length=2000)


class IssueOut(BaseModel):
    issue_key: str
    status: IssueStatus
    notes: str | None
    updated_at: datetime


class PersistentAnalyzeRequest(BaseModel):
    record_ids: list[UUID] = Field(min_length=1, max_length=80)
    mode: Literal["live-ai", "demo-rules"] = "live-ai"


class PersistentAnalyzeResponse(BaseModel):
    mode: Literal["live-ai", "demo-rules"]
    model: str | None
    updated: list[FeedbackOut]
    failed_ids: list[UUID] = Field(default_factory=list)
    warning: str | None = None


class FeedbackImportRequest(BaseModel):
    records: list[FeedbackCreate] = Field(min_length=1, max_length=500)


class FeedbackImportResponse(BaseModel):
    accepted: int
    rejected: list[dict[str, str]] = Field(default_factory=list)
    records: list[FeedbackOut]


class TrainingExampleCreate(BaseModel):
    source_feedback_id: UUID
    instruction: str = Field(min_length=1, max_length=2000)
    input_text: str = Field(min_length=1, max_length=8000)
    target_output: str = Field(min_length=1, max_length=4000)


class TrainingExampleOut(BaseModel):
    id: UUID
    source_feedback_id: UUID | None
    instruction: str
    input_text: str
    target_output: str
    provenance: str
    label_status: Literal["unreviewed", "verified", "rejected"]
    verified_at: datetime | None
    created_at: datetime


class AdaptionEstimateRequest(BaseModel):
    max_rows: int = Field(default=40, ge=3, le=40)


class AdaptionRunRequest(BaseModel):
    confirm: Literal[True]


class AdaptionJobOut(BaseModel):
    id: UUID
    dataset_id: str | None
    run_id: str | None
    status: str
    phase: str
    selected_example_count: int
    requested_row_cap: int | None
    estimated_credits: float | None
    estimated_minutes: float | None
    error_summary: str | None
    created_at: datetime
    updated_at: datetime
