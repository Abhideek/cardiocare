import { useState, useEffect, useRef, useCallback } from "react";
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart
} from "recharts";

// ─── Simulated ML prediction ───────────────────────────────────────────
function simulatePrediction(data) {
  const { age, sex, cp, trestbps, chol, fbs, thalach, exang, oldpeak, ca, thal } = data;
  let score =
    0.03 * ((age - 29) / 48) * 48 +
    0.4  * sex +
    0.3  * (3 - cp) +
    0.01 * ((trestbps - 94) / 106) +
    0.005 * ((chol - 126) / 438) +
    0.2  * fbs -
    0.15 * ((thalach - 71) / 131) +
    0.45 * exang +
    0.2  * (oldpeak / 6.2) +
    0.3  * (ca / 3) +
    0.35 * ((thal - 1) / 2);
  const prob = Math.min(0.97, Math.max(0.03, score / 3.2));
  const riskScore = Math.round(prob * 100);
  const category = prob < 0.35 ? "Low Risk" : prob < 0.65 ? "Moderate Risk" : "High Risk";
  return { risk_score: riskScore, risk_category: category, probability: prob };
}

function getDietPlan(category) {
  const plans = {
    "Low Risk": {
      title: "Balanced Mediterranean Diet",
      desc: "Focus on whole grains, lean proteins, fresh fruits and vegetables, and heart-healthy fats like olive oil.",
      items: ["Olive oil & avocados", "Fatty fish 3×/week", "Whole grain bread & legumes", "Daily fruits & vegetables", "Moderate red wine (optional)"]
    },
    "Moderate Risk": {
      title: "Heart-Healthy Protective Diet",
      desc: "Reduce saturated fats and sodium. Prioritize omega-3 fatty acids and antioxidant-rich foods.",
      items: ["Salmon, walnuts, flaxseed", "Sodium <2000mg/day", "5+ fruit & veggie servings", "Eliminate trans fats", "Oats & soluble fiber daily"]
    },
    "High Risk": {
      title: "DASH Diet — Strict Protocol",
      desc: "Severely restrict sodium (<1500mg/day), saturated fats, and dietary cholesterol. Consult a registered dietitian immediately.",
      items: ["Sodium <1500mg/day STRICTLY", "No processed/packaged foods", "Lean proteins only (no red meat)", "High potassium foods", "Daily BP monitoring required"]
    }
  };
  return plans[category] || plans["Low Risk"];
}

function getScoreColor(s) { return s < 35 ? "#4ade80" : s < 65 ? "#fb923c" : "#f43f5e"; }

// ─── Styles ────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060d1a; font-family: 'DM Sans', sans-serif; color: #e2e8f0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

  .btn { display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s;white-space:nowrap; }
  .btn-primary { background:linear-gradient(135deg,#0ea5e9,#2dd4bf);color:#fff;box-shadow:0 4px 20px rgba(14,165,233,.3); }
  .btn-primary:hover { transform:translateY(-1px);box-shadow:0 6px 28px rgba(14,165,233,.45); }
  .btn-outline { background:transparent;border:1.5px solid rgba(255,255,255,.13);color:#cbd5e1; }
  .btn-outline:hover { border-color:#0ea5e9;color:#0ea5e9;background:rgba(14,165,233,.06); }
  .btn-danger { background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.25);color:#f43f5e; }
  .btn-danger:hover { background:rgba(244,63,94,.2); }
  .btn-success { background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25);color:#4ade80; }
  .btn-success:hover { background:rgba(74,222,128,.2); }
  .btn-sm { padding:7px 14px;font-size:12.5px; }
  .btn-xs { padding:5px 10px;font-size:12px; }
  .btn-lg { padding:13px 30px;font-size:15px; }
  .btn:disabled { opacity:.45;cursor:not-allowed;transform:none !important; }
  .btn-icon { padding:8px;border-radius:8px; }

  .card { background:rgba(22,32,50,.88);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;backdrop-filter:blur(10px); }
  .card-glow { box-shadow:0 0 0 1px rgba(14,165,233,.12),0 20px 60px rgba(0,0,0,.5); }

  .input-field { width:100%;background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.09);border-radius:10px;padding:9px 13px;color:#e2e8f0;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s; }
  .input-field:focus { border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1); }
  .input-field::placeholder { color:#475569; }
  .input-field option { background:#1e293b; }
  .input-label { display:block;font-size:11.5px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px; }
  textarea.input-field { resize:vertical;min-height:80px;line-height:1.5; }

  /* ─ Landing ─ */
  .hero { position:relative;min-height:100vh;display:flex;flex-direction:column;overflow:hidden; }
  .hero-bg { position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(14,165,233,.15) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 80% 80%,rgba(45,212,191,.08) 0%,transparent 50%),#060d1a; }
  .hero-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 70% 70% at 50% 30%,black 30%,transparent 80%); }
  .top-nav { position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:1px solid rgba(255,255,255,.05); }
  .logo { display:flex;align-items:center;gap:10px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px;color:#fff; }
  .logo-icon { width:36px;height:36px;background:linear-gradient(135deg,#0ea5e9,#2dd4bf);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px; }
  .hero-content { position:relative;z-index:5;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 20px; }
  .hero-badge { display:inline-flex;align-items:center;gap:8px;background:rgba(14,165,233,.12);border:1px solid rgba(14,165,233,.25);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#0ea5e9;text-transform:uppercase;letter-spacing:.08em;margin-bottom:28px; }
  .hero-title { font-family:'Space Grotesk',sans-serif;font-size:clamp(34px,5.5vw,68px);font-weight:700;line-height:1.08;margin-bottom:22px;background:linear-gradient(135deg,#fff 30%,rgba(255,255,255,.55));-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
  .hero-sub { font-size:18px;color:#94a3b8;max-width:540px;line-height:1.7;margin-bottom:44px; }
  .feat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;padding:56px 40px;max-width:1160px;margin:0 auto; }
  .feat-card { padding:26px;border-radius:16px;background:rgba(22,32,50,.55);border:1px solid rgba(255,255,255,.06);transition:transform .2s,border-color .2s; }
  .feat-card:hover { transform:translateY(-3px);border-color:rgba(14,165,233,.25); }
  .feat-icon { width:46px;height:46px;background:linear-gradient(135deg,rgba(14,165,233,.18),rgba(45,212,191,.18));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:14px; }

  /* ─ Auth ─ */
  .auth-page { min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse 70% 60% at 50% 20%,rgba(14,165,233,.09),transparent 60%),#060d1a;padding:20px; }
  .tab-bar { display:flex;background:rgba(255,255,255,.04);border-radius:12px;padding:4px;margin-bottom:26px; }
  .tab { flex:1;padding:10px;border-radius:9px;border:none;background:transparent;color:#64748b;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s; }
  .tab.active { background:rgba(14,165,233,.14);color:#0ea5e9;box-shadow:0 0 0 1px rgba(14,165,233,.2); }

  /* ─ Dashboard ─ */
  .dash-layout { display:flex;min-height:100vh; }
  .sidebar { width:252px;flex-shrink:0;background:#0a1628;border-right:1px solid rgba(255,255,255,.055);display:flex;flex-direction:column;padding:22px 14px; }
  .sidebar-nav { display:flex;flex-direction:column;gap:3px;margin-top:28px;flex:1; }
  .nav-item { display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:10px;color:#64748b;font-weight:500;font-size:13.5px;cursor:pointer;transition:all .18s;border:none;background:transparent;text-align:left;width:100%; }
  .nav-item:hover { background:rgba(14,165,233,.06);color:#94a3b8; }
  .nav-item.active { background:rgba(14,165,233,.11);color:#0ea5e9;box-shadow:inset 3px 0 0 #0ea5e9; }
  .dash-main { flex:1;overflow-y:auto;padding:30px; }
  .page-title { font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:#fff;margin-bottom:3px; }
  .page-sub { color:#64748b;font-size:13.5px; }

  /* ─ Stats ─ */
  .stats-row { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px; }
  .stat-card { padding:18px 20px;border-radius:14px;background:rgba(22,32,50,.8);border:1px solid rgba(255,255,255,.06); }
  .stat-value { font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#fff; }
  .stat-label { font-size:11.5px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-top:3px; }

  /* ─ Patient Table ─ */
  .pt-table { width:100%;border-collapse:collapse; }
  .pt-table th { text-align:left;padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.07); }
  .pt-table td { padding:13px 14px;font-size:13.5px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.04); }
  .pt-table tr:hover td { background:rgba(14,165,233,.04); }
  .pt-table tr:last-child td { border-bottom:none; }

  /* ─ Badges ─ */
  .risk-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:100px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap; }
  .risk-low { background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.22); }
  .risk-moderate { background:rgba(251,146,60,.12);color:#fb923c;border:1px solid rgba(251,146,60,.22); }
  .risk-high { background:rgba(244,63,94,.12);color:#f43f5e;border:1px solid rgba(244,63,94,.22); }
  .risk-none { background:rgba(100,116,139,.1);color:#94a3b8;border:1px solid rgba(100,116,139,.2); }

  /* ─ Avatar ─ */
  .avatar { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0; }

  /* ─ Modal ─ */
  .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .modal { background:#0d1b2e;border:1px solid rgba(255,255,255,.1);border-radius:20px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease; }
  @keyframes slideUp { from { opacity:0;transform:translateY(18px); } to { opacity:1;transform:none; } }
  .modal-header { display:flex;align-items:center;justify-content:space-between;padding:22px 26px 18px;border-bottom:1px solid rgba(255,255,255,.07); }
  .modal-body { padding:24px 26px; }
  .modal-footer { padding:16px 26px 22px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(255,255,255,.07); }
  .form-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
  .form-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px; }
  .col-span-2 { grid-column:1/-1; }
  .section-divider { font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;padding:12px 0 8px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:14px;margin-top:8px; }

  /* ─ Clinical form ─ */
  .form-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px; }

  /* ─ Result ─ */
  .result-panel { padding:26px;border-radius:16px;background:rgba(22,32,50,.9);border:1px solid rgba(14,165,233,.18);animation:slideUp .35s ease; }

  /* ─ Patient card row ─ */
  .patient-row { display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;cursor:pointer;transition:background .15s;border:1.5px solid transparent; }
  .patient-row:hover { background:rgba(14,165,233,.05); }
  .patient-row.selected { background:rgba(14,165,233,.1);border-color:rgba(14,165,233,.2); }

  /* ─ Patient detail panel ─ */
  .detail-section { margin-bottom:20px; }
  .detail-label { font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px; }
  .detail-value { font-size:14px;color:#e2e8f0;font-weight:500; }
  .history-item { padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);margin-bottom:8px; }

  /* ─ Gauge ─ */
  .gauge-wrap { position:relative;display:flex;flex-direction:column;align-items:center; }
  .gauge-center { position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);text-align:center;pointer-events:none; }

  /* ─ Chatbot ─ */
  .chat-fab { position:fixed;bottom:26px;right:26px;z-index:1000;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#2dd4bf);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 28px rgba(14,165,233,.5);transition:transform .2s; }
  .chat-fab:hover { transform:scale(1.08); }
  .chat-window { position:fixed;bottom:92px;right:26px;z-index:999;width:350px;max-height:500px;display:flex;flex-direction:column;background:#0a1628;border:1px solid rgba(255,255,255,.1);border-radius:20px;box-shadow:0 20px 70px rgba(0,0,0,.7);animation:slideUp .22s ease; }
  .chat-header { padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:10px; }
  .chat-msgs { flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px; }
  .chat-msg { max-width:82%;padding:9px 13px;border-radius:13px;font-size:13px;line-height:1.55; }
  .chat-msg.bot { background:rgba(255,255,255,.06);color:#cbd5e1;border-radius:13px 13px 13px 3px; }
  .chat-msg.user { background:linear-gradient(135deg,#0ea5e9,#1d9fcf);color:#fff;margin-left:auto;border-radius:13px 13px 3px 13px; }
  .chat-input-row { display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.07); }
  .chat-input { flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:8px 12px;color:#e2e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none; }
  .chat-input:focus { border-color:#0ea5e9; }
  .chat-send { width:34px;height:34px;background:linear-gradient(135deg,#0ea5e9,#2dd4bf);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s;flex-shrink:0; }
  .chat-send:hover { transform:scale(1.05); }
  .typing { display:flex;gap:4px;align-items:center;padding:10px 14px; }
  .typing span { width:6px;height:6px;background:#64748b;border-radius:50%;animation:bounce .9s infinite; }
  .typing span:nth-child(2) { animation-delay:.15s; }
  .typing span:nth-child(3) { animation-delay:.3s; }
  @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-5px); } }

  .pulse-dot { width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }

  @keyframes spin { to { transform:rotate(360deg); } }
  .spinner { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.2);border-top-color:#0ea5e9;border-radius:50%;animation:spin .7s linear infinite; }

  /* ─ Search ─ */
  .search-wrap { position:relative; }
  .search-wrap input { padding-left:36px; }
  .search-icon { position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none; }

  /* ─ Empty state ─ */
  .empty-state { text-align:center;padding:48px 20px;color:#475569; }
  .empty-icon { font-size:40px;margin-bottom:12px; }

  /* ─ Steps ─ */
  .step-indicator { display:flex;align-items:center;gap:8px;margin-bottom:24px; }
  .step-dot { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all .2s; }
  .step-dot.done { background:#0ea5e9;color:#fff; }
  .step-dot.current { background:rgba(14,165,233,.2);border:2px solid #0ea5e9;color:#0ea5e9; }
  .step-dot.pending { background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);color:#475569; }
  .step-line { flex:1;height:1px;background:rgba(255,255,255,.07); }

  /* ─ Alert ─ */
  .alert { padding:12px 16px;border-radius:10px;font-size:13px;display:flex;align-items:flex-start;gap:10px;line-height:1.5; }
  .alert-warn { background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.2);color:#fb923c; }
  .alert-error { background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.2);color:#f43f5e; }
  .alert-success { background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);color:#4ade80; }
  .alert-info { background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.18);color:#38bdf8; }

  @media (max-width:768px) {
    .sidebar { display:none; }
    .dash-main { padding:16px; }
    .form-grid-2 { grid-template-columns:1fr; }
    .form-grid-3 { grid-template-columns:1fr 1fr; }
    .chat-window { width:calc(100vw - 40px);right:20px; }
  }
`;

// ─── Utility ───────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);
const initials = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const avatarColor = (name) => {
  const colors = ["#0ea5e9","#2dd4bf","#818cf8","#f472b6","#fb923c","#a3e635","#38bdf8","#e879f9"];
  let h = 0; for (let c of name) h = c.charCodeAt(0) + h * 31;
  return colors[Math.abs(h) % colors.length];
};

// ─── Default empty clinical form ───────────────────────────────────────
const defaultClinical = {
  age: "", sex: 1, cp: 0, trestbps: "", chol: "", fbs: 0,
  restecg: 0, thalach: "", exang: 0, oldpeak: "", slope: 1, ca: 0, thal: 2
};

const clinicalFields = [
  { key: "age",      label: "Age (years)",              type: "number",  min: 1,   max: 120 },
  { key: "sex",      label: "Sex",                      type: "select",  options: [{ v: 0, l: "Female" }, { v: 1, l: "Male" }] },
  { key: "cp",       label: "Chest Pain Type",          type: "select",  options: [{ v: 0, l: "Typical Angina" }, { v: 1, l: "Atypical Angina" }, { v: 2, l: "Non-Anginal Pain" }, { v: 3, l: "Asymptomatic" }] },
  { key: "trestbps", label: "Resting BP (mmHg)",        type: "number",  min: 80,  max: 250 },
  { key: "chol",     label: "Cholesterol (mg/dL)",      type: "number",  min: 100, max: 600 },
  { key: "fbs",      label: "Fasting Blood Sugar >120", type: "select",  options: [{ v: 0, l: "No  (<120 mg/dL)" }, { v: 1, l: "Yes (>120 mg/dL)" }] },
  { key: "restecg",  label: "Resting ECG",              type: "select",  options: [{ v: 0, l: "Normal" }, { v: 1, l: "ST-T Abnormality" }, { v: 2, l: "LV Hypertrophy" }] },
  { key: "thalach",  label: "Max Heart Rate",           type: "number",  min: 60,  max: 220 },
  { key: "exang",    label: "Exercise Angina",          type: "select",  options: [{ v: 0, l: "No" }, { v: 1, l: "Yes" }] },
  { key: "oldpeak",  label: "ST Depression (Oldpeak)",  type: "number",  min: 0,   max: 7,   step: 0.1 },
  { key: "slope",    label: "Peak ST Slope",            type: "select",  options: [{ v: 0, l: "Upsloping" }, { v: 1, l: "Flat" }, { v: 2, l: "Downsloping" }] },
  { key: "ca",       label: "Major Vessels (0–4)",      type: "number",  min: 0,   max: 4 },
  { key: "thal",     label: "Thalassemia",              type: "select",  options: [{ v: 1, l: "Normal" }, { v: 2, l: "Fixed Defect" }, { v: 3, l: "Reversible Defect" }] },
];

// ─── ChatBot ───────────────────────────────────────────────────────────
function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { id: 1, role: "bot", text: "👋 Hi! I'm CardioCare AI. Ask me about login, adding patients, diet plans, or risk scores!" }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const reply = (m) => {
    const t = m.toLowerCase();
    if (t.includes("add patient") || t.includes("register") || t.includes("new patient"))
      return "To add a patient: go to the Doctor Dashboard → click the '👥 Patients' tab in the sidebar → then click the '+ Add Patient' button in the top right. Fill in their personal and medical details, then save. You can then select them in the AI Analysis tab to run a heart risk prediction.";
    if (t.includes("login") || t.includes("sign in"))
      return "Use any @hospital.com email to access the Doctor dashboard, or any other email for the Patient dashboard. Passwords need to be 6+ characters.";
    if (t.includes("diet") || t.includes("food") || t.includes("nutrition"))
      return "Diet plans are auto-generated based on the patient's risk score: 🟢 Low Risk → Mediterranean Diet. 🟡 Moderate Risk → Heart-Healthy Protocol. 🔴 High Risk → DASH Diet (strict sodium restriction).";
    if (t.includes("predict") || t.includes("risk") || t.includes("score") || t.includes("analys"))
      return "Run a prediction by selecting a patient in the sidebar, then filling in the 13 clinical parameters in the AI Analysis form. Click 'Analyze & Predict Risk' to get a real-time risk score from the ML model.";
    if (t.includes("hello") || t.includes("hi"))
      return "Hello! 💙 How can I help you with CardioCare today?";
    return "🧠 I'm checking the clinical knowledge base... For specific medical questions, consult your healthcare provider. I can help with: adding patients, running predictions, understanding diet plans, or navigating dashboards.";
  };

  const send = () => {
    if (!input.trim()) return;
    const u = { id: Date.now(), role: "user", text: input };
    setMsgs(p => [...p, u]);
    setInput(""); setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(p => [...p, { id: Date.now() + 1, role: "bot", text: reply(u.text) }]);
    }, 1000 + Math.random() * 700);
  };

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div style={{ width:32,height:32,background:"linear-gradient(135deg,#0ea5e9,#2dd4bf)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>🤖</div>
            <div>
              <div style={{ fontWeight:700,fontSize:13.5,color:"#e2e8f0" }}>CardioCare AI</div>
              <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11.5,color:"#4ade80" }}><div className="pulse-dot" />Online</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft:"auto",background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:17 }}>✕</button>
          </div>
          <div className="chat-msgs">
            {msgs.map(m => <div key={m.id} className={`chat-msg ${m.role}`}>{m.text}</div>)}
            {typing && <div className="chat-msg bot" style={{ padding:"4px 13px" }}><div className="typing"><span/><span/><span/></div></div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <input className="chat-input" placeholder="Ask anything..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
            <button className="chat-send" onClick={send}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen(v => !v)}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
      </button>
    </>
  );
}

// ─── Landing Page ──────────────────────────────────────────────────────
function LandingPage({ navigate }) {
  const features = [
    { icon: "👤", title: "Patient Registration", desc: "Doctors register and manage patient profiles with full medical history and demographics." },
    { icon: "🔬", title: "AI Risk Analysis", desc: "13-parameter UCI clinical form feeds a trained Random Forest classifier for instant risk scoring." },
    { icon: "📊", title: "Patient Reports", desc: "Patients view their personalized health score, diet plan, and trend charts on their own dashboard." },
    { icon: "🥗", title: "Smart Diet Plans", desc: "AI-generated DASH, Mediterranean, or heart-healthy plans auto-assigned based on risk category." },
  ];
  return (
    <div className="hero">
      <div className="hero-bg" /><div className="hero-grid" />
      <nav className="top-nav">
        <div className="logo"><div className="logo-icon">❤️</div>CardioCare</div>
        <div style={{ display:"flex",gap:10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("login")}>Sign In</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("signup")}>Get Started</button>
        </div>
      </nav>
      <div className="hero-content">
        <div className="hero-badge"><div className="pulse-dot" style={{ width:6,height:6 }} />Powered by Machine Learning</div>
        <h1 className="hero-title">Advanced AI Heart Disease<br />Prediction for Clinicians</h1>
        <p className="hero-sub">CardioCare empowers doctors to register patients, run real-time cardiovascular AI analysis, and deliver personalised care plans — all in one system.</p>
        <div style={{ display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center" }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("login",{tab:"doctor"})}>🩺 Doctor Login</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate("login",{tab:"patient"})}>👤 Patient Login</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20,marginTop:60,maxWidth:680,width:"100%" }}>
          {[{v:"303+",l:"UCI Records"},{v:"92%",l:"Accuracy"},{v:"13",l:"Parameters"},{v:"<1s",l:"Prediction"}].map(s => (
            <div key={s.l} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#0ea5e9" }}>{s.v}</div>
              <div style={{ fontSize:12,color:"#64748b",marginTop:3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:"rgba(255,255,255,.018)",borderTop:"1px solid rgba(255,255,255,.05)" }}>
        <div className="feat-grid">
          {features.map(f => (
            <div className="feat-card" key={f.title}>
              <div className="feat-icon">{f.icon}</div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:600,marginBottom:7,color:"#fff" }}>{f.title}</h3>
              <p style={{ fontSize:13.5,color:"#64748b",lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center",padding:"0 0 44px",color:"#475569",fontSize:12.5 }}>
          © 2025 CardioCare AI System • React + Python FastAPI + Scikit-Learn
        </div>
      </div>
    </div>
  );
}

// ─── Auth Page ─────────────────────────────────────────────────────────
function AuthPage({ navigate, mode, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || "doctor");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [form, setForm] = useState({ email:"", password:"", name:"" });
  const [err, setErr] = useState("");

  const submit = () => {
    if (!form.email || !form.password) { setErr("Please fill all fields."); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setErr("");
    const user = { name: form.name || form.email.split("@")[0], email: form.email, role: tab };
    navigate(tab === "doctor" ? "doctor-dashboard" : "patient-dashboard", { user });
  };

  return (
    <div className="auth-page">
      <div style={{ width:"100%",maxWidth:440 }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div className="logo" style={{ justifyContent:"center",marginBottom:6,fontSize:21 }}>
            <div className="logo-icon">❤️</div>CardioCare
          </div>
          <p style={{ color:"#64748b",fontSize:13.5 }}>{isLogin ? "Sign in to your account" : "Create a new account"}</p>
        </div>
        <div className="card card-glow">
          <div className="tab-bar">
            <button className={`tab ${tab==="doctor"?"active":""}`} onClick={() => setTab("doctor")}>🩺 Doctor</button>
            <button className={`tab ${tab==="patient"?"active":""}`} onClick={() => setTab("patient")}>👤 Patient</button>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:15 }}>
            {!isLogin && (
              <div>
                <label className="input-label">Full Name</label>
                <input className="input-field" placeholder="Dr. Sarah Johnson" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} />
              </div>
            )}
            <div>
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" placeholder={tab==="doctor"?"doctor@hospital.com":"patient@gmail.com"}
                value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} />
              {tab==="doctor" && <p style={{ fontSize:11,color:"#64748b",marginTop:4 }}>💡 Use @hospital.com email for doctor access</p>}
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input-field" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}
                onKeyDown={e => e.key==="Enter" && submit()} />
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <button className="btn btn-primary" style={{ width:"100%",justifyContent:"center",marginTop:2 }} onClick={submit}>
              {isLogin ? `Sign In as ${tab==="doctor"?"Doctor":"Patient"}` : "Create Account"}
            </button>
          </div>
          <div style={{ textAlign:"center",marginTop:18,fontSize:13,color:"#64748b" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color:"#0ea5e9",cursor:"pointer",fontWeight:600 }} onClick={() => setIsLogin(v=>!v)}>
              {isLogin ? "Sign Up" : "Sign In"}
            </span>
          </div>
        </div>
        <div style={{ textAlign:"center",marginTop:18 }}>
          <span style={{ color:"#0ea5e9",cursor:"pointer",fontSize:13 }} onClick={() => navigate("landing")}>← Back to home</span>
        </div>
      </div>
    </div>
  );
}

// ─── Gauge ─────────────────────────────────────────────────────────────
function RiskGauge({ score, size = 180 }) {
  const color = getScoreColor(score);
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: "rgba(255,255,255,.04)" }];
  return (
    <div className="gauge-wrap" style={{ width: size, height: size * 0.65 }}>
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart innerRadius="58%" outerRadius="78%" startAngle={210} endAngle={-30} data={data} barSize={13}>
          <PolarAngleAxis type="number" domain={[0,100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={7} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="gauge-center">
        <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color,lineHeight:1 }}>{score}%</div>
        <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>Risk Score</div>
      </div>
    </div>
  );
}

// ─── Add / Edit Patient Modal ──────────────────────────────────────────
function PatientModal({ patient, onClose, onSave }) {
  const isEdit = !!patient?.id;
  const [form, setForm] = useState({
    name:       patient?.name      || "",
    age:        patient?.age       || "",
    sex:        patient?.sex       ?? 1,
    dob:        patient?.dob       || "",
    email:      patient?.email     || "",
    phone:      patient?.phone     || "",
    address:    patient?.address   || "",
    bloodType:  patient?.bloodType || "",
    allergies:  patient?.allergies || "",
    medHistory: patient?.medHistory|| "",
    notes:      patient?.notes     || "",
  });
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) { setErr("Patient name is required."); return false; }
    if (!form.age || form.age < 1 || form.age > 120) { setErr("Please enter a valid age (1–120)."); return false; }
    if (!form.email.trim()) { setErr("Email address is required."); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    setErr("");
    const ac = avatarColor(form.name);
    onSave({
      ...patient,
      id:         patient?.id || genId(),
      ...form,
      age:        Number(form.age),
      lastScore:  patient?.lastScore ?? null,
      history:    patient?.history   ?? [],
      color:      ac,
      createdAt:  patient?.createdAt || new Date().toISOString(),
    });
  };

  const F = ({ label, k, type="text", placeholder="", span=false, options=null, min, max }) => (
    <div className={span ? "col-span-2" : ""}>
      <label className="input-label">{label}</label>
      {options ? (
        <select className="input-field" value={form[k]} onChange={e => set(k, isNaN(e.target.value) ? e.target.value : Number(e.target.value))}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea className="input-field" placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
      ) : (
        <input className="input-field" type={type} placeholder={placeholder} min={min} max={max}
          value={form[k]} onChange={e => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:"#fff" }}>
              {isEdit ? "✏️ Edit Patient" : "👤 Register New Patient"}
            </div>
            <div style={{ fontSize:12.5,color:"#64748b",marginTop:2 }}>
              {isEdit ? "Update patient profile details" : "Fill in the patient's personal and medical information"}
            </div>
          </div>
          <button className="btn btn-outline btn-xs btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {err && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {err}</div>}

          {/* ── Personal Info ── */}
          <div className="section-divider">👤 Personal Information</div>
          <div className="form-grid-2">
            <F label="Full Name *"       k="name"  placeholder="e.g. Marcus Johnson" span />
            <F label="Age (years) *"     k="age"   type="number" min={1} max={120} placeholder="e.g. 52" />
            <F label="Sex"               k="sex"   options={[{v:1,l:"Male"},{v:0,l:"Female"}]} />
            <F label="Date of Birth"     k="dob"   type="date" />
            <F label="Email Address *"   k="email" type="email" placeholder="patient@gmail.com" />
            <F label="Phone Number"      k="phone" type="tel"  placeholder="+1 (555) 000-0000" />
          </div>

          {/* ── Medical Info ── */}
          <div className="section-divider" style={{ marginTop:20 }}>🩺 Medical Information</div>
          <div className="form-grid-3">
            <F label="Blood Type"  k="bloodType" options={[
              {v:"",l:"Unknown"},{v:"A+",l:"A+"},{v:"A-",l:"A-"},{v:"B+",l:"B+"},{v:"B-",l:"B-"},
              {v:"AB+",l:"AB+"},{v:"AB-",l:"AB-"},{v:"O+",l:"O+"},{v:"O-",l:"O-"}
            ]} />
            <div className="col-span-2">
              <label className="input-label">Known Allergies</label>
              <input className="input-field" placeholder="e.g. Penicillin, Aspirin, None" value={form.allergies}
                onChange={e => set("allergies", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <F label="Medical History" k="medHistory" type="textarea" placeholder="e.g. Hypertension (2018), Type 2 Diabetes (2020), Previous MI (2022)..." span />
          </div>
          <div style={{ marginTop:14 }}>
            <F label="Doctor's Notes" k="notes" type="textarea" placeholder="Any additional observations, current medications, lifestyle notes..." span />
          </div>

          {/* ── Contact ── */}
          <div className="section-divider" style={{ marginTop:20 }}>📍 Address</div>
          <F label="Street Address" k="address" placeholder="123 Main St, City, State, ZIP" span />
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isEdit ? "💾 Save Changes" : "✅ Register Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────
function DeleteModal({ patient, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:420 }}>
        <div className="modal-header">
          <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:"#f43f5e" }}>🗑 Remove Patient</div>
          <button className="btn btn-outline btn-xs btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:14,color:"#94a3b8",lineHeight:1.6 }}>
            Are you sure you want to remove <strong style={{ color:"#fff" }}>{patient?.name}</strong> from your patient list?
            This will permanently delete all their records and analysis history.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>🗑 Yes, Remove Patient</button>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Dashboard ──────────────────────────────────────────────────
function DoctorDashboard({ user, navigate }) {
  const [activeNav,       setActiveNav]       = useState("analyze");
  const [patients,        setPatients]        = useState([
    { id:genId(), name:"Marcus Johnson",  age:58, sex:1, email:"marcus@gmail.com",  phone:"+1 555-0101", bloodType:"B+",  allergies:"None",       medHistory:"Hypertension (2018)",          notes:"On Lisinopril 10mg",   address:"14 Oak Ave, Boston, MA",   color:"#f43f5e", lastScore:72, history:[], createdAt:"2024-11-01T10:00:00Z" },
    { id:genId(), name:"Elena Chen",      age:45, sex:0, email:"echen@gmail.com",   phone:"+1 555-0202", bloodType:"A+",  allergies:"Penicillin", medHistory:"None",                        notes:"Annual check-up",      address:"22 Elm St, Chicago, IL",   color:"#2dd4bf", lastScore:28, history:[], createdAt:"2024-12-05T09:00:00Z" },
    { id:genId(), name:"David Park",      age:63, sex:1, email:"dpark@gmail.com",   phone:"+1 555-0303", bloodType:"O-",  allergies:"Aspirin",    medHistory:"Type 2 Diabetes (2020)",      notes:"Monitor HbA1c",        address:"5 Maple Rd, Houston, TX",  color:"#fb923c", lastScore:55, history:[], createdAt:"2025-01-12T11:30:00Z" },
    { id:genId(), name:"Sarah Mitchell",  age:51, sex:0, email:"smitch@gmail.com",  phone:"+1 555-0404", bloodType:"AB+", allergies:"None",       medHistory:"Family hx of heart disease",  notes:"Smoker, 10 cig/day",   address:"8 Pine St, Phoenix, AZ",   color:"#818cf8", lastScore:41, history:[], createdAt:"2025-01-28T14:00:00Z" },
  ]);
  const [selectedId,      setSelectedId]      = useState(null);
  const [clinForm,        setClinForm]        = useState(defaultClinical);
  const [loading,         setLoading]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [published,       setPublished]       = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editPatient,     setEditPatient]     = useState(null);
  const [deletePatient,   setDeletePatient]   = useState(null);
  const [search,          setSearch]          = useState("");
  const [detailPatient,   setDetailPatient]   = useState(null);

  const selectedPatient = patients.find(p => p.id === selectedId) || null;

  // Auto-fill age & sex from patient profile when selected
  useEffect(() => {
    if (selectedPatient) {
      setClinForm(prev => ({
        ...prev,
        age: selectedPatient.age || prev.age,
        sex: selectedPatient.sex ?? prev.sex,
      }));
      setResult(null);
      setPublished(false);
    }
  }, [selectedId]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSavePatient = (data) => {
    if (patients.find(p => p.id === data.id)) {
      setPatients(prev => prev.map(p => p.id === data.id ? data : p));
    } else {
      setPatients(prev => [...prev, data]);
    }
    setShowAddModal(false);
    setEditPatient(null);
  };

  const handleDeletePatient = () => {
    setPatients(prev => prev.filter(p => p.id !== deletePatient.id));
    if (selectedId === deletePatient.id) setSelectedId(null);
    setDeletePatient(null);
  };

  const handleAnalyze = async () => {
    if (!selectedPatient) return;
    setLoading(true); setResult(null); setPublished(false);
    await new Promise(r => setTimeout(r, 1800));
    const res = simulatePrediction({ ...clinForm, age: Number(clinForm.age) });
    setResult(res);
    setLoading(false);
  };

  const handlePublish = () => {
    if (!selectedPatient || !result) return;
    const entry = {
      date:     new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
      score:    result.risk_score,
      category: result.risk_category,
      clinical: { ...clinForm },
    };
    setPatients(prev => prev.map(p => p.id === selectedId
      ? { ...p, lastScore: result.risk_score, history: [entry, ...p.history] }
      : p
    ));
    setPublished(true);
  };

  const riskClass = (s) => s === null ? "risk-none" : s < 35 ? "risk-low" : s < 65 ? "risk-moderate" : "risk-high";
  const riskLabel = (s) => s === null ? "No Data" : s < 35 ? "Low Risk" : s < 65 ? "Moderate Risk" : "High Risk";

  // ── Sidebar ─────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="sidebar">
      <div className="logo" style={{ fontSize:16 }}>
        <div className="logo-icon" style={{ width:32,height:32,fontSize:15 }}>❤️</div>
        CardioCare
      </div>
      <div style={{ marginTop:10,padding:"8px 13px",background:"rgba(14,165,233,.06)",borderRadius:10,fontSize:12.5,color:"#94a3b8" }}>
        <div style={{ fontSize:11,color:"#64748b",marginBottom:1 }}>Signed in as</div>
        <div style={{ color:"#0ea5e9",fontWeight:600 }}>{user?.name || "Doctor"}</div>
      </div>
      <nav className="sidebar-nav">
        {[
          { key:"analyze",  icon:"🔬", label:"AI Analysis" },
          { key:"patients", icon:"👥", label:"Patient List" },
          { key:"reports",  icon:"📈", label:"Reports" },
        ].map(n => (
          <button key={n.key} className={`nav-item ${activeNav===n.key?"active":""}`} onClick={() => { setActiveNav(n.key); setDetailPatient(null); }}>
            {n.icon} {n.label}
            {n.key==="patients" && <span style={{ marginLeft:"auto",background:"rgba(14,165,233,.15)",color:"#0ea5e9",borderRadius:100,padding:"1px 7px",fontSize:11,fontWeight:700 }}>{patients.length}</span>}
          </button>
        ))}
      </nav>
      <button className="nav-item" style={{ marginTop:"auto",color:"#f43f5e" }} onClick={() => navigate("landing")}>
        🚪 Sign Out
      </button>
    </aside>
  );

  // ── Stats row ────────────────────────────────────────────────────────
  const Stats = () => (
    <div className="stats-row">
      {[
        { v:patients.length,                                   l:"Total Patients",  icon:"👥" },
        { v:patients.filter(p=>p.lastScore>=65).length,        l:"High Risk",       icon:"🔴" },
        { v:patients.filter(p=>p.lastScore!==null&&p.lastScore<35).length, l:"Low Risk", icon:"🟢" },
        { v:patients.filter(p=>p.lastScore===null).length,     l:"Unassessed",      icon:"⏳" },
      ].map(s => (
        <div className="stat-card" key={s.l}>
          <div style={{ fontSize:20,marginBottom:6 }}>{s.icon}</div>
          <div className="stat-value">{s.v}</div>
          <div className="stat-label">{s.l}</div>
        </div>
      ))}
    </div>
  );

  // ── Patient List View ─────────────────────────────────────────────────
  const PatientListView = () => {
    if (detailPatient) {
      const p = patients.find(x => x.id === detailPatient);
      if (!p) return null;
      return (
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setDetailPatient(null)}>← Back</button>
            <h2 className="page-title" style={{ fontSize:20 }}>Patient Profile</h2>
            <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditPatient(p); setDetailPatient(null); }}>✏️ Edit</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setSelectedId(p.id); setActiveNav("analyze"); setDetailPatient(null); }}>🔬 Analyze</button>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>
            <div className="card">
              <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:20 }}>
                <div className="avatar" style={{ width:52,height:52,fontSize:18,background:`${p.color}22`,color:p.color }}>{initials(p.name)}</div>
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,color:"#fff" }}>{p.name}</div>
                  <div style={{ fontSize:13,color:"#64748b" }}>{p.email}</div>
                </div>
              </div>
              {[
                ["Age",          `${p.age} years`],
                ["Sex",          p.sex===1?"Male":"Female"],
                ["Date of Birth",p.dob || "—"],
                ["Blood Type",   p.bloodType || "Unknown"],
                ["Phone",        p.phone || "—"],
                ["Address",      p.address || "—"],
              ].map(([l,v]) => (
                <div key={l} style={{ display:"grid",gridTemplateColumns:"120px 1fr",gap:8,marginBottom:10 }}>
                  <div className="detail-label">{l}</div>
                  <div className="detail-value">{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div className="card">
                <div style={{ fontWeight:600,fontSize:14,marginBottom:12,color:"#e2e8f0" }}>🩺 Medical Information</div>
                {[
                  ["Allergies",    p.allergies || "None"],
                  ["History",      p.medHistory || "—"],
                  ["Notes",        p.notes || "—"],
                ].map(([l,v]) => (
                  <div key={l} style={{ marginBottom:12 }}>
                    <div className="detail-label">{l}</div>
                    <div className="detail-value" style={{ lineHeight:1.55,fontSize:13.5 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <div style={{ fontWeight:600,fontSize:14,color:"#e2e8f0" }}>📊 Latest Score</div>
                  <span className={`risk-badge ${riskClass(p.lastScore)}`}>{riskLabel(p.lastScore)}</span>
                </div>
                {p.lastScore !== null
                  ? <RiskGauge score={p.lastScore} size={160} />
                  : <div className="empty-state" style={{ padding:"20px 0" }}><div style={{ fontSize:13,color:"#475569" }}>No analysis yet</div></div>
                }
              </div>
            </div>
          </div>
          {p.history.length > 0 && (
            <div className="card" style={{ marginTop:18 }}>
              <div style={{ fontWeight:600,fontSize:14,color:"#e2e8f0",marginBottom:14 }}>🕒 Analysis History</div>
              {p.history.map((h, i) => (
                <div className="history-item" key={i}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13.5,fontWeight:600,color:"#e2e8f0" }}>{h.date}</div>
                      <div style={{ fontSize:12.5,color:"#64748b",marginTop:2 }}>Score: <span style={{ color:getScoreColor(h.score),fontWeight:700 }}>{h.score}%</span></div>
                    </div>
                    <span className={`risk-badge ${riskClass(h.score)}`}>{h.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div>
            <h2 className="page-title">Patient List</h2>
            <p className="page-sub">{patients.length} registered patient{patients.length!==1?"s":""}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Patient</button>
        </div>
        <Stats />
        <div className="card">
          <div style={{ marginBottom:16 }}>
            <div className="search-wrap">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="input-field" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{search ? "🔍" : "👥"}</div>
              <div style={{ fontWeight:600,color:"#64748b",marginBottom:6 }}>{search ? "No patients found" : "No patients yet"}</div>
              <div style={{ fontSize:13,color:"#475569" }}>{search ? "Try a different search term" : "Click '+ Add Patient' to register your first patient"}</div>
              {!search && <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={() => setShowAddModal(true)}>+ Add Patient</button>}
            </div>
          ) : (
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Patient</th><th>Age</th><th>Blood Type</th><th>Last Score</th><th>Risk</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div className="avatar" style={{ background:`${p.color}22`,color:p.color }}>{initials(p.name)}</div>
                        <div>
                          <div style={{ fontWeight:600,color:"#e2e8f0",fontSize:13.5 }}>{p.name}</div>
                          <div style={{ fontSize:12,color:"#64748b" }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.age}</td>
                    <td>{p.bloodType || "—"}</td>
                    <td style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:p.lastScore!==null?getScoreColor(p.lastScore):"#64748b" }}>
                      {p.lastScore !== null ? `${p.lastScore}%` : "—"}
                    </td>
                    <td><span className={`risk-badge ${riskClass(p.lastScore)}`}>{riskLabel(p.lastScore)}</span></td>
                    <td>
                      <div style={{ display:"flex",gap:6 }}>
                        <button className="btn btn-outline btn-xs" onClick={() => setDetailPatient(p.id)}>👁 View</button>
                        <button className="btn btn-success btn-xs" onClick={() => { setSelectedId(p.id); setActiveNav("analyze"); }}>🔬 Analyze</button>
                        <button className="btn btn-outline btn-xs" onClick={() => setEditPatient(p)}>✏️</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDeletePatient(p)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ── Analyze View ──────────────────────────────────────────────────────
  const AnalyzeView = () => {
    const resRiskClass = result?.risk_category === "Low Risk" ? "risk-low" : result?.risk_category === "High Risk" ? "risk-high" : "risk-moderate";
    return (
      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div>
            <h2 className="page-title">AI Risk Analysis</h2>
            <p className="page-sub">Select a patient, then enter their clinical data to generate a prediction</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="step-indicator" style={{ marginBottom:22 }}>
          <div className={`step-dot ${selectedPatient?"done":"current"}`}>{selectedPatient ? "✓" : "1"}</div>
          <div style={{ fontSize:13,fontWeight:500,color:selectedPatient?"#4ade80":"#0ea5e9",whiteSpace:"nowrap" }}>Select Patient</div>
          <div className="step-line" />
          <div className={`step-dot ${selectedPatient?(result?"done":"current"):"pending"}`}>{result ? "✓" : "2"}</div>
          <div style={{ fontSize:13,fontWeight:500,color:!selectedPatient?"#475569":result?"#4ade80":"#0ea5e9",whiteSpace:"nowrap" }}>Enter Clinical Data</div>
          <div className="step-line" />
          <div className={`step-dot ${result?"current":"pending"}`}>{published ? "✓" : "3"}</div>
          <div style={{ fontSize:13,fontWeight:500,color:result?"#0ea5e9":"#475569",whiteSpace:"nowrap" }}>Review & Publish</div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"240px 1fr",gap:18 }}>
          {/* Patient selector */}
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".05em" }}>Patients</div>
              <button className="btn btn-primary btn-xs" onClick={() => setShowAddModal(true)}>+ Add</button>
            </div>
            {patients.length === 0 ? (
              <div className="empty-state" style={{ padding:"20px 8px" }}>
                <div style={{ fontSize:24,marginBottom:8 }}>👥</div>
                <div style={{ fontSize:12.5,color:"#64748b" }}>No patients yet</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop:12,width:"100%",justifyContent:"center" }} onClick={() => setShowAddModal(true)}>+ Add Patient</button>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                {patients.map(p => (
                  <div key={p.id} className={`patient-row ${selectedId===p.id?"selected":""}`}
                    onClick={() => setSelectedId(p.id)} style={{ padding:"10px 10px" }}>
                    <div className="avatar" style={{ width:32,height:32,fontSize:12,background:`${p.color}22`,color:p.color }}>{initials(p.name)}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</div>
                      <div style={{ fontSize:11.5,color:"#64748b" }}>Age {p.age}</div>
                    </div>
                    {p.lastScore !== null && (
                      <div style={{ fontSize:12,fontWeight:700,color:getScoreColor(p.lastScore) }}>{p.lastScore}%</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinical form */}
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {!selectedPatient ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">👈</div>
                  <div style={{ fontWeight:600,color:"#64748b",marginBottom:6 }}>Select a Patient First</div>
                  <div style={{ fontSize:13,color:"#475569" }}>Choose a patient from the left panel to begin the clinical assessment</div>
                </div>
              </div>
            ) : (
              <>
                <div className="card">
                  {/* Patient banner */}
                  <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(14,165,233,.06)",borderRadius:12,marginBottom:20,border:"1px solid rgba(14,165,233,.15)" }}>
                    <div className="avatar" style={{ background:`${selectedPatient.color}22`,color:selectedPatient.color }}>{initials(selectedPatient.name)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:14.5,color:"#e2e8f0" }}>{selectedPatient.name}</div>
                      <div style={{ fontSize:12.5,color:"#64748b" }}>Age {selectedPatient.age} • {selectedPatient.sex===1?"Male":"Female"} • {selectedPatient.email}</div>
                    </div>
                    {selectedPatient.lastScore !== null && (
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11,color:"#64748b" }}>Previous</div>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:getScoreColor(selectedPatient.lastScore) }}>{selectedPatient.lastScore}%</div>
                      </div>
                    )}
                    <button className="btn btn-outline btn-xs" onClick={() => { setDetailPatient(selectedPatient.id); setActiveNav("patients"); }}>👁 Profile</button>
                  </div>

                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                    <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:15 }}>Clinical Assessment Form</h3>
                    <span style={{ fontSize:11.5,color:"#64748b" }}>13 UCI Parameters</span>
                  </div>

                  <div className="form-grid">
                    {clinicalFields.map(f => (
                      <div key={f.key}>
                        <label className="input-label">{f.label}</label>
                        {f.type === "select" ? (
                          <select className="input-field" value={clinForm[f.key]}
                            onChange={e => setClinForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}>
                            {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        ) : (
                          <input className="input-field" type="number" min={f.min} max={f.max} step={f.step || 1}
                            placeholder={`${f.min}–${f.max}`}
                            value={clinForm[f.key]}
                            onChange={e => setClinForm(p => ({ ...p, [f.key]: e.target.value === "" ? "" : Number(e.target.value) }))} />
                        )}
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary btn-lg" style={{ marginTop:20,width:"100%",justifyContent:"center" }}
                    onClick={handleAnalyze} disabled={loading || !clinForm.age || !clinForm.trestbps || !clinForm.chol}>
                    {loading
                      ? <><div className="spinner" />Running AI Analysis...</>
                      : "🧠 Analyze & Predict Risk"
                    }
                  </button>
                  {(!clinForm.age || !clinForm.trestbps || !clinForm.chol) && !loading && (
                    <div className="alert alert-warn" style={{ marginTop:10 }}>⚠ Age, Resting BP, and Cholesterol are required to run the analysis.</div>
                  )}
                </div>

                {result && (
                  <div className="result-panel">
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
                      <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16 }}>Prediction Result</h3>
                      <span className={`risk-badge ${resRiskClass}`}>⬤ {result.risk_category}</span>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"auto 1fr",gap:20,alignItems:"center" }}>
                      <RiskGauge score={result.risk_score} />
                      <div>
                        <div style={{ fontSize:13.5,color:"#94a3b8",marginBottom:10 }}>
                          Risk Probability: <span style={{ color:"#fff",fontWeight:700 }}>{(result.probability*100).toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize:13.5,color:"#94a3b8",marginBottom:14 }}>
                          Recommended Plan: <span style={{ color:"#2dd4bf",fontWeight:600 }}>{getDietPlan(result.risk_category).title}</span>
                        </div>
                        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                          <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={published}>
                            {published ? "✓ Published to Patient" : "📤 Publish to Patient"}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setResult(null); setPublished(false); }}>Clear</button>
                        </div>
                        {published && <div className="alert alert-success" style={{ marginTop:10 }}>✓ Report published to {selectedPatient.name}'s dashboard</div>}
                      </div>
                    </div>

                    {/* Diet preview */}
                    <div style={{ marginTop:18,paddingTop:18,borderTop:"1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:10 }}>Diet Plan Preview</div>
                      <div style={{ fontSize:13.5,color:"#94a3b8",marginBottom:10 }}>{getDietPlan(result.risk_category).desc}</div>
                      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                        {getDietPlan(result.risk_category).items.map((item,i) => (
                          <span key={i} style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"5px 11px",fontSize:12.5,color:"#cbd5e1" }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Reports View ──────────────────────────────────────────────────────
  const ReportsView = () => {
    const assessed = patients.filter(p => p.lastScore !== null);
    const avgScore = assessed.length ? Math.round(assessed.reduce((s,p) => s + p.lastScore, 0) / assessed.length) : 0;
    const chartData = patients.filter(p=>p.lastScore!==null).map(p => ({ name: p.name.split(" ")[0], score: p.lastScore }));

    return (
      <div>
        <div style={{ marginBottom:20 }}>
          <h2 className="page-title">Reports Overview</h2>
          <p className="page-sub">Summary of all patient risk assessments</p>
        </div>
        <Stats />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>
          <div className="card">
            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:6 }}>Average Risk Score</h3>
            <div style={{ display:"flex",alignItems:"center",gap:16,marginTop:10 }}>
              <RiskGauge score={avgScore || 0} size={150} />
              <div>
                <div style={{ fontSize:13,color:"#94a3b8" }}>{assessed.length} of {patients.length} patients assessed</div>
                <div style={{ marginTop:10,fontSize:13 }}>
                  <div style={{ color:"#f43f5e",marginBottom:4 }}>High Risk: {patients.filter(p=>p.lastScore>=65).length}</div>
                  <div style={{ color:"#fb923c",marginBottom:4 }}>Moderate: {patients.filter(p=>p.lastScore>=35&&p.lastScore<65).length}</div>
                  <div style={{ color:"#4ade80" }}>Low Risk: {patients.filter(p=>p.lastScore!==null&&p.lastScore<35).length}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:16 }}>Patient Score Distribution</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top:5,right:10,bottom:5,left:-20 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.04)" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fill:"#64748b",fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill:"#64748b",fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:"#1e293b",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#e2e8f0",fontSize:13 }}/>
                  <Area type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} fill="url(#g1)" dot={{ fill:"#0ea5e9",r:4 }}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div style={{ fontSize:12.5,color:"#475569" }}>No data yet — run some predictions first</div></div>
            )}
          </div>
        </div>
        {/* Full table */}
        <div className="card" style={{ marginTop:18 }}>
          <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:16 }}>All Patient Assessments</h3>
          {assessed.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><div style={{ fontSize:13,color:"#475569" }}>No assessments completed yet. Run an AI analysis to see results here.</div></div>
          ) : (
            <table className="pt-table">
              <thead><tr><th>Patient</th><th>Age</th><th>Risk Score</th><th>Category</th><th>Analyses</th><th>Action</th></tr></thead>
              <tbody>
                {assessed.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                        <div className="avatar" style={{ width:30,height:30,fontSize:11,background:`${p.color}22`,color:p.color }}>{initials(p.name)}</div>
                        {p.name}
                      </div>
                    </td>
                    <td>{p.age}</td>
                    <td><span style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:getScoreColor(p.lastScore) }}>{p.lastScore}%</span></td>
                    <td><span className={`risk-badge ${riskClass(p.lastScore)}`}>{riskLabel(p.lastScore)}</span></td>
                    <td>{p.history.length}</td>
                    <td><button className="btn btn-success btn-xs" onClick={() => { setSelectedId(p.id); setActiveNav("analyze"); }}>🔬 Re-Analyze</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dash-main">
        <div style={{ marginBottom:24 }}>
          <h1 className="page-title">
            {activeNav==="analyze" ? "AI Analysis" : activeNav==="patients" ? "Patient Management" : "Reports"}
          </h1>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} • Dr. {user?.name || "User"}
          </p>
        </div>

        {activeNav === "analyze"  && <AnalyzeView />}
        {activeNav === "patients" && <PatientListView />}
        {activeNav === "reports"  && <ReportsView />}
      </main>

      {/* Modals */}
      {showAddModal && <PatientModal onClose={() => setShowAddModal(false)} onSave={handleSavePatient} />}
      {editPatient  && <PatientModal patient={editPatient} onClose={() => setEditPatient(null)} onSave={handleSavePatient} />}
      {deletePatient && <DeleteModal patient={deletePatient} onClose={() => setDeletePatient(null)} onConfirm={handleDeletePatient} />}
    </div>
  );
}

// ─── Patient Dashboard ─────────────────────────────────────────────────
function PatientDashboard({ user, navigate }) {
  const riskScore = 68;
  const category  = riskScore < 35 ? "Low Risk" : riskScore < 65 ? "Moderate Risk" : "High Risk";
  const diet      = getDietPlan(category);
  const riskClass = category === "Low Risk" ? "risk-low" : category === "High Risk" ? "risk-high" : "risk-moderate";
  const trendData = [
    { month:"Sep", score:74 },{ month:"Oct", score:71 },{ month:"Nov", score:69 },
    { month:"Dec", score:72 },{ month:"Jan", score:70 },{ month:"Feb", score:riskScore },
  ];
  const recs = [
    { icon:"💊", text:"Blood pressure management — consult your cardiologist for hypertension follow-up" },
    { icon:"🏃", text:"Moderate aerobic exercise: 30-minute walks, 5 days/week" },
    { icon:"💤", text:"Prioritize 7-9 hours of sleep per night to support cardiovascular recovery" },
    { icon:"🚭", text:"Avoid smoking and limit alcohol to fewer than 14 units/week" },
    { icon:"🩺", text:"Schedule follow-up cardiac screening within the next 3 months" },
  ];

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="logo" style={{ fontSize:16 }}><div className="logo-icon" style={{ width:32,height:32,fontSize:15 }}>❤️</div>CardioCare</div>
        <div style={{ marginTop:10,padding:"8px 13px",background:"rgba(14,165,233,.06)",borderRadius:10,fontSize:12.5,color:"#94a3b8" }}>
          <div style={{ fontSize:11,color:"#64748b",marginBottom:1 }}>Patient</div>
          <div style={{ color:"#0ea5e9",fontWeight:600 }}>{user?.name || "Patient"}</div>
        </div>
        <nav className="sidebar-nav">
          {[{ key:"overview",icon:"📊",label:"Health Overview" },{ key:"diet",icon:"🥗",label:"Diet Plan" }].map(n => (
            <button key={n.key} className="nav-item active" style={{}}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <button className="nav-item" style={{ marginTop:"auto",color:"#f43f5e" }} onClick={() => navigate("landing")}>🚪 Sign Out</button>
      </aside>

      <main className="dash-main">
        <div style={{ marginBottom:24 }}>
          <h1 className="page-title">Health Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.name || "Patient"} • Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:18,marginBottom:18 }}>
          <div className="card" style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center" }}>
            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:16,alignSelf:"flex-start" }}>Heart Health Score</h3>
            <RiskGauge score={riskScore} />
            <span className={`risk-badge ${riskClass}`} style={{ marginTop:12 }}>⬤ {category}</span>
            <p style={{ fontSize:13,color:"#64748b",marginTop:10,lineHeight:1.55 }}>Your cardiovascular risk profile requires attention. Review your personalised plan below.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop:14,width:"100%" }}
              onClick={() => alert(`CardioCare Medical Report\nPatient: ${user?.name||"Patient"}\nRisk Score: ${riskScore}%\nCategory: ${category}\n\nRecommended Diet: ${diet.title}`)}>
              📥 Download Report PDF
            </button>
          </div>
          <div className="card">
            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:18 }}>Risk Score Trend</h3>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={trendData} margin={{ top:5,right:10,bottom:5,left:-20 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="month" tick={{ fill:"#64748b",fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[50,90]} tick={{ fill:"#64748b",fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:"#1e293b",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#e2e8f0",fontSize:13 }}/>
                <Area type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2.5} fill="url(#rg)" dot={{ fill:"#f43f5e",r:4 }} activeDot={{ r:6 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ marginBottom:18 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
            <div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15.5,marginBottom:4 }}>🥗 AI Diet Plan — {diet.title}</h3>
              <p style={{ fontSize:13.5,color:"#94a3b8",maxWidth:580,lineHeight:1.6 }}>{diet.desc}</p>
            </div>
            <span className={`risk-badge ${riskClass}`}>{category}</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10 }}>
            {diet.items.map((item,i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 13px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.05)",fontSize:13.5,color:"#cbd5e1" }}>
                <span style={{ fontSize:17 }}>{["🫒","🐟","🌾","🥦","🫐"][i%5]}</span>{item}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14.5,marginBottom:14 }}>Clinical Recommendations</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {recs.map((r,i) => (
              <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:11,padding:"11px 13px",background:"rgba(255,255,255,.025)",borderRadius:10,border:"1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize:17,flexShrink:0 }}>{r.icon}</span>
                <span style={{ fontSize:13.5,color:"#cbd5e1",lineHeight:1.55 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]     = useState("landing");
  const [data, setData]     = useState({});

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = styles;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const navigate = useCallback((to, d = {}) => {
    setPage(to); setData(d); window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      {page === "landing"          && <LandingPage   navigate={navigate} />}
      {page === "login"            && <AuthPage      navigate={navigate} mode="login"  defaultTab={data.tab} />}
      {page === "signup"           && <AuthPage      navigate={navigate} mode="signup" />}
      {page === "doctor-dashboard" && <DoctorDashboard user={data.user} navigate={navigate} />}
      {page === "patient-dashboard"&& <PatientDashboard user={data.user} navigate={navigate} />}
      <ChatBot />
    </div>
  );
}
