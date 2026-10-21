import json
import re
from typing import Any
from fastapi import Depends
from app.schema.evidence_schema import (
    ProofItem,
    VerifiedSkill,
    GitHubRepoInput,
    CodingAssessmentInput,
    ProjectEvaluationInput,
    StudentProfileBuildRequest,
    StudentEvidenceProfile,
    VerifySingleSkillRequest,
)
from app.service.skill_normalizer import SkillNormalizer

class EvidenceService:
    @staticmethod
    def _parse_package_json(content: str) -> list[str]:
        packages: list[str] = []
        try:
            data = json.loads(content)
            deps = data.get("dependencies", {})
            dev_deps = data.get("devDependencies", {})
            if isinstance(deps, dict):
                packages.extend(deps.keys())
            if isinstance(dev_deps, dict):
                packages.extend(dev_deps.keys())
        except Exception:
            pass
        return packages

    @staticmethod
    def _parse_requirements_txt(content: str) -> list[str]:
        packages: list[str] = []
        for line in content.splitlines():
            clean = line.strip()
            if not clean or clean.startswith("#"):
                continue
            # Extract package name before any version specifier ==, >=, <=, ~=, <, >
            match = re.split(r"[=><~;]", clean)[0].strip()
            if match:
                packages.append(match)
        return packages

    def analyze_github_repo(self, repo: GitHubRepoInput) -> dict[str, list[ProofItem]]:
        """
        Analyzes a GitHub repository and returns a mapping of canonical_skill -> list[ProofItem]
        """
        skill_proofs: dict[str, list[ProofItem]] = {}

        # 1. Primary language & language list
        all_langs = list(repo.languages)
        if repo.primary_language and repo.primary_language not in all_langs:
            all_langs.append(repo.primary_language)

        is_high_volume = repo.commit_count >= 10 and not repo.is_fork

        for lang in all_langs:
            norm = SkillNormalizer.normalize_single(lang)
            metric_msg = f"{repo.commit_count} commits, primary repo language" if is_high_volume else f"Basic code present ({repo.commit_count} commits)"
            proof = ProofItem(
                proof_id=f"gh_{repo.repo_name}_{norm.name.lower()}",
                source_type="github_repo",
                title=f"Repository: {repo.repo_name}",
                locator=repo.repo_url,
                metric=metric_msg,
                snippet=f"Implemented in {norm.name} within {repo.repo_name}",
            )
            skill_proofs.setdefault(norm.name, []).append(proof)

        # 2. Dependency Inspection (package.json, requirements.txt)
        detected_packages: list[str] = []
        for fname, fcontent in repo.dependency_files.items():
            if "package.json" in fname.lower():
                detected_packages.extend(self._parse_package_json(fcontent))
            elif "requirements" in fname.lower() or fname.endswith(".txt"):
                detected_packages.extend(self._parse_requirements_txt(fcontent))

        for pkg in detected_packages:
            norm_pkg = SkillNormalizer.normalize_single(pkg)
            if norm_pkg.category != "Other":
                proof = ProofItem(
                    proof_id=f"gh_{repo.repo_name}_{norm_pkg.name.lower()}",
                    source_type="github_repo",
                    title=f"Imported Package: {pkg}",
                    locator=f"{repo.repo_url}/dependencies",
                    metric=f"Direct dependency in {repo.repo_name}",
                    snippet=f"Dependency '{pkg}' resolved to '{norm_pkg.name}' ({norm_pkg.category})",
                )
                skill_proofs.setdefault(norm_pkg.name, []).append(proof)

        # 3. Dockerfile detection
        if repo.has_dockerfile:
            docker_norm = SkillNormalizer.normalize_single("Docker")
            proof = ProofItem(
                proof_id=f"gh_{repo.repo_name}_docker",
                source_type="github_repo",
                title="Containerization Config",
                locator=f"{repo.repo_url}/Dockerfile",
                metric="Production Dockerfile present",
                snippet=f"Dockerfile defined in repository {repo.repo_name}",
            )
            skill_proofs.setdefault(docker_norm.name, []).append(proof)

        # 4. Unit testing detection
        if repo.has_tests:
            test_norm = SkillNormalizer.normalize_single("Unit Testing")
            proof = ProofItem(
                proof_id=f"gh_{repo.repo_name}_testing",
                source_type="github_repo",
                title="Test Suite",
                locator=f"{repo.repo_url}/tests",
                metric="Automated test suite configured",
                snippet=f"Unit test suites verified in {repo.repo_name}",
            )
            skill_proofs.setdefault(test_norm.name, []).append(proof)

        return skill_proofs

    def analyze_assessments(
        self, submissions: list[CodingAssessmentInput]
    ) -> dict[str, list[ProofItem]]:
        """
        Maps passing coding assessments into verified proof for languages and algorithms
        """
        skill_proofs: dict[str, list[ProofItem]] = {}

        for sub in submissions:
            pass_ratio = (sub.passed_cases / sub.total_cases) if sub.total_cases > 0 else 0.0
            if pass_ratio < 0.6:
                continue  # Do not credit failed attempts

            # Credit the language
            norm_lang = SkillNormalizer.normalize_single(sub.language)
            lang_proof = ProofItem(
                proof_id=f"assess_{sub.assessment_id}_{norm_lang.name.lower()}",
                source_type="coding_assessment",
                title=f"Assessment: {sub.problem_title}",
                locator=f"assessment:{sub.assessment_id}",
                metric=f"Score: {sub.score}/100, Passed: {sub.passed_cases}/{sub.total_cases} cases ({sub.runtime_ms}ms runtime)",
                snippet=f"Solved problem in {norm_lang.name} under test conditions",
                verified_at=sub.submitted_at,
            )
            skill_proofs.setdefault(norm_lang.name, []).append(lang_proof)

            # Credit DSA / Algorithms category
            norm_category = SkillNormalizer.normalize_single(sub.category)
            cat_proof = ProofItem(
                proof_id=f"assess_{sub.assessment_id}_{norm_category.name.lower()}",
                source_type="coding_assessment",
                title=f"Evaluated Test: {sub.problem_title}",
                locator=f"assessment:{sub.assessment_id}",
                metric=f"Passed {sub.passed_cases}/{sub.total_cases} test cases",
                snippet=f"Demonstrated proficiency in {norm_category.name}",
                verified_at=sub.submitted_at,
            )
            skill_proofs.setdefault(norm_category.name, []).append(cat_proof)

        return skill_proofs

    def analyze_project_evaluations(
        self, projects: list[ProjectEvaluationInput]
    ) -> dict[str, list[ProofItem]]:
        """
        Maps faculty or mentor evaluated capstone projects into verified proof
        """
        skill_proofs: dict[str, list[ProofItem]] = {}

        for proj in projects:
            score = proj.faculty_score if proj.faculty_score is not None else 75
            if score < 50:
                continue

            for raw_tech in proj.declared_tech_stack:
                norm_tech = SkillNormalizer.normalize_single(raw_tech)
                proof = ProofItem(
                    proof_id=f"proj_{proj.project_id}_{norm_tech.name.lower()}",
                    source_type="evaluated_project",
                    title=f"Capstone Project: {proj.title}",
                    locator=proj.live_demo_url or proj.github_url or f"project:{proj.project_id}",
                    metric=f"Faculty / Mentor Score: {score}/100",
                    snippet=proj.evaluation_notes or f"Evaluated core project built with {norm_tech.name}",
                )
                skill_proofs.setdefault(norm_tech.name, []).append(proof)

        return skill_proofs

    def build_evidence_profile(
        self, request: StudentProfileBuildRequest
    ) -> StudentEvidenceProfile:
        # Collect all proof items by canonical skill
        aggregated_proofs: dict[str, list[ProofItem]] = {}

        # 1. Process GitHub
        for repo in request.github_repos:
            gh_proofs = self.analyze_github_repo(repo)
            for skill_name, proofs in gh_proofs.items():
                aggregated_proofs.setdefault(skill_name, []).extend(proofs)

        # 2. Process Assessments
        assess_proofs = self.analyze_assessments(request.coding_submissions)
        for skill_name, proofs in assess_proofs.items():
            aggregated_proofs.setdefault(skill_name, []).extend(proofs)

        # 3. Process Projects
        proj_proofs = self.analyze_project_evaluations(request.project_evaluations)
        for skill_name, proofs in proj_proofs.items():
            aggregated_proofs.setdefault(skill_name, []).extend(proofs)

        # Normalize declared skills
        normalized_declared = SkillNormalizer.normalize_batch(request.declared_skills)
        declared_names = {s.name for s in normalized_declared}

        verified_skills: list[VerifiedSkill] = []
        unsubstantiated_skills: list[VerifiedSkill] = []
        flagged_skills: list[VerifiedSkill] = []

        all_candidate_skills = set(declared_names).union(set(aggregated_proofs.keys()))

        for skill_name in sorted(all_candidate_skills):
            norm_info = SkillNormalizer.normalize_single(skill_name)
            proofs = aggregated_proofs.get(skill_name, [])
            is_declared = skill_name in declared_names

            # Check if flagged: e.g. student claimed it, but failed an explicit assessment in it
            has_failed_test = any(
                sub.score < 40 and SkillNormalizer.normalize_single(sub.language).name == skill_name
                for sub in request.coding_submissions
            )

            if is_declared and has_failed_test:
                flagged_skills.append(
                    VerifiedSkill(
                        name=skill_name,
                        category=norm_info.category,
                        confidence_tier="FLAGGED_FALSE",
                        evidence_score=15,
                        proof_count=0,
                        proofs=[],
                        audit_note=f"Flagged claim: Student claimed '{skill_name}', but scored < 40% on proctored assessment.",
                    )
                )
            elif proofs:
                # Calculate evidence score based on quantity & diversity of proofs
                has_gh_high = any(p.source_type == "github_repo" and "commits" in p.metric for p in proofs)
                has_assess = any(p.source_type == "coding_assessment" for p in proofs)
                has_proj = any(p.source_type == "evaluated_project" for p in proofs)

                tier = "SILVER_VALIDATED"
                score = 70

                if has_gh_high or (has_assess and len(proofs) >= 2):
                    tier = "GOLD_VERIFIED"
                    score = min(98, 85 + (len(proofs) * 4))
                elif has_proj:
                    tier = "SILVER_VALIDATED"
                    score = 75

                note = (
                    f"Strong proof: Backed by {len(proofs)} verified artifact(s) across "
                    f"{', '.join(set(p.source_type for p in proofs))}."
                )
                if not is_declared:
                    note += " (Discovered from genuine GitHub work; unlisted in claimed resume)."

                verified_skills.append(
                    VerifiedSkill(
                        name=skill_name,
                        category=norm_info.category,
                        confidence_tier=tier,  # type: ignore
                        evidence_score=score,
                        proof_count=len(proofs),
                        proofs=proofs,
                        audit_note=note,
                    )
                )
            elif is_declared:
                # Declared but zero evidence in any repo or test
                unsubstantiated_skills.append(
                    VerifiedSkill(
                        name=skill_name,
                        category=norm_info.category,
                        confidence_tier="BRONZE_SELF_REPORTED",
                        evidence_score=35,
                        proof_count=0,
                        proofs=[],
                        audit_note="Unsubstantiated claim: Stated on resume, but no repository code, assessment, or faculty evaluation found.",
                    )
                )

        # Calculate Overall Trust Score
        total_eval = len(verified_skills) + len(unsubstantiated_skills) + len(flagged_skills)
        if total_eval == 0:
            trust_score = 50
        else:
            gold_count = sum(1 for v in verified_skills if v.confidence_tier == "GOLD_VERIFIED")
            silver_count = sum(1 for v in verified_skills if v.confidence_tier == "SILVER_VALIDATED")
            bronze_count = len(unsubstantiated_skills)
            flagged_count = len(flagged_skills)

            raw_trust = (gold_count * 100 + silver_count * 75 + bronze_count * 25 - flagged_count * 40) / total_eval
            trust_score = max(5, min(99, int(round(raw_trust))))

        summary = (
            f"Candidate profile analyzed across {len(request.github_repos)} GitHub repositories, "
            f"{len(request.coding_submissions)} coding assessments, and {len(request.project_evaluations)} project evaluations. "
            f"{len(verified_skills)} skills verified with code proof; {len(unsubstantiated_skills)} self-reported claims lack evidence."
        )

        return StudentEvidenceProfile(
            student_id=request.student_id,
            overall_trust_score=trust_score,
            total_claimed_skills=len(request.declared_skills),
            verified_skills_count=len(verified_skills),
            unsubstantiated_claims_count=len(unsubstantiated_skills),
            flagged_claims_count=len(flagged_skills),
            verified_skills=verified_skills,
            unsubstantiated_skills=unsubstantiated_skills,
            flagged_skills=flagged_skills,
            summary=summary,
        )

    def verify_single_skill(self, request: VerifySingleSkillRequest) -> VerifiedSkill:
        req = StudentProfileBuildRequest(
            student_id="temp_verify",
            declared_skills=[request.skill_name],
            github_repos=request.github_repos,
            coding_submissions=request.coding_submissions,
            project_evaluations=request.project_evaluations,
        )
        profile = self.build_evidence_profile(req)
        for s in profile.verified_skills:
            if s.name.lower() == request.skill_name.lower():
                return s
        for s in profile.flagged_skills:
            if s.name.lower() == request.skill_name.lower():
                return s
        for s in profile.unsubstantiated_skills:
            if s.name.lower() == request.skill_name.lower():
                return s

        norm = SkillNormalizer.normalize_single(request.skill_name)
        return VerifiedSkill(
            name=norm.name,
            category=norm.category,
            confidence_tier="BRONZE_SELF_REPORTED",
            evidence_score=20,
            proof_count=0,
            proofs=[],
            audit_note="No evidence found for this skill.",
        )

def get_evidence_service() -> EvidenceService:
    return EvidenceService()

