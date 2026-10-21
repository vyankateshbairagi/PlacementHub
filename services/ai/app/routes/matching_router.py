from fastapi import APIRouter, Depends, HTTPException
from app.schema.matching_schema import (
    SingleMatchRequest,
    MatchResult,
    BatchRankRequest,
    BatchRankResponse,
)
from app.service.matching_service import MatchingService, get_matching_service
from app.service.job_service import JobService, get_job_service
from app.schema.job_schema import ParseJDRequest

router = APIRouter(prefix="/match", tags=["Explainable Matching & Batch Cohort Ranking"])

@router.post("/candidate", response_model=MatchResult)
async def match_single_candidate(
    request: SingleMatchRequest,
    matching_service: MatchingService = Depends(get_matching_service),
    job_service: JobService = Depends(get_job_service),
):
    """
    Evaluates evidence-backed fit for a single candidate against a target job:
    - Calculates proof-weighted Fit Score (0-100)
    - Distinguishes verified skills vs unverified claims
    - Identifies specific missing required and preferred skills
    - Generates plain-language explanation and TechSummitTrainers upskilling advice
    """
    parsed_job = request.parsed_job
    if not parsed_job:
        if not request.job_description:
            raise HTTPException(
                status_code=400,
                detail="Either 'parsed_job' or 'job_description' text must be provided.",
            )
        parsed_job = await job_service.parse_job_description(
            ParseJDRequest(job_description=request.job_description)
        )

    return matching_service.match_candidate(request.candidate, parsed_job)

@router.post("/batch-rank", response_model=BatchRankResponse)
async def rank_candidate_batch(
    request: BatchRankRequest,
    matching_service: MatchingService = Depends(get_matching_service),
):
    """
    TPO / Recruiter Superpower:
    Takes 1 Job Description and ranks an entire batch (50-500 students) by evidence-backed fit.
    Returns:
    - Ranked leaderboard (Ranks 1 to N)
    - Cohort-wide skill gap frequency (e.g. 45% lack Docker)
    - TPO batch debrief summary
    """
    return await matching_service.batch_rank(request)

