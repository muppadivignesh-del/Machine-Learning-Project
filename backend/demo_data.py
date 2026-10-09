import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_demo_dataset(count: int = 2500, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    np.random.seed(seed)
    
    records = []
    base_time = datetime(2026, 9, 1, 0, 0, 0)
    channels = ['Mobile', 'Web', 'POS', 'ATM']
    
    for i in range(count):
        is_fraud = random.random() < 0.065 # ~6.5% fraud
        tx_id = f"TX-{100000 + i}"
        cust_id = f"CUST-{random.randint(1000, 9999)}"
        
        if not is_fraud:
            persona = random.random()
            if persona < 0.55: # Daily retail
                hour = random.randint(8, 21)
                prev_avg = round(random.uniform(25, 75), 2)
                amount = round(max(5.0, prev_avg + random.uniform(-20, 25)), 2)
                freq_24h = random.randint(1, 3)
                dist_km = round(random.uniform(0.5, 12.0), 1)
                device_change = "Known Device"
                intl = 0
                login_tries = 1 if random.random() < 0.9 else 2
                acc_age = random.randint(180, 1200)
                merchant_risk = round(random.uniform(0.02, 0.20), 2)
                duration = random.randint(20, 75)
                balance = round(random.uniform(1500, 7500), 2)
                channel = 'Mobile' if random.random() < 0.6 else ('POS' if random.random() < 0.85 else 'Web')
            elif persona < 0.85: # Online shopping
                hour = random.randint(10, 22)
                prev_avg = round(random.uniform(120, 300), 2)
                amount = round(max(30.0, prev_avg + random.uniform(-60, 70)), 2)
                freq_24h = random.randint(1, 5)
                dist_km = round(random.uniform(1.0, 35.0), 1)
                device_change = "Known Device" if random.random() < 0.92 else "Changed Device"
                intl = 0
                login_tries = 1 if random.random() < 0.85 else 2
                acc_age = random.randint(90, 900)
                merchant_risk = round(random.uniform(0.08, 0.28), 2)
                duration = random.randint(35, 120)
                balance = round(random.uniform(3000, 15000), 2)
                channel = 'Web' if random.random() < 0.7 else 'Mobile'
            else: # Corporate / High value
                hour = random.randint(9, 18)
                prev_avg = round(random.uniform(600, 1500), 2)
                amount = round(max(250.0, prev_avg + random.uniform(-300, 400)), 2)
                freq_24h = random.randint(2, 6)
                dist_km = round(random.uniform(10.0, 80.0), 1)
                device_change = "Known Device" if random.random() < 0.88 else "Changed Device"
                intl = 1 if random.random() < 0.15 else 0
                login_tries = 1
                acc_age = random.randint(365, 1800)
                merchant_risk = round(random.uniform(0.05, 0.22), 2)
                duration = random.randint(45, 150)
                balance = round(random.uniform(15000, 50000), 2)
                channel = random.choice(['Web', 'Mobile', 'ATM'])
        else:
            # Fraudulent patterns
            fraud_type = random.random()
            if fraud_type < 0.35: # Account takeover / foreign attack
                hour = random.choice([0, 1, 2, 3, 4, 23])
                prev_avg = round(random.uniform(40, 90), 2)
                amount = round(random.uniform(1200, 3800), 2)
                freq_24h = random.randint(6, 18)
                dist_km = round(random.uniform(250.0, 1800.0), 1)
                device_change = "Changed Device"
                intl = 1
                login_tries = random.randint(3, 5)
                acc_age = random.randint(20, 300)
                merchant_risk = round(random.uniform(0.65, 0.95), 2)
                duration = random.randint(8, 25)
                balance = round(random.uniform(2000, 5000), 2)
                channel = 'Web' if random.random() < 0.6 else 'Mobile'
            elif fraud_type < 0.70: # High velocity card testing
                hour = random.randint(0, 23)
                prev_avg = round(random.uniform(50, 120), 2)
                amount = round(random.uniform(450, 1800), 2)
                freq_24h = random.randint(12, 28)
                dist_km = round(random.uniform(40.0, 400.0), 1)
                device_change = "Changed Device" if random.random() < 0.65 else "Known Device"
                intl = 1 if random.random() < 0.4 else 0
                login_tries = random.randint(2, 5)
                acc_age = random.randint(10, 150)
                merchant_risk = round(random.uniform(0.70, 0.98), 2)
                duration = random.randint(5, 20)
                balance = round(random.uniform(800, 3500), 2)
                channel = 'Web' if random.random() < 0.7 else 'ATM'
            else: # Merchant collusion
                hour = random.randint(1, 22)
                prev_avg = round(random.uniform(100, 250), 2)
                amount = round(random.uniform(2000, 4500), 2)
                freq_24h = random.randint(4, 9)
                dist_km = round(random.uniform(80.0, 600.0), 1)
                device_change = "Changed Device"
                intl = 1 if random.random() < 0.5 else 0
                login_tries = random.randint(2, 4)
                acc_age = random.randint(30, 450)
                merchant_risk = round(random.uniform(0.85, 0.99), 2)
                duration = random.randint(10, 35)
                balance = round(random.uniform(2500, 6000), 2)
                channel = random.choice(channels)
        
        amount_deviation = round(abs(amount - prev_avg) / max(1.0, prev_avg), 2)
        amount_to_balance = round(amount / max(1.0, balance), 3)
        
        # Calculate heuristic risk score (0-100)
        risk = 0
        if amount_deviation > 3.0: risk += 25
        elif amount_deviation > 1.5: risk += 12
        if dist_km > 300: risk += 25
        elif dist_km > 80: risk += 12
        if merchant_risk > 0.6: risk += 20
        if device_change == "Changed Device": risk += 15
        if login_tries >= 3: risk += 15
        if freq_24h >= 8: risk += 10
        if hour in [0, 1, 2, 3, 4]: risk += 8
        project_risk_score = min(100, max(0, risk))
        
        ts = base_time + timedelta(days=random.randint(0, 29), hours=hour, minutes=random.randint(0, 59), seconds=random.randint(0, 59))
        
        records.append({
            "Transaction_ID": tx_id,
            "Customer_ID": cust_id,
            "Timestamp": ts.isoformat(),
            "Transaction_Amount": amount,
            "Transaction_Hour": hour,
            "Transaction_Frequency_24H": freq_24h,
            "Location_Distance_KM": dist_km,
            "Device_Change": device_change,
            "International_Transaction": intl,
            "Login_Attempts": login_tries,
            "Account_Age_Days": acc_age,
            "Previous_Transaction_Avg": prev_avg,
            "Amount_Deviation": amount_deviation,
            "Merchant_Risk_Score": merchant_risk,
            "Transaction_Duration_Sec": duration,
            "Account_Balance": balance,
            "Amount_to_Balance_Ratio": amount_to_balance,
            "Channel": channel,
            "Fraud_Label": 1 if is_fraud else 0,
            "Project_Risk_Score": project_risk_score
        })
        
    return pd.DataFrame(records)
