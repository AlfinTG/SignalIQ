from typing import Literal

from pydantic import BaseModel, Field, field_validator

Sentiment = Literal["positive", "neutral", "negative"]
Severity = Literal["low", "medium", "high"]


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
    sentiment: Sentiment
    category: str = Field(min_length=1, max_length=80)
    issue_key: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=240)
    severity: Severity
    confidence: float | None = Field(default=None, ge=0, le=1)
    explanation: str = Field(min_length=1, max_length=400)
    suggested_action: str | None = Field(default=None, max_length=240)


class AnalyzeResponse(BaseModel):
    mode: Literal["live-ai"] = "live-ai"
    model: str
    results: list[AnalysisItem]
    failed_ids: list[str] = Field(default_factory=list)
    warning: str | None = None


class ErrorBody(BaseModel):
    error: str
    code: str
    detail: str | None = None


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
