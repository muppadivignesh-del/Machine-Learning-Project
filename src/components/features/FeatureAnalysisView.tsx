import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction } from '../../types';
import { ChartCard } from '../common/ChartCard';
import { BoxPlotChart } from '../common/BoxPlotChart';
import { computeHistogram, calculateBoxPlotStats, computeFeatureStats } from '../../algorithms/statistics';
import { Info, HelpCircle } from 'lucide-react';

interface FeatureAnalysisViewProps {
  transactions: Transaction[];
}

const AVAILABLE_FEATURES: { key: keyof Transaction; label: string; unit: string }[] = [
  { key: 'amount', label: 'Transaction Amount', unit: '$' },
  { key: 'frequency_24h', label: 'Transaction Frequency (24h)', unit: 'tx' },
  { key: 'location_distance', label: 'Location Distance', unit: 'km' },
  { key: 'login_attempts', label: 'Login Attempts', unit: 'tries' },
  { key: 'amount_deviation', label: 'Amount Deviation from Historical Avg', unit: 'x' },
  { key: 'merchant_risk', label: 'Merchant Risk Score', unit: 'idx' },
  { key: 'account_balance', label: 'Account Balance', unit: '$' },
  { key: 'account_age', label: 'Account Age', unit: 'days' },
  { key: 'tx_duration', label: 'Transaction Duration', unit: 'sec' },
  { key: 'amount_to_balance', label: 'Amount-to-Balance Ratio', unit: 'ratio' }
];

export const FeatureAnalysisView: React.FC<FeatureAnalysisViewProps> = ({ transactions }) => {
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<keyof Transaction>('amount');

  const activeFeatureMeta =
    AVAILABLE_FEATURES.find(f => f.key === selectedFeatureKey) || AVAILABLE_FEATURES[0];

  // Extract numeric array for stats
  const allValues = useMemo(() => {
    return transactions
      .map(t => t[selectedFeatureKey])
      .filter((v): v is number => typeof v === 'number');
  }, [transactions, selectedFeatureKey]);

  // Compute summary stats
  const featureStats = useMemo(() => {
    return computeFeatureStats(allValues, activeFeatureMeta.label);
  }, [allValues, activeFeatureMeta]);

  // Compute histogram
  const histogramData = useMemo(() => {
    return computeHistogram(transactions, selectedFeatureKey, 20, 'all');
  }, [transactions, selectedFeatureKey]);

  // Compute box plot comparison
  const boxPlotData = useMemo(() => {
    const normalVals = transactions
      .filter(t => t.fraud_label === 0 && !t.is_anomaly)
      .map(t => t[selectedFeatureKey])
      .filter((v): v is number => typeof v === 'number');

    const fraudVals = transactions
      .filter(t => t.fraud_label === 1)
      .map(t => t[selectedFeatureKey])
      .filter((v): v is number => typeof v === 'number');

    const anomalyVals = transactions
      .filter(t => t.is_anomaly)
      .map(t => t[selectedFeatureKey])
      .filter((v): v is number => typeof v === 'number');

    return [
      calculateBoxPlotStats(normalVals, 'Normal'),
      calculateBoxPlotStats(fraudVals, 'Fraud'),
      calculateBoxPlotStats(anomalyVals, 'DBSCAN Anomaly')
    ];
  }, [transactions, selectedFeatureKey]);

  // Dynamic Insight
  const featureInsight = useMemo(() => {
    const normalMed = boxPlotData[0]?.median || 0;
    const anomalyMed = boxPlotData[2]?.median || 0;
    if (featureStats.skewness > 1.5) {
      return `${activeFeatureMeta.label} exhibits strong positive skewness (${featureStats.skewness}), showing high-density concentration near the base and a long tail of extreme anomalies. Median for DBSCAN anomalies is ${anomalyMed} vs ${normalMed} for normal.`;
    }
    return `For ${activeFeatureMeta.label}, normal transactions cluster around a median of ${normalMed} ${activeFeatureMeta.unit}, whereas DBSCAN isolates points reaching up to ${featureStats.max} ${activeFeatureMeta.unit}.`;
  }, [boxPlotData, featureStats, activeFeatureMeta]);

  return (
    <div>
      {/* Theoretical Clarification Banner */}
      <div
        style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}
      >
        <Info size={22} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Unsupervised Methodology Note: Density-Based vs Supervised Feature Importance
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Unlike tree-based models (Random Forest, XGBoost) or linear regressions, <strong>DBSCAN is an unsupervised clustering algorithm</strong>. It does not compute loss gradients or Gini feature importance scores. Presenting a pseudo "DBSCAN Feature Importance" chart would be methodologically incorrect. Instead, we analyze <strong>Feature Distribution & Behavioral Separation</strong> to understand how each feature manifests across normal clusters versus noise.
          </p>
        </div>
      </div>

      {/* Feature Selector Dropdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Select Feature for Deep Analysis:
          </label>
          <select
            className="select-input"
            value={selectedFeatureKey}
            onChange={e => setSelectedFeatureKey(e.target.value as keyof Transaction)}
            style={{ minWidth: '240px', fontWeight: 600 }}
          >
            {AVAILABLE_FEATURES.map(f => (
              <option key={f.key} value={f.key}>
                {f.label} ({f.unit})
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Analyzing <strong>{allValues.length.toLocaleString()}</strong> data points
        </div>
      </div>

      {/* Row 1: Histogram & Box Plot Side-by-Side */}
      <div className="grid-cols-2">
        {/* Dynamic Histogram */}
        <ChartCard
          title={`${activeFeatureMeta.label} Distribution (Histogram)`}
          subtitle={`Binned frequency across the dataset with anomaly counts`}
          explanation={`Shows the empirical frequency distribution of ${activeFeatureMeta.label}. Look for multi-modal behavior or long right tails where DBSCAN identifies isolated points.`}
          insight={featureInsight}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={histogramData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="binRange" stroke="var(--text-muted)" fontSize={10} interval={1} angle={-25} textAnchor="end" />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.binRange} {activeFeatureMeta.unit}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Total Transactions:</span>
                          <span className="tooltip-val">{d.count}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">DBSCAN Anomalies:</span>
                          <span className="tooltip-val" style={{ color: '#fb7185' }}>{d.anomalyCount}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Confirmed Fraud:</span>
                          <span className="tooltip-val" style={{ color: '#f43f5e' }}>{d.fraudCount}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Dynamic Box Plot */}
        <ChartCard
          title={`${activeFeatureMeta.label} Box Plot Comparison`}
          subtitle="Normal vs Fraud vs DBSCAN Anomaly five-number summaries"
          explanation={`Examines how ${activeFeatureMeta.label} varies between legitimate clusters and suspicious outliers. The horizontal lines denote min/max whiskers and the central box bounds the 25th-75th percentiles.`}
          insight={`Notice the significant vertical separation between Normal clusters and DBSCAN anomalies, confirming this feature contributes distinct density boundaries.`}
        >
          <BoxPlotChart
            data={boxPlotData}
            yAxisLabel={activeFeatureMeta.label}
            unit={activeFeatureMeta.unit}
            height={300}
          />
        </ChartCard>
      </div>

      {/* Row 2: Comprehensive Summary Statistics Table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-title">Parametric & Non-Parametric Summary Statistics</h2>
            <p className="chart-subtitle">
              Exact mathematical properties of {activeFeatureMeta.label} calculated from live records
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Statistical Metric</th>
                <th>Calculated Value</th>
                <th>Interpretation & Purpose for DBSCAN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Mean (μ)</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {featureStats.mean.toLocaleString()} {activeFeatureMeta.unit}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  Center of mass. Used during Z-score standardization to zero-center feature dimensions.
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Median (Q2)</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                  {featureStats.median.toLocaleString()} {activeFeatureMeta.unit}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  50th percentile. Robust against extreme fraud spikes compared to the arithmetic mean.
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Standard Deviation (σ)</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {featureStats.std.toLocaleString()} {activeFeatureMeta.unit}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  Dispersion metric. Feature scaling divides by σ so no single high-variance feature dominates Euclidean distance.
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Min / Max Range</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {featureStats.min.toLocaleString()} — {featureStats.max.toLocaleString()} {activeFeatureMeta.unit}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  Full empirical support. Spread spans {(featureStats.max - featureStats.min).toLocaleString()} {activeFeatureMeta.unit}.
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Skewness</td>
                <td
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: featureStats.skewness > 1 ? '#f43f5e' : 'inherit'
                  }}
                >
                  {featureStats.skewness > 0 ? `+${featureStats.skewness}` : featureStats.skewness}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {featureStats.skewness > 1
                    ? 'Heavy right-tailed distribution. Extreme fraud values populate the sparse upper tail.'
                    : 'Relatively symmetric distribution around cluster cores.'}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Interquartile Range (IQR)</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {featureStats.iqr.toLocaleString()} {activeFeatureMeta.unit}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  Middle 50% density zone where normal transaction clusters reside.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
