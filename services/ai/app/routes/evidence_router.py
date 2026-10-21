from fastapi import APIRouter, Depends
from app.schema.evidence_schema import (
    StudentProfileBuildRequest,
    StudentEvidenceProfile,
    GitHubRepoInput,
    VerifiedSkill,
    VerifySingleSkillRequest,
)
from app.service.evidence_service import EvidenceService, get_evidence_service

router = APIRouter(prefix="/evidence", tags=["Evidence-Backed Skill Profiling & Verification"])

@router.post("/build-profile", response_model=StudentEvidenceProfile)
async def build_student_evidence_profile(
    request: StudentProfileBuildRequest,
    service: EvidenceService = Depends(get_evidence_service),
):
    """
    Builds a student's skill profile from evidence, not claims:
    - Ingests GitHub repos (AST dependencies & commits)
    - Ingests coding assessment test pass-rates and scores
    - Ingests faculty-evaluated capstone projects
    - Cross-references against declared claims:
      * Gold/Silver: Verified with code and test proof.
      * Bronze: Unsubstantiated claims lacking proof.
      * Flagged: Exaggerated or contradicted claims.
    """
    return service.build_evidence_profile(request)

@router.post("/analyze-github")
async def analyze_github_repository(
    repo: GitHubRepoInput,
    service: EvidenceService = Depends(get_evidence_service),
):
    """
    Analyzes a GitHub repository's languages, commit activity, Dockerfiles, test suites,
    and dependency manifests (package.json, requirements.txt) to extract verified proof items.
    """
    proofs_by_skill = service.analyze_github_repo(repo)
    return {
        "repo_name": repo.repo_name,
        "verified_skills": list(proofs_by_skill.keys()),
        "proof_count": sum(len(p) for p in proofs_by_skill.values()),
        "proofs": proofs_by_skill,
    }

@router.post("/verify-skill", response_model=VerifiedSkill)
async def verify_single_skill_claim(
    request: VerifySingleSkillRequest,
    service: EvidenceService = Depends(get_evidence_service),
):
    """
    Verifies a single claimed skill against available GitHub, assessment, and project evidence.
    """
    return service.verify_single_skill(request)

