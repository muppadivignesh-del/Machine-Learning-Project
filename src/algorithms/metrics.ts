import { Transaction, PerformanceMetrics, ParamSweepResult, DBSCANConfig } from '../types';
import { runDBSCAN } from './dbscan';

export function computePerformanceMetrics(transactions: Transaction[]): PerformanceMetrics {
  let tp = 0; // Predicted Anomaly (Noise) & Actual Fraud
  let fp = 0; // Predicted Anomaly (Noise) & Actual Normal
  let tn = 0; // Predicted Normal (Cluster) & Actual Normal
  let fn = 0; // Predicted Normal (Cluster) & Actual Fraud

  for (const t of transactions) {
    const isPredictedAnomaly = t.cluster === -1;
    const isActualFraud = t.fraud_label === 1;

    if (isPredictedAnomaly && isActualFraud) {
      tp++;
    } else if (isPredictedAnomaly && !isActualFraud) {
      fp++;
    } else if (!isPredictedAnomaly && !isActualFraud) {
      tn++;
    } else if (!isPredictedAnomaly && isActualFraud) {
      fn++;
    }
  }

  const total = tp + fp + tn + fn || 1;
  const accuracy = Number(((tp + tn) / total).toFixed(4));
  const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 0;
  const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 0;
  const f1 =
    precision + recall > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

  return {
    tp,
    fp,
    tn,
    fn,
    accuracy,
    precision,
    recall,
    f1
  };
}

export function runParameterSweep(
  baseTransactions: Transaction[],
  minSamples: number = 5,
  epsilons: number[] = [0.3, 0.45, 0.6, 0.75, 0.9, 1.1, 1.3, 1.5, 1.8],
  selectedFeatures: (keyof Transaction)[] = [
    'amount',
    'frequency_24h',
    'location_distance',
    'amount_deviation',
    'merchant_risk'
  ]
): ParamSweepResult[] {
  // To keep parameter comparison rapid for UI, sample 1200 transactions if dataset is large
  const evalSubset =
    baseTransactions.length > 1200
      ? baseTransactions.filter((_, i) => i % Math.ceil(baseTransactions.length / 1200) === 0)
      : baseTransactions;

  const results: ParamSweepResult[] = [];

  for (const eps of epsilons) {
    const config: DBSCANConfig = {
      eps,
      min_samples: minSamples,
      selectedFeatures
    };

    const { transactions, result } = runDBSCAN(evalSubset, config);
    const metrics = computePerformanceMetrics(transactions);

    results.push({
      eps,
      min_samples: minSamples,
      clusters: result.numClusters,
      noise: result.numNoise,
      noiseRate: Number(((result.numNoise / evalSubset.length) * 100).toFixed(1)),
      precision: Number((metrics.precision * 100).toFixed(1)),
      recall: Number((metrics.recall * 100).toFixed(1)),
      f1: Number((metrics.f1 * 100).toFixed(1))
    });
  }

  return results;
}
