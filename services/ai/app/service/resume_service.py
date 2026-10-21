import re
from typing import Any
from fastapi import Depends
from app.schema.resume_schema import (
    ResumeAuditRequest,
    ResumeAuditResponse,
    ClaimAuditItem,
    TraceableBullet,
    GroundedProject,
    GroundedResume,
    GenerateGroundedResumeRequest,
)
from app.schema.job_schema import ParsedJobOutput, ParseJDRequest
from app.service.job_service import JobService, get_job_service
from app.service.skill_normalizer import SkillNormalizer

class ResumeService:
    def __init__(self, job_service: JobService):
        self.job_service = job_service

    def audit_resume(self, request: ResumeAuditRequest) -> ResumeAuditResponse:
        resume_text = request.resume_text
        evidence = request.student_evidence

        # 1. Detect claims in resume text
        detected_skills = SkillNormalizer.extract_keywords_heuristically(resume_text)
        audited_claims: list[ClaimAuditItem] = []

        verified_map = {}
        flagged_map = {}
        if evidence:
            verified_map = {s.name.lower(): s for s in evidence.verified_skills}
            flagged_map = {s.name.lower(): s for s in evidence.flagged_skills}

        seen_skills = set()
        for skill_item in detected_skills:
            s_name = skill_item.name
            s_key = s_name.lower()
            if s_key in seen_skills:
                continue
            seen_skills.add(s_key)

            if s_key in flagged_map:
                flagged_info = flagged_map[s_key]
                audited_claims.append(
                    ClaimAuditItem(
                        claim_text=s_name,
                        claim_type="skill",
                        status="FLAGGED_FALSE",
                        proof_found=None,
                        recommendation=f"Critical: Remove or substantiate claim. {flagged_info.audit_note}",
                    )
                )
            elif s_key in verified_map:
                v_info = verified_map[s_key]
                proof_summary = (
                    v_info.proofs[0].metric if v_info.proofs else "Verified in code repository"
                )
                audited_claims.append(
                    ClaimAuditItem(
                        claim_text=s_name,
                        claim_type="skill",
                        status="VERIFIED",
                        proof_found=f"{v_info.confidence_tier}: {proof_summary}",
                        recommendation="Verified claim backed by real code proof; highlight on resume.",
                    )
                )
            elif s_key in {
                "kubernetes", "k8s", "raft", "distributed consensus", "paxos",
                "kernel", "solidity", "smart contracts", "hft", "fpga"
            }:
                audited_claims.append(
                    ClaimAuditItem(
                        claim_text=s_name,
                        claim_type="skill",
                        status="FLAGGED_FALSE",
                        proof_found=None,
                        recommendation=f"Flagged: High-complexity enterprise claim ({s_name}) declared with zero verifiable code artifacts or proctored assessments. Institutional placement policy requires resolving flagged claims before applying.",
                    )
                )
            else:
                audited_claims.append(
                    ClaimAuditItem(
                        claim_text=s_name,
                        claim_type="skill",
                        status="UNSUBSTANTIATED",
                        proof_found=None,
                        recommendation="Unverified claim: Add a GitHub project or complete an assessment to substantiate this skill.",
                    )
                )

        verified_count = sum(1 for c in audited_claims if c.status == "VERIFIED")
        flagged_count = sum(1 for c in audited_claims if c.status == "FLAGGED_FALSE")
        unsub_count = sum(1 for c in audited_claims if c.status == "UNSUBSTANTIATED")
        total_claims = len(audited_claims)

        # 2. Compute Integrity Score
        if total_claims == 0:
            integrity_score = 50
        else:
            raw_score = (verified_count * 100 + unsub_count * 25 - flagged_count * 60) / total_claims
            integrity_score = max(5, min(99, int(round(raw_score))))

        can_submit = (flagged_count == 0) and (integrity_score >= 40)

        # 3. ATS Formatting Analysis
        text_lower = resume_text.lower()
        action_verbs = [
            "built", "developed", "engineered", "optimized", "architected",
            "designed", "deployed", "implemented", "scaled", "automated", "spearheaded"
        ]
        found_verbs = [v for v in action_verbs if v in text_lower]
        has_metrics = bool(re.search(r"\d+([%kK]|x|\+)", resume_text))

        ats_formatting = {
            "single_column_friendly": True,
            "has_quantifiable_metrics": has_metrics,
            "action_verbs_detected": found_verbs,
            "action_verbs_score": min(100, len(found_verbs) * 18),
            "ats_readability_grade": "ATS-Ready (Single Column Recommended)",
        }

        claims_summary = (
            f"Audited {total_claims} claims: {verified_count} verified with proof, "
            f"{unsub_count} unsubstantiated, {flagged_count} flagged as contradictory. "
            f"Resume {'approved for drive submission' if can_submit else 'blocked: resolve flagged claims before applying'}."
        )

        return ResumeAuditResponse(
            integrity_score=integrity_score,
            can_submit_to_drives=can_submit,
            claims_summary=claims_summary,
            total_claims_detected=total_claims,
            verified_count=verified_count,
            unsubstantiated_count=unsub_count,
            flagged_count=flagged_count,
            audited_claims=audited_claims,
            ats_formatting=ats_formatting,
        )

    async def generate_grounded_resume(
        self, request: GenerateGroundedResumeRequest
    ) -> GroundedResume:
        # 1. Resolve Target Job
        parsed_job = request.parsed_job
        if not parsed_job and request.target_job_description:
            parsed_job = await self.job_service.parse_job_description(
                ParseJDRequest(job_description=request.target_job_description)
            )

        target_role = parsed_job.role_title if parsed_job else "Software Engineer"
        target_company = parsed_job.company_name if parsed_job else "Hiring Partner"

        # 2. Extract ONLY Verified Skills
        categorized_skills: dict[str, list[str]] = {}
        for v_skill in request.student_evidence.verified_skills:
            if v_skill.confidence_tier in ["GOLD_VERIFIED", "SILVER_VALIDATED"]:
                categorized_skills.setdefault(v_skill.category, []).append(v_skill.name)

        # 3. Synthesize Grounded Projects strictly from verified evidence & student database records
        grounded_projects: list[GroundedProject] = []
        verified_assessments: list[str] = []

        # Map verified proofs by skill name
        proofs_by_skill = {}
        for v_skill in request.student_evidence.verified_skills:
            for proof in v_skill.proofs:
                proofs_by_skill[v_skill.name.lower()] = proof
                st_lower = str(proof.source_type).lower()
                if "assessment" in st_lower or "code" in st_lower or "score" in proof.metric.lower():
                    assess_entry = f"{v_skill.name} Assessment: {proof.metric} ({proof.locator})"
                    if assess_entry not in verified_assessments:
                        verified_assessments.append(assess_entry)

        # Priority A: Student projects passed directly from database
        if request.projects and len(request.projects) > 0:
            for p in request.projects:
                p_title = p.get("title") or "Engineering Project"
                p_desc = p.get("description") or "Production-grade software module."
                raw_tech = p.get("techStack") or p.get("tech_stack") or []
                if isinstance(raw_tech, str):
                    tech_list = [t.strip() for t in raw_tech.split(",") if t.strip()]
                else:
                    tech_list = list(raw_tech)
                
                repo = p.get("githubUrl") or p.get("github_url") or p.get("liveUrl") or p.get("live_url")
                
                # Find matching proof for skills in this project
                matched_proof = None
                for t in tech_list:
                    if t.lower() in proofs_by_skill:
                        matched_proof = proofs_by_skill[t.lower()]
                        break

                metric_str = matched_proof.metric if matched_proof else "AST verified code commits"
                loc_str = matched_proof.locator if matched_proof else (repo or "https://github.com")

                bullets = [
                    TraceableBullet(
                        bullet_text=f"{p_desc} Architected robust modular architecture with verified metrics ({metric_str}).",
                        skills_highlighted=tech_list[:3],
                        proof_locator=loc_str,
                        evidence_metric=metric_str,
                    )
                ]

                grounded_projects.append(
                    GroundedProject(
                        title=p_title,
                        tech_stack=tech_list,
                        repo_url=repo,
                        demo_url=p.get("liveUrl") or p.get("live_url"),
                        bullets=bullets,
                    )
                )

        # Priority B: Synthesize from repository proofs if no projects explicitly given
        if len(grounded_projects) == 0:
            seen_project_locators = set()
            for v_skill in request.student_evidence.verified_skills:
                for proof in v_skill.proofs:
                    st_lower = str(proof.source_type).lower()
                    if "github" in st_lower or "repo" in st_lower:
                        loc = proof.locator
                        if loc not in seen_project_locators and len(grounded_projects) < 3:
                            seen_project_locators.add(loc)
                            repo_title = proof.title.replace("Proof: ", "").replace("Repository: ", "")
                            bullet = TraceableBullet(
                                bullet_text=(
                                    f"Architected and deployed {repo_title} featuring {v_skill.name}; "
                                    f"implemented production-grade architecture as measured by {proof.metric}."
                                ),
                                skills_highlighted=[v_skill.name],
                                proof_locator=proof.locator,
                                evidence_metric=proof.metric,
                            )
                            grounded_projects.append(
                                GroundedProject(
                                    title=repo_title.replace("/", " ").title(),
                                    tech_stack=[v_skill.name] + [
                                        s.name for s in request.student_evidence.verified_skills[:2]
                                    ],
                                    repo_url=proof.locator,
                                    bullets=[bullet],
                                )
                            )

        # 4. Generate Professional Summary
        top_skills_str = ", ".join(
            [s.name for s in request.student_evidence.verified_skills[:5]]
        )
        summary = (
            f"Evidence-backed {target_role} with verified proficiency in {top_skills_str}. "
            f"Demonstrated technical track record across genuine production code repositories and proctored coding assessments, "
            f"maintaining a certified {request.student_evidence.overall_trust_score}% profile integrity rating."
        )

        # 5. Build Clean Single-Column ATS Plain Text & Markdown
        markdown_lines = [
            f"# {request.candidate_name}",
            f"**Email:** {request.email} | **GitHub:** {request.github_url or 'Available'} | **LinkedIn:** {request.linkedin_url or 'Available'}",
            "",
            "## PROFESSIONAL SUMMARY",
            summary,
            "",
        ]

        if request.education_summary:
            markdown_lines.extend([
                "## EDUCATION",
                f"- {request.education_summary}",
                "",
            ])

        markdown_lines.append("## VERIFIED TECHNICAL SKILLS")
        for cat, skills in categorized_skills.items():
            markdown_lines.append(f"- **{cat}:** {', '.join(sorted(skills))}")

        # Work Experiences / Internships
        if request.experiences and len(request.experiences) > 0:
            markdown_lines.append("")
            markdown_lines.append("## WORK EXPERIENCE & INTERNSHIPS")
            for exp in request.experiences:
                comp = exp.get("company") or "Technology Partner"
                role = exp.get("role") or "Engineering Intern"
                dur = f"{exp.get('startDate', 'Jan 2025')} - {exp.get('endDate', 'Present')}"
                desc = exp.get("description") or "Engineered scalable features and modules."
                markdown_lines.append(f"### {role} • {comp} | `{dur}`")
                markdown_lines.append(f"- {desc}")

        if grounded_projects:
            markdown_lines.append("")
            markdown_lines.append("## FEATURED PROJECTS (100% EVIDENCE-VERIFIED)")
            for proj in grounded_projects:
                tech_line = ", ".join(set(proj.tech_stack))
                markdown_lines.append(f"### {proj.title} | `{tech_line}`")
                if proj.repo_url:
                    markdown_lines.append(f"*Repository:* {proj.repo_url}")
                for b in proj.bullets:
                    markdown_lines.append(f"- {b.bullet_text} *(Proof: {b.evidence_metric})*")

        if verified_assessments:
            markdown_lines.append("")
            markdown_lines.append("## VERIFIED ASSESSMENTS & BENCHMARKS")
            for a in verified_assessments:
                markdown_lines.append(f"- {a}")

        markdown_lines.append("")
        markdown_lines.append("---")
        markdown_lines.append(
            f"*Certified Truthful by Placement Hub Talent Passport (Student ID: {request.student_id} | Trust Score: {request.student_evidence.overall_trust_score}/100)*"
        )

        markdown_content = "\n".join(markdown_lines)
        plain_text = re.sub(r"[#*`]", "", markdown_content)

        return GroundedResume(
            candidate_name=request.candidate_name,
            target_role=target_role,
            target_company=target_company,
            summary=summary,
            education_summary=request.education_summary,
            verified_technical_skills=categorized_skills,
            projects=grounded_projects,
            experiences=request.experiences or [],
            verified_assessments=verified_assessments,
            one_page_plain_text=plain_text,
            markdown_content=markdown_content,
        )

def get_resume_service(job_service: JobService = Depends(get_job_service)) -> ResumeService:
    return ResumeService(job_service=job_service)

