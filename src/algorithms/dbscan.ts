import { Transaction, DBSCANConfig, DBSCANResult } from '../types';

export function runDBSCAN(
  transactions: Transaction[],
  config: DBSCANConfig
): { transactions: Transaction[]; result: DBSCANResult } {
  const { eps, min_samples, selectedFeatures } = config;
  const n = transactions.length;

  if (n === 0) {
    return {
      transactions: [],
      result: {
        clusters: [],
        numClusters: 0,
        numNoise: 0,
        noiseRatio: 0,
        clusterSizes: {}
      }
    };
  }

  // 1. Extract feature matrix
  const featureMatrix: number[][] = transactions.map(t =>
    selectedFeatures.map(feat => {
      const val = t[feat];
      return typeof val === 'number' ? val : 0;
    })
  );

  const numDim = selectedFeatures.length;

  // 2. Standardize features (Z-Score standardization: (x - mean) / std)
  const means: number[] = new Array(numDim).fill(0);
  const stds: number[] = new Array(numDim).fill(0);

  for (let d = 0; d < numDim; d++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += featureMatrix[i][d];
    }
    means[d] = sum / n;

    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      varianceSum += Math.pow(featureMatrix[i][d] - means[d], 2);
    }
    stds[d] = Math.sqrt(varianceSum / n) || 1e-6; // avoid division by 0
  }

  const normalizedMatrix: number[][] = featureMatrix.map(row =>
    row.map((val, d) => (val - means[d]) / stds[d])
  );

  // 3. Distance calculation helper (Euclidean distance)
  function distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let d = 0; d < numDim; d++) {
      const diff = a[d] - b[d];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // 4. Region Query helper
  function regionQuery(pointIdx: number): number[] {
    const neighbors: number[] = [];
    const pt = normalizedMatrix[pointIdx];
    for (let j = 0; j < n; j++) {
      if (distance(pt, normalizedMatrix[j]) <= eps) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }

  // 5. DBSCAN Clustering state
  const labels: number[] = new Array(n).fill(-2); // -2: unvisited, -1: noise, >= 0: cluster id
  let currentCluster = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue; // Already visited

    const neighbors = regionQuery(i);

    if (neighbors.length < min_samples) {
      labels[i] = -1; // Mark as noise for now (can become border point later)
    } else {
      // Core point: expand cluster
      labels[i] = currentCluster;
      const seedQueue = [...neighbors];

      // Use index pointer for fast queue processing
      let qIdx = 0;
      while (qIdx < seedQueue.length) {
        const neighborIdx = seedQueue[qIdx];
        qIdx++;

        if (labels[neighborIdx] === -1) {
          // Change previous noise to border point
          labels[neighborIdx] = currentCluster;
        }

        if (labels[neighborIdx] !== -2) {
          continue; // Already processed
        }

        labels[neighborIdx] = currentCluster;
        const neighborNeighbors = regionQuery(neighborIdx);

        if (neighborNeighbors.length >= min_samples) {
          for (let k = 0; k < neighborNeighbors.length; k++) {
            const nextNeighbor = neighborNeighbors[k];
            if (!seedQueue.includes(nextNeighbor)) {
              seedQueue.push(nextNeighbor);
            }
          }
        }
      }
      currentCluster++;
    }
  }

  // 6. Aggregate results
  let numNoise = 0;
  const clusterSizes: Record<number, number> = {};

  const updatedTransactions: Transaction[] = transactions.map((t, idx) => {
    const cluster = labels[idx];
    if (cluster === -1) {
      numNoise++;
    } else {
      clusterSizes[cluster] = (clusterSizes[cluster] || 0) + 1;
    }

    return {
      ...t,
      cluster,
      is_anomaly: cluster === -1,
      risk_category: cluster === -1 ? 'Potential Anomaly' : t.risk_category
    };
  });

  const numClusters = currentCluster;
  const noiseRatio = Number((numNoise / n).toFixed(4));

  return {
    transactions: updatedTransactions,
    result: {
      clusters: labels,
      numClusters,
      numNoise,
      noiseRatio,
      clusterSizes
    }
  };
}
