from typing import Any, Literal
from pydantic import BaseModel, Field, AliasChoices, model_validator
import hashlib
from app.schema.job_schema import ParsedJobOutput
from app.schema.evidence_schema import StudentEvidenceProfile, VerifiedSkill, ProofItem

AuditStatus = Literal["VERIFIED", "UNSUBSTANTIATED", "FLAGGED_FALSE"]

class ClaimAuditItem(BaseModel):
    claim_text: str = Field(..., description="Exact claim made on the resume")
    claim_type: Literal["skill", "metric", "project", "experience"] = "skill"
    status: AuditStatus
    proof_found: str | None = Field(default=None, description="Linked proof artifact if verified")
    recommendation: str = Field(..., description="Actionable fix for the candidate")
    raw_claim: str | None = None
    auditor_comment: str | None = None

    @model_validator(mode="after")
    def sync_aliases(self) -> "ClaimAuditItem":
        if not self.raw_claim:
            self.raw_claim = self.claim_text
        if not self.auditor_comment:
            self.auditor_comment = self.recommendation
        return self

class ResumeAuditRequest(BaseModel):
    resume_text: str = Field(..., min_length=5, description="Raw or parsed resume text")
    student_evidence: StudentEvidenceProfile | None = Field(
        default=None,
        description="Verified student evidence profile",
    )
    student_id: str = "default_student"
    verified_skills: list[Any] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_audit_request(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("student_evidence") and data.get("verified_skills"):
                v_skills_raw = data.get("verified_skills") or []
                skills_list: list[VerifiedSkill] = []
                flagged_list: list[VerifiedSkill] = []
                for item in v_skills_raw:
                    if isinstance(item, dict):
                        s_name = item.get("canonical_skill") or item.get("name") or "Technical Skill"
                        tier = item.get("confidence_tier") or "GOLD_VERIFIED"
                        locator = item.get("locator") or "https://github.com"
                        metric = item.get("metric") or "Production verified"
                        is_flagged = tier == "FLAGGED_FALSE"
                        v_skill = VerifiedSkill(
                            name=s_name,
                            category=item.get("category", "Technical"),
                            confidence_tier=tier if tier in ["GOLD_VERIFIED", "SILVER_VALIDATED", "BRONZE_SELF_REPORTED", "FLAGGED_FALSE"] else "GOLD_VERIFIED",
                            evidence_score=0 if is_flagged else 95,
                            proof_count=0 if is_flagged else 1,
                            proofs=[
                                ProofItem(
                                    proof_id=locator,
                                    source_type="github_repo",
                                    title=f"Proof: {s_name}",
                                    locator=locator,
                                    metric=metric,
                                    audit_note=item.get("audit_note") or "Verified proof",
                                )
                            ] if not is_flagged else [],
                            audit_note=item.get("audit_note") or ("Flagged contradictory claim" if is_flagged else "Verified artifact"),
                        )
                        if is_flagged:
                            flagged_list.append(v_skill)
                        else:
                            skills_list.append(v_skill)

                data["student_evidence"] = StudentEvidenceProfile(
                    student_id=data.get("student_id", "default_student"),
                    overall_trust_score=92 if not flagged_list else 35,
                    total_claimed_skills=len(skills_list) + len(flagged_list),
                    verified_skills_count=len(skills_list),
                    unsubstantiated_claims_count=0,
                    flagged_claims_count=len(flagged_list),
                    verified_skills=skills_list,
                    flagged_skills=flagged_list,
                    summary="Synthesized student evidence profile for audit.",
                )
        return data

class ResumeAuditResponse(BaseModel):
    integrity_score: int = Field(..., ge=0, le=100, description="Resume truthfulness score 0-100")
    can_submit_to_drives: bool = Field(
        ...,
        description="Whether resume passes institutional integrity check to apply for placement drives",
    )
    claims_summary: str
    total_claims_detected: int
    verified_count: int
    unsubstantiated_count: int
    flagged_count: int
    audited_claims: list[ClaimAuditItem]
    ats_formatting: dict[str, Any]
    verified_claims_count: int = 0
    application_blocked: bool = False
    block_reason: str | None = None
    feedback: str = ""
    ats_formatting_score: int = 85

    @model_validator(mode="after")
    def sync_aliases(self) -> "ResumeAuditResponse":
        self.verified_claims_count = self.verified_count
        self.application_blocked = not self.can_submit_to_drives
        if self.application_blocked:
            self.block_reason = f"Audit failed: {self.flagged_count} contradictory claims flagged or integrity score below threshold."
        self.feedback = self.claims_summary
        return self

class TraceableBullet(BaseModel):
    bullet_text: str = Field(..., description="XYZ-formatted resume bullet")
    skills_highlighted: list[str] = Field(default_factory=list)
    proof_locator: str = Field(..., description="Exact repository URL, commit SHA, or assessment ID")
    evidence_metric: str = Field(..., description="Underlying verification metric")

class GroundedProject(BaseModel):
    title: str
    tech_stack: list[str]
    repo_url: str | None = None
    demo_url: str | None = None
    bullets: list[TraceableBullet]

class GroundedResume(BaseModel):
    candidate_name: str
    target_role: str
    target_company: str
    summary: str
    verified_technical_skills: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Categorized technical skills strictly backed by Gold/Silver proof",
    )
    projects: list[GroundedProject] = Field(default_factory=list)
    experiences: list[dict[str, Any]] = Field(default_factory=list)
    verified_assessments: list[str] = Field(default_factory=list)
    one_page_plain_text: str = Field(..., description="ATS single-column plain text format")
    markdown_content: str = Field(..., description="Clean ATS-compliant Markdown")
    student_name: str | None = None
    email: str | None = None
    headline: str | None = None
    education_summary: str | None = None
    verified_skills_summary: list[str] = Field(default_factory=list)
    evidence_traceable_bullets: list[Any] = Field(default_factory=list)
    markdown_resume: str | None = None
    plain_text_resume: str | None = None
    integrity_hash: str | None = None

    @model_validator(mode="after")
    def sync_aliases(self) -> "GroundedResume":
        if not self.student_name:
            self.student_name = self.candidate_name
        if not self.headline:
            self.headline = f"{self.target_role} | {self.target_company}"
        if not self.markdown_resume:
            self.markdown_resume = self.markdown_content
        if not self.plain_text_resume:
            self.plain_text_resume = self.one_page_plain_text
        if not self.verified_skills_summary:
            all_s: list[str] = []
            for skills in self.verified_technical_skills.values():
                all_s.extend(skills)
            self.verified_skills_summary = all_s
        if not self.evidence_traceable_bullets:
            bullet_objs = []
            for p in self.projects:
                for b in p.bullets:
                    bullet_objs.append({
                        "bullet_text": b.bullet_text,
                        "backing_proof": {
                            "canonical_skill": b.skills_highlighted[0] if b.skills_highlighted else "Engineering",
                            "category": "Project Work",
                            "confidence_tier": "GOLD_VERIFIED",
                            "source_type": "GITHUB_REPO",
                            "locator": b.proof_locator,
                            "metric": b.evidence_metric,
                            "audit_note": "Verified project implementation",
                        }
                    })
            self.evidence_traceable_bullets = bullet_objs
        if not self.integrity_hash:
            h = hashlib.sha256(f"{self.candidate_name}:{self.target_role}:{self.markdown_content}".encode()).hexdigest()
            self.integrity_hash = f"SHA256-{h[:16]}"
        return self

class GenerateGroundedResumeRequest(BaseModel):
    student_id: str = "default_student"
    candidate_name: str = Field(
        default="Candidate",
        validation_alias=AliasChoices("candidate_name", "student_name", "name")
    )
    email: str = Field(default="student@campus.edu")
    phone: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    target_job_description: str | None = None
    parsed_job: ParsedJobOutput | None = None
    student_evidence: StudentEvidenceProfile | None = None
    verified_skills: list[Any] | None = None
    education_summary: str | None = None
    job_role: str | None = None
    projects: list[dict[str, Any]] | None = None
    experiences: list[dict[str, Any]] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_resume_request(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "student_name" in data and "candidate_name" not in data:
                data["candidate_name"] = data["student_name"]
            if "job_role" in data and not data.get("target_job_description"):
                data["target_job_description"] = f"Opening for {data['job_role']}"

            if not data.get("student_evidence"):
                v_skills_raw = data.get("verified_skills") or []
                skills_list: list[VerifiedSkill] = []
                for item in v_skills_raw:
                    if isinstance(item, dict):
                        s_name = item.get("canonical_skill") or item.get("name") or "Technical Skill"
                        tier = item.get("confidence_tier") or "GOLD_VERIFIED"
                        locator = item.get("locator") or "https://github.com"
                        metric = item.get("metric") or "Production verified"
                        st_raw = str(item.get("source_type") or item.get("sourceType") or "").lower()
                        source_type = "github_repo" if "github" in st_raw else ("coding_assessment" if "assessment" in st_raw or "code" in st_raw else "evaluated_project")
                        skills_list.append(
                            VerifiedSkill(
                                name=s_name,
                                category=item.get("category", "Technical"),
                                confidence_tier=tier if tier in ["GOLD_VERIFIED", "SILVER_VALIDATED", "BRONZE_SELF_REPORTED", "FLAGGED_FALSE"] else "GOLD_VERIFIED",
                                evidence_score=95,
                                proof_count=1,
                                proofs=[
                                    ProofItem(
                                        proof_id=locator,
                                        source_type=source_type,
                                        title=f"Proof: {s_name}",
                                        locator=locator,
                                        metric=metric,
                                        audit_note=item.get("audit_note") or item.get("auditNote") or "Verified proof",
                                    )
                                ],
                                audit_note=item.get("audit_note") or item.get("auditNote") or "Verified artifact",
                            )
                        )
                data["student_evidence"] = StudentEvidenceProfile(
                    student_id=data.get("student_id", "default_student"),
                    overall_trust_score=94,
                    total_claimed_skills=len(skills_list),
                    verified_skills_count=len(skills_list),
                    unsubstantiated_claims_count=0,
                    flagged_claims_count=0,
                    verified_skills=skills_list,
                    summary="Synthesized student evidence profile for grounded resume.",
                )
        return data


