# AQIS - Admissions Query Intelligence System

## Original Problem Statement
Build a full-stack web application named "Admissions Query Intelligence System (AQIS)" using React, Tailwind CSS, and a FastAPI backend. All data persistence is managed via localStorage.

## Core Requirements
- **Authentication:** Login page with Admin and AdCom Member roles
- **Layout:** Fixed left sidebar + top header bar
- **Core Features:** Admission Cycle Management, .xlsx data upload, Priority Engine, query management pages
- **AI Integration:** Groq AI for query analysis (summarization, intent detection, urgency, draft responses)
- **UI/UX:** Clear Data, SPJIMR branding, inline cycle management, guided tour
- **Document Verification:** Bulk-verify CAT scorecards (PDFs) against candidate list (CSV/Excel)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, SheetJS, PapaParse
- Backend: FastAPI (stateless)
- Persistence: localStorage (no database)
- Integrations: Groq AI, pdfplumber

## Architecture
```
/app/
├── backend/
│   ├── docverify.py       # PDF/CSV parsing & verification logic
│   ├── requirements.txt
│   └── server.py          # FastAPI: /api/ai/analyze, /api/docverify/verify
├── frontend/src/
│   ├── App.js
│   ├── components/
│   │   ├── GuidedTour.js
│   │   └── Layout.js      # Sidebar + header
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   └── DataContext.js  # localStorage data management
│   └── pages/
│       ├── DocumentVerificationPage.js
│       ├── QueryDetailDrawer.js
│       ├── UploadDataPage.js
│       └── ... (other pages)
```

## Completed Features (as of March 2026)
- [x] User authentication (Admin/AdCom Member roles)
- [x] Full query management pages (All Queries, My Queries, Escalation, SLA Monitor, Analytics, Reports)
- [x] .xlsx data upload with inline cycle management
- [x] Groq AI integration for query analysis
- [x] SPJIMR branding (logo on login + layout)
- [x] Interactive guided tour for onboarding
- [x] Clear Data functionality
- [x] **Document Verification feature** - bulk PDF vs CSV/Excel verification
  - Backend: PDF parsing with pdfplumber, CSV/Excel parsing, matching by CAT reg no or name
  - Frontend: File upload UI, verification results table with summary, export CSV/JSON, search/filter
  - Sidebar navigation link working
  - Bug fix: Numeric string normalization (21161013.0 → 21161013) for reg no matching
  - Bug fix: OCR-safe percentile column detection (handles "Percent ile", "Perc entile" etc.)
  - Bug fix: Layout table filtering (skip single-cell container tables)
  - Bug fix: Name pattern "Name of the Candidate" for CAT scorecards
  - Bug fix: Date normalization handles ordinal suffixes ("28th Nov 2021")
- [x] Refactoring: Removed obsolete CycleManagementPage (merged into UploadDataPage)
- [x] Fixed React key warning in DocumentVerificationPage
- [x] Fixed accessibility: Added DialogTitle to GuidedTour

## API Endpoints
- `POST /api/ai/analyze` - Groq AI query analysis
- `POST /api/docverify/verify` - Bulk document verification (multipart: CSV + PDFs)

## Credentials
- Admin: admin/admin123
- AdCom Member: member1/member123

## Backlog
- P2: Interview Logistics (greyed out placeholder in sidebar)
