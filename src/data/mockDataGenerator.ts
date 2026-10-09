import { Transaction } from '../types';

// Seeded pseudorandom number generator for deterministic reproducible data
function pseudoRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateTransactions(count: number = 2500, seed: number = 42): Transaction[] {
  const rand = pseudoRandom(seed);
  const transactions: Transaction[] = [];

  const channels: Transaction['channel'][] = ['Mobile', 'Web', 'POS', 'ATM'];

  for (let i = 0; i < count; i++) {
    const isFraudIntent = rand() < 0.065; // ~6.5% true fraud
    const txId = `TX-${String(100000 + i).slice(1)}`;

    let hour: number;
    let amount: number;
    let frequency_24h: number;
    let location_distance: number;
    let device_change: Transaction['device_change'];
    let login_attempts: number;
    let account_age: number;
    let prev_tx_avg: number;
    let merchant_risk: number;
    let tx_duration: number;
    let account_balance: number;
    let channel: Transaction['channel'];

    if (!isFraudIntent) {
      // Normal transaction behavior (clusters into dense regions)
      const persona = rand();
      if (persona < 0.55) {
        // Daily grocery / coffee / retail
        hour = Math.floor(8 + rand() * 14); // 8 AM - 10 PM
        prev_tx_avg = Math.round(25 + rand() * 50);
        amount = Math.round(Math.max(5, prev_tx_avg + (rand() - 0.5) * 30));
        frequency_24h = Math.floor(1 + rand() * 3);
        location_distance = Number((rand() * 12).toFixed(1)); // 0 - 12 km
        device_change = 'Known Device';
        login_attempts = rand() < 0.9 ? 1 : 2;
        account_age = Math.floor(180 + rand() * 1200);
        merchant_risk = Number((0.02 + rand() * 0.18).toFixed(2));
        tx_duration = Math.floor(20 + rand() * 60);
        account_balance = Math.round(1500 + rand() * 6000);
        channel = rand() < 0.6 ? 'Mobile' : rand() < 0.85 ? 'POS' : 'Web';
      } else if (persona < 0.85) {
        // Electronic / online shopping
        hour = Math.floor(10 + rand() * 12);
        prev_tx_avg = Math.round(120 + rand() * 180);
        amount = Math.round(Math.max(40, prev_tx_avg + (rand() - 0.5) * 80));
        frequency_24h = Math.floor(1 + rand() * 5);
        location_distance = Number((rand() * 30).toFixed(1));
        device_change = rand() < 0.92 ? 'Known Device' : 'Changed Device';
        login_attempts = rand() < 0.85 ? 1 : 2;
        account_age = Math.floor(90 + rand() * 900);
        merchant_risk = Number((0.08 + rand() * 0.25).toFixed(2));
        tx_duration = Math.floor(35 + rand() * 90);
        account_balance = Math.round(3000 + rand() * 12000);
        channel = rand() < 0.7 ? 'Web' : 'Mobile';
      } else {
        // High-net-worth legitimate / business travel
        hour = Math.floor(9 + rand() * 13);
        prev_tx_avg = Math.round(600 + rand() * 800);
        amount = Math.round(Math.max(300, prev_tx_avg + (rand() - 0.5) * 400));
        frequency_24h = Math.floor(2 + rand() * 6);
        location_distance = Number((15 + rand() * 80).toFixed(1));
        device_change = rand() < 0.88 ? 'Known Device' : 'Changed Device';
        login_attempts = 1;
        account_age = Math.floor(365 + rand() * 1500);
        merchant_risk = Number((0.05 + rand() * 0.20).toFixed(2));
        tx_duration = Math.floor(45 + rand() * 120);
        account_balance = Math.round(15000 + rand() * 45000);
        channel = rand() < 0.5 ? 'Web' : rand() < 0.8 ? 'Mobile' : 'ATM';
      }
    } else {
      // Fraudulent / Suspicious transaction patterns (anomalies / isolated points)
      const fraudType = rand();
      if (fraudType < 0.35) {
        // Account Takeover: new device, late night, far away, multiple bad logins
        hour = Math.floor(rand() < 0.75 ? rand() * 5 : 22 + rand() * 2); // 0-4 AM or 10-11 PM
        prev_tx_avg = Math.round(45 + rand() * 60);
        amount = Math.round(1200 + rand() * 2800); // huge sudden spike
        frequency_24h = Math.floor(6 + rand() * 12);
        location_distance = Number((250 + rand() * 1400).toFixed(1)); // remote / international
        device_change = 'Changed Device';
        login_attempts = Math.floor(3 + rand() * 3);
        account_age = Math.floor(30 + rand() * 400);
        merchant_risk = Number((0.65 + rand() * 0.32).toFixed(2));
        tx_duration = Math.floor(8 + rand() * 25);
        account_balance = Math.round(2000 + rand() * 5000);
        channel = rand() < 0.6 ? 'Web' : 'Mobile';
      } else if (fraudType < 0.70) {
        // High frequency card testing / rapid drain
        hour = Math.floor(rand() * 24);
        prev_tx_avg = Math.round(60 + rand() * 80);
        amount = Math.round(450 + rand() * 1500);
        frequency_24h = Math.floor(14 + rand() * 18); // rapid transactions
        location_distance = Number((60 + rand() * 350).toFixed(1));
        device_change = rand() < 0.6 ? 'Changed Device' : 'Known Device';
        login_attempts = Math.floor(2 + rand() * 4);
        account_age = Math.floor(10 + rand() * 180);
        merchant_risk = Number((0.75 + rand() * 0.23).toFixed(2));
        tx_duration = Math.floor(5 + rand() * 20);
        account_balance = Math.round(800 + rand() * 3000);
        channel = rand() < 0.7 ? 'Web' : 'ATM';
      } else {
        // Merchant collusion / High risk terminal
        hour = Math.floor(1 + rand() * 22);
        prev_tx_avg = Math.round(150 + rand() * 200);
        amount = Math.round(2200 + rand() * 3500);
        frequency_24h = Math.floor(4 + rand() * 8);
        location_distance = Number((80 + rand() * 500).toFixed(1));
        device_change = 'Changed Device';
        login_attempts = Math.floor(2 + rand() * 3);
        account_age = Math.floor(40 + rand() * 500);
        merchant_risk = Number((0.85 + rand() * 0.14).toFixed(2));
        tx_duration = Math.floor(12 + rand() * 35);
        account_balance = Math.round(2500 + rand() * 4000);
        channel = channels[Math.floor(rand() * channels.length)];
      }
    }

    // Calculated fields
    const amount_deviation = Number((Math.abs(amount - prev_tx_avg) / prev_tx_avg).toFixed(2));
    const amount_to_balance = Number((amount / Math.max(1, account_balance)).toFixed(3));

    // Heuristic project risk index (0 - 100) — based on operational business rules
    let risk_calc = 0;
    if (amount_deviation > 3.0) risk_calc += 25;
    else if (amount_deviation > 1.5) risk_calc += 12;

    if (location_distance > 300) risk_calc += 25;
    else if (location_distance > 80) risk_calc += 12;

    if (merchant_risk > 0.6) risk_calc += 20;
    if (device_change === 'Changed Device') risk_calc += 15;
    if (login_attempts >= 3) risk_calc += 15;
    if (frequency_24h >= 8) risk_calc += 10;
    if (hour >= 1 && hour <= 4) risk_calc += 8;

    const project_risk_score = Math.min(100, Math.max(0, Math.round(risk_calc)));

    let risk_category: Transaction['risk_category'] = 'Low Risk';
    if (project_risk_score >= 70) risk_category = 'High Risk';
    else if (project_risk_score >= 40) risk_category = 'Medium Risk';
    else risk_category = 'Low Risk';

    // Format ISO timestamp within past 30 days
    const dayOffset = Math.floor(rand() * 28);
    const minute = Math.floor(rand() * 60);
    const second = Math.floor(rand() * 60);
    const dateObj = new Date(2026, 8, 10 + dayOffset, hour, minute, second);

    transactions.push({
      id: txId,
      timestamp: dateObj.toISOString(),
      hour,
      amount,
      frequency_24h,
      location_distance,
      device_change,
      login_attempts,
      account_age,
      prev_tx_avg,
      amount_deviation,
      merchant_risk,
      tx_duration,
      account_balance,
      amount_to_balance,
      channel,
      fraud_label: isFraudIntent ? 1 : 0,
      project_risk_score,
      risk_category
    });
  }

  return transactions;
}
