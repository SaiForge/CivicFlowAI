# CivicFlowAI — Autonomous Multi-Agent Smart Civic Issue Resolution Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.3+-7B42BC.svg?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter%20%7C%20Gemini-FF6B6B.svg)](https://openrouter.ai/)

> **India's Autonomous Civic Grievance & Ward Redressal Infrastructure**  
> *"स्वच्छ नगर, सुरक्षित सड़कें, पारदर्शी प्रशासन"*

CivicFlowAI is an enterprise-grade, full-stack civic governance platform designed for municipal corporations and smart city initiatives (e.g., Nagar Nigam, PWD, Jal Board, DISCOM). It eliminates municipal red tape, prevents lost complaints, detects duplicate reports, and enforces photographic proof of work through an autonomous **7-Agent AI Core**, real-time **Redis Pub/Sub & Server-Sent Events (SSE)**, and tailored **Role-Based Workspaces**.

---

## 📑 Table of Contents

1. [System Architecture](#-system-architecture)
2. [The 7-Agent AI Core & Quality Gate](#-the-7-agent-ai-core--quality-gate)
3. [Key Features & Innovations](#-key-features--innovations)
4. [Role-Based Workspaces & Personas](#-role-based-workspaces--personas)
5. [Anti-Fraud & Cross-Modal Quality Gate](#-anti-fraud--cross-modal-quality-gate)
6. [Voice Grievance & Multimodal Audio](#-voice-grievance--multimodal-audio)
7. [Live Cross-Portal Synchronization](#-live-cross-portal-synchronization)
8. [Project Directory Layout](#-project-directory-layout)
9. [Default Demo Credentials](#-default-demo-credentials)
10. [Quickstart Guide](#-quickstart-guide)
    - [Option 1: Docker Compose (Recommended)](#option-1-docker-compose-recommended)
    - [Option 2: Local Development Setup](#option-2-local-development-setup)
11. [Environment Variables Reference](#-environment-variables-reference)
12. [API Reference & Endpoints](#-api-reference--endpoints)
13. [Testing & Quality Assurance](#-testing--quality-assurance)
14. [Infrastructure as Code (Terraform)](#-infrastructure-as-code-terraform)
15. [Contributing & License](#-contributing--license)

---

## 🏛 System Architecture

CivicFlowAI operates on a clean, distributed 5-tier architecture connecting citizens, field workers, municipal heads, and autonomous AI agents:

```mermaid
flowchart TD
    subgraph Clients["Client Layer"]
        CitizenUser["Citizen Mobile / Web Portal"]
        DeptUser["Field Authority Queue (PWD, Waste, Water)"]
        AdminUser["Municipal HQ Admin Command Centre"]
    end

    subgraph Edge["Reverse Proxy & Gateway"]
        Nginx["Nginx Reverse Proxy & Static Host (:3000)"]
        SSEStream["Realtime Server-Sent Events (/api/events)"]
    end

    subgraph BackendGateway["Backend API Service (:5001 -> :5000)"]
        FastAPIGateway["FastAPI Core Gateway"]
        AuthModule["JWT RBAC Authentication"]
        ExifExtractor["EXIF Recency & Metadata Engine"]
        AudioTranscriber["Whisper / Multimodal Audio Engine"]
        CacheLayer["Redis Cache & Pub/Sub Client"]
    end

    subgraph MultiAgentEngine["Multi-Agent AI Core (:8000)"]
        ManagerAgent["ManagerAgent (Orchestrator & Self-Correction)"]
        Stage1["Stage 1: IssueAgent, EvidenceAgent, SeverityAgent"]
        Stage2["Stage 2: RoutingAgent, IncidentAgent, WorkflowAgent"]
        Stage3["Stage 3: VerificationAgent (Quality Gate)"]
        LLMHub["LLM Hub: OpenRouter / Gemini / OpenAI"]
    end

    subgraph Persistence["Storage & State Layer"]
        Postgres[(PostgreSQL 16 Database :5433)]
        Redis[(Redis 7 Cache & Pub/Sub :6379)]
        BlobStorage[Local / S3 Image & Audio Evidence]
    end

    Clients --> Nginx
    Nginx --> FastAPIGateway
    FastAPIGateway --> SSEStream
    FastAPIGateway --> AuthModule
    FastAPIGateway --> ExifExtractor
    FastAPIGateway --> AudioTranscriber
    FastAPIGateway --> CacheLayer
    FastAPIGateway --> Postgres
    FastAPIGateway --> Redis
    FastAPIGateway --> BlobStorage

    FastAPIGateway <-->|Async REST API| ManagerAgent
    ManagerAgent --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 -->|Retry Cascade if Rejected| Stage1
    Stage1 & Stage2 & Stage3 <--> LLMHub
```

### Component Breakdown:
| Service | Technology | Port (Host:Container) | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Leaflet, Vanilla CSS | `3000:3000` | Responsive Citizen, Department, and Admin dashboards with Indian civic aesthetic. |
| **Backend Gateway** | Python FastAPI, SQLAlchemy, Pydantic | `5001:5000` | REST API, JWT auth, multipart file upload, EXIF validation, caching, SSE stream. |
| **Multi-Agent Core** | Python FastAPI, Uvicorn, LangChain/LLM | `8000:8000` | Autonomous 7-specialist pipeline with heuristic self-correction and validation. |
| **PostgreSQL** | PostgreSQL 16 Alpine | `5433:5432` | Relational persistence for complaints, incidents, timeline audit logs, and users. |
| **Redis** | Redis 7 Alpine | `6379:6379` | High-speed response caching and real-time Pub/Sub live event synchronization. |

---

## 🤖 The 7-Agent AI Core & Quality Gate

When a grievance is submitted, it is processed through an autonomous multi-stage pipeline coordinated by the `ManagerAgent`. Each specialist agent performs a deterministic, auditable task:

```mermaid
sequenceDiagram
    autonumber
    participant C as Citizen / Gateway
    participant M as ManagerAgent
    participant S1 as Issue / Evidence / Severity
    participant S2 as Routing / Incident / Workflow
    participant V as VerificationAgent (Quality Gate)
    participant DB as PostgreSQL Persistence

    C->>M: POST /api/agent/triage (Text, Location, Photo, Audio)
    M->>S1: Stage 1 Parallel Execution
    Note over S1: IssueAgent: Classifies category & extracts keywords<br/>EvidenceAgent: Multimodal CV & grounding score<br/>SeverityAgent: Computes safety & public impact rubric
    S1-->>M: Aggregated Stage 1 blackboard data
    M->>S2: Stage 2 Sequential Execution
    Note over S2: RoutingAgent: Assigns municipal department<br/>IncidentAgent: Geohash deduplication & clustering<br/>WorkflowAgent: SLA calculation & escalation hierarchy
    S2-->>M: Aggregated Stage 2 blackboard data
    M->>V: Stage 3 Quality Gate Audit
    alt Quality Gate Pass
        V-->>M: Approved: True (Grounding >= 0.7, Confidence >= 0.7)
        M->>DB: Persist Ticket (CIV-XXXX) & Broadcast Redis Event
        M-->>C: 201 Created with Full AI Trace & Ticket ID
    else Contradiction or Hallucination Detected
        V-->>M: Approved: False (Feedback & Corrections)
        M->>S1: Self-Correction Retry (Max 2 Attempts)
        alt Retry Fails
            M-->>C: 422 Unprocessable Entity (Rejection Reason)
        end
    end
```

### Specialist Agent Responsibilities:

1. **`IssueAgent` (Intake & Entity Classification)**:
   - Identifies the primary civic issue domain (`Road`, `Waste`, `Water`, `Streetlight`, `Drainage`, `Infrastructure`).
   - Normalizes coordinates via Nominatim GIS gazetteer and extracts clean technical keywords.
   - Provides multilingual recognition across English, Hindi, and regional scripts.

2. **`EvidenceAgent` (Multimodal Vision & Audio Grounding)**:
   - Inspects attached photographic evidence using vision LLMs (`inclusionai/ling-3.0-flash-vl:free`, Gemini, or GPT-4o-mini).
   - Computes a mathematical **Grounding Score** ($0.0 \rightarrow 1.0$) measuring consistency between the citizen's text and the visual reality.
   - Enforces EXIF capture time recency checks (< 15 days old).

3. **`SeverityAgent` (Public Safety & Severity Rubric)**:
   - Computes an objective severity score ($0 \rightarrow 100$) using weighted multidimensional factors:
     $$\text{Severity} = (0.40 \times \text{Safety Risk}) + (0.30 \times \text{Public Impact}) + (0.15 \times \text{Recurrence}) + (0.15 \times \text{Visual Severity})$$
   - Maps scores to standard municipal priorities: `Low`, `Medium`, `High`, `Critical`.

4. **`RoutingAgent` (Municipal Jurisdiction Assignment)**:
   - Routes issues to the appropriate municipal department (PWD Roads, Nagar Nigam Sanitation, Jal Board, DISCOM Electric, Storm Drainage).
   - Identifies secondary assisting departments and determines zonal administrative jurisdiction.

5. **`IncidentAgent` (Spatial Deduplication & Clustering)**:
   - Scans existing active complaints within a spatial radius (geohash / coordinate proximity).
   - Prevents duplicate dispatch by clustering related complaints under parent incident groups (`INC-XXXX`).

6. **`WorkflowAgent` (SLA Calculation & Escalation Hierarchy)**:
   - Calculates binding Service Level Agreement (SLA) deadlines (e.g., 24h for High, 48h for Medium, 72h for Low).
   - Configures automated multi-tier escalation targets (e.g., Ward Officer $\rightarrow$ Assistant Engineer $\rightarrow$ Zonal Commissioner).

7. **`VerificationAgent` (Autonomous Quality Gate)**:
   - Evaluates the output of all upstream agents against strict consistency, grounding, and confidence thresholds.
   - If hallucinations, contradictions, or missing fields are detected, initiates a self-correction loop back to the faulty agent.
   - If photographic proof directly contradicts the complaint (e.g. text says "pothole" but photo shows a pet or unrelated room), immediately rejects the issue with a descriptive error.

---

## 🌟 Key Features & Innovations

- ⚡ **Zero Red Tape Autonomous Triage**: Issues are analyzed, verified, categorized, and assigned to the right municipal department in under 15 seconds.
- 🔄 **Real-Time Live Synchronization**: All citizen reports, status progressions, and authority resolutions sync instantly across browser tabs and portals via Redis Pub/Sub and SSE without manual page refreshing.
- 🎙️ **Multimodal Voice Grievances**: Citizens can speak or record voice notes directly in the browser with live waveform visualization, audio playback in the complaint detail drawer, and TTS read-aloud.
- 📸 **Photographic Proof of Work**: Authority field officers cannot resolve an issue without uploading verified "After-Repair" photographic proof.
- 🛡️ **Anti-Fraud Quality Protection**: Real-time rejection of keyboard smash spam, duplicate images, stale photographs (> 15 days), and cross-modal text-image contradictions.
- 🗺️ **Interactive GIS Hotspot Maps**: Interactive Leaflet map featuring real-time cluster markers, ward boundary context, and an interactive pin-picker modal for pinpoint complaint location.
- 🎨 **Indian Civic Design System**: Clean, premium UI featuring warm sandstone & tricolor aesthetics, glassmorphism cards, micro-animations, and accessible typography.

---

## 👥 Role-Based Workspaces & Personas

CivicFlowAI provides 3 dedicated, security-isolated user interfaces:

### 1. 🧑‍💼 Citizen Portal
- **File a Civic Grievance**: Quick-select domain cards (Roads, Waste, Water, Streetlights, Drains) with photo upload, voice note recording, and interactive GPS map picker.
- **My Complaints Progress Tracker**: Step-by-step visual tracker (`Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved & Verified`).
- **Nearby Ward Issues & Community Upvoting**: Citizens can upvote existing neighborhood issues to increase SLA priority and avoid filing duplicate tickets.
- **Live AI Processing Screen**: High-precision multi-agent workflow visualizer displaying live execution steps, GIS coordinates, grounding scores, and technical logs.

### 2. 👷 Field Authority (Department) Portal
- **Department Dispatch Queue**: Tailored queues for PWD Roads, Nagar Nigam Sanitation, Jal Board, DISCOM Electrics, and Drainage.
- **Status Lifecycle Management**: Field supervisors move complaints from `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Resolution Submitted`.
- **Proof-of-Work Upload**: Upload before/after photos and resolution notes for AI verification before ticket closure.
- **Ward Heatmap**: Geospatial view of open tasks prioritized by SLA countdown.

### 3. 🏛️ Municipal HQ Admin Command Centre
- **City-wide KPI Cards**: Track total complaints, resolution rate, critical escalations, and active field workers.
- **Multi-Agent Pipeline Health**: Real-time status of the 5 autonomous AI agents and quality gate pass rates.
- **Incident Clusters**: Aggregated multi-complaint incident master tickets (`INC-XXXX`).
- **Department Performance Matrix**: Compare resolution turnaround times and SLA compliance across municipal bodies.

---

## 🛡️ Anti-Fraud & Cross-Modal Quality Gate

CivicFlowAI incorporates multi-layered validation to prevent spam, fraudulent claims, and wasted municipal resources:

```
Citizen Submission
       │
       ├── 1. Text Heuristic Filter
       │     ├── Min 6 alphabetic characters
       │     ├── Vocabulary diversity check (>= 4 unique chars)
       │     ├── Vowel ratio validation (12% - 85% natural language bounds)
       │     └── Anti-keyboard smash scan (rejects 'asdfgh', 'qwerty', 'asdsad')
       │
       ├── 2. EXIF Timestamp Recency Check
       │     ├── Extracts DateTimeOriginal / DateTimeDigitized from EXIF tags
       │     └── Rejects photos captured > 15 days ago to prevent reuse of archival photos
       │
       ├── 3. Multimodal Vision Grounding
       │     ├── Vision model inspects image pixels
       │     └── Calculates Grounding Score (>= 0.70 required for physical defects)
       │
       └── 4. Cross-Modal Contradiction Gate
             ├── Rejects if text describes road damage but photo depicts indoor scenes or unrelated objects
             └── Returns HTTP 422 with exact explanation: "Photographic evidence contradicts reported grievance description."
```

---

## 🎙️ Voice Grievance & Multimodal Audio

CivicFlowAI provides end-to-end voice accessibility:
- **Dual-Engine Speech Recognition**:
  1. *Primary*: In-browser Web Speech API for instantaneous, zero-latency transcription in Hindi and Indian English (`en-IN`).
  2. *Secondary (AI Fallback)*: Multipart audio recording (`.webm`, `.wav`) transmitted to `/api/voice/transcribe` backed by OpenAI Whisper or OpenRouter multimodal audio models.
- **Recorded Audio Waveform Playback**: Attached citizen audio clips are playable directly within the complaint drawer with animated audio waveform bars.
- **Accessibility Text-to-Speech (TTS)**: One-click speaker icon reads aloud complaint summaries and municipal repair updates.

---

## ⚡ Live Cross-Portal Synchronization

Real-time synchronization across all portals without continuous polling:

```mermaid
sequenceDiagram
    participant C as Citizen Browser
    participant B as Backend Gateway
    participant R as Redis Pub/Sub
    participant D as Department Authority Browser
    participant A as Admin HQ Browser

    C->>B: POST /api/complaints (New Complaint)
    B->>R: PUBLISH 'civicflow:events' (type: complaint_created)
    R-->>B: Broadcast to active SSE listeners
    B-->>D: SSE 'event: update' payload
    B-->>A: SSE 'event: update' payload
    Note over D,A: Both portals trigger silent background refetch<br/>New complaint appears on dispatch queue & admin map instantly!
```

---

## 📂 Project Directory Layout

```
CivicFlowAI/
├── agent/                               # Multi-Agent AI Core (Port 8000)
│   ├── app/
│   │   ├── agent/                       # Agent Orchestrator & Specialists
│   │   │   ├── core_agent.py            # ManagerAgent orchestrator & retry cascade
│   │   │   ├── planner.py               # Dependency graph & execution planning
│   │   │   ├── executor.py              # Asynchronous agent step execution
│   │   │   └── specialists/             # 7 Specialized AI Agents
│   │   │       ├── issue_agent.py       # Issue intake & GIS entity extractor
│   │   │       ├── evidence_agent.py    # Multimodal CV & grounding evaluation
│   │   │       ├── severity_agent.py    # Public safety & severity rubric
│   │   │       ├── routing_agent.py     # Department & jurisdiction routing
│   │   │       ├── incident_agent.py    # Deduplication & cluster incident builder
│   │   │       ├── workflow_agent.py    # SLA & escalation hierarchy configuration
│   │   │       └── verification_agent.py# Quality gate & hallucination detection
│   │   ├── api/                         # Agent Pydantic schemas & routes
│   │   ├── config/                      # Agent settings & environment loader
│   │   ├── llm/                         # Dual LLM provider (OpenRouter / Gemini / OpenAI)
│   │   ├── memory/                      # Agent blackboard & context memory
│   │   ├── tools/                       # Department registry & GIS calculators
│   │   └── main.py                      # FastAPI application entrypoint
│   ├── tests/                           # Pytest unit & integration test suite
│   ├── Dockerfile                       # Agent Docker container manifest
│   ├── requirements.txt                 # Agent dependencies
│   └── test_manual.py                   # Interactive CLI complaint triage runner
│
├── backend/                             # API Gateway Service (Port 5001 -> 5000)
│   ├── app/
│   │   ├── auth.py                      # JWT token generation, bcrypt hashing & RBAC
│   │   ├── cache.py                     # Redis in-memory cache & SSE Pub/Sub generator
│   │   ├── config.py                    # Backend settings & environment loader
│   │   ├── database.py                  # SQLAlchemy engine & session factory
│   │   ├── main.py                      # Gateway entrypoint & middleware setup
│   │   ├── models.py                    # PostgreSQL tables (User, Complaint, Incident, Timeline)
│   │   ├── routes.py                    # REST API endpoints (Complaints, Incidents, Auth, Stats)
│   │   └── schemas.py                   # Pydantic request/response schemas
│   ├── Dockerfile                       # Backend Docker container manifest
│   └── requirements.txt                 # Gateway dependencies
│
├── frontend/                            # React 19 + Vite Web Application (Port 3000)
│   ├── nginx.conf/                      # Production Nginx reverse proxy configuration
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/                   # Admin Command Centre, Hotspot Map, Dept Performance
│   │   │   ├── citizen/                 # Citizen Dashboard, Report Form, Processing Screen
│   │   │   ├── dept/                    # Department Dispatch Queue & Resolution Upload
│   │   │   ├── home/                    # Landing page, Auth Modal, Android Onboarding Tour
│   │   │   ├── shared/                  # Complaint Detail drawer, Agent Trace, Stat Cards
│   │   │   └── Header.jsx               # Universal navigation header with role indicators
│   │   ├── context/
│   │   │   └── AppContext.jsx           # Global state, auth session & SSE stream listener
│   │   ├── hooks/
│   │   │   └── useApi.js                # SWR-style data hooks with resilient background sync
│   │   ├── services/
│   │   │   └── api.js                   # Fetch API client with JWT bearer tokens
│   │   ├── App.jsx                      # Root application & error boundary
│   │   ├── index.css                    # Unified Indian Civic design system (Vanilla CSS)
│   │   └── main.jsx                     # Vite React DOM entrypoint
│   ├── Dockerfile                       # Multi-stage build (Node 20 builder -> Nginx Alpine)
│   └── package.json                     # Dependencies (Lucide icons, Leaflet, React 19)
│
├── infrastructure/
│   └── terraform/                       # Infrastructure as Code (Azure VM / Native Cloud)
│       ├── main.tf                      # Resource groups, VNet, VM, Security Rules
│       ├── variables.tf                 # Cloud configuration variables
│       └── outputs.tf                   # Public IP, FQDN & SSH connection outputs
│
├── docker-compose.yml                   # Unified 5-container orchestration manifest
└── README.md                            # Comprehensive project documentation
```

---

## 🔑 Default Demo Credentials

For instant evaluation, the platform includes pre-seeded demonstration accounts for all 3 portals:

| Portal | Role | Email / Identifier | Password | Access Rights |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen Portal** | `citizen` | `citizen@civicflow.gov` | `demo123` | File issues, view ward status, upvote, record voice |
| **Department Authority** | `dept` | `dept@civicflow.gov` | `demo123` | Manage queue, dispatch crew, upload resolution photos |
| **Municipal HQ Admin** | `admin` | `admin@civicflow.gov` *(or `admin`)* | `admin123` | Full city-wide analytics, agent trace, SLA monitoring |

> 💡 **Quick Access**: On the login modal, click any **1-Click Instant Demo Login** card (`Citizen`, `Authority`, or `Admin`) to immediately sign in without typing credentials.

---

## 🚀 Quickstart Guide

### Option 1: Docker Compose (Recommended)

#### Prerequisites:
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- (Optional) OpenRouter or Google Gemini API Key for online multimodal AI

#### 1. Clone the repository:
```bash
git clone https://github.com/your-org/CivicFlowAI.git
cd CivicFlowAI
```

#### 2. Configure environment:
Create `.env` in the root directory (or use default values):
```bash
cp .env.example .env
```
Ensure your API key is populated:
```ini
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL_NAME=inclusionai/ling-3.0-flash-vl:free
```

#### 3. Build and launch all 5 containers:
```bash
docker compose up --build
```

#### 4. Access the applications:
- 🌐 **Web Application (Citizen, Authority, Admin)**: [`http://localhost:3000`](http://localhost:3000)
- 🔌 **Backend Gateway OpenAPI Docs**: [`http://localhost:5001/docs`](http://localhost:5001/docs)
- 🤖 **Multi-Agent Engine OpenAPI Docs**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- 🗄️ **PostgreSQL Database**: `localhost:5433` (User: `civicflow`, Database: `civicflow`)
- ⚡ **Redis Instance**: `localhost:6379`

---

### Option 2: Local Development Setup

If you prefer running services directly on your host machine:

#### 1. Start Database & Redis:
```bash
# Launch PostgreSQL and Redis using Docker
docker run -d --name civicflow_postgres -p 5433:5432 -e POSTGRES_USER=civicflow -e POSTGRES_PASSWORD=civicflow_secret -e POSTGRES_DB=civicflow postgres:16-alpine
docker run -d --name civicflow_redis -p 6379:6379 redis:7-alpine
```

#### 2. Start Multi-Agent AI Core (Port 8000):
```bash
cd agent
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start agent service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Start Backend Gateway Service (Port 5001):
```bash
cd ../backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend service
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

#### 4. Start React Frontend (Port 3000):
```bash
cd ../frontend
npm install
npm run dev -- --port 3000
```

Open [`http://localhost:3000`](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables Reference

### Agent Service (`agent/.env`):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `openrouter` | AI Provider: `openrouter`, `gemini`, `openai`, or `auto` |
| `OPENROUTER_API_KEY` | `""` | OpenRouter API Key |
| `OPENROUTER_MODEL_NAME`| `inclusionai/ling-3.0-flash-vl:free` | Free multimodal model for visual grounding |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter base API endpoint |
| `GEMINI_API_KEY` | `""` | Google Gemini API Key (Alternative provider) |
| `DATABASE_URL` | `postgresql://civicflow:civicflow_secret@localhost:5433/civicflow` | PostgreSQL database connection string |
| `CONFIDENCE_THRESHOLD` | `0.7` | Minimum quality threshold for autonomous pass |
| `MAX_RETRIES` | `2` | Number of self-correction retry attempts on rejection |

### Backend Service (`backend/.env`):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `AGENT_SERVICE_URL` | `http://agent:8000` *(or `http://localhost:8000`)* | URL to the Multi-Agent AI engine |
| `DATABASE_URL` | `postgresql://civicflow:civicflow_secret@postgres:5432/civicflow` | Connection string to PostgreSQL |
| `REDIS_URL` | `redis://redis:6379/0` *(or `redis://localhost:6379/0`)* | Connection string to Redis |
| `SECRET_KEY` | `change_me_in_production_civicflow_2024` | Secret key for signing JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Session lifetime (24 hours) |

### Frontend Service (`frontend/.env`):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:5001` | Base URL pointing to the Backend Gateway |

---

## 📡 API Reference & Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate citizen, authority, or admin user via email & password. Returns JWT token.
- `POST /api/auth/register`: Register new citizen profile with Ward and contact details.
- `GET /api/auth/me`: Validate active JWT bearer token and return user profile.

### 2. Complaints Management (`/api/complaints`)
- `GET /api/complaints`: List complaints with optional filtering by `dept`, `status`, `citizen_id`, and `limit`.
- `POST /api/complaints`: Multipart complaint submission (`category`, `description`, `location`, `lat`, `lng`, `images`, `audio`). Triggers synchronous multi-agent evaluation.
- `GET /api/complaints/{id}`: Fetch detailed record including timeline audit log, AI thoughts, and photo URLs.
- `PATCH /api/complaints/{id}`: Update complaint status, assign department officer, or record internal notes.
- `POST /api/complaints/{id}/vote`: Community upvote/downvote support counter.
- `POST /api/complaints/{id}/images`: Upload before/after proof of work resolution photos.
- `GET /api/complaints/{id}/trace`: Retrieve full step-by-step multi-agent technical execution trace.

### 3. Incidents & Clustering (`/api/incidents`)
- `GET /api/incidents`: Retrieve aggregated multi-complaint incident clusters (`INC-XXXX`).
- `GET /api/incidents/{id}`: Inspect specific incident cluster and all child complaint tickets.

### 4. Real-time Live Synchronization (`/api/events`)
- `GET /api/events`: Server-Sent Events (SSE) stream broadcasting real-time Redis events (`complaint_created`, `complaint_updated`, `complaint_voted`).

### 5. Multimodal Audio Transcription (`/api/voice`)
- `POST /api/voice/transcribe`: Multimodal speech transcription endpoint accepting raw audio bytes (`audio/webm`, `audio/wav`).

### 6. System Health (`/health`)
- `GET /health`: Healthcheck confirming status of database connectivity, Redis connection, and Agent service.

---

## 🧪 Testing & Quality Assurance

### 1. Backend & Multi-Agent Test Suite:
Run the comprehensive Pytest suite covering agent triage, validation rules, EXIF extraction, and API routes:
```bash
# Test Multi-Agent Core
cd agent
pytest tests/ -v

# Test Backend API Gateway
cd ../backend
pytest tests/ -v
```

### 2. Interactive CLI Complaint Runner:
Test the multi-agent pipeline manually from the terminal with realistic civic grievances:
```bash
cd agent
python test_manual.py
```

### 3. Frontend Linting & Production Build:
Ensure zero undefined identifiers or style regressions:
```bash
cd frontend
npm run lint    # Runs oxlint static analysis
npm run build   # Validates Vite production bundle compilation
```

---

## ☁️ Infrastructure as Code (Terraform)

CivicFlowAI includes production cloud deployment manifests in `infrastructure/terraform/` for automated provisioning on Microsoft Azure:

- **Virtual Machine Deployment Mode**: Provisions an Ubuntu 22.04 LTS native VM with Nginx, Systemd service units, Redis, and Python virtual environment (zero container overhead).
- **Network Security Rules**: Automatically configures HTTPS (:443), HTTP (:80), and secure SSH (:22).

To deploy:
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Azure subscription details
terraform init
terraform plan
terraform apply
```

---

## 📄 License & Mission

CivicFlowAI is developed under the **MIT License**.

Built for smart governance, citizen empowerment, and accountable public administration.
*"Solving civic problems before they become crises."*
