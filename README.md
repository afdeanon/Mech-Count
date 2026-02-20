# MechCount

AI-assisted blueprint analysis platform for detecting and counting mechanical symbols - built to solve a real, time-consuming problem faced by mechanical estimators every day. 

## The Problem

Mechanical estimators spend hours manually counting symbols across dense, multi-page blueprints before they can produce a bid. A single missed valve or fitting can throw off an entire estimate. This tedious, error-prone process is a known pain point in the mechanical contracting industry — and it's still done by hand at most firms.

MechCount automates it.

## Who This Is For

**Mechanical estimators** at HVAC, plumbing, and piping contractors who need to:
- Rapidly count and categorize mechanical symbols (valves, fittings, fixtures, etc.) across blueprint drawings
- Reduce manual counting errors that lead to inaccurate bids
- Keep a searchable history of past blueprint analyses tied to specific projects

Whether you're a one-person estimating department or part of a larger team, MechCount turns a 2-hour manual count into a sub-minute automated analysis.

## What This Project Does

1.  Upload blueprint images and run AI-powered symbol detection
2.  Group detections by category and summarize counts/confidence
3.  Review and manually correct any detections before finalizing
4.  Save analyses to project history for future reference
5.  Manage multiple projects and their associated blueprints

## Current Status & Known Limitations

MechCount is an active work-in-progress project. The full platform — authentication, file uploads, project management, detection review, and analytics — is functional end-to-end.

The area I'm currently improving is **AI detection accuracy**. The current model detects many mechanical symbols correctly, but struggles with:
- Detecting symbols that are densley packed or overlapping
- Placing bounding boxes precisely at the right location 

This is the core engineering challenge I'm determined to solve. My next steps are experimenting with fine-tuned vision models trained on mechanical drawing datasets and improving the prompt engineering around spatial localization.

Everything outside of detection accuracy — the upload flow, manual correction tools, charts, and project history — works as intended.


## Demo

**MechCount Full Demo Video**

<p align="center">
  <a href="https://youtu.be/HYlSyUR6CBI?si=2FYBLaiUJLThkIma">
    <img src="https://img.youtube.com/vi/HYlSyUR6CBI/maxresdefault.jpg" alt="Watch MechCount full demo" width="920" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/HYlSyUR6CBI?si=2FYBLaiUJLThkIma">Play full demo video</a>
</p>

## Feaures:
1. ***Upload Blueprint***- Upload mechanical blueprints as image files and detect symbols using AI.
2. ***Add, Edit, Move, or Delete Symbols*** - Modify blueprint symbol detections directly on a blueprint

4. ***Blueprint History*** - View recently uploaded blueprints, browse through user history, search for an uploaded blueprint.
5. ***Blueprint Details & Analysis*** - Edit blueprint data, review AI-generated symbols analysis, and make final adjustments to detections before saving. Export structured blueprint data as a CSV file for use in estimating tools or spreadsheets. 
6. ***Project Management*** - Create and manage projects that group related blueprints. Blueprints can be uploaded directly into a project or added later to maintain organized estimating workflows.

## Video Walkthroughs

### 1) Upload Blueprint
<a href="https://youtu.be/nAkwM4y8Se8">
  <img src="https://img.youtube.com/vi/nAkwM4y8Se8/maxresdefault.jpg" alt="Upload Blueprint demo" width="920" />
</a>

[Play video](https://youtu.be/nAkwM4y8Se8)

### 2) AI Symbol Detection & Analysis
<a href="https://youtu.be/ZqeYG3nY_YY">
  <img src="https://img.youtube.com/vi/ZqeYG3nY_YY/maxresdefault.jpg" alt="Delete a Symbol, AI and Overall Analysis demo" width="920" />
</a>

[Play video](https://youtu.be/ZqeYG3nY_YY)

### 3) Review & Correct Detections
<a href="https://youtu.be/ZWPPgPOTw5U">
  <img src="https://img.youtube.com/vi/ZWPPgPOTw5U/maxresdefault.jpg" alt="Move and Add Symbols demo" width="920" />
</a>

[Play video](https://youtu.be/ZWPPgPOTw5U)


### 4) User Authentication
<a href="https://youtu.be/HbCndXqhEeM">
  <img src="https://img.youtube.com/vi/HbCndXqhEeM/maxresdefault.jpg" alt="User Authentication demo" width="920" />
</a>

[Play video](https://youtu.be/HbCndXqhEeM)

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
