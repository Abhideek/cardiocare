# CardioCare — AI Heart Disease Prediction System

A full-stack clinical web application where doctors run AI-powered cardiovascular risk assessments and publish results directly to patient dashboards.

---

## How It Works

CardioCare has two roles: **Doctor** and **Patient**.

The doctor logs in, registers patients, enters 13 clinical parameters (age, blood pressure, cholesterol, etc.), and triggers an AI risk prediction powered by a Random Forest model trained on the UCI Heart Disease dataset. The result — a risk score from 0–100% with a Low / Moderate / High category — is then published to the patient's dashboard with one click.

The patient logs in with their registered email and sees their published score, a trend chart built from all past analyses, an AI-generated diet plan matched to their risk level, clinical recommendations, and can download a full HTML medical report.

All patient data and published scores are saved to `localStorage` so everything persists across page refreshes and re-logins.

If the Python backend is unreachable, the frontend automatically falls back to a local JavaScript prediction model and labels the result clearly as a local estimate.

---

## Tech Stack

- **Frontend** — React 18, Vite, Tailwind CSS, Recharts
- **Backend** — Python FastAPI, Uvicorn
- **ML Model** — Scikit-Learn Random Forest Classifier
- **Dataset** — UCI Heart Disease (303 records, 13 features)
- **Storage** — Browser localStorage

---

## Project Structure

```
cardiocare/
├── cardiocare-frontend/
│   ├── src/
│   │   ├── CardioCare.jsx      # Full React app (all components in one file)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── cardiocare-backend/
    ├── api.py                  # FastAPI server with /predict and /health
    ├── train_model.py          # Trains and saves the ML model
    ├── requirements.txt
    └── models/                 # Auto-generated after running train_model.py
        ├── heart_model.pkl
        ├── scaler.pkl
        ├── scale_cols.pkl
        └── feature_names.pkl
```

---

## Backend Setup

Navigate to the backend folder:

```bash
cd cardiocare-backend
```

Create and activate a virtual environment:

```bash
# macOS / Linux
python -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Train the ML model (only needs to be done once — creates the `models/` folder):

```bash
python train_model.py
```

Start the API server:

```bash
uvicorn api:app --reload --port 8000
```

The API runs at `http://localhost:8000`. Interactive docs are at `http://localhost:8000/docs`.

---

## Frontend Setup

Create a new Vite + React project:

```bash
npm create vite@latest cardiocare-frontend -- --template react
cd cardiocare-frontend
```

Install dependencies:

```bash
npm install recharts framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Start the development server:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Usage Guide

### As a Doctor

1. Go to `http://localhost:5173` and click Doctor Login
2. Sign in with any `@hospital.com` email and a password of 6+ characters
3. Go to Patient List and click Add Patient to register a new patient
4. Go to AI Analysis, select a patient from the left panel, fill in the 13 clinical fields, and click Analyze & Predict Risk
5. When the result appears, click Publish to Patient to push the score to their dashboard
6. The patient can now log in with their registered email to see their result

### As a Patient

1. Go to `http://localhost:5173` and click Patient Login
2. Sign in with the email address your doctor registered you with
3. View your risk score and trend chart in Health Overview
4. Browse your Diet Plan and Recommendations tabs
5. Click Download Report to save a full HTML medical report to your device


