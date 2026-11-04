# BookLeaf Royalty Desk

### Author Royalty Management & Operations Platform

A full-stack, role-based royalty management platform that enables authors to track book performance, sales, earnings and payouts, while providing administrators with a centralized operations console to manage authors and automate royalty-summary notifications.

Built with **React, TypeScript, Tailwind CSS, Node.js, Express, PostgreSQL, Prisma ORM, Docker and n8n**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [Application Architecture & Data Flow](#5-application-architecture--data-flow)
6. [Database Design](#6-database-design)
7. [Project Structure](#7-project-structure)
8. [Technology Stack](#8-technology-stack)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Royalty Summary Automation](#10-royalty-summary-automation)
11. [Installation & Local Setup](#11-installation--local-setup)
12. [Environment Configuration](#12-environment-configuration)
13. [Running the Application](#13-running-the-application)
14. [CI/CD & Deployment](#14-cicd--deployment)
15. [Important Engineering Decisions](#15-important-engineering-decisions)
16. [Limitations & Future Improvements](#16-limitations--future-improvements)
17. [Assignment Coverage](#17-assignment-coverage)

---

# 1. Project Overview

BookLeaf Royalty Desk is a two-sided author royalty management platform designed to simplify royalty tracking and administrative operations.

The platform provides two distinct experiences:

**Author Portal**

Authors can securely access their individual dashboards to monitor their published books, sales performance, royalty earnings, paid amounts and pending payouts.

**Admin Operations Console**

Administrators can manage authors, inspect their royalty performance, filter accounts based on payout status and trigger automated royalty-summary notifications individually or in bulk.

The platform also integrates with **n8n** to orchestrate royalty-summary generation through a secure webhook-based workflow.

### Core objectives

- Provide transparent royalty visibility to authors.
- Centralize author and book management.
- Automate royalty-summary generation.
- Maintain an auditable notification history.
- Enforce role-based access control.
- Build a maintainable, modular full-stack architecture.

### Assignment implementation note

The assignment originally references Bubble.io and n8n. This implementation uses the requested code-based stack (React, Tailwind CSS, Express, TypeScript, PostgreSQL and Prisma) while retaining the n8n automation integration.

This repository is a code-based implementation, not a Bubble.io application.

---

# 2. Problem Statement

Traditional royalty management often involves fragmented spreadsheets, manual calculations, delayed communication and limited visibility into author earnings.

This creates several problems:

- Authors cannot easily track their earnings and pending payments.
- Administrators need to manually inspect individual author records.
- Royalty-summary communication becomes repetitive.
- Notification failures are difficult to audit.
- There is no centralized view of author performance and payout status.

### Proposed solution

BookLeaf Royalty Desk introduces a centralized platform with:

1. Role-specific dashboards.
2. Structured royalty and sales data.
3. Author-level financial summaries.
4. Administrative search and filtering.
5. Automated notification workflows.
6. Persistent notification and failure logs.

---

# 3. Key Features

## 3.1 Author Portal

A dedicated dashboard for authors to monitor their publishing and royalty information.

**Authentication**
- Email and password login.
- JWT-based authentication.
- Secure password hashing using bcrypt.
- Author-specific account access.

**Book Management & Visibility**

Authors can view:
- Book title and ISBN.
- Genre and publication status.
- Publication date.
- Maximum retail price (MRP).
- Print partner.
- Distribution platforms.
- Royalty earned per copy.

**Royalty Dashboard**

The dashboard provides:
- Total copies sold.
- Total royalty earned.
- Total amount paid.
- Outstanding royalty balance.
- Last payout information.
- Consolidated royalty summaries.

**Payout Status**

The platform distinguishes between:
- Paid royalties.
- Pending royalties.
- Overdue royalties.
- Books still in production.

A published title with an outstanding balance is marked overdue when the last payout was more than 90 days ago, or when no payout is recorded and the title is older than 90 days.

## 3.2 Admin Operations Console

A centralized administrative interface for managing author accounts and royalty operations.

**Author Directory**
- View registered authors.
- Search by author name or email.
- Access author profile information.
- Inspect book portfolios.
- View individual royalty summaries.

**Royalty Management**
- View total paid royalties.
- View pending balances.
- Filter authors by payout status.
- Identify overdue royalty accounts.
- Inspect book-level financial information.

**Notification Management**
- Trigger royalty summaries for individual authors.
- Trigger summaries in bulk for authors with pending royalties.
- View generated notification content.
- Monitor processing status.
- Inspect timestamps and failure messages.

## 3.3 Automated Royalty Notifications

The n8n integration automates the royalty-summary generation process.

Features include:
- Secure webhook communication.
- Author-specific royalty snapshot retrieval.
- AI-assisted email drafting.
- Deterministic fallback when no AI key is configured.
- Success and failure callbacks.
- Retry handling.
- Idempotency protection.
- Persistent notification history.

---

# 4. System Architecture

BookLeaf follows a modular, service-oriented architecture within a Turborepo monorepo.

The application separates presentation, business logic, data persistence and workflow automation.

## 4.1 High-Level Architecture

```mermaid
flowchart TB
    U[Users]

    subgraph FRONTEND["Presentation Layer"]
        A[Author Portal]
        B[Admin Console]
        C[React + TypeScript + Tailwind]
    end

    subgraph BACKEND["Application Layer"]
        D[Express REST API]
        E[JWT Authentication]
        F[Role-Based Authorization]
        G[Business Logic]
        H[Notification Service]
    end

    subgraph DATA["Data Layer"]
        I[Prisma ORM]
        J[(PostgreSQL)]
    end

    subgraph AUTOMATION["Automation Layer"]
        K[n8n Workflow]
        L[Secret Validation]
        M[Royalty Snapshot]
        N[AI Summary Generation]
        O[Success / Failure Callback]
    end

    U --> A
    U --> B
    A --> C
    B --> C
    C -->|HTTP Requests| D

    D --> E
    E --> F
    F --> G
    G --> I
    I --> J

    G --> H
    H -->|Secure Webhook| K
    K --> L
    L --> M
    M --> D
    K --> N
    N --> O
    O --> D

    D -->|API Responses| C
```

### Architecture explanation

**1. Presentation Layer**

The React application provides separate interfaces for authors and administrators.

The frontend communicates with the Express backend through HTTP requests.

**2. Application Layer**

The Express API handles:
- Authentication.
- Request validation.
- Authorization.
- Author and book operations.
- Royalty calculations and summaries.
- Notification orchestration.

**3. Data Layer**

Prisma ORM provides type-safe database access to PostgreSQL.

The relational database stores users, books, sales, royalty records and notification events.

**4. Automation Layer**

n8n manages the royalty-summary workflow.

It receives authenticated webhook requests, retrieves author information, generates notification content and reports the execution result back to the API.

## 4.2 Architectural Design Principles

The architecture follows these principles:

- Separation of concerns.
- Single source of truth for application data.
- Explicit authorization at the API boundary.
- Reusable business logic.
- Database-backed auditability.
- Idempotent workflow execution.
- Independent frontend and backend development.
- Containerized infrastructure.

---

# 5. Application Architecture & Data Flow

## 5.1 Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as Express API
    participant Auth as Authentication
    participant DB as PostgreSQL

    User->>UI: Enter email and password
    UI->>API: POST login request
    API->>Auth: Validate credentials
    Auth->>DB: Find user by email
    DB-->>Auth: User record
    Auth->>Auth: Verify bcrypt password hash
    Auth->>Auth: Generate JWT
    Auth-->>UI: Authentication response
    UI-->>User: Open role-specific dashboard
```

## 5.2 Author Dashboard Data Flow

1. Author logs into the application.
2. Frontend sends authenticated API requests.
3. Backend validates the JWT.
4. Backend identifies the authenticated user.
5. Prisma retrieves only that author's records.
6. The API aggregates the required book, sales and royalty information.
7. The frontend renders the dashboard.

Author data is scoped to the authenticated account. An author cannot access another author's information simply by changing a request parameter.

## 5.3 Admin Operations Flow

1. Administrator authenticates.
2. Backend validates the JWT and ADMIN role.
3. Admin requests the author directory.
4. Backend retrieves author and royalty information.
5. Search and payout filters narrow the results.
6. Admin can inspect an author or initiate a notification.
7. Every notification request is recorded for auditing.

## 5.4 Royalty Notification Flow

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin Console
    participant API as Express API
    participant DB as PostgreSQL
    participant N8N as n8n Workflow
    participant AI as AI Provider

    Admin->>UI: Trigger royalty summary
    UI->>API: Request notification
    API->>API: Validate admin authorization
    API->>DB: Create notification record
    DB-->>API: Notification ID

    API->>N8N: Secure webhook request
    N8N->>N8N: Validate shared secret
    N8N->>API: Request author snapshot
    API->>DB: Fetch fresh author data
    DB-->>API: Royalty and book information
    API-->>N8N: Author snapshot

    N8N->>AI: Generate summary draft
    AI-->>N8N: Generated content

    N8N->>API: Success callback
    API->>DB: Update notification status
    DB-->>API: Updated notification

    API-->>UI: Updated notification information
    UI-->>Admin: Display summary and status
```

If AI is not configured, the application uses deterministic, fact-based summary generation.

If a configured AI provider fails, the workflow records the notification as failed.

---

# 6. Database Design

PostgreSQL is used as the primary relational database, with Prisma ORM providing schema management and database access.

## 6.1 Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ BOOK : owns
    USER ||--o{ NOTIFICATION : receives
    BOOK ||--o{ SALE : generates
    BOOK ||--o{ ROYALTY : accumulates

    USER {
        String id PK
        String sourceId UK
        String name
        String email UK
        String passwordHash
        Role role
        String city
        String phone
        DateTime joinedAt
        DateTime createdAt
    }

    BOOK {
        String id PK
        String sourceId UK
        String authorId FK
        String title
        String isbn UK
        String genre
        BookStatus status
        Decimal mrp
        Decimal royaltyPerCopy
        String platform
        DateTime publishedAt
    }

    SALE {
        String id PK
        String bookId FK
        String platform
        Int units
        String period
        DateTime createdAt
    }

    ROYALTY {
        String id PK
        String bookId FK
        Decimal amount
        Decimal paidAmount
        String period
        DateTime lastPayoutAt
    }

    NOTIFICATION {
        String id PK
        String authorId FK
        NotificationStatus status
        String subject
        String body
        String error
        String idempotencyKey UK
        String triggeredBy
        DateTime createdAt
        DateTime completedAt
    }
```

## 6.2 Entity Responsibilities

| Entity | Responsibility |
|---|---|
| User | Stores admin and author accounts |
| Book | Stores author-owned book information |
| Sale | Stores sales information by platform and period |
| Royalty | Stores royalty earnings and paid amounts |
| Notification | Stores generated summaries and workflow history |

## 6.3 Relationships

- One author can own multiple books.
- Every book belongs to exactly one author.
- One book can have multiple sales records.
- One book can have multiple royalty records.
- One author can receive multiple notifications.

## 6.4 Database Optimization

The schema uses indexes and constraints to improve data integrity and query efficiency.

Examples:

- Unique user email.
- Unique book ISBN.
- Unique source identifiers.
- Composite uniqueness for book, sales period and platform.
- Index on author ID and book status.
- Index on author ID and notification creation time.
- Index on notification status and creation time.

Foreign keys enforce relational integrity, with cascading deletes where configured.

## 6.5 Financial Data Handling

Financial amounts use PostgreSQL `Decimal` rather than floating-point types to avoid precision problems in monetary calculations.

The supplied assignment fixture contains lifetime aggregates rather than detailed historical transactions.

Therefore, imported sales and royalty totals are stored using the `SOURCE_AGGREGATE` period identifier.

The application does not invent individual payout transactions from aggregate data.

---

# 7. Project Structure

The repository uses an npm workspace-based Turborepo monorepo.

```text
BookLeaf-Royalty-Desk/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── .turbo/
│
├── client/
│   ├── src/
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── data/
│   │   │   └── bookleaf_sample_data.json
│   │   ├── migrations/
│   │   │   └── 20261104000000_init/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── lib/
│   │   │   └── db.ts
│   │   ├── routes/
│   │   │   └── api.ts
│   │   └── index.ts
│   │
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│   └── system-architecture.md
│
├── n8n/
│   └── royalty-summary.workflow.json
│
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package-lock.json
├── package.json
├── README.md
└── turbo.json
```

### Folder Responsibilities

**client/**

Contains the React frontend.

Responsibilities:
- Author dashboard.
- Admin dashboard.
- Authentication screens.
- API integration.
- Responsive UI components.
- Book and royalty visualization.

**server/**

Contains the Express backend.

Responsibilities:
- REST API endpoints.
- JWT authentication.
- Role-based authorization.
- Request validation.
- Business logic.
- Database operations.
- Notification orchestration.

**server/prisma/**

Contains database-related files.

Responsibilities:
- Prisma schema.
- Database migrations.
- Sample fixture data.
- Idempotent seed script.

**server/src/lib/**

Contains shared backend utilities and infrastructure integrations, including the Prisma client.

**server/src/routes/**

Contains API route definitions and request handlers.

**n8n/**

Contains the exported royalty-summary automation workflow.

**docs/**

Contains technical documentation and system architecture details.

**.github/workflows/**

Contains CI and deployment automation.

**docker-compose.yml**

Defines the local infrastructure services and their dependencies.

**turbo.json**

Defines the Turborepo task graph and caching behavior.

---

# 8. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Component-based UI |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Responsive styling |
| Backend | Node.js | JavaScript runtime |
| API | Express.js | REST API |
| Validation | Zod | Request validation |
| Authentication | JWT | Stateless authentication |
| Password security | bcryptjs | Password hashing |
| Database | PostgreSQL 16 | Relational persistence |
| ORM | Prisma | Type-safe database access |
| Automation | n8n | Workflow orchestration |
| AI | OpenAI API | Summary drafting |
| Infrastructure | Docker | Containerization |
| Orchestration | Docker Compose | Local service management |
| Monorepo | Turborepo | Workspace orchestration |
| CI/CD | GitHub Actions | Automated builds and deployment |

---

# 9. Authentication & Authorization

The application implements role-based access control with two roles:

- `ADMIN`
- `AUTHOR`

### Authentication

1. User submits email and password.
2. Backend retrieves the account.
3. bcrypt verifies the password hash.
4. Backend generates a signed JWT.
5. Authenticated requests use the token.

### Authorization

**Admin permissions**
- View the author directory.
- Search and filter authors.
- Access author-level royalty details.
- Trigger individual summaries.
- Trigger bulk summaries.
- Inspect notification logs.

**Author permissions**
- Access their own profile.
- View their own books.
- View their own sales and royalties.
- Access their own notification information where supported.

Authorization is enforced on the backend, not just through frontend navigation or hidden UI controls.

### Security Measures

- Password hashing with bcrypt.
- JWT-based authentication.
- Zod request validation.
- Shared-secret validation for internal workflow requests.
- Database constraints.
- Server-side role checks.
- Secrets stored in environment variables.
- Provider credentials excluded from the frontend bundle.

---

# 10. Royalty Summary Automation

The royalty-summary feature uses n8n as a workflow orchestration layer.

## 10.1 Why n8n?

Instead of tightly coupling notification generation to the main API request lifecycle, the application delegates workflow orchestration to n8n.

This creates a clear separation between core application operations and external automation.

## 10.2 Workflow Steps

1. Admin triggers a royalty summary.
2. Express validates the admin request.
3. A notification record is created in PostgreSQL.
4. The API sends a secure webhook request to n8n.
5. n8n validates the shared secret.
6. n8n requests a fresh author snapshot from the protected API.
7. The workflow prepares the royalty-summary content.
8. OpenAI generates an email draft when configured.
9. The workflow calls the API with the execution result.
10. The notification record is updated with the result and timestamp.
11. Admin can inspect the generated content and status.

## 10.3 Notification Lifecycle

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> PROCESSING
    PROCESSING --> SUCCESS
    PROCESSING --> FAILED
    FAILED --> PROCESSING: Retry
    SUCCESS --> [*]
```

## 10.4 Reliability & Idempotency

The notification implementation includes:

- 30-second in-flight deduplication.
- Unique idempotency keys.
- Persistent notification records.
- Two workflow processing retries.
- Success and failure callbacks.
- Failure messages and timestamps.

These mechanisms help avoid duplicate notification requests and make failures visible to administrators.

## 10.5 AI Summary Generation

The generated royalty summary is based on supplied author and book data.

The workflow is designed to communicate:

- Published-book performance.
- Copies sold.
- Total royalty earned.
- Amount already paid.
- Pending balance.
- Quarterly-cycle and 45-day guidance for pending amounts.
- Acknowledgement when all royalties are paid.
- Production status for unpublished titles.

The AI prompt instructs the model to use supplied facts only and avoid inventing payment dates or promises.

**Important:** SMTP delivery is not enabled. The current implementation generates and stores notification drafts and exposes them through the operations console for review.

---

# 11. Installation & Local Setup

There are two ways to run the application locally.

## Option A: Docker Compose (Recommended)

### Prerequisites

- Docker Desktop.
- Docker Compose.
- Git.

### Step 1: Clone the repository

```bash
git clone https://github.com/Avichal296/Bookleaf2.git
cd Bookleaf2
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
```

Update the development secrets in `.env`.

### Step 3: Start all services

```bash
docker compose up --build -d
```

Docker Compose starts:

- PostgreSQL.
- Express API.
- React frontend.
- n8n workflow engine.

The API container applies Prisma migrations and imports the assignment fixture as part of the configured startup process.

### Step 4: Check service health

```bash
docker compose ps
```

### Step 5: Access the application

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:4000 |
| API Health | http://localhost:4000/health |
| n8n | http://localhost:5678 |

On the first n8n launch, create an owner account.

---

## Option B: Run Frontend & Backend Locally

Use this approach when actively developing or debugging the application.

### Prerequisites

- Node.js 22+
- npm
- Docker Desktop
- PostgreSQL 16+ (Docker is used below)

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Create environment configuration

```bash
cp .env.example .env
```

For local development, set the database URL to:

```env
DATABASE_URL=postgresql://bookleaf:bookleaf@localhost:5432/bookleaf?schema=public
```

If your Prisma commands execute from the `server/` workspace, also ensure the server can load its environment:

```bash
cp .env server/.env
```

Keep both environment files out of Git.

### Step 3: Start PostgreSQL

```bash
docker compose up -d db
```

Check database readiness:

```bash
docker compose exec db pg_isready -U bookleaf -d bookleaf
```

### Step 4: Generate Prisma Client

```bash
npm run db:generate
```

### Step 5: Apply migrations

```bash
npm run db:migrate
```

### Step 6: Import sample data

```bash
npm run db:seed
```

### Step 7: Start development servers

```bash
npm run dev
```

The frontend and backend run through Turborepo.

Typical local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

If Vite reports that port 5173 is already in use, it may select another port, such as 5174. Ensure `CLIENT_ORIGIN` matches the actual frontend origin and restart the API.

### Useful Development Commands

```bash
# Start both applications
npm run dev

# Start only backend
npm run dev:api

# Start only frontend
npm run dev:web

# Build all workspaces
npm run build

# Generate Prisma Client
npm run db:generate

# Apply database migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Stop Docker services
docker compose down
```

To stop Docker services without deleting persistent database volumes:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to delete the persistent volumes.

---

# 12. Environment Configuration

Create your local `.env` from `.env.example`.

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | JWT signing secret |
| WEBHOOK_SECRET | Shared secret for workflow communication |
| OPENAI_API_KEY | Optional AI provider API key |
| OPENAI_MODEL | AI model used for summary generation |
| N8N_ENCRYPTION_KEY | Persistent n8n encryption key |
| API_PORT | Backend API port |
| CLIENT_ORIGIN | Allowed frontend origin |
| SEED_ADMIN_EMAIL | Initial admin email |
| SEED_ADMIN_PASSWORD | Initial admin password |
| SEED_AUTHOR_PASSWORD | Initial author password |

### Security recommendations

- Never commit `.env` files.
- Use strong, unique secrets.
- Never expose JWT or webhook secrets to the frontend.
- Use managed secrets in production.
- Keep the n8n encryption key stable across restarts.

---

# 13. Running the Application

### Demo Admin Account

```text
Email: admin@bookleaf.local
Password: BookleafDemo2026!
```

### Demo Author Account

```text
Email: priya.sharma@email.com
Password: AuthorDemo2026!
```

The fixture contains 10 authors and 18 books.

The admin and author credentials are intended for local demonstration only. Change them before deploying an accessible environment.

### Suggested Application Walkthrough

1. Sign in as an author.
2. Review the author dashboard.
3. Inspect book details and royalty balances.
4. Verify that author data is account-scoped.
5. Sign out and log in as admin.
6. Open the author directory.
7. Search and filter authors by payout status.
8. Inspect an individual author profile.
9. Trigger a royalty-summary notification.
10. Inspect the generated notification content and status.
11. Open n8n and review the workflow execution.

---

# 14. CI/CD & Deployment

GitHub Actions provides automated validation and container publishing.

### CI Pipeline

The CI workflow performs:

1. Dependency installation.
2. Prisma Client generation.
3. TypeScript compilation.
4. Frontend and backend build verification.

It runs on repository pushes and pull requests as configured in `.github/workflows/ci.yml`.

### Deployment Pipeline

The deployment workflow builds and publishes API and web Docker images to GitHub Container Registry (GHCR) on the main branch.

Configure the repository variable:

```text
VITE_API_URL
```

Set it to the publicly accessible API URL.

Production deployments also require:

- PostgreSQL connection configuration.
- JWT signing secret.
- Webhook shared secret.
- n8n webhook URL.
- Stable n8n encryption key.
- Optional AI provider credentials.
- Correct frontend CORS origin.
- HTTPS-enabled service endpoints.

---

# 15. Important Engineering Decisions

## 15.1 Monorepo Architecture

The frontend and backend are maintained in one repository using npm workspaces and Turborepo.

**Why?**

- Shared project management.
- Centralized dependency installation.
- Consistent build orchestration.
- Easier local development.
- Independent workspace scripts.

## 15.2 PostgreSQL + Prisma

A relational database was selected because author, book, sales, royalty and notification information has well-defined relationships.

Prisma provides:
- Type-safe queries.
- Schema-driven development.
- Database migrations.
- Consistent relational operations.

## 15.3 Decimal for Financial Data

Royalty and MRP values use PostgreSQL Decimal fields instead of floating-point numbers.

This avoids floating-point precision issues in financial calculations.

## 15.4 Backend Authorization

Author access restrictions are enforced in the backend.

Frontend route guards and conditional rendering improve the experience, but they are not treated as security boundaries.

## 15.5 Workflow Separation

n8n handles the orchestration of royalty-summary generation instead of embedding all workflow steps inside the frontend or a single API handler.

This keeps the automation independently inspectable.

## 15.6 Idempotent Notifications

Unique idempotency keys and in-flight deduplication reduce accidental duplicate notification generation.

Notification records also preserve execution history for administrative review.

## 15.7 Source Data Integrity

The assignment fixture contains lifetime aggregate royalty and sales values.

The implementation preserves these figures rather than inventing historical payment records or individual sales transactions.

---

# 16. Limitations & Future Improvements

The current implementation focuses on the assignment's required workflows.

Potential future enhancements include:

- Actual SMTP/email provider integration.
- Detailed payout transaction history.
- Payment reconciliation.
- Exportable royalty statements in PDF.
- Advanced analytics and reporting.
- Pagination for large author directories.
- More granular audit logging.
- Rate limiting and observability improvements.
- Automated integration and end-to-end tests.
- Production-grade background job processing.
- Role and permission management beyond two fixed roles.

---

# 17. Assignment Coverage

| Requirement | Implementation |
|---|---|
| Author login | JWT authentication |
| Author-specific dashboard | React author portal |
| Book details | PostgreSQL + Prisma |
| Sales information | Sales records |
| Royalty calculations and summaries | Royalty records and aggregates |
| Paid and pending visibility | Author and admin dashboards |
| Admin author directory | Admin console |
| Author search | Directory search |
| Payout status filters | Operations console |
| Individual royalty summary | Notification trigger |
| Bulk royalty summary | Bulk trigger |
| Workflow automation | n8n |
| AI-assisted summary | OpenAI integration |
| Notification history | PostgreSQL notification log |
| Failure visibility | Notification error/status fields |
| Containerized setup | Docker Compose |
| Automated validation | GitHub Actions |

---

## Project Information

**Project:** BookLeaf Royalty Desk  
**Architecture:** Full-Stack Monorepo  
**Frontend:** React + TypeScript + Tailwind CSS  
**Backend:** Node.js + Express  
**Database:** PostgreSQL + Prisma ORM  
**Automation:** n8n  
**Infrastructure:** Docker + Docker Compose  
**CI/CD:** GitHub Actions

---

*BookLeaf Royalty Desk — Bringing transparency, visibility and automation to author royalty management.*
