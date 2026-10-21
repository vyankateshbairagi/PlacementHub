from fastapi import APIRouter, Depends
from app.schema.job_schema import (
    ParseJDRequest,
    ParsedJobOutput,
    DeduplicateRequest,
    DeduplicateResponse,
    NormalizeSkillsRequest,
    NormalizeSkillsResponse,
    DetectFakeJobRequest,
    DetectFakeJobResponse,
)
from app.service.job_service import JobService, get_job_service

router = APIRouter(prefix="/jobs", tags=["Job Openings, Parsing & Deduplication"])

@router.post("/parse-jd", response_model=ParsedJobOutput)
async def parse_job_description(
    request: ParseJDRequest,
    service: JobService = Depends(get_job_service),
):
    """
    Parses unstructured Job Description (JD) text:
    - Normalizes skill variants ("ReactJS", "React.js" -> "React").
    - Segregates required vs. preferred skills.
    - Extracts CTC, min CGPA, branches, and selection rounds.
    """
    return await service.parse_job_description(request)

@router.post("/detect-fake", response_model=DetectFakeJobResponse)
async def detect_fake_job_post(
    request: DetectFakeJobRequest,
    service: JobService = Depends(get_job_service),
):
    """
    Detects fake job postings, fee scams, phishing portals, and recruiter impersonation.
    Returns authenticity trust score, fraud risk rating, red flags, and protective recommendations.
    """
    return await service.detect_fake_job(request)

@router.post("/deduplicate", response_model=DeduplicateResponse)
async def deduplicate_job_opening(
    request: DeduplicateRequest,
    service: JobService = Depends(get_job_service),
):
    """
    Identifies if an incoming opening from any source (partner, alumni, external API)
    is already in the system using multi-factor entity resolution & semantic embeddings.
    """
    return await service.deduplicate_job(request)

@router.post("/normalize-skills", response_model=NormalizeSkillsResponse)
async def normalize_skill_list(
    request: NormalizeSkillsRequest,
    service: JobService = Depends(get_job_service),
):
    """
    Direct utility endpoint to normalize raw skill strings into their
    canonical placement ontology tokens and categories.
    """
    return service.normalize_skills(request)

