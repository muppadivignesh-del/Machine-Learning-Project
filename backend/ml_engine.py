import io
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

STANDARD_COLUMNS = [
    "Transaction_ID",
    "Customer_ID",
    "Timestamp",
    "Transaction_Amount",
    "Transaction_Hour",
    "Transaction_Frequency_24H",
    "Location_Distance_KM",
    "Device_Change",
    "International_Transaction",
    "Login_Attempts",
    "Account_Age_Days",
    "Previous_Transaction_Avg",
    "Amount_Deviation",
    "Merchant_Risk_Score",
    "Transaction_Duration_Sec",
    "Account_Balance",
    "Amount_to_Balance_Ratio",
    "Channel",
    "Fraud_Label"
]

NUMERICAL_FEATURES_DEFAULT = [
    "Transaction_Amount",
    "Transaction_Frequency_24H",
    "Location_Distance_KM",
    "Amount_Deviation",
    "Merchant_Risk_Score"
]

ALL_NUMERICAL_CANDIDATES = [
    "Transaction_Amount",
    "Transaction_Frequency_24H",
    "Location_Distance_KM",
    "Login_Attempts",
    "Account_Age_Days",
    "Previous_Transaction_Avg",
    "Amount_Deviation",
    "Merchant_Risk_Score",
    "Transaction_Duration_Sec",
    "Account_Balance",
    "Amount_to_Balance_Ratio"
]

def validate_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    rows, cols = df.shape
    if rows == 0:
        return {"valid": False, "error": "Uploaded CSV file contains 0 rows of data."}
    
    missing_counts = df.isnull().sum().to_dict()
    total_missing = int(df.isnull().sum().sum())
    duplicates = int(df.duplicated().sum())
    
    col_names = list(df.columns)
    numeric_cols = [c for c in col_names if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in col_names if c not in numeric_cols]
    
    has_fraud_label = "Fraud_Label" in col_names or "fraud_label" in [c.lower() for c in col_names]
    
    return {
        "valid": True,
        "rows": rows,
        "columns": cols,
        "column_names": col_names,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "total_missing_cells": total_missing,
        "missing_by_column": missing_counts,
        "duplicate_rows": duplicates,
        "has_fraud_label": has_fraud_label
    }

def apply_column_mapping_and_clean(df: pd.DataFrame, mapping: Optional[Dict[str, str]] = None) -> pd.DataFrame:
    clean_df = df.copy()
    if mapping:
        clean_df = clean_df.rename(columns=mapping)
    
    # Auto-detect standard aliases if not mapped
    col_map_auto = {}
    for col in clean_df.columns:
        norm = col.lower().replace(" ", "_").replace("-", "_")
        if norm in ["amount", "tx_amount", "transaction_amount", "amt"]:
            col_map_auto[col] = "Transaction_Amount"
        elif norm in ["id", "tx_id", "transaction_id"]:
            col_map_auto[col] = "Transaction_ID"
        elif norm in ["hour", "tx_hour", "transaction_hour"]:
            col_map_auto[col] = "Transaction_Hour"
        elif norm in ["fraud", "is_fraud", "fraud_label", "label"]:
            col_map_auto[col] = "Fraud_Label"
        elif norm in ["distance", "location_distance", "location_distance_km", "dist_km"]:
            col_map_auto[col] = "Location_Distance_KM"
        elif norm in ["frequency", "frequency_24h", "tx_freq", "transaction_frequency_24h"]:
            col_map_auto[col] = "Transaction_Frequency_24H"
        elif norm in ["merchant_risk", "merchant_risk_score", "risk_score"]:
            col_map_auto[col] = "Merchant_Risk_Score"
        elif norm in ["login_attempts", "logins", "login_tries"]:
            col_map_auto[col] = "Login_Attempts"
    
    if col_map_auto:
        clean_df = clean_df.rename(columns=col_map_auto)
        
    # Ensure Transaction_ID exists
    if "Transaction_ID" not in clean_df.columns:
        clean_df["Transaction_ID"] = [f"TX-{100000 + i}" for i in range(len(clean_df))]
        
    # Handle missing numeric columns with intelligent defaults
    if "Transaction_Amount" not in clean_df.columns:
        clean_df["Transaction_Amount"] = 100.0
    clean_df["Transaction_Amount"] = pd.to_numeric(clean_df["Transaction_Amount"], errors='coerce').fillna(50.0)
    
    if "Transaction_Hour" not in clean_df.columns:
        clean_df["Transaction_Hour"] = np.random.randint(0, 24, size=len(clean_df))
    clean_df["Transaction_Hour"] = pd.to_numeric(clean_df["Transaction_Hour"], errors='coerce').fillna(12).astype(int)
    
    if "Transaction_Frequency_24H" not in clean_df.columns:
        clean_df["Transaction_Frequency_24H"] = 2
    clean_df["Transaction_Frequency_24H"] = pd.to_numeric(clean_df["Transaction_Frequency_24H"], errors='coerce').fillna(2).astype(int)
    
    if "Location_Distance_KM" not in clean_df.columns:
        clean_df["Location_Distance_KM"] = 10.0
    clean_df["Location_Distance_KM"] = pd.to_numeric(clean_df["Location_Distance_KM"], errors='coerce').fillna(10.0)
    
    if "Login_Attempts" not in clean_df.columns:
        clean_df["Login_Attempts"] = 1
    clean_df["Login_Attempts"] = pd.to_numeric(clean_df["Login_Attempts"], errors='coerce').fillna(1).astype(int)
    
    if "Previous_Transaction_Avg" not in clean_df.columns:
        clean_df["Previous_Transaction_Avg"] = clean_df["Transaction_Amount"] * 0.95
    clean_df["Previous_Transaction_Avg"] = pd.to_numeric(clean_df["Previous_Transaction_Avg"], errors='coerce').fillna(50.0)
    
    if "Amount_Deviation" not in clean_df.columns:
        clean_df["Amount_Deviation"] = np.round(
            np.abs(clean_df["Transaction_Amount"] - clean_df["Previous_Transaction_Avg"]) / np.maximum(1.0, clean_df["Previous_Transaction_Avg"]),
            2
        )
    clean_df["Amount_Deviation"] = pd.to_numeric(clean_df["Amount_Deviation"], errors='coerce').fillna(0.2)
    
    if "Merchant_Risk_Score" not in clean_df.columns:
        clean_df["Merchant_Risk_Score"] = 0.15
    clean_df["Merchant_Risk_Score"] = pd.to_numeric(clean_df["Merchant_Risk_Score"], errors='coerce').fillna(0.15)
    
    if "Account_Balance" not in clean_df.columns:
        clean_df["Account_Balance"] = 5000.0
    clean_df["Account_Balance"] = pd.to_numeric(clean_df["Account_Balance"], errors='coerce').fillna(5000.0)
    
    if "Amount_to_Balance_Ratio" not in clean_df.columns:
        clean_df["Amount_to_Balance_Ratio"] = np.round(clean_df["Transaction_Amount"] / np.maximum(1.0, clean_df["Account_Balance"]), 3)
    clean_df["Amount_to_Balance_Ratio"] = pd.to_numeric(clean_df["Amount_to_Balance_Ratio"], errors='coerce').fillna(0.01)
    
    if "Device_Change" not in clean_df.columns:
        clean_df["Device_Change"] = "Known Device"
    else:
        clean_df["Device_Change"] = clean_df["Device_Change"].astype(str)
        
    if "Channel" not in clean_df.columns:
        clean_df["Channel"] = "Mobile"
    else:
        clean_df["Channel"] = clean_df["Channel"].astype(str)
        
    if "Account_Age_Days" not in clean_df.columns:
        clean_df["Account_Age_Days"] = 365
    clean_df["Account_Age_Days"] = pd.to_numeric(clean_df["Account_Age_Days"], errors='coerce').fillna(365).astype(int)
    
    if "Transaction_Duration_Sec" not in clean_df.columns:
        clean_df["Transaction_Duration_Sec"] = 45
    clean_df["Transaction_Duration_Sec"] = pd.to_numeric(clean_df["Transaction_Duration_Sec"], errors='coerce').fillna(45).astype(int)
    
    if "Fraud_Label" in clean_df.columns:
        clean_df["Fraud_Label"] = pd.to_numeric(clean_df["Fraud_Label"], errors='coerce').fillna(0).astype(int)
    
    # Calculate heuristic Project_Risk_Score
    risk = np.zeros(len(clean_df))
    risk += np.where(clean_df["Amount_Deviation"] > 3.0, 25, np.where(clean_df["Amount_Deviation"] > 1.5, 12, 0))
    risk += np.where(clean_df["Location_Distance_KM"] > 300, 25, np.where(clean_df["Location_Distance_KM"] > 80, 12, 0))
    risk += np.where(clean_df["Merchant_Risk_Score"] > 0.6, 20, 0)
    risk += np.where(clean_df["Device_Change"] == "Changed Device", 15, 0)
    risk += np.where(clean_df["Login_Attempts"] >= 3, 15, 0)
    risk += np.where(clean_df["Transaction_Frequency_24H"] >= 8, 10, 0)
    risk += np.where(clean_df["Transaction_Hour"].isin([0, 1, 2, 3, 4]), 8, 0)
    clean_df["Project_Risk_Score"] = np.clip(risk, 0, 100).astype(int)
    
    return clean_df

def run_dbscan_clustering(
    df: pd.DataFrame,
    eps: float = 0.50,
    min_samples: int = 5,
    selected_features: Optional[List[str]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    if not selected_features:
        selected_features = NUMERICAL_FEATURES_DEFAULT
        
    valid_features = [f for f in selected_features if f in df.columns]
    if not valid_features:
        valid_features = [c for c in df.select_dtypes(include=[np.number]).columns if c != "Fraud_Label"][:5]
        
    X = df[valid_features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    db = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean', n_jobs=-1)
    cluster_labels = db.fit_predict(X_scaled)
    
    res_df = df.copy()
    res_df["Cluster"] = cluster_labels
    res_df["Is_Anomaly"] = cluster_labels == -1
    
    n_noise = int((cluster_labels == -1).sum())
    unique_clusters = set(cluster_labels)
    unique_clusters.discard(-1)
    n_clusters = len(unique_clusters)
    noise_ratio = round(n_noise / len(df), 4)
    
    cluster_sizes = {}
    for c in sorted(list(unique_clusters)):
        cluster_sizes[int(c)] = int((cluster_labels == c).sum())
        
    meta = {
        "num_clusters": int(n_clusters),
        "num_noise": int(n_noise),
        "noise_ratio": float(noise_ratio),
        "cluster_sizes": cluster_sizes,
        "selected_features": valid_features,
        "eps": float(eps),
        "min_samples": int(min_samples)
    }
    
    return res_df, meta

def compute_k_distance_elbow(
    df: pd.DataFrame,
    k: int = 5,
    selected_features: Optional[List[str]] = None,
    max_samples: int = 1500
) -> Dict[str, Any]:
    if not selected_features:
        selected_features = NUMERICAL_FEATURES_DEFAULT
    valid_features = [f for f in selected_features if f in df.columns]
    
    sub_df = df if len(df) <= max_samples else df.sample(n=max_samples, random_state=42)
    X = sub_df[valid_features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    nn = NearestNeighbors(n_neighbors=k, metric='euclidean', n_jobs=-1)
    nn.fit(X_scaled)
    distances, _ = nn.kneighbors(X_scaled)
    
    k_distances = np.sort(distances[:, k - 1])
    n_pts = len(k_distances)
    
    # Kneedle algorithm for elbow detection
    x1, y1 = 0, k_distances[0]
    x2, y2 = n_pts - 1, k_distances[-1]
    dx = x2 - x1
    dy = y2 - y1
    line_len = math.sqrt(dx*dx + dy*dy) or 1.0
    
    max_dist = -1.0
    elbow_idx = int(n_pts * 0.85)
    for i in range(int(n_pts * 0.4), int(n_pts * 0.98)):
        px, py = i, k_distances[i]
        perp = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / line_len
        if perp > max_dist:
            max_dist = perp
            elbow_idx = i
            
    recommended_eps = round(float(k_distances[elbow_idx]), 2)
    recommended_eps = max(0.15, min(2.50, recommended_eps))
    
    # Downsample points for chart (100 points)
    step = max(1, n_pts // 100)
    chart_points = []
    for idx in range(0, n_pts, step):
        pt_idx = len(chart_points) + 1
        dist_val = round(float(k_distances[idx]), 3)
        chart_points.append({
            "index": pt_idx,
            "distance": dist_val,
            "isElbow": abs(idx - elbow_idx) < step
        })
        
    return {
        "points": chart_points,
        "recommended_eps": recommended_eps,
        "k": k
    }

def compute_evaluation_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    if "Fraud_Label" not in df.columns:
        return {
            "has_labels": False,
            "message": "Ground-truth fraud labels are not available. Precision, recall, F1 and confusion matrix cannot be calculated."
        }
        
    is_anomaly = df["Cluster"] == -1
    is_fraud = df["Fraud_Label"] == 1
    
    tp = int((is_anomaly & is_fraud).sum())
    fp = int((is_anomaly & ~is_fraud).sum())
    tn = int((~is_anomaly & ~is_fraud).sum())
    fn = int((~is_anomaly & is_fraud).sum())
    
    total = tp + fp + tn + fn or 1
    accuracy = round((tp + tn) / total, 4)
    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
    f1 = round(2 * precision * recall / (precision + recall), 4) if (precision + recall) > 0 else 0.0
    
    # Parameter sweep across epsilon
    sweep = []
    sub_df = df if len(df) <= 1200 else df.sample(1200, random_state=42)
    valid_features = [f for f in NUMERICAL_FEATURES_DEFAULT if f in df.columns]
    X_scaled = StandardScaler().fit_transform(sub_df[valid_features].values)
    y_fraud = sub_df["Fraud_Label"].values
    
    for test_eps in [0.30, 0.45, 0.60, 0.75, 0.90, 1.10, 1.30, 1.50, 1.80]:
        test_db = DBSCAN(eps=test_eps, min_samples=5, metric='euclidean', n_jobs=-1)
        labels = test_db.fit_predict(X_scaled)
        pred_anom = labels == -1
        
        sw_tp = int((pred_anom & (y_fraud == 1)).sum())
        sw_fp = int((pred_anom & (y_fraud == 0)).sum())
        sw_fn = int((~pred_anom & (y_fraud == 1)).sum())
        
        sw_prec = round(sw_tp / (sw_tp + sw_fp), 4) if (sw_tp + sw_fp) > 0 else 0.0
        sw_rec = round(sw_tp / (sw_tp + sw_fn), 4) if (sw_tp + sw_fn) > 0 else 0.0
        sw_f1 = round(2 * sw_prec * sw_rec / (sw_prec + sw_rec), 4) if (sw_prec + sw_rec) > 0 else 0.0
        
        unique_c = len(set(labels) - {-1})
        n_noise = int((labels == -1).sum())
        
        sweep.append({
            "eps": test_eps,
            "min_samples": 5,
            "clusters": unique_c,
            "noise": n_noise,
            "noiseRate": round(n_noise / len(sub_df) * 100, 1),
            "precision": round(sw_prec * 100, 1),
            "recall": round(sw_rec * 100, 1),
            "f1": round(sw_f1 * 100, 1)
        })
        
    return {
        "has_labels": True,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "sweep": sweep
    }

def compute_box_plot_stats(series: pd.Series, category_name: str) -> Dict[str, Any]:
    cleaned = series.dropna().values
    if len(cleaned) == 0:
        return {"category": category_name, "min": 0, "q1": 0, "median": 0, "q3": 0, "max": 0, "mean": 0, "outliers": [], "count": 0}
        
    q1 = float(np.percentile(cleaned, 25))
    median = float(np.percentile(cleaned, 50))
    q3 = float(np.percentile(cleaned, 75))
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    in_bounds = cleaned[(cleaned >= lower_bound) & (cleaned <= upper_bound)]
    min_val = float(np.min(in_bounds)) if len(in_bounds) > 0 else float(np.min(cleaned))
    max_val = float(np.max(in_bounds)) if len(in_bounds) > 0 else float(np.max(cleaned))
    
    outliers = cleaned[(cleaned < lower_bound) | (cleaned > upper_bound)]
    sampled_outliers = [round(float(v), 2) for v in outliers[:20]]
    
    return {
        "category": category_name,
        "min": round(min_val, 2),
        "q1": round(q1, 2),
        "median": round(median, 2),
        "q3": round(q3, 2),
        "max": round(max_val, 2),
        "mean": round(float(np.mean(cleaned)), 2),
        "outliers": sampled_outliers,
        "count": len(cleaned)
    }

def compute_histogram_bins(series: pd.Series, num_bins: int = 20) -> List[Dict[str, Any]]:
    cleaned = series.dropna().values
    if len(cleaned) == 0:
        return []
    counts, bin_edges = np.histogram(cleaned, bins=num_bins)
    bins = []
    for i in range(len(counts)):
        b_min = round(float(bin_edges[i]), 1)
        b_max = round(float(bin_edges[i+1]), 1)
        bins.append({
            "binRange": f"{int(b_min)}-{int(b_max)}",
            "min": b_min,
            "max": b_max,
            "count": int(counts[i])
        })
    return bins

def compute_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    available_cols = [c for c in ALL_NUMERICAL_CANDIDATES if c in df.columns]
    if len(available_cols) < 2:
        return {"features": [], "matrix": [], "strongestPositive": {}, "strongestNegative": {}, "redundantPairs": []}
        
    corr = df[available_cols].corr().fillna(0).round(2)
    matrix = corr.values.tolist()
    
    strongest_pos = {"feat1": "", "feat2": "", "value": -1.0}
    strongest_neg = {"feat1": "", "feat2": "", "value": 1.0}
    redundant_pairs = []
    
    n_feats = len(available_cols)
    for i in range(n_feats):
        for j in range(i + 1, n_feats):
            val = float(matrix[i][j])
            f1, f2 = available_cols[i], available_cols[j]
            if val > strongest_pos["value"]:
                strongest_pos = {"feat1": f1, "feat2": f2, "value": val}
            if val < strongest_neg["value"]:
                strongest_neg = {"feat1": f1, "feat2": f2, "value": val}
            if abs(val) >= 0.70:
                redundant_pairs.append({"feat1": f1, "feat2": f2, "value": val})
                
    return {
        "features": available_cols,
        "matrix": matrix,
        "strongestPositive": strongest_pos,
        "strongestNegative": strongest_neg,
        "redundantPairs": redundant_pairs
    }

def prepare_frontend_payload(df: pd.DataFrame, meta: Dict[str, Any]) -> Dict[str, Any]:
    n_total = len(df)
    n_anomalies = meta["num_noise"]
    n_clusters = meta["num_clusters"]
    
    has_labels = "Fraud_Label" in df.columns
    n_fraud = int(df["Fraud_Label"].sum()) if has_labels else 0
    n_normal = n_total - n_fraud if has_labels else n_total - n_anomalies
    
    total_volume = round(float(df["Transaction_Amount"].sum()), 2)
    
    # 1. Dashboard summary cards
    kpi = {
        "total_transactions": n_total,
        "total_volume": total_volume,
        "normal_transactions": n_normal,
        "fraud_transactions": n_fraud if has_labels else None,
        "anomaly_count": n_anomalies,
        "anomaly_rate": round((n_anomalies / n_total) * 100, 1),
        "cluster_count": n_clusters,
        "has_fraud_label": has_labels
    }
    
    # 2. Hourly activity
    hourly_counts = []
    for h in range(24):
        mask = df["Transaction_Hour"] == h
        h_total = int(mask.sum())
        h_fraud = int((mask & (df["Fraud_Label"] == 1)).sum()) if has_labels else 0
        h_anomaly = int((mask & (df["Cluster"] == -1)).sum())
        hourly_counts.append({
            "hour": f"{h:02d}:00",
            "hourNum": h,
            "total": h_total,
            "fraud": h_fraud,
            "anomaly": h_anomaly,
            "normal": h_total - h_anomaly
        })
        
    # 3. Amount distribution histogram
    amount_hist = compute_histogram_bins(df["Transaction_Amount"], 20)
    
    # 4. Box plots
    is_norm = df["Cluster"] != -1
    is_anom = df["Cluster"] == -1
    
    location_boxes = [
        compute_box_plot_stats(df[is_norm]["Location_Distance_KM"], "Normal"),
        compute_box_plot_stats(df[is_anom]["Location_Distance_KM"], "Potential Anomaly")
    ]
    login_boxes = [
        compute_box_plot_stats(df[is_norm]["Login_Attempts"], "Normal"),
        compute_box_plot_stats(df[is_anom]["Login_Attempts"], "Potential Anomaly")
    ]
    dev_boxes = [
        compute_box_plot_stats(df[is_norm]["Amount_Deviation"], "Normal"),
        compute_box_plot_stats(df[is_anom]["Amount_Deviation"], "DBSCAN Anomaly")
    ]
    risk_boxes = [
        compute_box_plot_stats(df[is_norm]["Merchant_Risk_Score"], "Normal"),
        compute_box_plot_stats(df[is_anom]["Merchant_Risk_Score"], "Potential Anomaly")
    ]
    
    # 5. Correlation Matrix
    corr_data = compute_correlation_matrix(df)
    
    # 6. Sampled Scatter Points (Preserve 100% of all anomalies!)
    anomaly_pts = df[is_anom]
    normal_pts = df[is_norm]
    sample_size = min(1200, len(normal_pts))
    sampled_normal = normal_pts.sample(n=sample_size, random_state=42) if len(normal_pts) > sample_size else normal_pts
    
    scatter_df = pd.concat([sampled_normal, anomaly_pts])
    scatter_data = []
    for _, row in scatter_df.iterrows():
        scatter_data.append({
            "id": str(row["Transaction_ID"]),
            "amount": float(row["Transaction_Amount"]),
            "amount_deviation": float(row["Amount_Deviation"]),
            "location_distance": float(row["Location_Distance_KM"]),
            "frequency_24h": int(row["Transaction_Frequency_24H"]),
            "merchant_risk": float(row["Merchant_Risk_Score"]),
            "login_attempts": int(row["Login_Attempts"]),
            "account_balance": float(row["Account_Balance"]),
            "cluster": int(row["Cluster"]),
            "is_anomaly": bool(row["Is_Anomaly"]),
            "fraud_label": int(row["Fraud_Label"]) if has_labels else 0,
            "project_risk_score": int(row["Project_Risk_Score"]),
            "channel": str(row["Channel"]),
            "device_change": str(row["Device_Change"])
        })
        
    # 7. Evaluation metrics
    eval_metrics = compute_evaluation_metrics(df)
    
    # 8. Cluster Distribution
    cluster_dist = []
    for c_id, count in meta["cluster_sizes"].items():
        cluster_dist.append({"cluster": f"Cluster {c_id}", "count": count, "isNoise": False})
    cluster_dist.append({"cluster": "Noise / Anomalies", "count": n_anomalies, "isNoise": True})
    
    return {
        "kpi": kpi,
        "meta": meta,
        "hourly_counts": hourly_counts,
        "amount_histogram": amount_hist,
        "box_plots": {
            "location": location_boxes,
            "login": login_boxes,
            "amount_deviation": dev_boxes,
            "merchant_risk": risk_boxes
        },
        "correlation": corr_data,
        "scatter_points": scatter_data,
        "evaluation": eval_metrics,
        "cluster_distribution": cluster_dist
    }
