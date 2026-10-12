from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

Sentiment = Literal["positive", "neutral", "negative", "unclassified"]
Severity = Literal["low", "medium", "high", "unknown"]
FormStatus = Literal["draft", "published", "archived"]
ActionStatus = Literal["open", "in_progress", "completed"]


class FeedbackIn(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=4000)
    source: str | None = Field(default=None, max_length=80)
    date: str | None = Field(default=None, max_length=40)
    rating: float | None = Field(default=None, ge=0, le=5)


class AnalyzeRequest(BaseModel):
    items: list[FeedbackIn] = Field(min_length=1)

    @field_validator("items")
    @classmethod
    def unique_ids(cls, items: list[FeedbackIn]) -> list[FeedbackIn]:
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate feedback IDs are not allowed in one request.")
        return items


class AnalysisItem(BaseModel):
    id: str
    sentiment: Literal["positive", "neutral", "negative"]
    category: str = Field(min_length=1, max_length=80)
    issue_key: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=240)
    severity: Literal["low", "medium", "high"]
    confidence: float | None = Field(default=None, ge=0, le=1)
    explanation: str = Field(min_length=1, max_length=400)
    suggested_action: str | None = Field(default=None, max_length=240)


class AnalyzeResponse(BaseModel):
    mode: Literal["live-ai", "demo-rules"] = "live-ai"
    model: str
    results: list[AnalysisItem]
    failed_ids: list[str] = Field(default_factory=list)
    warning: str | None = None


class ErrorBody(BaseModel):
    error: str
    code: str
    detail: str | None = None


# --- Project & Workspace Schemas ---
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: Optional[str] = Field(default=None, max_length=255)


class ProjectOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    url: Optional[str]
    created_at: str


# --- Form Builder Schemas ---
class FormFieldSchema(BaseModel):
    id: str
    type: Literal["text", "textarea", "rating", "category", "email"]
    label: str
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None


class FormCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default="", max_length=500)
    fields: List[FormFieldSchema]
    accent_color: str = Field(default="#2563EB", max_length=30)
    submit_text: str = Field(default="Send Feedback", max_length=50)
    success_message: str = Field(default="Thank you for your feedback!", max_length=300)
    template: str = Field(default="general", max_length=50)


class FormUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    fields: Optional[List[FormFieldSchema]] = None
    accent_color: Optional[str] = Field(default=None, max_length=30)
    submit_text: Optional[str] = Field(default=None, max_length=50)
    success_message: Optional[str] = Field(default=None, max_length=300)
    status: Optional[FormStatus] = None
    template: Optional[str] = None


class FormOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str]
    fields: List[Dict[str, Any]]
    accent_color: str
    submit_text: str
    success_message: str
    status: str
    template: str
    created_at: str
    updated_at: str


# --- Public Submission & Ingestion Schemas ---
class PublicSubmissionIn(BaseModel):
    form_id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=4000)
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    source: Optional[str] = Field(default="widget", max_length=50)
    custom_data: Optional[Dict[str, Any]] = None

    @field_validator("custom_data")
    @classmethod
    def validate_custom_data(cls, value: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if value is None:
            return value
        if len(value) > 20:
            raise ValueError("A feedback submission may contain at most 20 custom fields.")
        for key, field_value in value.items():
            if not isinstance(key, str) or not key.strip() or len(key) > 80:
                raise ValueError("Custom field names must be non-empty strings up to 80 characters.")
            if not isinstance(field_value, (str, int, float, bool)) and field_value is not None:
                raise ValueError("Custom field values must be simple values.")
            if isinstance(field_value, str) and len(field_value) > 500:
                raise ValueError("Custom text values must be at most 500 characters.")
        return value


class PublicSubmissionResponse(BaseModel):
    ok: bool = True
    submission_id: str
    message: str


# --- Submission Out Schema ---
class SubmissionOut(BaseModel):
    id: str
    project_id: str
    form_id: Optional[str]
    text: str
    rating: Optional[float]
    source: str
    sentiment: str
    category: str
    issue_key: str
    severity: str
    confidence: Optional[float]
    analysis_reason: Optional[str]
    suggested_action: Optional[str]
    analysis_mode: str
    analysis_status: str
    custom_data: Optional[Dict[str, Any]] = None
    created_at: str


# --- Action Item Schemas ---
class ActionCreate(BaseModel):
    issue_key: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=150)
    proposed_fix: Optional[str] = Field(default=None, max_length=500)
    assignee: Optional[str] = Field(default=None, max_length=100)
    due_date: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)
    status: ActionStatus = "open"


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    proposed_fix: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ActionStatus] = None


class ActionOut(BaseModel):
    id: str
    project_id: str
    issue_key: str
    title: str
    proposed_fix: Optional[str]
    assignee: Optional[str]
    due_date: Optional[str]
    status: str
    notes: Optional[str]
    created_at: str
    updated_at: str


# --- Adaption Schemas ---
class AdaptionExample(BaseModel):
    instruction: str = Field(min_length=1, max_length=2000)
    input: str = Field(min_length=1, max_length=4000)
    output: str = Field(min_length=1, max_length=2000)


class AdaptionEstimateRequest(BaseModel):
    examples: list[AdaptionExample] = Field(min_length=3, max_length=40)
    max_rows: int = Field(default=40, ge=3, le=40)


class AdaptionEstimateResponse(BaseModel):
    job_id: str
    dataset_id: str
    status: str
    estimate: bool = True
    estimated_credits_consumed: float | None = None
    estimated_minutes: float | None = None
    row_count: int | None = None
    warning: str | None = None


class AdaptionRunRequest(BaseModel):
    job_id: str = Field(min_length=1, max_length=80)
    confirm: bool


class AdaptionRunResponse(BaseModel):
    job_id: str
    dataset_id: str
    run_id: str | None = None
    status: str
    estimate: bool = False


class AdaptionJobStatus(BaseModel):
    job_id: str
    dataset_id: str
    run_id: str | None = None
    status: str
    phase: str
    row_count: int | None = None
    progress_percent: int | None = None
    processed_rows: int | None = None
    total_rows: int | None = None
    estimated_credits_consumed: float | None = None
    estimated_minutes: float | None = None
    download_ready: bool = False
    error: str | None = None
    note: str | None = None
