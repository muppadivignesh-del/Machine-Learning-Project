import { Transaction, BoxPlotStats, FeatureStats } from '../types';

export function calculateBoxPlotStats(
  values: number[],
  categoryName: string
): BoxPlotStats {
  if (values.length === 0) {
    return {
      category: categoryName,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      mean: 0,
      outliers: [],
      count: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Number((sum / n).toFixed(2));

  function getPercentile(p: number): number {
    const idx = (n - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  const q1 = Number(getPercentile(0.25).toFixed(2));
  const median = Number(getPercentile(0.50).toFixed(2));
  const q3 = Number(getPercentile(0.75).toFixed(2));
  const iqr = q3 - q1;

  const lowerWhiskerBound = q1 - 1.5 * iqr;
  const upperWhiskerBound = q3 + 1.5 * iqr;

  // Actual min/max within whisker bounds
  let min = sorted[0];
  let max = sorted[n - 1];
  const outliers: number[] = [];

  for (const v of sorted) {
    if (v < lowerWhiskerBound || v > upperWhiskerBound) {
      outliers.push(v);
    }
  }

  // Whisker endpoints are extreme points within 1.5 IQR
  const inRange = sorted.filter(v => v >= lowerWhiskerBound && v <= upperWhiskerBound);
  if (inRange.length > 0) {
    min = inRange[0];
    max = inRange[inRange.length - 1];
  }

  return {
    category: categoryName,
    min: Number(min.toFixed(2)),
    q1,
    median,
    q3,
    max: Number(max.toFixed(2)),
    mean,
    outliers,
    count: n
  };
}

export function computeFeatureStats(
  values: number[],
  featureName: string
): FeatureStats {
  const n = values.length;
  if (n === 0) {
    return {
      feature: featureName,
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0,
      skewness: 0,
      iqr: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median =
    n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  // Skewness: m3 / (std^3)
  let m3 = 0;
  for (const v of sorted) {
    m3 += Math.pow(v - mean, 3);
  }
  m3 /= n;
  const skewness = std > 0 ? Number((m3 / Math.pow(std, 3)).toFixed(2)) : 0;

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = Number((q3 - q1).toFixed(2));

  return {
    feature: featureName,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[n - 1].toFixed(2)),
    skewness,
    iqr
  };
}

export interface HistogramBin {
  binRange: string;
  min: number;
  max: number;
  count: number;
  normalCount: number;
  fraudCount: number;
  anomalyCount: number;
}

export function computeHistogram(
  transactions: Transaction[],
  feature: keyof Transaction = 'amount',
  numBins: number = 20,
  filter: 'all' | 'normal' | 'fraud' | 'anomaly' = 'all'
): HistogramBin[] {
  let filtered = transactions;
  if (filter === 'normal') filtered = transactions.filter(t => t.fraud_label === 0 && !t.is_anomaly);
  else if (filter === 'fraud') filtered = transactions.filter(t => t.fraud_label === 1);
  else if (filter === 'anomaly') filtered = transactions.filter(t => t.is_anomaly);

  const values = filtered
    .map(t => t[feature])
    .filter((v): v is number => typeof v === 'number');

  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / numBins || 1;

  const bins: HistogramBin[] = [];

  for (let b = 0; b < numBins; b++) {
    const bMin = min + b * step;
    const bMax = b === numBins - 1 ? max : min + (b + 1) * step;
    bins.push({
      binRange: `${Math.round(bMin)}-${Math.round(bMax)}`,
      min: bMin,
      max: bMax,
      count: 0,
      normalCount: 0,
      fraudCount: 0,
      anomalyCount: 0
    });
  }

  for (const t of filtered) {
    const val = t[feature];
    if (typeof val !== 'number') continue;
    let bIdx = Math.floor((val - min) / step);
    if (bIdx >= numBins) bIdx = numBins - 1;
    if (bIdx < 0) bIdx = 0;

    bins[bIdx].count++;
    if (t.fraud_label === 1) bins[bIdx].fraudCount++;
    else if (t.is_anomaly) bins[bIdx].anomalyCount++;
    else bins[bIdx].normalCount++;
  }

  return bins;
}

export interface HourlyActivityPoint {
  hour: string;
  hourNum: number;
  total: number;
  normal: number;
  fraud: number;
  anomaly: number;
  isPeak: boolean;
}

export function computeHourlyActivity(transactions: Transaction[]): HourlyActivityPoint[] {
  const hoursMap: Record<number, { total: number; normal: number; fraud: number; anomaly: number }> = {};
  for (let h = 0; h < 24; h++) {
    hoursMap[h] = { total: 0, normal: 0, fraud: 0, anomaly: 0 };
  }

  for (const t of transactions) {
    const h = t.hour;
    if (hoursMap[h]) {
      hoursMap[h].total++;
      if (t.fraud_label === 1) hoursMap[h].fraud++;
      if (t.is_anomaly) hoursMap[h].anomaly++;
      if (t.fraud_label === 0 && !t.is_anomaly) hoursMap[h].normal++;
    }
  }

  const totals = Object.values(hoursMap).map(h => h.total);
  const maxTx = Math.max(...totals);
  const avgTx = totals.reduce((a, b) => a + b, 0) / 24;
  const peakThreshold = avgTx * 1.35; // Highlight peak activity hours

  return Object.keys(hoursMap).map(hStr => {
    const h = Number(hStr);
    const data = hoursMap[h];
    const hourLabel = `${String(h).padStart(2, '0')}:00`;
    return {
      hour: hourLabel,
      hourNum: h,
      total: data.total,
      normal: data.normal,
      fraud: data.fraud,
      anomaly: data.anomaly,
      isPeak: data.total >= peakThreshold && data.total === maxTx
    };
  });
}
