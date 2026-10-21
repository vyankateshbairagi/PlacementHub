from typing import Any, Literal
from pydantic import BaseModel, Field, AliasChoices, model_validator

ConfidenceTier = Literal["GOLD_VERIFIED", "SILVER_VALIDATED", "BRONZE_SELF_REPORTED", "FLAGGED_FALSE"]
ProofSourceType = Literal["github_repo", "coding_assessment", "evaluated_project", "certification", "manual_claim"]

class ProofItem(BaseModel):
    model_config = {"extra": "ignore"}
    proof_id: str
    source_type: ProofSourceType
    title: str = Field(..., description="Name of the proof artifact, e.g. 'GitHub: student/careeros-backend'")
    locator: str = Field(..., description="URL, commit SHA, or assessment record identifier")
    metric: str = Field(..., description="Measurable indicator, e.g. '100% test cases passed, 42 commits'")
    snippet: str | None = Field(default=None, description="Code excerpt, commit summary, or rubric feedback")
    audit_note: str | None = None
    verified_at: str | None = None

class VerifiedSkill(BaseModel):
    name: str = Field(..., description="Canonical normalized skill name, e.g. 'FastAPI'")
    category: str = Field(default="Other", description="Taxonomy category (Backend, Frontend, etc.)")
    confidence_tier: ConfidenceTier
    evidence_score: int = Field(..., ge=0, le=100, description="Confidence score 0-100")
    proof_count: int = Field(default=0)
    proofs: list[ProofItem] = Field(default_factory=list)
    audit_note: str = Field(..., description="Human-readable explanation of why this skill is verified or flagged")

class GitHubRepoInput(BaseModel):
    repo_name: str
    repo_url: str
    primary_language: str | None = None
    languages: list[str] = Field(default_factory=list)
    dependency_files: dict[str, str] = Field(
        default_factory=dict,
        description="Map of filename to content, e.g. {'package.json': '{...}', 'requirements.txt': 'fastapi==0.110'}",
    )
    commit_count: int = 1
    is_fork: bool = False
    has_dockerfile: bool = False
    has_tests: bool = False
    readme_snippet: str | None = None

class CodingAssessmentInput(BaseModel):
    assessment_id: str
    problem_title: str
    category: str = Field(default="Data Structures & Algorithms")
    language: str
    passed_cases: int
    total_cases: int
    runtime_ms: int = 0
    score: int = Field(..., ge=0, le=100)
    submitted_at: str | None = None

class ProjectEvaluationInput(BaseModel):
    project_id: str
    title: str
    description: str = ""
    declared_tech_stack: list[str] = Field(default_factory=list)
    github_url: str | None = None
    live_demo_url: str | None = None
    faculty_score: int | None = Field(default=None, ge=0, le=100)
    evaluation_notes: str | None = None

class StudentProfileBuildRequest(BaseModel):
    student_id: str = Field(..., description="Student unique ID or roll number")
    declared_skills: list[str] = Field(..., description="Self-reported skill claims by the student")
    github_repos: list[GitHubRepoInput] = Field(default_factory=list)
    coding_submissions: list[CodingAssessmentInput] = Field(default_factory=list)
    project_evaluations: list[ProjectEvaluationInput] = Field(default_factory=list)

class StudentEvidenceProfile(BaseModel):
    student_id: str = "default_student"
    overall_trust_score: int = Field(
        default=85,
        ge=0,
        le=100,
        validation_alias=AliasChoices("overall_trust_score", "trust_score"),
        description="Overall profile trustworthiness score 0-100",
    )
    total_claimed_skills: int = 0
    verified_skills_count: int = 0
    unsubstantiated_claims_count: int = 0
    flagged_claims_count: int = 0
    verified_skills: list[VerifiedSkill] = Field(
        default_factory=list,
        description="Skills backed by Gold or Silver level evidence",
    )
    unsubstantiated_skills: list[VerifiedSkill] = Field(
        default_factory=list,
        description="Skills claimed by student but with zero proof attached (Bronze)",
    )
    flagged_skills: list[VerifiedSkill] = Field(
        default_factory=list,
        description="Skills claimed but contradicted or inflated by evidence",
    )
    summary: str = "Student evidence profile verified through institutional proof engine."

    @model_validator(mode="before")
    @classmethod
    def normalize_profile(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Alias trust_score -> overall_trust_score
            if "trust_score" in data and "overall_trust_score" not in data:
                data["overall_trust_score"] = data["trust_score"]

            # 2. Convert dict of proof arrays into list[VerifiedSkill] if needed
            vs = data.get("verified_skills")
            if isinstance(vs, dict):
                skills_list: list[VerifiedSkill] = []
                for skill_name, proofs in vs.items():
                    proof_items: list[ProofItem] = []
                    if isinstance(proofs, list):
                        for p in proofs:
                            if isinstance(p, dict):
                                locator = p.get("locator") or "https://github.com"
                                proof_items.append(
                                    ProofItem(
                                        proof_id=p.get("id") or locator,
                                        source_type="github_repo"
                                        if "github" in str(p.get("source_type", "")).lower()
                                        else "coding_assessment",
                                        title=f"Proof for {skill_name}",
                                        locator=locator,
                                        metric=p.get("metric") or "Verified artifact",
                                        audit_note=p.get("audit_note") or "Audited evidence",
                                    )
                                )
                    skills_list.append(
                        VerifiedSkill(
                            name=skill_name,
                            category="Technical",
                            confidence_tier="GOLD_VERIFIED",
                            evidence_score=95,
                            proof_count=len(proof_items),
                            proofs=proof_items,
                            audit_note=f"Verified through {len(proof_items)} proof artifacts.",
                        )
                    )
                data["verified_skills"] = skills_list

            # 3. Ensure defaults for counts
            v_skills = data.get("verified_skills") or []
            if not data.get("verified_skills_count"):
                data["verified_skills_count"] = len(v_skills)
            if not data.get("total_claimed_skills"):
                data["total_claimed_skills"] = len(v_skills) + len(
                    data.get("unsubstantiated_skills") or []
                )
            if not data.get("summary"):
                data["summary"] = (
                    f"Candidate evidence profile with {len(v_skills)} verified skills."
                )
        return data

class VerifySingleSkillRequest(BaseModel):
    skill_name: str
    github_repos: list[GitHubRepoInput] = Field(default_factory=list)
    coding_submissions: list[CodingAssessmentInput] = Field(default_factory=list)
    project_evaluations: list[ProjectEvaluationInput] = Field(default_factory=list)

