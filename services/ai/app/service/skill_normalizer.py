import re
from app.schema.job_schema import SkillItem, SkillImportance

# Canonical Skill Taxonomy: {normalized_key: (CanonicalName, Category)}
SKILL_TAXONOMY: dict[str, tuple[str, str]] = {
    # Frontend
    "react": ("React", "Frontend"),
    "reactjs": ("React", "Frontend"),
    "react.js": ("React", "Frontend"),
    "react js": ("React", "Frontend"),
    "react 18": ("React", "Frontend"),
    "next": ("Next.js", "Frontend"),
    "nextjs": ("Next.js", "Frontend"),
    "next.js": ("Next.js", "Frontend"),
    "next js": ("Next.js", "Frontend"),
    "vue": ("Vue.js", "Frontend"),
    "vuejs": ("Vue.js", "Frontend"),
    "vue.js": ("Vue.js", "Frontend"),
    "angular": ("Angular", "Frontend"),
    "angularjs": ("Angular", "Frontend"),
    "angular.js": ("Angular", "Frontend"),
    "svelte": ("Svelte", "Frontend"),
    "sveltekit": ("Svelte", "Frontend"),
    "tailwind": ("Tailwind CSS", "Frontend"),
    "tailwindcss": ("Tailwind CSS", "Frontend"),
    "tailwind css": ("Tailwind CSS", "Frontend"),
    "html": ("HTML5", "Frontend"),
    "html5": ("HTML5", "Frontend"),
    "css": ("CSS3", "Frontend"),
    "css3": ("CSS3", "Frontend"),
    "redux": ("Redux", "Frontend"),
    "redux toolkit": ("Redux", "Frontend"),
    "rtk": ("Redux", "Frontend"),
    "zustand": ("Zustand", "Frontend"),
    "bootstrap": ("Bootstrap", "Frontend"),

    # Backend
    "node": ("Node.js", "Backend"),
    "nodejs": ("Node.js", "Backend"),
    "node.js": ("Node.js", "Backend"),
    "node js": ("Node.js", "Backend"),
    "express": ("Express.js", "Backend"),
    "expressjs": ("Express.js", "Backend"),
    "express.js": ("Express.js", "Backend"),
    "fastapi": ("FastAPI", "Backend"),
    "fast api": ("FastAPI", "Backend"),
    "django": ("Django", "Backend"),
    "django rest framework": ("Django", "Backend"),
    "drf": ("Django", "Backend"),
    "flask": ("Flask", "Backend"),
    "spring": ("Spring Boot", "Backend"),
    "spring boot": ("Spring Boot", "Backend"),
    "springboot": ("Spring Boot", "Backend"),
    "asp.net": (".NET Core", "Backend"),
    "asp.net core": (".NET Core", "Backend"),
    ".net core": (".NET Core", "Backend"),
    "dotnet": (".NET Core", "Backend"),
    "graphql": ("GraphQL", "Backend"),
    "rest": ("REST APIs", "Backend"),
    "rest api": ("REST APIs", "Backend"),
    "restful": ("REST APIs", "Backend"),
    "restful api": ("REST APIs", "Backend"),
    "rest apis": ("REST APIs", "Backend"),
    "restful apis": ("REST APIs", "Backend"),
    "grpc": ("gRPC", "Backend"),

    # Databases & Caching
    "postgresql": ("PostgreSQL", "Database"),
    "postgres": ("PostgreSQL", "Database"),
    "psql": ("PostgreSQL", "Database"),
    "mysql": ("MySQL", "Database"),
    "mongodb": ("MongoDB", "Database"),
    "mongo": ("MongoDB", "Database"),
    "redis": ("Redis", "Database"),
    "cassandra": ("Apache Cassandra", "Database"),
    "sqlite": ("SQLite", "Database"),
    "sqlite3": ("SQLite", "Database"),
    "elasticsearch": ("Elasticsearch", "Database"),
    "elastic search": ("Elasticsearch", "Database"),
    "neo4j": ("Neo4j", "Database"),
    "prisma": ("Prisma ORM", "Database"),
    "prisma orm": ("Prisma ORM", "Database"),
    "hibernate": ("Hibernate", "Database"),
    "sqlalchemy": ("SQLAlchemy", "Database"),

    # DevOps & Cloud
    "docker": ("Docker", "DevOps & Cloud"),
    "dockerfile": ("Docker", "DevOps & Cloud"),
    "containerization": ("Docker", "DevOps & Cloud"),
    "containers": ("Docker", "DevOps & Cloud"),
    "kubernetes": ("Kubernetes", "DevOps & Cloud"),
    "k8s": ("Kubernetes", "DevOps & Cloud"),
    "aws": ("AWS", "DevOps & Cloud"),
    "amazon web services": ("AWS", "DevOps & Cloud"),
    "aws ec2": ("AWS", "DevOps & Cloud"),
    "aws s3": ("AWS", "DevOps & Cloud"),
    "aws lambda": ("AWS", "DevOps & Cloud"),
    "gcp": ("Google Cloud (GCP)", "DevOps & Cloud"),
    "google cloud": ("Google Cloud (GCP)", "DevOps & Cloud"),
    "google cloud platform": ("Google Cloud (GCP)", "DevOps & Cloud"),
    "azure": ("Microsoft Azure", "DevOps & Cloud"),
    "microsoft azure": ("Microsoft Azure", "DevOps & Cloud"),
    "ci/cd": ("CI/CD", "DevOps & Cloud"),
    "cicd": ("CI/CD", "DevOps & Cloud"),
    "github actions": ("CI/CD", "DevOps & Cloud"),
    "gitlab ci": ("CI/CD", "DevOps & Cloud"),
    "jenkins": ("Jenkins", "DevOps & Cloud"),
    "terraform": ("Terraform", "DevOps & Cloud"),
    "ansible": ("Ansible", "DevOps & Cloud"),
    "linux": ("Linux / Shell", "DevOps & Cloud"),
    "unix": ("Linux / Shell", "DevOps & Cloud"),
    "bash": ("Linux / Shell", "DevOps & Cloud"),
    "shell scripting": ("Linux / Shell", "DevOps & Cloud"),

    # Programming Languages
    "python": ("Python", "Programming Language"),
    "python3": ("Python", "Programming Language"),
    "javascript": ("JavaScript", "Programming Language"),
    "js": ("JavaScript", "Programming Language"),
    "es6": ("JavaScript", "Programming Language"),
    "typescript": ("TypeScript", "Programming Language"),
    "ts": ("TypeScript", "Programming Language"),
    "java": ("Java", "Programming Language"),
    "core java": ("Java", "Programming Language"),
    "c++": ("C++", "Programming Language"),
    "cpp": ("C++", "Programming Language"),
    "c": ("C", "Programming Language"),
    "c#": ("C#", "Programming Language"),
    "csharp": ("C#", "Programming Language"),
    "golang": ("Go", "Programming Language"),
    "go": ("Go", "Programming Language"),
    "rust": ("Rust", "Programming Language"),
    "kotlin": ("Kotlin", "Programming Language"),
    "swift": ("Swift", "Programming Language"),
    "sql": ("SQL", "Programming Language"),
    "r": ("R", "Programming Language"),
    "php": ("PHP", "Programming Language"),

    # Core CS & Systems
    "dsa": ("Data Structures & Algorithms", "Core CS & Systems"),
    "data structures": ("Data Structures & Algorithms", "Core CS & Systems"),
    "algorithms": ("Data Structures & Algorithms", "Core CS & Systems"),
    "data structures and algorithms": ("Data Structures & Algorithms", "Core CS & Systems"),
    "data structures & algorithms": ("Data Structures & Algorithms", "Core CS & Systems"),
    "system design": ("System Design", "Core CS & Systems"),
    "distributed systems": ("System Design", "Core CS & Systems"),
    "hld": ("System Design", "Core CS & Systems"),
    "lld": ("System Design", "Core CS & Systems"),
    "oops": ("Object-Oriented Programming (OOP)", "Core CS & Systems"),
    "oop": ("Object-Oriented Programming (OOP)", "Core CS & Systems"),
    "object oriented programming": ("Object-Oriented Programming (OOP)", "Core CS & Systems"),
    "dbms": ("DBMS", "Core CS & Systems"),
    "database management systems": ("DBMS", "Core CS & Systems"),
    "operating systems": ("Operating Systems", "Core CS & Systems"),
    "os concepts": ("Operating Systems", "Core CS & Systems"),
    "computer networks": ("Computer Networks", "Core CS & Systems"),
    "networking": ("Computer Networks", "Core CS & Systems"),
    "microservices": ("Microservices", "Core CS & Systems"),

    # AI & Data
    "machine learning": ("Machine Learning", "AI & Data"),
    "ml": ("Machine Learning", "AI & Data"),
    "deep learning": ("Deep Learning", "AI & Data"),
    "dl": ("Deep Learning", "AI & Data"),
    "nlp": ("NLP", "AI & Data"),
    "natural language processing": ("NLP", "AI & Data"),
    "computer vision": ("Computer Vision", "AI & Data"),
    "cv": ("Computer Vision", "AI & Data"),
    "pytorch": ("PyTorch", "AI & Data"),
    "tensorflow": ("TensorFlow", "AI & Data"),
    "tf": ("TensorFlow", "AI & Data"),
    "rag": ("RAG", "AI & Data"),
    "retrieval augmented generation": ("RAG", "AI & Data"),
    "vector databases": ("Vector Databases", "AI & Data"),
    "vector db": ("Vector Databases", "AI & Data"),
    "pgvector": ("Vector Databases", "AI & Data"),
    "chromadb": ("Vector Databases", "AI & Data"),
    "pinecone": ("Vector Databases", "AI & Data"),
    "langchain": ("LangChain / LlamaIndex", "AI & Data"),
    "llamaindex": ("LangChain / LlamaIndex", "AI & Data"),
    "llms": ("Generative AI / LLMs", "AI & Data"),
    "llm": ("Generative AI / LLMs", "AI & Data"),
    "generative ai": ("Generative AI / LLMs", "AI & Data"),
    "genai": ("Generative AI / LLMs", "AI & Data"),
    "pandas": ("Data Analysis (Pandas/NumPy)", "AI & Data"),
    "numpy": ("Data Analysis (Pandas/NumPy)", "AI & Data"),
    "scikit-learn": ("Scikit-Learn", "AI & Data"),
    "sklearn": ("Scikit-Learn", "AI & Data"),

    # Mobile
    "react native": ("React Native", "Mobile"),
    "flutter": ("Flutter", "Mobile"),
    "dart": ("Flutter", "Mobile"),
    "android": ("Android Development", "Mobile"),
    "android sdk": ("Android Development", "Mobile"),
    "ios": ("iOS Development", "Mobile"),

    # Tools, Testing & Methodologies
    "git": ("Git / Version Control", "Tools & Methodologies"),
    "github": ("Git / Version Control", "Tools & Methodologies"),
    "gitlab": ("Git / Version Control", "Tools & Methodologies"),
    "unit testing": ("Unit Testing", "Testing & Security"),
    "jest": ("Jest", "Testing & Security"),
    "pytest": ("Pytest", "Testing & Security"),
    "junit": ("JUnit", "Testing & Security"),
    "cypress": ("Cypress", "Testing & Security"),
    "cybersecurity": ("Cybersecurity", "Testing & Security"),
    "web security": ("Cybersecurity", "Testing & Security"),
    "owasp": ("Cybersecurity", "Testing & Security"),
    "agile": ("Agile / Scrum", "Tools & Methodologies"),
    "scrum": ("Agile / Scrum", "Tools & Methodologies"),
    "jira": ("Jira", "Tools & Methodologies"),
}

class SkillNormalizer:
    @staticmethod
    def _clean_token(token: str) -> str:
        cleaned = token.strip().lower()
        cleaned = re.sub(r"[\s\-_]+", " ", cleaned)
        return cleaned

    @classmethod
    def normalize_single(
        cls, raw_skill: str, importance: SkillImportance = "required"
    ) -> SkillItem:
        raw_clean = raw_skill.strip()
        lookup_key = cls._clean_token(raw_clean)

        if lookup_key in SKILL_TAXONOMY:
            canonical_name, category = SKILL_TAXONOMY[lookup_key]
            return SkillItem(
                name=canonical_name,
                category=category,
                raw_match=raw_clean,
                importance=importance,
            )

        # Fallback check for punctuation variations (e.g. "React.js" -> "react.js")
        direct_key = raw_clean.lower()
        if direct_key in SKILL_TAXONOMY:
            canonical_name, category = SKILL_TAXONOMY[direct_key]
            return SkillItem(
                name=canonical_name,
                category=category,
                raw_match=raw_clean,
                importance=importance,
            )

        # Title-cased fallback for unmapped skill
        canonical_fallback = raw_clean.title()
        return SkillItem(
            name=canonical_fallback,
            category="Other",
            raw_match=raw_clean,
            importance=importance,
        )

    @classmethod
    def normalize_batch(
        cls, raw_skills: list[str], importance: SkillImportance = "required"
    ) -> list[SkillItem]:
        seen_names: set[str] = set()
        results: list[SkillItem] = []

        for raw in raw_skills:
            if not raw or not raw.strip():
                continue
            item = cls.normalize_single(raw, importance=importance)
            if item.name.lower() not in seen_names:
                seen_names.add(item.name.lower())
                results.append(item)

        return results

    @classmethod
    def extract_keywords_heuristically(cls, text: str) -> list[SkillItem]:
        """
        Scans text for all known skills in the taxonomy and returns normalized matches.
        """
        text_lower = f" {text.lower()} "
        found_skills: list[SkillItem] = []
        seen: set[str] = set()

        # Sort taxonomy keys by length descending to match multi-word phrases first
        sorted_keys = sorted(SKILL_TAXONOMY.keys(), key=len, reverse=True)

        for key in sorted_keys:
            # Punctuation-safe boundary lookaround matching (handles 'c++', 'c#', '.net', etc.)
            pattern = rf"(?<![a-zA-Z0-9]){re.escape(key)}(?![a-zA-Z0-9])"
            if re.search(pattern, text_lower):
                canonical_name, category = SKILL_TAXONOMY[key]
                if canonical_name.lower() not in seen:
                    seen.add(canonical_name.lower())
                    found_skills.append(
                        SkillItem(
                            name=canonical_name,
                            category=category,
                            raw_match=key,
                            importance="required",
                        )
                    )

        return found_skills

