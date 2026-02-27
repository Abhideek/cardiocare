"""
CardioCare - Heart Disease Risk Model Training Script
Dataset: UCI Heart Disease Dataset
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.pipeline import Pipeline
import joblib
import os

# ─────────────────────────────────────────────
# 1. Load / Synthesize UCI Heart Disease Data
# ─────────────────────────────────────────────
# In production: pd.read_csv("heart.csv")
# Here we generate a realistic synthetic version for portability
np.random.seed(42)
n = 1000

def synthesize_uci():
    age        = np.random.randint(29, 77, n)
    sex        = np.random.randint(0, 2, n)
    cp         = np.random.randint(0, 4, n)          # chest pain type 0-3
    trestbps   = np.random.randint(94, 200, n)       # resting blood pressure
    chol       = np.random.randint(126, 564, n)      # serum cholesterol
    fbs        = (np.random.rand(n) > 0.85).astype(int)  # fasting blood sugar >120
    restecg    = np.random.randint(0, 3, n)          # resting ECG 0-2
    thalach    = np.random.randint(71, 202, n)       # max heart rate
    exang      = np.random.randint(0, 2, n)          # exercise-induced angina
    oldpeak    = np.round(np.random.uniform(0, 6.2, n), 1)  # ST depression
    slope      = np.random.randint(0, 3, n)          # slope of peak exercise ST
    ca         = np.random.randint(0, 4, n)          # number of major vessels
    thal       = np.random.choice([1, 2, 3], n)      # thalassemia type

    # Simulate realistic target (disease probability)
    risk_score = (
        0.03 * (age - 29) +
        0.4  * sex +
        0.3  * (3 - cp) +
        0.01 * (trestbps - 94) / 106 +
        0.005 * (chol - 126) / 438 +
        0.2  * fbs +
        -0.01 * (thalach - 71) / 131 +
        0.4  * exang +
        0.2  * oldpeak / 6.2 +
        0.3  * ca / 3 +
        0.3  * (thal - 1) / 2 +
        np.random.normal(0, 0.1, n)
    )
    target = (risk_score > np.median(risk_score)).astype(int)

    df = pd.DataFrame({
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps,
        'chol': chol, 'fbs': fbs, 'restecg': restecg, 'thalach': thalach,
        'exang': exang, 'oldpeak': oldpeak, 'slope': slope, 'ca': ca,
        'thal': thal, 'target': target
    })
    return df

df = synthesize_uci()
print(f"Dataset shape: {df.shape}")
print(f"Target distribution:\n{df['target'].value_counts()}")

# ─────────────────────────────────────────────
# 2. Preprocessing
# ─────────────────────────────────────────────
FEATURES = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
            'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
SCALE_COLS = ['trestbps', 'chol', 'thalach', 'oldpeak', 'age']

X = df[FEATURES].copy()
y = df['target']

# Handle missing values
X.fillna(X.median(), inplace=True)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ─────────────────────────────────────────────
# 3. Train Random Forest Classifier
# ─────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = X_train.copy()
X_test_scaled  = X_test.copy()

X_train_scaled[SCALE_COLS] = scaler.fit_transform(X_train[SCALE_COLS])
X_test_scaled[SCALE_COLS]  = scaler.transform(X_test[SCALE_COLS])

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    min_samples_leaf=5,
    random_state=42,
    class_weight='balanced'
)
model.fit(X_train_scaled, y_train)

# Evaluation
y_pred = model.predict(X_test_scaled)
y_prob = model.predict_proba(X_test_scaled)[:, 1]
print("\n── Model Evaluation ──")
print(classification_report(y_test, y_pred))
print(f"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")

# ─────────────────────────────────────────────
# 4. Save Artifacts
# ─────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/heart_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")
joblib.dump(SCALE_COLS, "models/scale_cols.pkl")
joblib.dump(FEATURES, "models/feature_names.pkl")

print("\n✅ Saved: models/heart_model.pkl, models/scaler.pkl")
print("Run train_model.py first, then start the API with: uvicorn api:app --reload")
