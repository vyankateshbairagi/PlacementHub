import re
from typing import Any
from app.schema.interview_schema import (
    CategorizedQuestion,
    PostInterviewReportInput,
    AlumniReferralItem,
    CompanyInterviewVaultResponse,
    QuestionCategory,
    InterviewDifficulty,
)

# Seeded Alumni Network Registry
SEEDED_ALUMNI: list[AlumniReferralItem] = [
    AlumniReferralItem(
        alumni_id="alum_01",
        name="Ananya Verma",
        current_company="Amazon Web Services",
        current_role="Software Development Engineer 2",
        graduation_year=2023,
        linkedin_url="https://linkedin.com/in/ananya-verma",
        is_mentor_available=True,
        active_referrals=["SDE-1 (Cloud Services)", "SDE Intern"],
    ),
    AlumniReferralItem(
        alumni_id="alum_02",
        name="Karthik Iyer",
        current_company="Amazon",
        current_role="Solutions Architect",
        graduation_year=2022,
        linkedin_url="https://linkedin.com/in/karthik-iyer",
        is_mentor_available=True,
        active_referrals=["Associate Cloud Architect"],
    ),
    AlumniReferralItem(
        alumni_id="alum_03",
        name="Siddharth Rao",
        current_company="Microsoft",
        current_role="Software Engineer",
        graduation_year=2024,
        linkedin_url="https://linkedin.com/in/siddharth-rao",
        is_mentor_available=True,
        active_referrals=["Software Engineer (Azure Core)"],
    ),
    AlumniReferralItem(
        alumni_id="alum_04",
        name="Ritu Sen",
        current_company="Google",
        current_role="Software Engineer 3",
        graduation_year=2021,
        linkedin_url="https://linkedin.com/in/ritu-sen",
        is_mentor_available=False,
        active_referrals=["University Graduate SWE 2026"],
    ),
    AlumniReferralItem(
        alumni_id="alum_05",
        name="Manish Kulkarni",
        current_company="Tata Consultancy Services",
        current_role="Digital Systems Engineer",
        graduation_year=2023,
        linkedin_url="https://linkedin.com/in/manish-kulkarni",
        is_mentor_available=True,
        active_referrals=["TCS Prime / Digital Developer"],
    ),
]

# Initial Seeded Real Interview Reports from Students & Alumni
SEEDED_REPORTS: list[dict[str, Any]] = [
    {
        "company_name": "Amazon",
        "role_title": "Software Development Engineer 1",
        "round_type": "Technical Round 1",
        "difficulty": "Medium",
        "questions": [
            ("Given a binary tree, serialize and deserialize it into a string format.", "DSA / Coding", "Hard"),
            ("Design an LRU Cache with O(1) get and put operations.", "DSA / Coding", "Medium"),
            ("Explain the difference between optimistic and pessimistic locking in databases.", "Core CS & Systems", "Medium"),
            ("Tell me about a time you had a conflict with a team member and how you resolved it.", "Behavioral / HR", "Medium"),
        ],
        "tips": "Emphasize Amazon Leadership Principles (Customer Obsession & Ownership) in every behavioral answer.",
    },
    {
        "company_name": "Microsoft",
        "role_title": "Software Engineer",
        "round_type": "Technical Round 2",
        "difficulty": "Medium",
        "questions": [
            ("Find the lowest common ancestor in a Binary Search Tree.", "DSA / Coding", "Medium"),
            ("Design a URL shortener like bit.ly. How do you handle 100M daily writes?", "System Design", "Hard"),
            ("How does asynchronous I/O work in the Node.js event loop vs Python asyncio?", "Domain / Frameworks", "Medium"),
            ("Why Microsoft? Tell me about a feature in VS Code you would improve.", "Behavioral / HR", "Easy"),
        ],
        "tips": "Write modular, clean code on the shared whiteboard; test boundary and empty input cases first.",
    },
    {
        "company_name": "Google",
        "role_title": "Software Engineer - Campus",
        "round_type": "Technical Round 1",
        "difficulty": "Hard",
        "questions": [
            ("Word Break problem using Trie and Dynamic Programming.", "DSA / Coding", "Hard"),
            ("Find the median from a continuous data stream.", "DSA / Coding", "Hard"),
            ("Explain memory paging, virtual memory, and cache thrashing.", "Core CS & Systems", "Medium"),
        ],
        "tips": "Communicate your thought process out loud continuously before writing a single line of code.",
    },
]

class InterviewService:
    def __init__(self):
        self.reports = list(SEEDED_REPORTS)
        self.alumni_list = list(SEEDED_ALUMNI)

    def _categorize_question(self, q_text: str) -> tuple[QuestionCategory, InterviewDifficulty]:
        lower = q_text.lower()
        if any(w in lower for w in ["tree", "graph", "dp", "dynamic programming", "array", "linked list", "sort", "search", "lru", "stack", "queue"]):
            diff = "Hard" if any(w in lower for w in ["serialize", "segment", "trie", "hard", "median stream"]) else "Medium"
            return "DSA / Coding", diff
        elif any(w in lower for w in ["system design", "architecture", "microservice", "scale", "cache", "rate limit", "sharding", "url shortener"]):
            return "System Design", "Hard"
        elif any(w in lower for w in ["react", "node", "fastapi", "docker", "postgres", "sql", "graphql", "orm", "spring"]):
            return "Domain / Frameworks", "Medium"
        elif any(w in lower for w in ["tell me about", "conflict", "leadership", "weakness", "why", "situation", "star"]):
            return "Behavioral / HR", "Easy"
        else:
            return "Core CS & Systems", "Medium"

    def submit_report(self, report: PostInterviewReportInput) -> dict[str, Any]:
        extracted_questions: list[tuple[str, QuestionCategory, InterviewDifficulty]] = []

        # 1. Process explicit questions list
        for q in report.questions_asked:
            if q.strip():
                cat, diff = self._categorize_question(q)
                extracted_questions.append((q.strip(), cat, diff))

        # 2. Extract from raw experience text if questions_asked is empty
        if not extracted_questions and report.raw_experience_text:
            lines = report.raw_experience_text.splitlines()
            for line in lines:
                clean = line.strip()
                if clean.endswith("?") or re.match(r"^[0-9]+[\.\)]", clean):
                    cat, diff = self._categorize_question(clean)
                    extracted_questions.append((clean, cat, diff))

        report_entry = {
            "company_name": report.company_name,
            "role_title": report.role_title,
            "round_type": report.round_type,
            "difficulty": report.difficulty,
            "questions": extracted_questions,
            "tips": report.tips or "",
            "outcome": report.outcome,
        }
        self.reports.append(report_entry)

        return {
            "status": "success",
            "message": f"Report for {report.company_name} indexed with {len(extracted_questions)} questions.",
            "questions_indexed": len(extracted_questions),
        }

    def get_company_vault(self, company_name: str) -> CompanyInterviewVaultResponse:
        norm_target = company_name.lower().strip()

        # Filter reports matching company
        matching_reports = [
            r for r in self.reports
            if norm_target in r["company_name"].lower() or r["company_name"].lower() in norm_target
        ]

        # Filter alumni
        matching_alumni = [
            a for a in self.alumni_list
            if norm_target in a.current_company.lower() or a.current_company.lower() in norm_target
        ]

        difficulty_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
        questions_by_cat: dict[str, list[CategorizedQuestion]] = {}
        all_topics: set[str] = set()

        for rep in matching_reports:
            diff = rep.get("difficulty", "Medium")
            difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1

            for q_tuple in rep.get("questions", []):
                q_text, q_cat, q_diff = q_tuple
                questions_by_cat.setdefault(q_cat, [])

                # Check if question already exists to increment frequency
                existing = next(
                    (q for q in questions_by_cat[q_cat] if q.question_text.lower() == q_text.lower()),
                    None,
                )
                if existing:
                    existing.frequency_count += 1
                else:
                    questions_by_cat[q_cat].append(
                        CategorizedQuestion(
                            question_text=q_text,
                            category=q_cat,
                            difficulty=q_diff,
                            frequency_count=1,
                            model_answer_hints=[f"Focus on algorithmic complexity and edge cases for {q_cat}."],
                        )
                    )
                all_topics.add(q_cat)

        total_reports = len(matching_reports)
        advice_summary = (
            f"Verified Interview Intelligence for {company_name}: "
            f"Based on {total_reports} campus interview reports. "
            f"Primary focus areas: {', '.join(sorted(all_topics)) if all_topics else 'DSA and Core CS'}. "
            f"We have {len(matching_alumni)} alumni working here who can provide internal referrals."
        )

        return CompanyInterviewVaultResponse(
            company_name=company_name,
            total_reports=total_reports,
            difficulty_breakdown=difficulty_counts,
            common_topics_tested=sorted(list(all_topics)),
            top_questions_by_category=questions_by_cat,
            prep_kit_advice=advice_summary,
            mapped_alumni=matching_alumni,
        )

interview_service_singleton = InterviewService()

def get_interview_service() -> InterviewService:
    return interview_service_singleton

