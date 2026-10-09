import { Transaction, KDistancePoint } from '../types';

export function computeKDistanceGraph(
  transactions: Transaction[],
  k: number = 5,
  features: (keyof Transaction)[] = [
    'amount',
    'frequency_24h',
    'location_distance',
    'amount_deviation',
    'merchant_risk'
  ],
  sampleSize: number = 100
): { points: KDistancePoint[]; recommendedEps: number; elbowIndex: number } {
  const n = transactions.length;
  if (n <= k) {
    return { points: [], recommendedEps: 0.5, elbowIndex: 0 };
  }

  // 1. Normalize features (z-score)
  const numDim = features.length;
  const matrix: number[][] = transactions.map(t =>
    features.map(f => {
      const v = t[f];
      return typeof v === 'number' ? v : 0;
    })
  );

  const means: number[] = new Array(numDim).fill(0);
  const stds: number[] = new Array(numDim).fill(0);

  for (let d = 0; d < numDim; d++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += matrix[i][d];
    means[d] = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += Math.pow(matrix[i][d] - means[d], 2);
    stds[d] = Math.sqrt(varSum / n) || 1e-6;
  }

  const normMatrix: number[][] = matrix.map(row =>
    row.map((val, d) => (val - means[d]) / stds[d])
  );

  // 2. Compute k-nearest neighbor distance for each point
  // To keep calculation fast, if n is large (> 1200), we can sample 800 points for k-distance evaluation
  const evalIndices: number[] = [];
  const maxEval = Math.min(n, 1000);
  const step = Math.max(1, Math.floor(n / maxEval));
  for (let i = 0; i < n; i += step) {
    evalIndices.push(i);
  }

  const kDistances: number[] = [];

  for (const i of evalIndices) {
    const pt = normMatrix[i];
    // Calculate distance to all other points
    const dists: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let dSum = 0;
      for (let d = 0; d < numDim; d++) {
        const diff = pt[d] - normMatrix[j][d];
        dSum += diff * diff;
      }
      dists.push(Math.sqrt(dSum));
    }
    // Sort ascending and pick k-th distance (0-indexed k-1)
    dists.sort((a, b) => a - b);
    const kDist = dists[Math.min(k - 1, dists.length - 1)];
    kDistances.push(kDist);
  }

  // 3. Sort all k-distances ascending
  kDistances.sort((a, b) => a - b);

  // 4. Kneedle Algorithm for Elbow Detection:
  // Find point with maximum perpendicular distance to secant line from start to end
  const numDist = kDistances.length;
  const x1 = 0;
  const y1 = kDistances[0];
  const x2 = numDist - 1;
  const y2 = kDistances[numDist - 1];

  let maxPerpDist = -1;
  let rawElbowIdx = Math.floor(numDist * 0.85); // fallback default

  const lineDx = x2 - x1;
  const lineDy = y2 - y1;
  const lineLen = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

  // Search elbow typically between 60% and 95% of sorted curve
  const startSearch = Math.floor(numDist * 0.5);
  const endSearch = Math.floor(numDist * 0.98);

  for (let i = startSearch; i < endSearch; i++) {
    const px = i;
    const py = kDistances[i];
    // Perpendicular distance: |(y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1| / sqrt(...)
    const perp = Math.abs(lineDy * px - lineDx * py + x2 * y1 - y2 * x1) / (lineLen || 1);
    if (perp > maxPerpDist) {
      maxPerpDist = perp;
      rawElbowIdx = i;
    }
  }

  const rawRecommendedEps = Number(kDistances[rawElbowIdx].toFixed(2));
  const recommendedEps = Math.max(0.2, Math.min(2.5, rawRecommendedEps));

  // 5. Downsample sorted points for chart display (sampleSize points)
  const sampledPoints: KDistancePoint[] = [];
  const sampleStep = Math.max(1, Math.floor(numDist / sampleSize));

  let chartElbowIdx = 0;
  let minDiffToElbow = Infinity;

  for (let i = 0; i < numDist; i += sampleStep) {
    const ptIdx = sampledPoints.length;
    const distVal = Number(kDistances[i].toFixed(3));
    sampledPoints.push({
      index: ptIdx + 1,
      distance: distVal,
      isElbow: false
    });

    const diff = Math.abs(i - rawElbowIdx);
    if (diff < minDiffToElbow) {
      minDiffToElbow = diff;
      chartElbowIdx = ptIdx;
    }
  }

  if (sampledPoints[chartElbowIdx]) {
    sampledPoints[chartElbowIdx].isElbow = true;
  }

  return {
    points: sampledPoints,
    recommendedEps,
    elbowIndex: chartElbowIdx + 1
  };
}
