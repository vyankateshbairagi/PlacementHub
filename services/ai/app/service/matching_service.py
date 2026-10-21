from typing import Any
from fastapi import Depends
from app.schema.job_schema import ParsedJobOutput, ParseJDRequest
from app.schema.matching_schema import (
    StudentCandidate,
    SkillGap,
    MatchResult,
    SingleMatchRequest,
    BatchRankRequest,
    BatchRankResponse,
    MatchTier,
)
from app.service.job_service import JobService, get_job_service
from app.service.skill_normalizer import SkillNormalizer

class MatchingService:
    def __init__(self, job_service: JobService):
        self.job_service = job_service

    def match_candidate(
        self, candidate: StudentCandidate, job: ParsedJobOutput
    ) -> MatchResult:
        # 1. Hard Eligibility Rules
        is_eligible = True
        eligibility_reasons: list[str] = []

        if job.min_cgpa is not None and candidate.cgpa < job.min_cgpa:
            is_eligible = False
            eligibility_reasons.append(
                f"CGPA {candidate.cgpa:.2f} is below required cutoff of {job.min_cgpa:.2f}"
            )

        if job.max_backlogs is not None and candidate.backlogs_count > job.max_backlogs:
            is_eligible = False
            eligibility_reasons.append(
                f"Has {candidate.backlogs_count} backlog(s), maximum allowed is {job.max_backlogs}"
            )

        if job.eligible_branches:
            branch_match = any(
                b.lower() in candidate.department.lower()
                or candidate.department.lower() in b.lower()
                for b in job.eligible_branches
            )
            if not branch_match:
                # Be flexible for CSE/IT/Tech variants
                is_tech_dept = any(
                    t in candidate.department.lower()
                    for t in ["computer", "comp", "it", "information", "software", "tech"]
                )
                is_tech_job = any(
                    t in "".join(job.eligible_branches).lower()
                    for t in ["computer", "comp", "it", "cse"]
                )
                if not (is_tech_dept and is_tech_job):
                    is_eligible = False
                    eligibility_reasons.append(
                        f"Department '{candidate.department}' not listed in eligible branches ({', '.join(job.eligible_branches)})"
                    )

        # 2. Build Student Skill Maps
        verified_map = {
            s.name.lower(): s for s in candidate.profile.verified_skills
        }
        unsubstantiated_map = {
            s.name.lower(): s for s in candidate.profile.unsubstantiated_skills
        }

        # 3. Evaluate Required Skills
        matched_required: list[str] = []
        missing_required: list[SkillGap] = []
        req_weights: list[float] = []

        def _extract_skill_info(skill: Any) -> tuple[str, str]:
            if isinstance(skill, str):
                return skill, "Technical"
            if isinstance(skill, dict):
                return skill.get("name", ""), skill.get("category", "Technical")
            return getattr(skill, "name", str(skill)), getattr(skill, "category", "Technical")

        for req_skill in job.required_skills:
            req_name, req_cat = _extract_skill_info(req_skill)
            if not req_name:
                continue
            s_name = req_name.lower()
            if s_name in verified_map:
                v_skill = verified_map[s_name]
                matched_required.append(req_name)
                # Gold gets 1.0, Silver gets 0.85
                credit = 1.0 if v_skill.confidence_tier == "GOLD_VERIFIED" else 0.85
                req_weights.append(credit)
            elif s_name in unsubstantiated_map:
                matched_required.append(f"{req_name} (Unverified Claim)")
                req_weights.append(0.35)  # Severe discount for unverified claim
            else:
                missing_required.append(
                    SkillGap(
                        skill_name=req_name,
                        category=req_cat,
                        importance="required",
                        remediation_suggestion=f"Mandatory requirement: Take an assessment or complete a project demonstrating {req_name}.",
                    )
                )
                req_weights.append(0.0)

        # 4. Evaluate Preferred Skills
        matched_preferred: list[str] = []
        missing_preferred: list[SkillGap] = []
        pref_weights: list[float] = []

        for pref_skill in job.preferred_skills:
            pref_name, pref_cat = _extract_skill_info(pref_skill)
            if not pref_name:
                continue
            s_name = pref_name.lower()
            if s_name in verified_map:
                v_skill = verified_map[s_name]
                matched_preferred.append(pref_name)
                credit = 1.0 if v_skill.confidence_tier == "GOLD_VERIFIED" else 0.85
                pref_weights.append(credit)
            elif s_name in unsubstantiated_map:
                matched_preferred.append(f"{pref_name} (Unverified)")
                pref_weights.append(0.40)
            else:
                missing_preferred.append(
                    SkillGap(
                        skill_name=pref_name,
                        category=pref_cat,
                        importance="preferred",
                        remediation_suggestion=f"Bonus skill: Explore {pref_name} fundamentals to stand out.",
                    )
                )
                pref_weights.append(0.0)

        # 5. Calculate Weighted Fit Score
        req_score = (sum(req_weights) / len(req_weights) * 100) if req_weights else 85.0
        pref_score = (sum(pref_weights) / len(pref_weights) * 100) if pref_weights else 75.0
        trust_score = float(candidate.profile.overall_trust_score)
        acad_score = min(100.0, (candidate.cgpa / 10.0) * 100)

        # Weights: Required (50%), Preferred (20%), Trust (15%), Academics (15%)
        raw_fit = (req_score * 0.50) + (pref_score * 0.20) + (trust_score * 0.15) + (acad_score * 0.15)

        if not is_eligible:
            # Penalize ineligible candidate so they do not outrank eligible ones
            raw_fit = min(45.0, raw_fit * 0.60)

        fit_score = max(5, min(99, int(round(raw_fit))))

        # 6. Determine Match Tier
        tier: MatchTier = "NOT_RECOMMENDED"
        if is_eligible and fit_score >= 80 and len(missing_required) == 0:
            tier = "STRONG_MATCH"
        elif is_eligible and fit_score >= 60:
            tier = "POTENTIAL_MATCH"
        elif fit_score >= 40:
            tier = "TRAINABLE"
        else:
            tier = "NOT_RECOMMENDED"

        # 7. Formulate Strengths & Plain-Language Explanation
        top_proofs: list[str] = []
        for s in candidate.profile.verified_skills[:3]:
            if s.proofs:
                top_proofs.append(f"{s.name} ({s.proofs[0].metric})")

        strengths_str = (
            f"Verified proficiency in {', '.join(top_proofs)}."
            if top_proofs
            else "Basic profile verified."
        )

        explanation_parts = []
        if is_eligible:
            explanation_parts.append(
                f"Candidate meets academic cutoffs (CGPA {candidate.cgpa:.2f}, {candidate.backlogs_count} backlogs)."
            )
        else:
            explanation_parts.append(
                f"Eligibility warning: {'; '.join(eligibility_reasons)}."
            )

        if len(missing_required) == 0:
            explanation_parts.append(
                f"Covers all {len(job.required_skills)} required skill domains with verified evidence."
            )
        else:
            missing_names = [g.skill_name for g in missing_required]
            explanation_parts.append(
                f"Missing {len(missing_required)} required skill(s): {', '.join(missing_names)}."
            )

        if candidate.profile.unsubstantiated_claims_count > 0:
            explanation_parts.append(
                f"Note: {candidate.profile.unsubstantiated_claims_count} claim(s) on resume lack verifiable proof."
            )

        plain_language = " ".join(explanation_parts)

        # 8. TechSummitTrainers Upskilling Recommendation
        upskill_rec = None
        if missing_required or missing_preferred:
            priority_gap = (missing_required[0] if missing_required else missing_preferred[0]).skill_name
            upskill_rec = (
                f"Sponsored by TechSummitTrainers: Bridge your {priority_gap} skill gap with their "
                f"targeted 2-week intensive prep module to boost your interview readiness."
            )

        return MatchResult(
            student_id=candidate.student_id,
            name=candidate.name,
            fit_score=fit_score,
            match_tier=tier,
            is_eligible=is_eligible,
            eligibility_reason="; ".join(eligibility_reasons) if eligibility_reasons else None,
            matched_required_skills=matched_required,
            missing_required_skills=missing_required,
            matched_preferred_skills=matched_preferred,
            missing_preferred_skills=missing_preferred,
            strengths_summary=strengths_str,
            plain_language_explanation=plain_language,
            upskilling_recommendation=upskill_rec,
        )

    async def batch_rank(self, request: BatchRankRequest) -> BatchRankResponse:
        # 1. Resolve Parsed Job
        parsed_job = request.parsed_job
        if not parsed_job:
            if not request.job_description:
                raise ValueError("Either parsed_job or job_description must be provided.")
            parsed_job = await self.job_service.parse_job_description(
                ParseJDRequest(job_description=request.job_description)
            )

        # 2. Evaluate all candidates
        results: list[MatchResult] = []
        cohort_gaps: dict[str, int] = {}

        for candidate in request.candidates:
            res = self.match_candidate(candidate, parsed_job)
            if request.only_eligible and not res.is_eligible:
                continue
            if res.fit_score < request.min_fit_score:
                continue

            results.append(res)

            # Track cohort skill gaps
            for gap in res.missing_required_skills + res.missing_preferred_skills:
                cohort_gaps[gap.skill_name] = cohort_gaps.get(gap.skill_name, 0) + 1

        # 3. Sort leaderboard by eligibility then fit_score descending
        results.sort(key=lambda r: (1 if r.is_eligible else 0, r.fit_score), reverse=True)

        # Assign ranks
        for idx, item in enumerate(results, start=1):
            item.rank = idx

        eligible_count = sum(1 for r in results if r.is_eligible)
        strong_count = sum(1 for r in results if r.match_tier == "STRONG_MATCH")
        potential_count = sum(1 for r in results if r.match_tier == "POTENTIAL_MATCH")

        # Sort cohort gaps by highest frequency
        sorted_gaps = dict(sorted(cohort_gaps.items(), key=lambda kv: kv[1], reverse=True))

        top_gaps_text = ", ".join([f"{k} ({v} students)" for k, v in list(sorted_gaps.items())[:3]])
        tpo_summary = (
            f"Batch ranking completed for {parsed_job.role_title} at {parsed_job.company_name}. "
            f"Evaluated {len(request.candidates)} candidates: {strong_count} Strong Matches, "
            f"{potential_count} Potential Matches, {eligible_count} Eligible. "
            f"Top cohort gaps: {top_gaps_text or 'None'}."
        )

        return BatchRankResponse(
            job_title=parsed_job.role_title,
            company_name=parsed_job.company_name,
            total_evaluated=len(request.candidates),
            eligible_count=eligible_count,
            strong_match_count=strong_count,
            potential_match_count=potential_count,
            leaderboard=results,
            cohort_gap_analysis=sorted_gaps,
            tpo_summary=tpo_summary,
        )

def get_matching_service(
    job_service: JobService = Depends(get_job_service),
) -> MatchingService:
    return MatchingService(job_service=job_service)

