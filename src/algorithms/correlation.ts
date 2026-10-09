import { Transaction, CorrelationMatrix } from '../types';

export const NUMERICAL_FEATURES: { key: keyof Transaction; label: string }[] = [
  { key: 'amount', label: 'Amount' },
  { key: 'frequency_24h', label: 'Tx Frequency' },
  { key: 'location_distance', label: 'Location Dist' },
  { key: 'login_attempts', label: 'Login Attempts' },
  { key: 'account_age', label: 'Account Age' },
  { key: 'prev_tx_avg', label: 'Prev Tx Avg' },
  { key: 'amount_deviation', label: 'Amount Dev' },
  { key: 'merchant_risk', label: 'Merchant Risk' },
  { key: 'tx_duration', label: 'Tx Duration' },
  { key: 'account_balance', label: 'Account Balance' },
  { key: 'amount_to_balance', label: 'Amount / Balance' }
];

export function computeCorrelationMatrix(transactions: Transaction[]): CorrelationMatrix {
  const n = transactions.length;
  const numFeats = NUMERICAL_FEATURES.length;

  if (n === 0) {
    return {
      features: NUMERICAL_FEATURES.map(f => f.label),
      matrix: [],
      strongestPositive: { feat1: '', feat2: '', value: 0 },
      strongestNegative: { feat1: '', feat2: '', value: 0 },
      redundantPairs: []
    };
  }

  // 1. Calculate means and std dev for each feature
  const values: number[][] = NUMERICAL_FEATURES.map(f =>
    transactions.map(t => {
      const v = t[f.key];
      return typeof v === 'number' ? v : 0;
    })
  );

  const means: number[] = values.map(col => col.reduce((acc, v) => acc + v, 0) / n);
  const stds: number[] = values.map((col, idx) => {
    const mean = means[idx];
    const variance = col.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    return Math.sqrt(variance) || 1e-6;
  });

  // 2. Compute Pearson correlation coefficients
  const matrix: number[][] = [];
  let maxPos = { feat1: '', feat2: '', value: -1 };
  let maxNeg = { feat1: '', feat2: '', value: 1 };
  const redundantPairs: { feat1: string; feat2: string; value: number }[] = [];

  for (let i = 0; i < numFeats; i++) {
    const row: number[] = [];
    for (let j = 0; j < numFeats; j++) {
      if (i === j) {
        row.push(1.0);
        continue;
      }
      let cov = 0;
      for (let k = 0; k < n; k++) {
        cov += (values[i][k] - means[i]) * (values[j][k] - means[j]);
      }
      cov /= n;
      const r = Number((cov / (stds[i] * stds[j])).toFixed(2));
      row.push(r);

      if (i < j) {
        const feat1 = NUMERICAL_FEATURES[i].label;
        const feat2 = NUMERICAL_FEATURES[j].label;

        if (r > maxPos.value) {
          maxPos = { feat1, feat2, value: r };
        }
        if (r < maxNeg.value) {
          maxNeg = { feat1, feat2, value: r };
        }
        if (Math.abs(r) >= 0.70) {
          redundantPairs.push({ feat1, feat2, value: r });
        }
      }
    }
    matrix.push(row);
  }

  return {
    features: NUMERICAL_FEATURES.map(f => f.label),
    matrix,
    strongestPositive: maxPos,
    strongestNegative: maxNeg,
    redundantPairs
  };
}
