# AQIS - Admissions Query Intelligence System

## Original Problem Statement
Build a full-stack web application named "Admissions Query Intelligence System (AQIS)" using React, Tailwind CSS, and a FastAPI backend.

## Core Requirements
- **Authentication:** Login page with Admin and AdCom Member roles — backed by Supabase PostgreSQL
- **Layout:** Fixed left sidebar + top header bar
- **Core Features:** Admission Cycle Management, .xlsx data upload, Priority Engine, query management pages
- **AI Integration:** Groq AI for query analysis (summarization, intent detection, urgency, draft responses)
- **Document Verification:** Bulk-verify CAT scorecards (PDFs) against candidate list (CSV/Excel)
- **User Management:** Full CRUD with Supabase DB (create, edit, delete users)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, SheetJS, PapaParse
- Backend: FastAPI, SQLAlchemy (async), asyncpg, bcrypt, PyJWT
- Database: Supabase PostgreSQL (users table), localStorage (queries, cycles, uploads)
- Integrations: Groq AI, pdfplumber, Supabase

## Architecture
```
/app/
├── backend/
│   ├── alembic/           # Database migrations
│   ├── auth.py            # Auth + User CRUD endpoints (JWT, bcrypt)
│   ├── database.py        # SQLAlchemy async engine config
│   ├── docverify.py       # PDF/CSV parsing & verification logic
│   ├── models.py          # User SQLAlchemy model
│   ├── requirements.txt
│   └── server.py          # FastAPI main app
├── frontend/src/
│   ├── App.js
│   ├── components/
│   │   ├── GuidedTour.js
│   │   └── Layout.js
│   ├── contexts/
│   │   ├── AuthContext.js  # JWT-based auth with backend API
│   │   └── DataContext.js  # Users from API, other data from localStorage
│   └── pages/
│       ├── DocumentVerificationPage.js
│       ├── LoginPage.js
│       ├── UserManagementPage.js  # Full CRUD with delete
│       └── ... (other pages)
```

## API Endpoints
- `POST /api/auth/login` - Login with username/password, returns JWT + user
- `GET /api/users` - List all users from Supabase
- `POST /api/users` - Create user (with bcrypt password hashing)
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `POST /api/ai/analyze` - Groq AI query analysis
- `POST /api/docverify/verify` - Bulk document verification

## Completed Features
- [x] User authentication with Supabase PostgreSQL (bcrypt + JWT)
- [x] User Management: full CRUD (create, edit, delete) synced to Supabase DB
- [x] Query management pages (All Queries, My Queries, Escalation, SLA, Analytics, Reports)
- [x] .xlsx data upload with inline cycle management
- [x] Groq AI integration for query analysis
- [x] Document Verification (PDF parsing, field matching, OCR-safe extraction)
- [x] SPJIMR branding, Guided tour, Clear Data
- [x] Refactoring: Removed obsolete CycleManagementPage

## Database Schema (Supabase)
```sql
users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'AdCom Member',
  is_admin_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

## Credentials
- Admin: admin/admin123
- AdCom Member: member1/member123

## Backlog
- P2: Interview Logistics (greyed out placeholder in sidebar)
- Minor: Add aria-describedby to Dialog components for accessibility
