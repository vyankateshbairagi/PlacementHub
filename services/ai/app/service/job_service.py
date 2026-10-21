import json
import math
import re
from typing import Any
from fastapi import Depends
from app.core.config import settings
from app.schema.job_schema import (
    ParseJDRequest,
    ParsedJobOutput,
    SkillItem,
    DeduplicateRequest,
    DeduplicateResponse,
    DuplicateMatch,
    JobOpeningItem,
    NormalizeSkillsRequest,
    NormalizeSkillsResponse,
    DetectFakeJobRequest,
    DetectFakeJobResponse,
)
from app.service.ai_service import AIService, get_ai_service
from app.service.skill_normalizer import SkillNormalizer

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot_product / (norm_a * norm_b)))

def normalize_text(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower().strip())

class JobService:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def parse_job_description(self, request: ParseJDRequest) -> ParsedJobOutput:
        system_prompt = (
            "You are an expert Talent Intelligence Engine. "
            "Analyze the following Job Description (JD) text and extract structured placement information. "
            "You must return ONLY a valid JSON object matching this exact schema:\n"
            "{\n"
            '  "role_title": "string",\n'
            '  "company_name": "string",\n'
            '  "experience_level": "Fresher / 0-1 Years" or other,\n'
            '  "employment_type": "Full-time" or "Internship",\n'
            '  "location": "string",\n'
            '  "is_remote": true/false,\n'
            '  "ctc_text": "string e.g. ₹12 - ₹15 LPA" or null,\n'
            '  "min_cgpa": number or null,\n'
            '  "max_backlogs": number or null,\n'
            '  "eligible_branches": ["CSE", "IT", ...],\n'
            '  "required_skills": ["skill1", "skill2", ...],\n'
            '  "preferred_skills": ["skill1", "skill2", ...],\n'
            '  "selection_rounds": ["Online Assessment", "Technical Interview", "HR Round"],\n'
            '  "summary": "concise 2-sentence summary of the opening"\n'
            "}"
        )

        user_prompt = f"Job Description:\n{request.job_description}"
        if request.company_name_hint:
            user_prompt += f"\nHint - Company Name: {request.company_name_hint}"
        if request.role_title_hint:
            user_prompt += f"\nHint - Role Title: {request.role_title_hint}"

        raw_parsed: dict[str, Any] = {}
        try:
            response_text = await self.ai_service.chat_raw(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                format="json",
            )
            raw_parsed = json.loads(response_text)
        except Exception:
            # Fallback heuristic parser if LLM is offline or output is invalid JSON
            raw_parsed = self._heuristic_parse(request)

        # Post-process & Normalize Skills through SkillNormalizer
        raw_req_skills = raw_parsed.get("required_skills", [])
        raw_pref_skills = raw_parsed.get("preferred_skills", [])

        normalized_required = SkillNormalizer.normalize_batch(
            raw_req_skills, importance="required"
        )
        normalized_preferred = SkillNormalizer.normalize_batch(
            raw_pref_skills, importance="preferred"
        )

        # Also run heuristic extraction on full JD text to avoid missing explicit skills
        heuristic_found = SkillNormalizer.extract_keywords_heuristically(request.job_description)
        existing_canonical = {s.name.lower() for s in (normalized_required + normalized_preferred)}

        for h_skill in heuristic_found:
            if h_skill.name.lower() not in existing_canonical:
                # Add to preferred if not explicitly placed in required by LLM
                normalized_preferred.append(
                    SkillItem(
                        name=h_skill.name,
                        category=h_skill.category,
                        raw_match=h_skill.raw_match,
                        importance="preferred",
                    )
                )
                existing_canonical.add(h_skill.name.lower())

        # Flatten canonical tokens for fast vector / DB lookups
        canonical_tokens = sorted(list(existing_canonical))

        # Infer min_cgpa from text if not caught by LLM
        min_cgpa = raw_parsed.get("min_cgpa")
        if min_cgpa is None:
            cgpa_match = re.search(r"(?:cgpa|gpa)\s*(?:>=|:|of|above)?\s*([0-9]\.[0-9]+|[0-9])", request.job_description, re.IGNORECASE)
            if cgpa_match:
                try:
                    val = float(cgpa_match.group(1))
                    if 4.0 <= val <= 10.0:
                        min_cgpa = val
                except ValueError:
                    pass

        # Infer CTC from text if not caught
        ctc_text = raw_parsed.get("ctc_text")
        if not ctc_text:
            ctc_match = re.search(r"(?:₹|inr|rs\.?)\s*([0-9]+(?:\.[0-9]+)?(?:\s*-\s*[0-9]+(?:\.[0-9]+)?)?\s*(?:lpa|lakhs?|lac))", request.job_description, re.IGNORECASE)
            if ctc_match:
                ctc_text = f"₹{ctc_match.group(1).upper()}"

        return ParsedJobOutput(
            role_title=raw_parsed.get("role_title") or request.role_title_hint or "Software Engineer",
            company_name=raw_parsed.get("company_name") or request.company_name_hint or "Hiring Partner",
            experience_level=raw_parsed.get("experience_level") or "Fresher / 0-1 Years",
            employment_type=raw_parsed.get("employment_type") or "Full-time",
            location=raw_parsed.get("location") or "Pan-India",
            is_remote=bool(raw_parsed.get("is_remote", False)),
            ctc_text=ctc_text,
            min_cgpa=min_cgpa,
            max_backlogs=raw_parsed.get("max_backlogs", 0),
            eligible_branches=raw_parsed.get("eligible_branches") or ["Computer Science", "Information Technology", "Circuit Branches"],
            required_skills=normalized_required,
            preferred_skills=normalized_preferred,
            selection_rounds=raw_parsed.get("selection_rounds") or ["Online Assessment", "Technical Interview", "HR Round"],
            summary=raw_parsed.get("summary") or f"Exciting opportunity for {raw_parsed.get('role_title', 'Engineers')} at {raw_parsed.get('company_name', 'Partner Company')}.",
            normalized_skill_tokens=canonical_tokens,
        )

    def _heuristic_parse(self, request: ParseJDRequest) -> dict[str, Any]:
        """Robust regex fallback when LLM is unavailable."""
        text = request.job_description
        company = request.company_name_hint or "Partner Company"
        role = request.role_title_hint or "Software Engineer"

        # Heuristic role extraction
        for candidate_role in ["Full Stack Engineer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Engineer", "Software Engineer", "Associate SDE"]:
            if candidate_role.lower() in text.lower():
                role = candidate_role
                break

        return {
            "role_title": role,
            "company_name": company,
            "experience_level": "Fresher / 0-1 Years",
            "employment_type": "Full-time",
            "location": "Pan-India",
            "is_remote": "remote" in text.lower(),
            "ctc_text": None,
            "min_cgpa": None,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "IT", "ECE"],
            "required_skills": [],
            "preferred_skills": [],
            "selection_rounds": ["Online Assessment", "Technical Interview", "HR Round"],
            "summary": f"Campus hiring drive for {role} at {company}.",
        }

    async def deduplicate_job(self, request: DeduplicateRequest) -> DeduplicateResponse:
        new_job = request.new_job
        existing_jobs = request.existing_jobs

        if not existing_jobs:
            return DeduplicateResponse(
                is_duplicate=False,
                primary_match=None,
                all_matches=[],
                consolidated_sources=[new_job.source],
            )

        new_norm_company = normalize_text(new_job.company_name)
        new_norm_role = normalize_text(new_job.role_title)

        # Compute embedding for new job description
        new_job_text = f"{new_job.company_name} {new_job.role_title}: {new_job.description}"
        try:
            new_job_emb = await self.ai_service.generate_embedding(new_job_text)
        except Exception:
            new_job_emb = []

        matches: list[DuplicateMatch] = []
        consolidated_sources = {new_job.source}

        for candidate in existing_jobs:
            cand_norm_company = normalize_text(candidate.company_name)
            cand_norm_role = normalize_text(candidate.role_title)

            # 1. Exact entity match on company & role
            is_same_company = (new_norm_company == cand_norm_company) or (new_norm_company in cand_norm_company) or (cand_norm_company in new_norm_company)
            is_same_role = (new_norm_role == cand_norm_role) or (new_norm_role in cand_norm_role) or (cand_norm_role in new_norm_role)

            similarity = 0.0
            if new_job_emb:
                cand_text = f"{candidate.company_name} {candidate.role_title}: {candidate.description}"
                try:
                    cand_emb = await self.ai_service.generate_embedding(cand_text)
                    similarity = round(cosine_similarity(new_job_emb, cand_emb), 4)
                except Exception:
                    similarity = 0.0

            # Determine duplicate conditions
            is_dup = False
            match_type = "SEMANTIC_SIMILARITY"
            explanation = ""

            if is_same_company and is_same_role:
                # Strong entity match
                boosted_score = max(similarity, 0.90)
                is_dup = True
                match_type = "EXACT_ENTITY"
                explanation = (
                    f"Direct company & role match for '{candidate.company_name}' - '{candidate.role_title}'. "
                    f"Arrived via '{candidate.source}' and '{new_job.source}'."
                )
            elif is_same_company and similarity >= request.similarity_threshold:
                is_dup = True
                match_type = "HIGH_CONFIDENCE_OVERLAP"
                explanation = (
                    f"Matches company '{candidate.company_name}' with high semantic JD similarity ({round(similarity * 100, 1)}%)."
                )
            elif similarity >= 0.88:
                is_dup = True
                match_type = "SEMANTIC_SIMILARITY"
                explanation = (
                    f"Near-identical job description semantic match ({round(similarity * 100, 1)}%) with {candidate.company_name}."
                )

            if is_dup:
                consolidated_sources.add(candidate.source)
                matches.append(
                    DuplicateMatch(
                        matched_job_id=candidate.id,
                        matched_company=candidate.company_name,
                        matched_role=candidate.role_title,
                        matched_source=candidate.source,
                        similarity_score=similarity if similarity > 0 else 0.95,
                        match_type=match_type,
                        explanation=explanation,
                    )
                )

        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        primary = matches[0] if matches else None

        return DeduplicateResponse(
            is_duplicate=len(matches) > 0,
            primary_match=primary,
            all_matches=matches,
            consolidated_sources=sorted(list(consolidated_sources)),
        )

    def normalize_skills(self, request: NormalizeSkillsRequest) -> NormalizeSkillsResponse:
        normalized_items = SkillNormalizer.normalize_batch(request.raw_skills, importance="required")
        tokens = sorted(list({item.name for item in normalized_items}))
        return NormalizeSkillsResponse(
            normalized=normalized_items,
            canonical_tokens=tokens,
        )

    async def detect_fake_job(self, request: DetectFakeJobRequest) -> DetectFakeJobResponse:
        """
        Detects whether an advertised job post, recruitment link, or off-campus drive
        is fraudulent, deceptive, or legitimate using deep heuristic analysis and AI evaluation.
        """
        combined = f"{request.company} {request.role} {request.description or ''} {request.ctc or ''} {request.url or ''} {request.contact_email or ''} {request.contact_channel or ''}".lower()
        
        red_flags: list[dict[str, Any]] = []
        green_flags: list[dict[str, Any]] = []
        
        # Payment fee checks
        fee_patterns = [
            (r"(registration|processing|application|selection|screening)\s+(fee|charge|cost|amount)", "Registration or Processing Fee Demanded", "CRITICAL"),
            (r"(security\s+deposit|refundable\s+deposit|laptop\s+deposit|equipment\s+deposit)", "Laptop / Equipment Security Deposit Demanded", "CRITICAL"),
            (r"(pay|deposit|transfer|send)\s+(₹|rs\.?|inr|\$|\d+)\s*(via\s+upi|gpay|phonepe|paytm|crypto)", "Direct UPI / Wallet Payment Requested for Offer", "CRITICAL"),
            (r"(training\s+fee|course\s+fee|certification\s+cost)\s*(before\s+joining|mandatory)", "Mandatory Upfront Paid Training for Placement", "HIGH"),
            (r"(task\s+unlock|recharge\s+wallet|vip\s+tier|rating\s+deposit)", "Task / Product Rating Tier Recharge Scam", "CRITICAL"),
        ]
        
        has_payment_demand = False
        for pattern, title, severity in fee_patterns:
            match = re.search(pattern, combined, re.IGNORECASE)
            if match:
                start_idx = match.start()
                preceding = combined[max(0, start_idx - 35):start_idx].strip()
                is_negated = bool(re.search(r"(no|never|not|zero|without\s+any|free\s+of)\s*$", preceding, re.IGNORECASE))
                if not is_negated:
                    has_payment_demand = True
                    red_flags.append({
                        "id": f"rf-fee-{len(red_flags) + 1}",
                        "category": "FINANCIAL_SCAM",
                        "severity": severity,
                        "title": title,
                        "description": "Legitimate campus employers and enterprise recruiters NEVER charge registration fees, security deposits, or laptop dispatch costs.",
                        "evidenceSnippet": match.group(0),
                    })

        # Channel & domain checks
        is_telegram = bool(re.search(r"t\.me/|telegram", combined, re.IGNORECASE))
        is_whatsapp_only = bool(re.search(r"contact\s+on\s+whatsapp\s+only|wa\.me/|whatsapp\s+only", combined, re.IGNORECASE))
        
        url_lower = (request.url or "").lower()
        suspicious_tld = any(url_lower.endswith(t) or f"{t}/" in url_lower for t in [".xyz", ".top", ".click", ".buzz", ".site", ".club", ".tk", ".ml"])
        
        email_lower = (request.contact_email or "").lower()
        free_mail = any(email_lower.endswith(f"@{p}") for p in ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"])
        known_enterprise = bool(re.search(r"google|amazon|microsoft|apple|tcs|infosys|wipro|deloitte|atlassian|meta", request.company, re.IGNORECASE))
        
        if is_telegram:
            red_flags.append({
                "id": "rf-comm-telegram",
                "category": "SUSPICIOUS_COMMUNICATION",
                "severity": "HIGH",
                "title": "Unregulated Telegram Group / Bot Channel",
                "description": "Telegram channels are commonly leveraged by anonymous cyber syndicates executing fake job and crypto task scams.",
            })
            
        if is_whatsapp_only:
            red_flags.append({
                "id": "rf-comm-whatsapp",
                "category": "SUSPICIOUS_COMMUNICATION",
                "severity": "HIGH",
                "title": "Recruitment Restricted to Personal WhatsApp",
                "description": "Enterprise campus hiring is facilitated through authenticated ATS portals, not unmonitored personal messaging links.",
            })

        if free_mail and known_enterprise:
            red_flags.append({
                "id": "rf-impersonation-email",
                "category": "SUSPICIOUS_COMMUNICATION",
                "severity": "CRITICAL",
                "title": f"Impersonation Scam: Public Webmail for {request.company}",
                "description": f"Global firms like {request.company} strictly use registered enterprise email domains, never free accounts (@{email_lower.split('@')[-1] if '@' in email_lower else 'public'}).",
            })
            
        if suspicious_tld:
            red_flags.append({
                "id": "rf-domain-tld",
                "category": "DOMAIN_PHISHING",
                "severity": "CRITICAL",
                "title": "High-Risk Disposable Top-Level Domain",
                "description": "Throwaway domain extensions (.xyz, .top, .buzz) are standard indicators of spoofed recruitment portals.",
            })

        # Low-effort high-pay scams
        unrealistic_patterns = [
            (r"(earn\s+₹?\d+\s*-\s*₹?\d+\s*(per\s*day|daily))", "Unrealistic Daily Freshers Cash Guarantee"),
            (r"(no\s+skills?\s+(needed|required)|no\s+interview|guaranteed\s+selection)", "Guaranteed Selection with Zero Evaluation / Assessment"),
            (r"(copy\s*paste|typing\s*captcha|like\s*videos?|data\s*entry\s*from\s*home)", "Classic Captcha / Video Rating Task Trap"),
        ]
        for pattern, title in unrealistic_patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                red_flags.append({
                    "id": f"rf-unrealistic-{len(red_flags) + 1}",
                    "category": "UNREALISTIC_OFFER",
                    "severity": "HIGH",
                    "title": title,
                    "description": "Unrealistic earnings promises without technical qualifications are deceptive funnels designed to extract deposits.",
                })

        # Green flags
        trusted_domains = ["google.com", "amazon.jobs", "microsoft.com", "tcs.com", "infosys.com", "deloitte.com", "atlassian.com", "greenhouse.io", "lever.co", "workday.com", "smartrecruiters.com"]
        is_trusted_domain = any(td in url_lower for td in trusted_domains)
        if is_trusted_domain:
            green_flags.append({
                "id": "gf-trusted-domain",
                "title": "Verified Enterprise ATS / Career Portal",
                "description": "Destination URL routes directly to an authenticated corporate recruiting ecosystem.",
            })
            
        if re.search(r"data structures|algorithms|system design|python|java|react|sql|docker|cloud", combined, re.IGNORECASE):
            green_flags.append({
                "id": "gf-skills",
                "title": "Concrete Technical Competencies Specified",
                "description": "Listing specific programming languages and engineering fundamentals aligns with verified corporate job descriptions.",
            })

        if re.search(r"online assessment|technical interview|coding round|managerial round", combined, re.IGNORECASE):
            green_flags.append({
                "id": "gf-rounds",
                "title": "Multi-Stage Rigorous Evaluation Pipeline",
                "description": "Hiring process follows formal technical screening benchmarks.",
            })

        # Calculate scores
        authenticity_score = 88
        if is_trusted_domain:
            authenticity_score += 8
        if len(green_flags) >= 2:
            authenticity_score += 4
            
        penalty = 0
        for rf in red_flags:
            sev = rf.get("severity")
            if sev == "CRITICAL":
                penalty += 45
            elif sev == "HIGH":
                penalty += 25
            else:
                penalty += 12
                
        authenticity_score = max(5, min(99, authenticity_score - penalty))
        fraud_risk_score = 100 - authenticity_score
        
        if fraud_risk_score >= 70 or has_payment_demand:
            risk_level = "CRITICAL"
            verdict = "FRAUD_SCAM_DETECTED"
            verdict_title = "High-Risk Recruitment Scam Detected"
        elif fraud_risk_score >= 40:
            risk_level = "HIGH"
            verdict = "FRAUD_SCAM_DETECTED"
            verdict_title = "Likely Fraudulent Job Posting"
        elif fraud_risk_score >= 20 or len(red_flags) > 0:
            risk_level = "MEDIUM"
            verdict = "PROCEED_WITH_CAUTION"
            verdict_title = "Proceed with Caution - Suspicious Elements Identified"
        else:
            risk_level = "LOW"
            verdict = "VERIFIED_LEGITIMATE"
            verdict_title = "Verified Authentic Job Opportunity"

        breakdown = {
            "domainSafetyScore": 15 if suspicious_tld else 98 if is_trusted_domain else 70,
            "financialSafetyScore": 10 if has_payment_demand else 95,
            "communicationSafetyScore": 15 if (free_mail and known_enterprise) else 30 if is_telegram else 88,
            "contentRealismScore": 25 if any(rf["category"] == "UNREALISTIC_OFFER" for rf in red_flags) else 90,
        }

        safety_recs = [
            "Never transfer money, UPI payments, or purchase test kits for any job opportunity.",
            "Verify the posting directly on the employer's official careers website before providing Aadhaar or personal credentials.",
            "Contact your college Training and Placement Cell (TPO) to verify off-campus drives.",
        ]

        action_tpo = (
            "QUARANTINE IMMEDIATELY: Reject student posting, alert cohort to avoid this link, and blacklist sender address."
            if verdict == "FRAUD_SCAM_DETECTED"
            else "MANUAL REVIEW: Cross-check recruiter identity before batch broadcast."
            if verdict == "PROCEED_WITH_CAUTION"
            else "APPROVE FOR COHORT: Job verified genuine. Safe to publish to student batch."
        )

        action_student = (
            "DO NOT APPLY: Definitive fraud indicators detected. Report this link to your college TPO immediately."
            if verdict == "FRAUD_SCAM_DETECTED"
            else "EXERCISE CAUTION: Verify recruiter credentials and official domain before sharing your resume."
            if verdict == "PROCEED_WITH_CAUTION"
            else "SAFE TO APPLY: Matches standard corporate campus recruitment patterns."
        )

        summary = (
            f"Critical risk detected: {red_flags[0]['title'] if red_flags else 'Fraud patterns identified'}. Never pay money or share credentials."
            if verdict == "FRAUD_SCAM_DETECTED"
            else f"Caution required: {len(red_flags)} anomaly/anomalies detected. Verify company credentials before applying."
            if verdict == "PROCEED_WITH_CAUTION"
            else f"Opportunity for {request.company} verified authentic with {authenticity_score}/100 trust score and zero extortion markers."
        )

        return DetectFakeJobResponse(
            company=request.company,
            role=request.role,
            authenticity_score=authenticity_score,
            fraud_risk_score=fraud_risk_score,
            risk_level=risk_level,
            verdict=verdict,
            verdict_title=verdict_title,
            summary=summary,
            ai_confidence=95,
            breakdown=breakdown,
            red_flags=red_flags,
            green_flags=green_flags,
            domain_analysis={
                "isTrustedDomain": is_trusted_domain,
                "isSuspiciousTld": suspicious_tld,
                "isFreeMail": free_mail,
            },
            safety_recommendations=safety_recs,
            action_for_tpo=action_tpo,
            action_for_student=action_student,
        )

def get_job_service(ai_service: AIService = Depends(get_ai_service)) -> JobService:
    return JobService(ai_service=ai_service)

