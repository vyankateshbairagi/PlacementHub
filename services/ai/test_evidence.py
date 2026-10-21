import json
from app.service.evidence_service import EvidenceService
from app.schema.evidence_schema import (
    StudentProfileBuildRequest,
    GitHubRepoInput,
    CodingAssessmentInput,
    ProjectEvaluationInput,
)

service = EvidenceService()

pkg_json = json.dumps({
    "dependencies": {
        "react": "^18.2.0",
        "next": "14.1.0",
        "tailwindcss": "^3.4.1"
    }
})

req = StudentProfileBuildRequest(
    student_id="STU_2026_001",
    declared_skills=["React", "Next.js", "Docker", "Python", "Kubernetes", "Redis", "C++"],
    github_repos=[
        GitHubRepoInput(
            repo_name="student/fullstack-careeros",
            repo_url="https://github.com/student/fullstack-careeros",
            primary_language="TypeScript",
            languages=["TypeScript", "JavaScript"],
            dependency_files={"package.json": pkg_json},
            commit_count=42,
            has_dockerfile=True,
            has_tests=True
        )
    ],
    coding_submissions=[
        CodingAssessmentInput(
            assessment_id="assess_py_01",
            problem_title="LRU Cache Implementation",
            category="Data Structures & Algorithms",
            language="Python",
            passed_cases=12,
            total_cases=12,
            score=95,
            submitted_at="2026-10-10"
        ),
        CodingAssessmentInput(
            assessment_id="assess_cpp_01",
            problem_title="Segment Tree Range Queries",
            category="Data Structures & Algorithms",
            language="C++",
            passed_cases=2,
            total_cases=10,
            score=20,
            submitted_at="2026-10-12"
        )
    ],
    project_evaluations=[
        ProjectEvaluationInput(
            project_id="proj_redis_01",
            title="Distributed Message Queue",
            description="High throughput queue with pub/sub",
            declared_tech_stack=["Redis", "Node.js"],
            live_demo_url="https://demo.queue.dev",
            faculty_score=88,
            evaluation_notes="Solid pub/sub design and persistence strategy"
        )
    ]
)

profile = service.build_evidence_profile(req)
print("=== Student Evidence Profile Output ===")
print("Overall Trust Score:", profile.overall_trust_score, "/ 100")
print("Total Claimed:", profile.total_claimed_skills)
print("Verified Count:", profile.verified_skills_count)
print("Unsubstantiated Count:", profile.unsubstantiated_claims_count)
print("Flagged Count:", profile.flagged_claims_count)

print("\n--- 1. Verified Skills (Evidence-backed) ---")
for v in profile.verified_skills:
    print(f"  [{v.confidence_tier}] {v.name} ({v.category}, Score: {v.evidence_score}) -> {v.audit_note}")

print("\n--- 2. Unsubstantiated Claims (Zero proof) ---")
for u in profile.unsubstantiated_skills:
    print(f"  [{u.confidence_tier}] {u.name} ({u.category}) -> {u.audit_note}")

print("\n--- 3. Flagged False/Contradicted Claims ---")
for f in profile.flagged_skills:
    print(f"  [{f.confidence_tier}] {f.name} ({f.category}) -> {f.audit_note}")

