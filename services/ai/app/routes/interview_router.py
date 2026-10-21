from fastapi import APIRouter, Depends
from app.schema.interview_schema import (
    PostInterviewReportInput,
    CompanyInterviewVaultResponse,
    AlumniReferralItem,
)
from app.service.interview_service import InterviewService, get_interview_service

router = APIRouter(prefix="/vault", tags=["Company Interview Question Bank & Alumni Referrals"])

@router.post("/report")
async def submit_post_interview_report(
    report: PostInterviewReportInput,
    service: InterviewService = Depends(get_interview_service),
):
    """
    Submits a student's real post-interview experience report:
    - Automatically categorizes technical, DSA, system design, and HR questions.
    - Updates company question banks and difficulty statistics.
    """
    return service.submit_report(report)

@router.get("/company/{company_name}", response_model=CompanyInterviewVaultResponse)
async def get_company_interview_vault(
    company_name: str,
    service: InterviewService = Depends(get_interview_service),
):
    """
    Retrieves the company-wise question bank and preparation kit:
    - Real questions asked to past batches, categorized by round and topic
    - Difficulty breakdown (Easy / Medium / Hard)
    - Verified alumni mapped at that company available for 1:1 mentorship/referrals
    """
    return service.get_company_vault(company_name)

@router.get("/alumni/{company_name}", response_model=list[AlumniReferralItem])
async def get_mapped_alumni_for_company(
    company_name: str,
    service: InterviewService = Depends(get_interview_service),
):
    """
    Retrieves college alumni working at a target employer who can provide
    employee referrals or pre-interview guidance.
    """
    vault = service.get_company_vault(company_name)
    return vault.mapped_alumni

