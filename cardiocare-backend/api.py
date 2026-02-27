"""
CardioCare FastAPI Prediction Server
Run:  uvicorn api:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Literal
import joblib
import numpy as np
import pandas as pd
import os

# ─────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────
app = FastAPI(
    title="CardioCare Prediction API",
    description="AI-powered heart disease risk prediction using UCI dataset",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Load Model Artifacts
# ─────────────────────────────────────────────
MODEL_DIR = "models"

try:
    model      = joblib.load(os.path.join(MODEL_DIR, "heart_model.pkl"))
    scaler     = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    scale_cols = joblib.load(os.path.join(MODEL_DIR, "scale_cols.pkl"))
    features   = joblib.load(os.path.join(MODEL_DIR, "feature_names.pkl"))
    print("✅ Model artifacts loaded successfully")
except FileNotFoundError:
    print("⚠️  Model files not found. Run train_model.py first.")
    model = scaler = scale_cols = features = None


# ─────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────
class PredictRequest(BaseModel):
    age:      int   = Field(..., ge=1,  le=120, description="Patient age in years")
    sex:      int   = Field(..., ge=0,  le=1,   description="0=Female, 1=Male")
    cp:       int   = Field(..., ge=0,  le=3,   description="Chest pain type (0-3)")
    trestbps: int   = Field(..., ge=80, le=250, description="Resting blood pressure (mmHg)")
    chol:     int   = Field(..., ge=100,le=600, description="Serum cholesterol (mg/dL)")
    fbs:      int   = Field(..., ge=0,  le=1,   description="Fasting blood sugar >120: 1=True")
    restecg:  int   = Field(..., ge=0,  le=2,   description="Resting ECG result (0-2)")
    thalach:  int   = Field(..., ge=60, le=220, description="Maximum heart rate achieved")
    exang:    int   = Field(..., ge=0,  le=1,   description="Exercise induced angina 1=Yes")
    oldpeak:  float = Field(..., ge=0,  le=7.0, description="ST depression induced by exercise")
    slope:    int   = Field(..., ge=0,  le=2,   description="Slope of peak exercise ST (0-2)")
    ca:       int   = Field(..., ge=0,  le=4,   description="Number of major vessels (0-4)")
    thal:     int   = Field(..., ge=1,  le=3,   description="Thalassemia: 1=Normal, 2=Fixed, 3=Reversible")
    
    patient_name: str = Field("", description="Optional: patient name for report")

    class Config:
        schema_extra = {
            "example": {
                "age": 52, "sex": 1, "cp": 0, "trestbps": 125,
                "chol": 212, "fbs": 0, "restecg": 1, "thalach": 168,
                "exang": 0, "oldpeak": 1.0, "slope": 2, "ca": 2,
                "thal": 3, "patient_name": "John Doe"
            }
        }


class PredictResponse(BaseModel):
    risk_score:    int
    risk_category: Literal["Low Risk", "Moderate Risk", "High Risk"]
    probability:   float
    confidence:    str
    diet_plan:     str
    recommendations: list[str]
    patient_name:  str


# ─────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────
def get_risk_category(prob: float) -> str:
    if prob < 0.35:  return "Low Risk"
    if prob < 0.65:  return "Moderate Risk"
    return "High Risk"


def get_diet_plan(category: str) -> str:
    plans = {
        "Low Risk":      "Balanced Mediterranean Diet — Focus on whole grains, lean proteins, fruits, vegetables, and healthy fats. Limit processed foods and refined sugars.",
        "Moderate Risk": "Heart-Healthy Diet — Reduce saturated fats and sodium. Increase omega-3 fatty acids (salmon, walnuts, flaxseed). Aim for 5 servings of fruits/vegetables daily.",
        "High Risk":     "DASH Diet (Strict Low Sodium) — Severely limit sodium (<1500mg/day), saturated fats, and cholesterol. Eliminate processed foods. Consult a registered dietitian immediately.",
    }
    return plans[category]


def get_recommendations(category: str, data: PredictRequest) -> list[str]:
    recs = []
    if data.trestbps > 140:
        recs.append("Blood pressure elevated — consult cardiologist for hypertension management")
    if data.chol > 240:
        recs.append("High cholesterol detected — consider lipid-lowering therapy")
    if data.fbs == 1:
        recs.append("Elevated fasting blood sugar — monitor for diabetes risk")
    if data.exang == 1:
        recs.append("Exercise-induced angina present — avoid strenuous activity until evaluated")
    if category == "High Risk":
        recs.append("URGENT: Schedule immediate cardiology consultation")
        recs.append("Begin daily aspirin therapy (consult physician first)")
    elif category == "Moderate Risk":
        recs.append("Schedule follow-up cardiac screening within 3 months")
        recs.append("Begin supervised cardiac rehabilitation program")
    else:
        recs.append("Maintain current healthy lifestyle")
        recs.append("Annual cardiac checkup recommended")
    return recs or ["Continue regular health monitoring"]


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "CardioCare API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run train_model.py first."
        )
    
    # Build feature DataFrame
    input_dict = {
        "age": req.age, "sex": req.sex, "cp": req.cp,
        "trestbps": req.trestbps, "chol": req.chol, "fbs": req.fbs,
        "restecg": req.restecg, "thalach": req.thalach, "exang": req.exang,
        "oldpeak": req.oldpeak, "slope": req.slope, "ca": req.ca, "thal": req.thal
    }
    df_input = pd.DataFrame([input_dict], columns=features)
    
    # Scale numerical features
    df_scaled = df_input.copy()
    df_scaled[scale_cols] = scaler.transform(df_input[scale_cols])
    
    # Predict
    proba     = float(model.predict_proba(df_scaled)[0][1])
    category  = get_risk_category(proba)
    risk_score = int(round(proba * 100))
    
    # Confidence based on distance from 0.5
    distance = abs(proba - 0.5)
    if distance > 0.35:   confidence = "Very High"
    elif distance > 0.2:  confidence = "High"
    elif distance > 0.1:  confidence = "Moderate"
    else:                 confidence = "Low"
    
    return PredictResponse(
        risk_score    = risk_score,
        risk_category = category,
        probability   = round(proba, 4),
        confidence    = confidence,
        diet_plan     = get_diet_plan(category),
        recommendations = get_recommendations(category, req),
        patient_name  = req.patient_name or "Unknown"
    )


# ─────────────────────────────────────────────
# Run (development)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
