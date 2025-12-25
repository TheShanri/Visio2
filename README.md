# VISIO Monorepo

This repository contains a minimal frontend and backend for the VISIO MVP.

## Project structure

- `frontend/`: Vite + React + TypeScript app that calls the backend health endpoint.
- `backend/`: Flask API exposing a `/health` route with configurable CORS.

## Setup

### Backend

1. Create a virtual environment (optional) and install dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Configure allowed origins (optional):

   ```bash
   cp .env.example .env  # adjust ALLOWED_ORIGINS as needed
   ```

3. Run the backend on port 8000:

   ```bash
   python app.py
   ```

### Frontend

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure the API URL (optional):

   ```bash
   cp .env.example .env  # ensure VITE_API_URL points to the backend
   ```

3. Run the frontend on port 5173:

   ```bash
   npm run dev
   ```

Navigate to `http://localhost:5173` to view the app. It will call `VITE_API_URL/health` and display the backend status.
