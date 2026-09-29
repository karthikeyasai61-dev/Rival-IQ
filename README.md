# RivalIQ — Autonomous Competitive Intelligence Platform
### *Complete Product View, System Architecture & End-to-End Workflow*

<p align="center">
  <img src="public/rivaliq-full.png" alt="RivalIQ Logo" width="360" />
</p>

<p align="center">
  <strong>Autonomous AI-powered intelligence platform that ingests rival telemetry, detects strategic signals, retains long-term memory, and generates board-ready executive dossiers.</strong>
</p>

---

## 🧭 The Vision & Core Problem

Traditional competitive research is broken:
- It relies on fragmented spreadsheets, manual web searches, and one-off ChatGPT prompts.
- Once an analysis is finished, it is lost—teams have **zero institutional memory** of past rival moves.
- Leaders lack a way to **simulate what happens** if they cut prices or launch counter-products before spending real money.

**RivalIQ** solves this by delivering an **autonomous competitive intelligence agent** that transforms raw market metrics into predictive, board-ready executive actions. It remembers past competitor maneuvers across quarters, identifies structural gaps, and generates complete strategic playbooks with financial impact models.

---

## 🔄 End-to-End Intelligence Lifecycle

RivalIQ operates as a continuous, closed-loop competitive intelligence engine:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 1. EMPIRICAL DATA INGESTION                 │
  │     Upload internal & rival CSV/JSON metrics (telemetry)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │            2. SIGNAL & ANOMALY DETECTION ENGINE             │
  │   Velocity surges, pricing shifts, hiring spikes, drops     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │            3. HINDSIGHT STRATEGIC MEMORY BANK               │
  │   Retains historical rival tactics & outcomes over time     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           4. PRESCRIPTIVE RECOMMENDATION PLAYBOOK           │
  │   Actionable 3-tier counter-moves with KPI targets & ROI    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │             5. WHAT-IF MARKET RIVALRY SIMULATION            │
  │   Monte Carlo scenario modeling against rival reactions     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │          6. EXECUTIVE INTELLIGENCE DOSSIER & PDF            │
  │    Board-ready report with embedded high-resolution charts  │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Module-by-Module Application Tour

### 1. Data Ingestion Cockpit (`/app/data`)
- **Universal File Parser**: Ingests enterprise and competitor datasets in CSV, JSON, or Excel formats.
- **Automated Normalization**: Cleans and maps heterogeneous metrics (revenue, market share, retention rates, employee headcount, pricing tiers).
- **Entity Separation**: Automatically isolates your organization’s internal telemetry from rival data to prevent cross-contamination and guarantee objective benchmarks.

### 2. Competitor Discovery Matrix (`/app/competitors`)
- **Entity Profiling**: Tracks every competitor detected across ingested datasets.
- **Head-to-Head Comparison Barometer**: Real-time visual comparison of scale, growth rate, retention surplus, and customer sentiment.
- **Dynamic Entity Isolation**: When multiple rivals are uploaded, users can toggle between different target competitors.

### 3. Real-Time Competitive Signals (`/app/signals`)
- **Deterministic Anomaly Engine**: Scans empirical data for:
  - *Pricing adjustments & promotional discount sprints*
  - *Sudden customer acquisition velocity spikes*
  - *Key department hiring expansions*
  - *CSAT / customer satisfaction drops*
- **Severity Scoring**: Categorizes signals into Low, Medium, High, or Critical threat vectors.
- **Interactive Trajectory Charts**: Powered by Apache ECharts, showing historical divergence curves over time.

### 4. Strategic Gap Analysis (`/app/gaps`)
- **Moat vs. Blindspot Radar**: Identifies areas where your organization leads (Structural Moats) versus where competitors hold an advantage (Vulnerability Vectors).
- **Quantified Deficits**: Measures precise percentage gaps in market share, customer retention buffers, and operational efficiency.

### 5. Persistent Hindsight Memory Bank (`/app/memory`)
- **Institutional Knowledge Retention**: Unlike standard LLMs that reset after every chat, RivalIQ permanently stores historical rival behavior in a semantic memory bank.
- **Strategic Reflection**: Cross-references current signals with past historical events to answer: *"Have they executed this pricing maneuver before, and how did the market respond?"*
- **Hindsight Querying**: Allows executives to recall past strategic lessons on demand.

### 6. Prescriptive Strategy Playbooks (`/app/recommendations`)
- **3-Tier Action Framework**:
  - **Tier 1 (Immediate Defense)**: Short-term countermeasures (e.g., promotional price matching or retention drops).
  - **Tier 2 (Operational Shifts)**: Mid-term adjustments (reallocating marketing spend, channel tiering).
  - **Tier 3 (Structural Moats)**: Long-term strategic initiatives (proprietary technology, enterprise exclusivity).
- **Governance & KPIs**: Every recommendation includes expected financial delta (+$M GMV), implementation risk, and designated C-suite ownership.

### 7. What-If Market Rivalry Simulation (`/app/simulation`)
- **Interactive Decision Cockpit**: Executives can test hypothetical scenarios by adjusting strategic sliders (pricing changes, R&D allocation, marketing sprints).
- **Counter-Reaction Modeling**: Simulates how the target rival is statistically likely to respond.
- **Financial Forecasting**: Projects expected net revenue change, market share shift, and retention stability before committing capital.

### 8. Executive Intelligence Dossier Studio (`/app/reports`)
- **C-Suite Briefing Documents**: Synthesizes end-to-end intelligence into a comprehensive, board-ready strategic report.
- **Client-Side High-Res PDF Engine**: Dynamically captures live ECharts visual graphs and compiles chapters on macro posture, competitive moats, threat matrices, and execution roadmaps into multi-page downloadable PDFs.
- **Zero Mock Pollution**: Newly created workspaces start completely empty until genuine datasets are ingested and analyzed.

---

## 🏛️ System Architecture

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 16 (App Router), React 19, TypeScript | Cyberpunk-sleek glassmorphic interface, dark mode, responsive layouts |
| **Data Visualization** | Apache ECharts (`echarts-for-react`) | Interactive radar plots, dual-axis revenue trajectories, gap bars |
| **Backend API** | Next.js Serverless Route Handlers (`src/app/api/`) | Secure server-side execution for analysis, simulations, and report drafting |
| **Primary AI Model** | Google Gemini (`gemini-2.5-flash` / `1.5-flash`) | Fast, structured JSON extraction and strategic synthesis |
| **High-Speed Fallback** | Groq Cloud (`llama-3.3-70b-versatile`) | Ultra-fast (500+ tok/sec) backup ensuring 100% uptime if Gemini limits |
| **Long-Term Memory** | Hindsight Vector Store API | Semantic recall and reflection across past competitive cycles |
| **Database & Auth** | Google Firebase (Auth & Firestore Admin) | User authentication, workspace partitioning, and dataset storage |
| **PDF Deliverables** | jsPDF | Multi-page board-ready consulting reports with embedded charts |

---

## 🔒 Enterprise Data Privacy & Security

- **Isolated Workspace Tenants**: Datasets, signals, memories, and reports are strictly scoped to authenticated workspace IDs.
- **Server-Side Credential Protection**: All Gemini, Groq, and Firebase private keys reside exclusively in server-side environment variables and are never leaked to the client browser.
- **Zero Training on User Data**: Ingested company records are analyzed via ephemeral API calls and are never used to train public LLM models.
