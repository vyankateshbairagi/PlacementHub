#!/usr/bin/env python3
"""
CareerOS / Kurukshetra Placement Hub - Comprehensive Full-Stack Verification Suite
Tests all 3 microservices, database connectivity, RBAC authentication,
core API routes, AI validation engine, and frontend route availability.
"""

import sys
import json
import time
import requests
from typing import Dict, Any, List

CAREEROS_URL = "http://localhost:3000"
ASSESSMENT_URL = "http://localhost:5001"
AI_URL = "http://127.0.0.1:8000"

results: List[Dict[str, Any]] = []

def record_test(suite: str, test_name: str, passed: bool, details: Any, latency_ms: float = 0.0):
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] [{suite}] {test_name} ({latency_ms:.1f}ms)", flush=True)
    if not passed:
        print(f"       -> Error/Details: {details}", flush=True)
    results.append({
        "suite": suite,
        "test_name": test_name,
        "passed": passed,
        "latency_ms": round(latency_ms, 2),
        "details": str(details)[:300],
    })

def test_service_health():
    suite = "Service Health & Connectivity"
    
    # 1. Next.js Web Portal
    t0 = time.time()
    try:
        r = requests.get(f"{CAREEROS_URL}/login", timeout=15)
        passed = r.status_code == 200 and ("CareerOS" in r.text or "Sign In" in r.text or "Login" in r.text or "ThinkBuild" in r.text)
        record_test(suite, "CareerOS Next.js Portal (:3000)", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "CareerOS Next.js Portal (:3000)", False, str(e), (time.time() - t0) * 1000)

    # 2. Assessment Microservice
    t0 = time.time()
    try:
        r = requests.get(f"{ASSESSMENT_URL}/health", timeout=10)
        data = r.json() if r.status_code == 200 else {}
        passed = r.status_code == 200 and data.get("status") == "ok" and data.get("database") == "connected"
        record_test(suite, "Assessment Express Service (:5001)", passed, data, (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Assessment Express Service (:5001)", False, str(e), (time.time() - t0) * 1000)

    # 3. PlacementHub AI Microservice
    t0 = time.time()
    try:
        r = requests.get(f"{AI_URL}/", timeout=10)
        passed = r.status_code == 200 and "running" in r.text.lower()
        record_test(suite, "PlacementHub AI FastAPI Service (:8000)", passed, r.text, (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "PlacementHub AI FastAPI Service (:8000)", False, str(e), (time.time() - t0) * 1000)

def test_authentication_and_rbac():
    suite = "Authentication & RBAC"
    roles = [
        ("Student Role", "aditya.shinde@student.gcoen.ac.in", "CareerOS@2026", "STUDENT"),
        ("TPO Role", "tpo@gcoen.ac.in", "CareerOS@2026", "TPO"),
        ("Recruiter Role", "recruiter.google@alphabet.com", "CareerOS@2026", "RECRUITER"),
        ("Faculty Role", "faculty.cs@gcoen.ac.in", "CareerOS@2026", "FACULTY"),
    ]

    tokens: Dict[str, str] = {}
    cookies_map: Dict[str, Any] = {}

    for name, email, password, expected_role in roles:
        t0 = time.time()
        try:
            r = requests.post(
                f"{CAREEROS_URL}/api/auth/login",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            token = data.get("token") or data.get("accessToken") or data.get("jwt")
            user = data.get("user") or {}
            role = user.get("role") or data.get("role")
            
            passed = r.status_code == 200 and (role == expected_role or role == expected_role.upper())
            if passed:
                tokens[expected_role] = token
                cookies_map[expected_role] = r.cookies
            record_test(suite, f"Login: {name} ({email})", passed, f"HTTP {r.status_code}, Role: {role}", (time.time() - t0) * 1000)
        except Exception as e:
            record_test(suite, f"Login: {name} ({email})", False, str(e), (time.time() - t0) * 1000)

    # Negative Test 1: Invalid Password
    t0 = time.time()
    try:
        r = requests.post(
            f"{CAREEROS_URL}/api/auth/login",
            json={"email": "aditya.shinde@student.gcoen.ac.in", "password": "WrongPassword!2026"},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        passed = r.status_code in [400, 401]
        record_test(suite, "Security: Invalid Password Rejected", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Security: Invalid Password Rejected", False, str(e), (time.time() - t0) * 1000)

    # Negative Test 2: Blank Payload
    t0 = time.time()
    try:
        r = requests.post(
            f"{CAREEROS_URL}/api/auth/login",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        passed = r.status_code in [400, 422]
        record_test(suite, "Validation: Empty Payload Rejected", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Validation: Empty Payload Rejected", False, str(e), (time.time() - t0) * 1000)

    return tokens, cookies_map

def test_assessment_microservice():
    suite = "Assessment & Learning Engine (:5001)"
    
    # 1. Health with Database Query
    t0 = time.time()
    try:
        r = requests.get(f"{ASSESSMENT_URL}/health", timeout=10)
        data = r.json()
        passed = r.status_code == 200 and data.get("database") == "connected"
        record_test(suite, "Prisma DB Connection (SELECT 1)", passed, data, (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Prisma DB Connection (SELECT 1)", False, str(e), (time.time() - t0) * 1000)

    # 2. List Assessments
    t0 = time.time()
    try:
        r = requests.get(f"{ASSESSMENT_URL}/api/assessments", timeout=10)
        data = r.json()
        passed = r.status_code == 200 and (isinstance(data, list) or data.get("success") is True or "assessments" in data or isinstance(data.get("data"), list))
        record_test(suite, "GET /api/assessments (Catalog)", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "GET /api/assessments (Catalog)", False, str(e), (time.time() - t0) * 1000)

    # 3. List Coding Problems
    t0 = time.time()
    try:
        r = requests.get(f"{ASSESSMENT_URL}/api/assessments/coding/problems", timeout=10)
        data = r.json()
        passed = r.status_code == 200 and (isinstance(data, list) or data.get("success") is True or "problems" in data or isinstance(data.get("data"), list))
        record_test(suite, "GET /api/assessments/coding/problems", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "GET /api/assessments/coding/problems", False, str(e), (time.time() - t0) * 1000)

    # 4. List Roadmaps
    t0 = time.time()
    try:
        r = requests.get(f"{ASSESSMENT_URL}/api/learning/roadmaps", timeout=10)
        data = r.json()
        passed = r.status_code == 200 and (isinstance(data, list) or data.get("success") is True or "roadmaps" in data or isinstance(data.get("data"), list))
        record_test(suite, "GET /api/learning/roadmaps", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "GET /api/learning/roadmaps", False, str(e), (time.time() - t0) * 1000)

def test_ai_microservice():
    suite = "PlacementHub AI Engine (:8000)"

    # 1. OpenAPI Docs
    t0 = time.time()
    try:
        r = requests.get(f"{AI_URL}/docs", timeout=10)
        passed = r.status_code == 200 and "swagger" in r.text.lower()
        record_test(suite, "FastAPI Swagger Docs (/docs)", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "FastAPI Swagger Docs (/docs)", False, str(e), (time.time() - t0) * 1000)

    # 2. Skill Normalization
    t0 = time.time()
    try:
        payload = {"raw_skills": ["ReactJS", "Node.js", "K8s", "Postgres", "py3"]}
        r = requests.post(f"{AI_URL}/api/v1/jobs/normalize-skills", json=payload, timeout=10)
        data = r.json()
        tokens = data.get("canonical_tokens", [])
        passed = r.status_code == 200 and len(tokens) > 0 and "React" in tokens
        record_test(suite, "POST /api/v1/jobs/normalize-skills", passed, f"Canonical: {tokens}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "POST /api/v1/jobs/normalize-skills", False, str(e), (time.time() - t0) * 1000)

    # 3. Fake Job Detector - Fraud Case
    t0 = time.time()
    try:
        payload = {
            "company": "Global Tech Solns",
            "role": "Data Entry / Fresher Software Trainee",
            "description": "Earn 50,000 INR per week. Registration fee 2,500 INR mandatory. Contact on Telegram @hr_hiring_manager",
            "contact_channel": "Telegram",
            "contact_email": "globaltech@gmail.com",
            "ctc": "50,000 / week"
        }
        r = requests.post(f"{AI_URL}/api/v1/jobs/detect-fake", json=payload, timeout=10)
        data = r.json()
        verdict = data.get("verdict")
        risk = data.get("risk_level")
        passed = r.status_code == 200 and verdict in ["FRAUD_SCAM_DETECTED", "PROCEED_WITH_CAUTION"] and risk in ["HIGH", "CRITICAL"]
        record_test(suite, "Fake Job Detector (Fraud Scam Case)", passed, f"Verdict: {verdict}, Risk: {risk}, Flags: {len(data.get('red_flags', []))}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Fake Job Detector (Fraud Scam Case)", False, str(e), (time.time() - t0) * 1000)

    # 4. Fake Job Detector - Legitimate Case
    t0 = time.time()
    try:
        payload = {
            "company": "Google India Pvt Ltd",
            "role": "Associate Software Engineer - Campus 2026",
            "description": "Looking for B.Tech CSE/IT graduates. Strong algorithms, distributed systems, Python/Go. Zero registration fees.",
            "contact_channel": "Corporate Career Portal",
            "contact_email": "university-hiring@google.com",
            "url": "https://careers.google.com/jobs/results/",
            "ctc": "₹28,00,000 LPA"
        }
        r = requests.post(f"{AI_URL}/api/v1/jobs/detect-fake", json=payload, timeout=10)
        data = r.json()
        verdict = data.get("verdict")
        score = data.get("authenticity_score")
        passed = r.status_code == 200 and verdict == "VERIFIED_LEGITIMATE" and score >= 80
        record_test(suite, "Fake Job Detector (Legitimate Case)", passed, f"Verdict: {verdict}, Authenticity: {score}/100", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "Fake Job Detector (Legitimate Case)", False, str(e), (time.time() - t0) * 1000)

    # 5. GitHub Repository Evidence Analysis
    t0 = time.time()
    try:
        payload = {
            "repo_name": "vyankatesh/careeros-core",
            "repo_url": "https://github.com/vyankatesh/careeros-core",
            "primary_language": "TypeScript",
            "languages": ["TypeScript", "Python"],
            "commit_count": 142,
            "has_dockerfile": True,
            "has_tests": True,
            "dependency_files": {
                "package.json": json.dumps({"dependencies": {"react": "^18.0.0", "next": "^14.0.0"}})
            }
        }
        r = requests.post(f"{AI_URL}/api/v1/evidence/analyze-github", json=payload, timeout=10)
        data = r.json()
        proof_count = data.get("proof_count", 0)
        skills = data.get("verified_skills", [])
        passed = r.status_code == 200 and proof_count > 0 and len(skills) > 0
        record_test(suite, "POST /api/v1/evidence/analyze-github (AST Proofs)", passed, f"Proof Count: {proof_count}, Skills: {skills[:4]}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "POST /api/v1/evidence/analyze-github (AST Proofs)", False, str(e), (time.time() - t0) * 1000)

    # 6. Resume Claim Audit (Bullshit Detector)
    t0 = time.time()
    try:
        payload = {
            "resume_text": "Experienced Full Stack Engineer with 5 years building massive distributed systems with Kafka and Kubernetes. Led 100 microservices.",
            "student_id": "student-101",
            "verified_skills": [
                {
                    "canonical_skill": "React",
                    "confidence_tier": "GOLD_VERIFIED",
                    "locator": "https://github.com/aditya/careeros",
                    "metric": "AST Component tree verified"
                }
            ]
        }
        r = requests.post(f"{AI_URL}/api/v1/resume/audit", json=payload, timeout=10)
        data = r.json()
        score = data.get("integrity_score")
        unsub = data.get("unsubstantiated_count")
        passed = r.status_code == 200 and isinstance(score, int)
        record_test(suite, "POST /api/v1/resume/audit (Integrity Audit)", passed, f"Score: {score}/100, Unsubstantiated: {unsub}", (time.time() - t0) * 1000)
    except Exception as e:
        record_test(suite, "POST /api/v1/resume/audit (Integrity Audit)", False, str(e), (time.time() - t0) * 1000)

def test_nextjs_core_endpoints(tokens: Dict[str, str], cookies_map: Dict[str, Any]):
    suite = "Next.js Core APIs & RBAC Guard"
    
    student_headers = {"Authorization": f"Bearer {tokens.get('STUDENT')}"} if tokens.get("STUDENT") else {}
    tpo_headers = {"Authorization": f"Bearer {tokens.get('TPO')}"} if tokens.get("TPO") else {}
    student_cookies = cookies_map.get("STUDENT", {})
    tpo_cookies = cookies_map.get("TPO", {})

    endpoints = [
        ("GET /api/drives", f"{CAREEROS_URL}/api/drives", tpo_headers, tpo_cookies),
        ("GET /api/students", f"{CAREEROS_URL}/api/students", tpo_headers, tpo_cookies),
        ("GET /api/reports/nirf", f"{CAREEROS_URL}/api/reports/nirf", tpo_headers, tpo_cookies),
        ("GET /api/reports/placement", f"{CAREEROS_URL}/api/reports/placement", tpo_headers, tpo_cookies),
        ("GET /api/assessments", f"{CAREEROS_URL}/api/assessments", student_headers, student_cookies),
        ("GET /api/learning/roadmaps", f"{CAREEROS_URL}/api/learning/roadmaps", student_headers, student_cookies),
        ("GET /api/profile/student", f"{CAREEROS_URL}/api/profile/student", student_headers, student_cookies),
        ("GET /api/notifications", f"{CAREEROS_URL}/api/notifications", student_headers, student_cookies),
        ("GET /api/offers", f"{CAREEROS_URL}/api/offers", student_headers, student_cookies),
        ("GET /api/referrals", f"{CAREEROS_URL}/api/referrals", student_headers, student_cookies),
        ("POST /api/jobs/detect-fake", f"{CAREEROS_URL}/api/jobs/detect-fake", student_headers, student_cookies, {"company": "Test Company", "role": "SE", "description": "Good job"}),
    ]

    for item in endpoints:
        label = item[0]
        url = item[1]
        headers = item[2]
        cookies = item[3]
        payload = item[4] if len(item) > 4 else None

        t0 = time.time()
        try:
            if payload:
                r = requests.post(url, json=payload, headers=headers, cookies=cookies, timeout=15)
            else:
                r = requests.get(url, headers=headers, cookies=cookies, timeout=20)
            passed = r.status_code in [200, 201]
            record_test(suite, label, passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
        except Exception as e:
            record_test(suite, label, False, str(e), (time.time() - t0) * 1000)

def test_frontend_routes():
    suite = "Frontend Portal SSR & Viewports"
    routes = [
        ("/", "Landing Page"),
        ("/login", "Multi-Role Authentication Portal"),
        ("/student", "Student CareerOS Operating System"),
        ("/tpo", "TPO Placement Office Dashboard"),
        ("/recruiter", "Recruiter Hiring & Pipeline Portal"),
        ("/faculty", "Faculty Mentorship & Endorsement Portal"),
    ]

    for path, desc in routes:
        t0 = time.time()
        try:
            r = requests.get(f"{CAREEROS_URL}{path}", timeout=15)
            passed = r.status_code == 200
            record_test(suite, f"Page: {desc} ({path})", passed, f"HTTP {r.status_code}", (time.time() - t0) * 1000)
        except Exception as e:
            record_test(suite, f"Page: {desc} ({path})", False, str(e), (time.time() - t0) * 1000)

def main():
    print("=======================================================================", flush=True)
    print("  PlacementHub / Kurukshetra Placement Hub Test Suite                  ", flush=True)
    print("=======================================================================\n", flush=True)

    test_service_health()
    tokens, cookies_map = test_authentication_and_rbac()
    test_assessment_microservice()
    test_ai_microservice()
    test_nextjs_core_endpoints(tokens, cookies_map)
    test_frontend_routes()

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    pass_rate = (passed / total) * 100 if total > 0 else 0

    print("\n=======================================================================", flush=True)
    print(f"  Summary: {passed}/{total} Passed ({pass_rate:.1f}%) | {failed} Failed", flush=True)
    print("=======================================================================", flush=True)

    # Write JSON summary for reporting
    with open("test_results.json", "w") as f:
        json.dump({
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round(pass_rate, 2),
            "results": results
        }, f, indent=2)

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
