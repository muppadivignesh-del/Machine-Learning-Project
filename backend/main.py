import os
import sys
import io
import time
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import pandas as pd

from auth import (
    UserRegister,
    UserLogin,
    USERS_DB,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    DEMO_USERNAME,
    DEMO_PASSWORD
)
from demo_data import generate_demo_dataset
from ml_engine import (
    validate_dataframe,
    apply_column_mapping_and_clean,
    run_dbscan_clustering,
    compute_k_distance_elbow,
    prepare_frontend_payload,
    NUMERICAL_FEATURES_DEFAULT
)
from jobs import job_manager

app = FastAPI(
    title="FraudGuard API",
    description="DBSCAN-Based Financial Transaction Anomaly Detection & Intelligence Platform",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for current active dataset and results
CURRENT_SESSION = {
    "df_raw": None,
    "df_processed": None,
    "dataset_name": "Demo Benchmark Dataset",
    "is_demo": True,
    "validation_meta": None,
    "dbscan_meta": None,
    "payload": None,
    "config": {
        "eps": 0.50,
        "min_samples": 5,
        "selected_features": NUMERICAL_FEATURES_DEFAULT
    }
}

# Auto-initialize session with demo dataset
def init_demo_session():
    df_demo = generate_demo_dataset(2500, seed=42)
    clean_df = apply_column_mapping_and_clean(df_demo)
    proc_df, meta = run_dbscan_clustering(clean_df, eps=0.50, min_samples=5, selected_features=NUMERICAL_FEATURES_DEFAULT)
    payload = prepare_frontend_payload(proc_df, meta)
    
    CURRENT_SESSION["df_raw"] = df_demo
    CURRENT_SESSION["df_processed"] = proc_df
    CURRENT_SESSION["dataset_name"] = "fraud_transaction_dataset.csv (Demo)"
    CURRENT_SESSION["is_demo"] = True
    CURRENT_SESSION["validation_meta"] = validate_dataframe(df_demo)
    CURRENT_SESSION["dbscan_meta"] = meta
    CURRENT_SESSION["payload"] = payload

init_demo_session()

# Auth dependency
def get_current_user(token: Optional[str] = Query(None)):
    # Also check Authorization header if available
    if not token:
        # Fallback for demo convenience
        return USERS_DB.get(DEMO_USERNAME)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    username = payload.get("sub")
    user = USERS_DB.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/api/auth/register")
def register_user(req: UserRegister):
    if req.username in USERS_DB:
        raise HTTPException(status_code=400, detail="Username already exists. Please choose another username.")
    for u in USERS_DB.values():
        if u.get("email") == req.email:
            raise HTTPException(status_code=400, detail="An account with this email address already exists.")
            
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    USERS_DB[req.username] = {
        "full_name": req.full_name,
        "email": req.email,
        "username": req.username,
        "hashed_password": hash_password(req.password),
        "created_at": time.time()
    }
    
    return {"success": True, "message": "Account created successfully. Please log in."}

@app.post("/api/auth/login")
def login_user(req: UserLogin):
    user = USERS_DB.get(req.username)
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
        
    token = create_access_token({"sub": user["username"], "email": user["email"], "name": user["full_name"]})
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "full_name": user["full_name"],
            "email": user["email"]
        }
    }

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "email": user["email"]
    }

# ==================== DATASET MANAGEMENT ROUTES ====================

@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_dataset.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) file formats are supported.")
        
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
    try:
        # Read in chunks to prevent memory spikes
        chunk_iter = pd.read_csv(io.BytesIO(contents), chunksize=50000)
        chunks = []
        for c in chunk_iter:
            chunks.append(c)
        df_uploaded = pd.concat(chunks, ignore_index=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    val_report = validate_dataframe(df_uploaded)
    if not val_report["valid"]:
        raise HTTPException(status_code=400, detail=val_report["error"])
        
    # Clean and run default clustering
    clean_df = apply_column_mapping_and_clean(df_uploaded)
    proc_df, meta = run_dbscan_clustering(clean_df, eps=0.50, min_samples=5)
    payload = prepare_frontend_payload(proc_df, meta)
    
    CURRENT_SESSION["df_raw"] = df_uploaded
    CURRENT_SESSION["df_processed"] = proc_df
    CURRENT_SESSION["dataset_name"] = filename
    CURRENT_SESSION["is_demo"] = False
    CURRENT_SESSION["validation_meta"] = val_report
    CURRENT_SESSION["dbscan_meta"] = meta
    CURRENT_SESSION["payload"] = payload
    
    return {
        "success": True,
        "filename": filename,
        "rows": val_report["rows"],
        "columns": val_report["columns"],
        "validation": val_report,
        "kpi": payload["kpi"]
    }

@app.post("/api/dataset/demo")
def load_demo_dataset():
    init_demo_session()
    return {
        "success": True,
        "filename": CURRENT_SESSION["dataset_name"],
        "is_demo": True,
        "validation": CURRENT_SESSION["validation_meta"],
        "kpi": CURRENT_SESSION["payload"]["kpi"]
    }

class ColumnMappingRequest(BaseModel):
    mapping: Dict[str, str]

@app.post("/api/dataset/map-columns")
def map_columns(req: ColumnMappingRequest):
    if CURRENT_SESSION["df_raw"] is None:
        raise HTTPException(status_code=400, detail="No active dataset to map.")
        
    clean_df = apply_column_mapping_and_clean(CURRENT_SESSION["df_raw"], req.mapping)
    proc_df, meta = run_dbscan_clustering(clean_df, eps=CURRENT_SESSION["config"]["eps"], min_samples=CURRENT_SESSION["config"]["min_samples"])
    payload = prepare_frontend_payload(proc_df, meta)
    
    CURRENT_SESSION["df_processed"] = proc_df
    CURRENT_SESSION["dbscan_meta"] = meta
    CURRENT_SESSION["payload"] = payload
    
    return {"success": True, "kpi": payload["kpi"]}

@app.get("/api/dataset/preview")
def preview_dataset(page: int = 1, page_size: int = 15):
    df = CURRENT_SESSION["df_processed"] if CURRENT_SESSION["df_processed"] is not None else CURRENT_SESSION["df_raw"]
    if df is None:
        raise HTTPException(status_code=400, detail="No active dataset available.")
        
    total = len(df)
    start = (page - 1) * page_size
    end = min(total, start + page_size)
    
    sample_df = df.iloc[start:end]
    records = sample_df.fillna("").to_dict(orient="records")
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "columns": list(df.columns),
        "rows": records
    }

# ==================== DBSCAN & BACKGROUND JOB EXECUTION ====================

class DBSCANRunRequest(BaseModel):
    eps: float = 0.50
    min_samples: int = 5
    selected_features: Optional[List[str]] = None

def execute_dbscan_job(job_id: str, eps: float, min_samples: int, features: Optional[List[str]]):
    try:
        # Step 0: Uploaded
        job_manager.update_step(job_id, 0)
        time.sleep(0.15)
        
        # Step 1: Validated
        job_manager.update_step(job_id, 1)
        time.sleep(0.15)
        
        # Step 2: Data preprocessing
        job_manager.update_step(job_id, 2)
        df_to_use = CURRENT_SESSION["df_raw"]
        if df_to_use is None:
            df_to_use = generate_demo_dataset(2500)
            CURRENT_SESSION["df_raw"] = df_to_use
        clean_df = apply_column_mapping_and_clean(df_to_use)
        time.sleep(0.15)
        
        # Step 3: Feature engineering
        job_manager.update_step(job_id, 3)
        time.sleep(0.15)
        
        # Step 4: Feature scaling
        job_manager.update_step(job_id, 4)
        time.sleep(0.15)
        
        # Step 5: DBSCAN clustering
        job_manager.update_step(job_id, 5)
        proc_df, meta = run_dbscan_clustering(clean_df, eps=eps, min_samples=min_samples, selected_features=features)
        time.sleep(0.15)
        
        # Step 6: Evaluation
        job_manager.update_step(job_id, 6)
        time.sleep(0.15)
        
        # Step 7: Preparing charts
        job_manager.update_step(job_id, 7)
        payload = prepare_frontend_payload(proc_df, meta)
        
        CURRENT_SESSION["df_processed"] = proc_df
        CURRENT_SESSION["dbscan_meta"] = meta
        CURRENT_SESSION["payload"] = payload
        CURRENT_SESSION["config"]["eps"] = eps
        CURRENT_SESSION["config"]["min_samples"] = min_samples
        
        job_manager.complete_job(job_id, {"meta": meta, "kpi": payload["kpi"]})
    except Exception as e:
        job_manager.fail_job(job_id, str(e))

@app.post("/api/dbscan/run")
def trigger_dbscan(req: DBSCANRunRequest):
    job_id = job_manager.create_job()
    thread = threading.Thread(
        target=execute_dbscan_job,
        args=(job_id, req.eps, req.min_samples, req.selected_features)
    )
    thread.daemon = True
    thread.start()
    return {"job_id": job_id, "status": "running"}

@app.get("/api/jobs/{job_id}/status")
def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/dbscan/k-distance")
def get_k_distance(k: int = 5):
    df = CURRENT_SESSION["df_processed"]
    if df is None:
        df = generate_demo_dataset(2500)
    k_res = compute_k_distance_elbow(df, k=k, selected_features=CURRENT_SESSION["config"].get("selected_features"))
    return k_res

# ==================== ANALYTICS & VISUALIZATION ROUTES ====================

@app.get("/api/analytics/payload")
def get_analytics_payload():
    if CURRENT_SESSION["payload"] is None:
        init_demo_session()
    return {
        "dataset_name": CURRENT_SESSION["dataset_name"],
        "is_demo": CURRENT_SESSION["is_demo"],
        "payload": CURRENT_SESSION["payload"]
    }

@app.get("/api/transactions")
def get_transactions_table(
    page: int = 1,
    page_size: int = 12,
    filter_type: str = "all", # all, dbscan_noise, high_risk, high_amount, new_device, international, high_freq
    search: Optional[str] = None
):
    df = CURRENT_SESSION["df_processed"]
    if df is None:
        init_demo_session()
        df = CURRENT_SESSION["df_processed"]
        
    filtered = df
    if filter_type == "dbscan_noise":
        filtered = filtered[filtered["Cluster"] == -1]
    elif filter_type == "high_risk":
        filtered = filtered[filtered["Project_Risk_Score"] >= 70]
    elif filter_type == "high_amount":
        filtered = filtered[filtered["Transaction_Amount"] >= 1000]
    elif filter_type == "new_device":
        filtered = filtered[filtered["Device_Change"] == "Changed Device"]
    elif filter_type == "international":
        filtered = filtered[filtered["Location_Distance_KM"] >= 150]
    elif filter_type == "high_freq":
        filtered = filtered[filtered["Transaction_Frequency_24H"] >= 8]
        
    if search and search.strip():
        q = search.strip().lower()
        id_match = filtered["Transaction_ID"].astype(str).str.lower().str.contains(q)
        ch_match = filtered["Channel"].astype(str).str.lower().str.contains(q)
        filtered = filtered[id_match | ch_match]
        
    total = len(filtered)
    start = (page - 1) * page_size
    end = min(total, start + page_size)
    sample_rows = filtered.iloc[start:end]
    
    rows = []
    for _, r in sample_rows.iterrows():
        rows.append({
            "id": str(r["Transaction_ID"]),
            "amount": float(r["Transaction_Amount"]),
            "hour": int(r["Transaction_Hour"]),
            "frequency_24h": int(r["Transaction_Frequency_24H"]),
            "location_distance": float(r["Location_Distance_KM"]),
            "device_change": str(r["Device_Change"]),
            "login_attempts": int(r["Login_Attempts"]),
            "merchant_risk": float(r["Merchant_Risk_Score"]),
            "amount_deviation": float(r["Amount_Deviation"]),
            "cluster": int(r["Cluster"]),
            "is_anomaly": bool(r["Is_Anomaly"]),
            "fraud_label": int(r["Fraud_Label"]) if "Fraud_Label" in r else 0,
            "project_risk_score": int(r["Project_Risk_Score"]),
            "channel": str(r["Channel"]),
            "account_balance": float(r["Account_Balance"]),
            "prev_tx_avg": float(r["Previous_Transaction_Avg"]),
            "timestamp": str(r["Timestamp"]) if "Timestamp" in r else ""
        })
        
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "rows": rows
    }

@app.get("/api/transactions/export")
def export_transactions():
    df = CURRENT_SESSION["df_processed"]
    if df is None:
        init_demo_session()
        df = CURRENT_SESSION["df_processed"]
        
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=fraudguard_processed_transactions.csv"
    return response

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FraudGuard API",
        "dataset_loaded": CURRENT_SESSION["df_processed"] is not None
    }
