# StudentOS Backend

Scalable modular monolith backend for StudentOS using Node.js, Express, TypeScript, MongoDB, Redis, and Zod.

## Why This Architecture

- Modular monolith first: fast iteration with clear bounded contexts.
- Layered modules: routes, controllers, services, and models/repositories.
- MongoDB-first design: references for scalable relationships and selective embedding where reads benefit.
- Microservice-ready boundaries: analytics and AI modules can be extracted later.

## Structure

src/
- modules/
  - auth/
  - dsa/
  - planner/
  - applications/
  - resume/
  - analytics/
  - ai/
- models/
- shared/
  - middleware/
  - utils/
  - constants/
- config/
- database/
- app.ts
- server.ts

## Data Modeling Strategy

### Referenced Collections (scalable, multi-entity relationships)
- users
- problems (global/static)
- userProblems (user dynamic progress)
- tasks
- applications
- resumes
- generatedRoadmaps

### Embedding Guidance
- applications.notes kept embedded as string array (small bounded field).
- resume.content embedded (single document payload) for read-heavy resume retrieval.

### Why userProblems Is Separate
- problems are reusable global metadata.
- userProblems handles user-specific state: attempts, status, lastSolvedAt.
- Enables efficient user-scoped analytics with indexes and aggregations.

## API Conventions

- Versioning: /api/v1
- Standard response shape:

{
  "success": true,
  "data": {},
  "error": null
}

## Main Endpoints

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET /api/v1/dsa/problems
- GET /api/v1/dsa/user-problems
- POST /api/v1/dsa/user-problems
- GET /api/v1/planner/tasks
- POST /api/v1/planner/tasks
- PATCH /api/v1/planner/tasks/:taskId/completed
- GET /api/v1/applications
- POST /api/v1/applications
- GET /api/v1/resume
- POST /api/v1/resume
- GET /api/v1/analytics/weekly-solved
- GET /api/v1/analytics/topic-breakdown
- GET /api/v1/analytics/weak-topics
- GET /api/v1/analytics/streak
- POST /api/v1/ai/roadmap

## Aggregation Strategy

Implemented in analytics module using pipelines with:
- $match for user and status filtering
- $group for weekly/topic aggregations
- $project for response shaping
- $sort for deterministic dashboard output

Weak topic detection uses score:
- weaknessScore = reviseCount - solvedCount

## Streak Strategy

Hybrid approach:
- Source of truth: userProblems solved activity
- Cache: Redis key per user (currentStreak, lastActiveDate)
- TTL based invalidation for fast dashboard reads

## Indexing Strategy

Applied indexes prioritize read-heavy filters:
- userProblems: (userId, createdAt), (userId, status), (userId, problemId unique)
- tasks: (userId, dueDate), (userId, completed)
- applications: (userId, status), (userId, createdAt)
- resumes: (userId, updatedAt)
- common identity indexes: users.email

## Security and Reliability

- JWT access + refresh token flow
- Bcrypt password hashing
- Rate limiting via express-rate-limit
- Centralized error handling
- Zod request validation
- Helmet + CORS

## Performance

- Redis caching for expensive analytics and streak reads
- Pagination with page/limit and skip
- Lean model separation to avoid heavy joins

## Local Setup

1. Copy .env.example to .env and fill values.
  - Set CORS_ORIGIN to your frontend URL (for local dev: http://localhost:3000).
  - For Upstash, set REDIS_URL using the TLS URL from your Upstash dashboard:
    rediss://default:<UPSTASH_REDIS_PASSWORD>@<UPSTASH_REDIS_HOST>:6379
  - For Brevo email delivery, set BREVO_SMTP_USER and BREVO_SMTP_PASS in .env.
  - For dev email diagnostics endpoint, set EMAIL_DEBUG_KEY in .env.
  - For S3 resume uploads in local development, provide AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or use another valid AWS credential source).
2. Install dependencies:
   npm install
3. Run development server:
   npm run dev

## Email Diagnostics (Dev Only)

- Endpoint: GET /health/email
- Available only when NODE_ENV=development
- Protected with EMAIL_DEBUG_KEY via either:
  - Header: x-email-debug-key: <your key>
  - Query: ?key=<your key>
- Optional recipient query: ?to=<email>
  - If omitted, BREVO_SMTP_USER is used.

Example:

curl "http://localhost:8080/health/email?key=your_debug_key&to=you@example.com"

## Deployment

- API containerized with Docker (recommended)
- MongoDB Atlas for managed document database
- Upstash Redis for low-latency cache/streak state
- Deploy app service to EC2, ECS, or any container runtime

## Future Scale Plan

- Extract analytics module to analytics service.
- Extract ai module to ai service.
- Introduce BullMQ for async workloads:
  - heavy aggregation refresh
  - AI roadmap generation queues
- Keep shared auth and user identity contracts stable via versioned APIs.
