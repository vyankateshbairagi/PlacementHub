from typing import Literal
from pydantic import BaseModel, Field
from app.schema.job_schema import ParsedJobOutput
from app.schema.evidence_schema import StudentEvidenceProfile

MatchTier = Literal["STRONG_MATCH", "POTENTIAL_MATCH", "TRAINABLE", "NOT_RECOMMENDED"]

class StudentCandidate(BaseModel):
    student_id: str
    name: str
    email: str | None = None
    department: str = Field(default="Computer Science")
    cgpa: float = Field(..., ge=0.0, le=10.0)
    backlogs_count: int = Field(default=0)
    profile: StudentEvidenceProfile

class SkillGap(BaseModel):
    skill_name: str
    category: str
    importance: Literal["required", "preferred"]
    remediation_suggestion: str

class MatchResult(BaseModel):
    student_id: str
    name: str
    rank: int | None = None
    fit_score: int = Field(..., ge=0, le=100)
    match_tier: MatchTier
    is_eligible: bool = True
    eligibility_reason: str | None = None
    matched_required_skills: list[str] = Field(default_factory=list)
    missing_required_skills: list[SkillGap] = Field(default_factory=list)
    matched_preferred_skills: list[str] = Field(default_factory=list)
    missing_preferred_skills: list[SkillGap] = Field(default_factory=list)
    strengths_summary: str
    plain_language_explanation: str
    upskilling_recommendation: str | None = None

class SingleMatchRequest(BaseModel):
    candidate: StudentCandidate
    job_description: str | None = None
    parsed_job: ParsedJobOutput | None = None

class BatchRankRequest(BaseModel):
    job_description: str | None = None
    parsed_job: ParsedJobOutput | None = None
    candidates: list[StudentCandidate] = Field(..., min_length=1)
    min_fit_score: int = Field(default=0, ge=0, le=100)
    only_eligible: bool = Field(default=False)

class BatchRankResponse(BaseModel):
    job_title: str
    company_name: str
    total_evaluated: int
    eligible_count: int
    strong_match_count: int
    potential_match_count: int
    leaderboard: list[MatchResult]
    cohort_gap_analysis: dict[str, int] = Field(
        default_factory=dict,
        description="Frequency count of missing skills across the student batch",
    )
    tpo_summary: str

