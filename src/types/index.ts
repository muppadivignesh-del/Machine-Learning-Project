export interface Transaction {
  id: string;
  timestamp: string;
  hour: number;
  amount: number;
  frequency_24h: number;
  location_distance: number; // in km
  device_change: 'Known Device' | 'Changed Device';
  login_attempts: number;
  account_age: number; // in days
  prev_tx_avg: number;
  amount_deviation: number; // relative deviation from average
  merchant_risk: number; // 0 to 1
  tx_duration: number; // in seconds
  account_balance: number;
  amount_to_balance: number;
  channel: 'Web' | 'Mobile' | 'ATM' | 'POS';
  fraud_label: 0 | 1; // 0: Normal, 1: Fraud
  project_risk_score: number; // 0 - 100 heuristic risk index
  risk_category: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Potential Anomaly';
  cluster?: number; // -1 for noise, >= 0 for clusters
  is_anomaly?: boolean; // cluster === -1
}

export interface DBSCANConfig {
  eps: number;
  min_samples: number;
  selectedFeatures: (keyof Transaction)[];
}

export interface DBSCANResult {
  clusters: number[];
  numClusters: number;
  numNoise: number;
  noiseRatio: number;
  clusterSizes: Record<number, number>;
  silhouetteScore?: number;
}

export interface PerformanceMetrics {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ParamSweepResult {
  eps: number;
  min_samples: number;
  clusters: number;
  noise: number;
  noiseRate: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface KDistancePoint {
  index: number;
  distance: number;
  isElbow?: boolean;
}

export interface BoxPlotStats {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
  count: number;
}

export interface CorrelationMatrix {
  features: string[];
  matrix: number[][];
  strongestPositive: { feat1: string; feat2: string; value: number };
  strongestNegative: { feat1: string; feat2: string; value: number };
  redundantPairs: { feat1: string; feat2: string; value: number }[];
}

export interface FeatureStats {
  feature: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  skewness: number;
  iqr: number;
}
