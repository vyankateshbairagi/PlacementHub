from typing import Literal, Union, Any
from pydantic import BaseModel, Field, field_validator

SkillImportance = Literal["required", "preferred"]

class SkillItem(BaseModel):
    name: str = Field(..., description="Canonical normalized skill name, e.g. 'React'")
    category: str = Field(default="Other", description="Skill taxonomy category (Frontend, Backend, etc.)")
    raw_match: str = Field(default="", description="Original raw representation in source text, e.g. 'React.js'")
    importance: SkillImportance = Field(default="required", description="Whether skill is mandatory or preferred")

class ParsedJobOutput(BaseModel):
    role_title: str = Field(..., description="Extracted or normalized role title")
    company_name: str = Field(..., description="Extracted or inferred company name")
    experience_level: str = Field(default="Fresher / 0-1 Years", description="Target experience bracket")
    employment_type: str = Field(default="Full-time", description="Full-time, Internship, etc.")
    location: str = Field(default="Pan-India / Flexible", description="Work location")
    is_remote: bool = Field(default=False, description="Whether remote work is supported")
    ctc_text: str | None = Field(default=None, description="Compensation / CTC string, e.g. '₹10 - ₹14 LPA'")
    min_cgpa: float | None = Field(default=None, description="Minimum CGPA cutoff if specified")
    max_backlogs: int | None = Field(default=None, description="Maximum active backlogs allowed")
    eligible_branches: list[str] = Field(default_factory=list, description="Eligible degree streams, e.g. ['CSE', 'IT', 'ECE']")
    required_skills: list[Union[SkillItem, str, dict]] = Field(default_factory=list, description="Must-have skills")
    preferred_skills: list[Union[SkillItem, str, dict]] = Field(default_factory=list, description="Good-to-have / bonus skills")
    selection_rounds: list[str] = Field(
        default_factory=lambda: ["Online Assessment", "Technical Interview", "HR Round"],
        description="Identified hiring process rounds",
    )
    summary: str = Field(default="Position opening for qualified candidates.", description="Concise 2-sentence executive summary of the opening")
    normalized_skill_tokens: list[str] = Field(
        default_factory=list,
        description="Flat array of canonical skill names for fast vector and set matching",
    )

class ParseJDRequest(BaseModel):
    job_description: str = Field(..., min_length=20, description="Raw job description text")
    source: Literal["partner_portal", "alumni_referral", "external_api", "manual_tpo"] = "manual_tpo"
    company_name_hint: str | None = Field(default=None, description="Optional hinted company name")
    role_title_hint: str | None = Field(default=None, description="Optional hinted role title")

class JobOpeningItem(BaseModel):
    id: str = Field(..., description="Unique ID of the opening")
    company_name: str
    role_title: str
    location: str | None = None
    source: str = Field(default="partner_portal", description="Source of the opening")
    description: str
    posted_date: str | None = None

class DeduplicateRequest(BaseModel):
    new_job: JobOpeningItem
    existing_jobs: list[JobOpeningItem]
    similarity_threshold: float = Field(default=0.82, ge=0.5, le=1.0)

class DuplicateMatch(BaseModel):
    matched_job_id: str
    matched_company: str
    matched_role: str
    matched_source: str
    similarity_score: float
    match_type: Literal["EXACT_ENTITY", "SEMANTIC_SIMILARITY", "HIGH_CONFIDENCE_OVERLAP"]
    explanation: str

class DeduplicateResponse(BaseModel):
    is_duplicate: bool
    primary_match: DuplicateMatch | None = None
    all_matches: list[DuplicateMatch] = []
    consolidated_sources: list[str] = []

class NormalizeSkillsRequest(BaseModel):
    raw_skills: list[str] = Field(..., min_length=1, description="Raw skill strings to normalize")

class NormalizeSkillsResponse(BaseModel):
    normalized: list[SkillItem]
    canonical_tokens: list[str]

class DetectFakeJobRequest(BaseModel):
    company: str = Field(..., description="Company name")
    role: str = Field(..., description="Job role or designation")
    description: str | None = Field(default=None, description="Full or partial job description")
    url: str | None = Field(default=None, description="Application link or career portal URL")
    ctc: str | None = Field(default=None, description="Advertised salary or stipend")
    contact_email: str | None = Field(default=None, description="Contact email address")
    contact_channel: str | None = Field(default=None, description="Telegram, WhatsApp, portal, etc.")
    source: str | None = Field(default="MANUAL_SCAN", description="Source of opening")

class DetectFakeJobResponse(BaseModel):
    company: str
    role: str
    authenticity_score: int
    fraud_risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    verdict: Literal["VERIFIED_LEGITIMATE", "PROCEED_WITH_CAUTION", "FRAUD_SCAM_DETECTED"]
    verdict_title: str
    summary: str
    ai_confidence: int
    breakdown: dict[str, int]
    red_flags: list[dict[str, Any]]
    green_flags: list[dict[str, Any]]
    domain_analysis: dict[str, Any]
    safety_recommendations: list[str]
    action_for_tpo: str
    action_for_student: str

