from typing import Literal
from pydantic import BaseModel, Field

InterviewRoundType = Literal[
    "Online Assessment", "Technical Round 1", "Technical Round 2", "System Design", "HR / Behavioral"
]
InterviewDifficulty = Literal["Easy", "Medium", "Hard"]
QuestionCategory = Literal[
    "DSA / Coding", "System Design", "Domain / Frameworks", "Behavioral / HR", "Core CS & Systems"
]

class CategorizedQuestion(BaseModel):
    question_text: str
    category: QuestionCategory
    difficulty: InterviewDifficulty = "Medium"
    frequency_count: int = 1
    model_answer_hints: list[str] = Field(default_factory=list)

class PostInterviewReportInput(BaseModel):
    student_id: str
    student_name: str
    company_name: str
    role_title: str
    round_type: InterviewRoundType = "Technical Round 1"
    difficulty: InterviewDifficulty = "Medium"
    raw_experience_text: str
    questions_asked: list[str] = Field(default_factory=list)
    tips: str | None = None
    outcome: Literal["OFFERED", "SELECTED_NEXT_ROUND", "REJECTED", "PENDING"] = "PENDING"

class AlumniReferralItem(BaseModel):
    alumni_id: str
    name: str
    current_company: str
    current_role: str
    graduation_year: int
    linkedin_url: str | None = None
    is_mentor_available: bool = True
    active_referrals: list[str] = Field(default_factory=list)

class CompanyInterviewVaultResponse(BaseModel):
    company_name: str
    total_reports: int
    difficulty_breakdown: dict[str, int] = Field(
        default_factory=lambda: {"Easy": 0, "Medium": 0, "Hard": 0}
    )
    common_topics_tested: list[str] = Field(default_factory=list)
    top_questions_by_category: dict[str, list[CategorizedQuestion]] = Field(default_factory=dict)
    prep_kit_advice: str
    mapped_alumni: list[AlumniReferralItem] = Field(default_factory=list)

class RecruiterShortlistQuery(BaseModel):
    job_id: str
    company_name: str
    role_title: str
    required_skills: list[str] = Field(default_factory=list)
    min_fit_score: int = Field(default=60, ge=0, le=100)
    only_gold_verified: bool = Field(default=False)

