from fastapi import APIRouter, Depends
from app.schema.resume_schema import (
    ResumeAuditRequest,
    ResumeAuditResponse,
    GenerateGroundedResumeRequest,
    GroundedResume,
)
from app.service.resume_service import ResumeService, get_resume_service

router = APIRouter(prefix="/resume", tags=["Evidence-Traceable Resumes & Bullshit Detector"])

@router.post("/audit", response_model=ResumeAuditResponse)
async def audit_resume_claims(
    request: ResumeAuditRequest,
    service: ResumeService = Depends(get_resume_service),
):
    """
    Resume Bullshit Detector:
    - Parses resume text to detect technical and metric claims.
    - Audits claims against verified GitHub, assessment, and project evidence:
      * 🟢 VERIFIED: Backed by real proof.
      * 🟡 UNSUBSTANTIATED: Claim made with zero proof in the system.
      * 🔴 FLAGGED_FALSE: Contradicted claim (blocks drive application!).
    - Computes Integrity Score (0-100) and ATS format compliance.
    """
    return service.audit_resume(request)

@router.post("/generate-grounded", response_model=GroundedResume)
async def generate_grounded_ats_resume(
    request: GenerateGroundedResumeRequest,
    service: ResumeService = Depends(get_resume_service),
):
    """
    Grounded 1-Page ATS Resume Generator:
    - Generates a tailored one-page resume where every single bullet point
      is strictly traceable back to verified evidence.
    - Zero hallucination: Blocks all unverified claims.
    - Formats in ATS-friendly single-column Markdown and plain text.
    """
    return await service.generate_grounded_resume(request)

