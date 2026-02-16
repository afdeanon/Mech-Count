# MechCount

AI-assisted blueprint analysis platform for detecting and counting mechanical symbols.

## What This Project Does

- Upload blueprint images and run AI-powered symbol detection
- Group detections by category and summarize counts/confidence
- Save analyses to project history
- Manage projects and historical blueprints

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind, Recharts, Firebase Auth
- Backend: Node.js, Express, TypeScript, MongoDB (Mongoose)
- Infra services: Firebase Admin, AWS S3, OpenAI API

## Architecture

1. Frontend uploads blueprint + metadata to backend.
2. Backend stores image (S3), persists metadata (MongoDB), and runs AI analysis.
3. Frontend reads blueprint/project resources via authenticated API endpoints.

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance
- Firebase project + service account
- AWS S3 bucket + credentials
- OpenAI API key

## Quick Start (Local)

1. Install dependencies:
   ```bash
   npm ci
   npm ci --prefix backend
   ```
2. Create env files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
3. Fill required env values in `.env` and `backend/.env`.
4. Start backend:
   ```bash
   npm run backend:dev
   ```
5. Start frontend:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173`.

## Environment Variables

Frontend (`.env`):
- `VITE_API_BASE_URL` (for example `http://localhost:3000`)
- Firebase client variables (`VITE_FIREBASE_*`)

Backend (`backend/.env`):
- `PORT`, `FRONTEND_URL`, `NODE_ENV`
- `MONGODB_URI`
- Firebase admin variables
- AWS S3 variables
- `OPENAI_API_KEY`

## Scripts

Frontend:
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check` (lint + typecheck + frontend build + backend build)

Backend:
- `npm run backend:dev`
- `npm run backend:build`

## Quality Gates

The repository includes GitHub Actions CI at `.github/workflows/ci.yml`:
- Frontend lint + build
- Backend TypeScript build

## Deployment Notes

1. Deploy backend first and expose `https://your-api-domain`.
2. Set frontend `VITE_API_BASE_URL=https://your-api-domain`.
3. Configure backend `FRONTEND_URL` to the deployed frontend origin.
4. Verify `/health` and authenticated routes.

## Suggested Next Upgrades

- Add automated API integration tests
- Add structured logging and request IDs
- Add metrics dashboards (latency/error rate)
- Add rate limiting and API abuse protection
