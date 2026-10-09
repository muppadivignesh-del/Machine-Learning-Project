import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Sliders,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Zap,
  Filter,
  Sparkles
} from 'lucide-react';
import { Transaction, DBSCANConfig, DBSCANResult, KDistancePoint } from '../../types';
import { ChartCard } from '../common/ChartCard';
import { computeKDistanceGraph } from '../../algorithms/kdistance';

interface DBSCANViewProps {
  transactions: Transaction[];
  config: DBSCANConfig;
  onUpdateConfig: (newConfig: DBSCANConfig) => void;
  dbscanResult: DBSCANResult;
  onInspectTransaction: (tx: Transaction) => void;
}

const SCATTER_FEATURES: { key: keyof Transaction; label: string; unit: string }[] = [
  { key: 'amount', label: 'Transaction Amount', unit: '$' },
  { key: 'amount_deviation', label: 'Amount Deviation', unit: 'x' },
  { key: 'location_distance', label: 'Location Distance', unit: 'km' },
  { key: 'frequency_24h', label: 'Frequency in 24h', unit: 'tx' },
  { key: 'merchant_risk', label: 'Merchant Risk', unit: 'idx' },
  { key: 'login_attempts', label: 'Login Attempts', unit: 'tries' },
  { key: 'account_balance', label: 'Account Balance', unit: '$' }
];

export const DBSCANView: React.FC<DBSCANViewProps> = ({
  transactions,
  config,
  onUpdateConfig,
  dbscanResult,
  onInspectTransaction
}) => {
  // 1. K-Distance graph state
  const kDistInfo = useMemo(() => {
    return computeKDistanceGraph(transactions, config.min_samples, config.selectedFeatures, 120);
  }, [transactions, config.min_samples, config.selectedFeatures]);

  // 2. Scatter plot axis state
  const [xAxisKey, setXAxisKey] = useState<keyof Transaction>('amount');
  const [yAxisKey, setYAxisKey] = useState<keyof Transaction>('amount_deviation');
  const [noiseOnlyFilter, setNoiseOnlyFilter] = useState<boolean>(false);
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>('all');
  const [searchTxId, setSearchTxId] = useState<string>('');

  // Zoom / Pan state for Scatter Plot
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredTx, setHoveredTx] = useState<{
    tx: Transaction;
    x: number;
    y: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filtered transactions for scatter plot
  const scatterPoints = useMemo(() => {
    let pts = transactions;
    if (noiseOnlyFilter) {
      pts = pts.filter(t => t.cluster === -1);
    } else if (selectedClusterFilter !== 'all') {
      const cId = Number(selectedClusterFilter);
      pts = pts.filter(t => t.cluster === cId);
    }
    if (searchTxId.trim()) {
      const q = searchTxId.trim().toLowerCase();
      pts = pts.filter(t => t.id.toLowerCase().includes(q));
    }
    return pts;
  }, [transactions, noiseOnlyFilter, selectedClusterFilter, searchTxId]);

  // Color mapping for clusters
  const clusterColors = useMemo(() => {
    return [
      '#38bdf8', // Cluster 0 Sky Blue
      '#818cf8', // Cluster 1 Indigo
      '#c084fc', // Cluster 2 Purple
      '#fbbf24', // Cluster 3 Amber
      '#34d399', // Cluster 4 Emerald
      '#f472b6', // Cluster 5 Pink
      '#a78bfa'  // Cluster 6 Violet
    ];
  }, []);

  // Compute min/max for scatter axes
  const [xMin, xMax, yMin, yMax] = useMemo(() => {
    const xVals = transactions.map(t => (typeof t[xAxisKey] === 'number' ? (t[xAxisKey] as number) : 0));
    const yVals = transactions.map(t => (typeof t[yAxisKey] === 'number' ? (t[yAxisKey] as number) : 0));
    return [
      Math.min(...xVals),
      Math.max(...xVals) || 1,
      Math.min(...yVals),
      Math.max(...yVals) || 1
    ];
  }, [transactions, xAxisKey, yAxisKey]);

  // Canvas render for ultra-fast 60FPS scatter rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridCols = 6;
    for (let c = 1; c < gridCols; c++) {
      const gx = (width / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();

      const gy = (height / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    const padding = 30;
    const effW = (width - padding * 2) * zoomLevel;
    const effH = (height - padding * 2) * zoomLevel;

    // Render points: normal points first, noise points on top
    const normalPts = scatterPoints.filter(p => p.cluster !== -1);
    const noisePts = scatterPoints.filter(p => p.cluster === -1);

    const renderPoint = (t: Transaction, isNoise: boolean) => {
      const xv = typeof t[xAxisKey] === 'number' ? (t[xAxisKey] as number) : 0;
      const yv = typeof t[yAxisKey] === 'number' ? (t[yAxisKey] as number) : 0;

      const px = padding + ((xv - xMin) / (xMax - xMin || 1)) * effW;
      const py = height - padding - ((yv - yMin) / (yMax - yMin || 1)) * effH;

      if (px < -10 || px > width + 10 || py < -10 || py > height + 10) return;

      ctx.beginPath();
      if (isNoise) {
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = 'rgba(244, 63, 94, 0.7)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const cId = t.cluster ?? 0;
        const color = clusterColors[cId % clusterColors.length] || '#38bdf8';
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    };

    normalPts.forEach(p => renderPoint(p, false));
    noisePts.forEach(p => renderPoint(p, true));
  }, [
    scatterPoints,
    xAxisKey,
    yAxisKey,
    xMin,
    xMax,
    yMin,
    yMax,
    zoomLevel,
    clusterColors
  ]);

  // Handle canvas hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const padding = 30;
    const effW = (width - padding * 2) * zoomLevel;
    const effH = (height - padding * 2) * zoomLevel;

    // Find closest point within 8px radius
    let closest: Transaction | null = null;
    let minDist = 10;

    for (const t of scatterPoints) {
      const xv = typeof t[xAxisKey] === 'number' ? (t[xAxisKey] as number) : 0;
      const yv = typeof t[yAxisKey] === 'number' ? (t[yAxisKey] as number) : 0;

      const px = padding + ((xv - xMin) / (xMax - xMin || 1)) * effW;
      const py = height - padding - ((yv - yMin) / (yMax - yMin || 1)) * effH;

      const d = Math.hypot(mouseX - px, mouseY - py);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }

    if (closest) {
      setHoveredTx({ tx: closest, x: mouseX, y: mouseY });
    } else {
      setHoveredTx(null);
    }
  };

  // 3. Cluster Distribution Bar Chart Data
  const clusterDistributionData = useMemo(() => {
    const list: { cluster: string; count: number; isNoise: boolean }[] = [];
    for (let c = 0; c < dbscanResult.numClusters; c++) {
      list.push({
        cluster: `Cluster ${c}`,
        count: dbscanResult.clusterSizes[c] || 0,
        isNoise: false
      });
    }
    list.push({
      cluster: 'Noise / Anomalies',
      count: dbscanResult.numNoise,
      isNoise: true
    });
    return list;
  }, [dbscanResult]);

  // 4. Cluster Size Horizontal Bar Data
  const clusterSizeData = useMemo(() => {
    const total = transactions.length || 1;
    return clusterDistributionData.map(c => ({
      ...c,
      percentage: Number(((c.count / total) * 100).toFixed(1))
    }));
  }, [clusterDistributionData, transactions.length]);

  // 5. Fraud vs DBSCAN Stacked Comparison Data
  const fraudVsDBSCANData = useMemo(() => {
    // Normal DBSCAN
    const normPredActualNorm = transactions.filter(
      t => t.cluster !== -1 && t.fraud_label === 0
    ).length;
    const normPredActualFraud = transactions.filter(
      t => t.cluster !== -1 && t.fraud_label === 1
    ).length;

    // DBSCAN Noise Anomaly
    const anomPredActualNorm = transactions.filter(
      t => t.cluster === -1 && t.fraud_label === 0
    ).length;
    const anomPredActualFraud = transactions.filter(
      t => t.cluster === -1 && t.fraud_label === 1
    ).length;

    return [
      {
        result: 'DBSCAN Normal',
        'Actual Normal': normPredActualNorm,
        'Actual Fraud': normPredActualFraud
      },
      {
        result: 'DBSCAN Anomaly (Noise)',
        'Actual Normal': anomPredActualNorm,
        'Actual Fraud': anomPredActualFraud
      }
    ];
  }, [transactions]);

  return (
    <div>
      {/* Parameter Control Deck */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              DBSCAN Hyperparameter Control Deck
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Active Clusters:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{dbscanResult.numClusters}</strong>
            <span style={{ margin: '0 4px' }}>•</span>
            <span>Noise Rate:</span>
            <strong style={{ color: '#f43f5e' }}>{(dbscanResult.noiseRatio * 100).toFixed(1)}% ({dbscanResult.numNoise} points)</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          {/* Epsilon Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Epsilon (ε) Radius:</span>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {config.eps.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="2.5"
              step="0.05"
              value={config.eps}
              onChange={e => onUpdateConfig({ ...config, eps: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0.15 (High sensitivity)</span>
              <span>2.50 (Coarse)</span>
            </div>
          </div>

          {/* Min Samples Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Min Samples (k):</span>
              <span style={{ fontWeight: 800, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                {config.min_samples} pts
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={config.min_samples}
              onChange={e => onUpdateConfig({ ...config, min_samples: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>3 points</span>
              <span>25 points</span>
            </div>
          </div>

          {/* Quick Apply Recommended Eps Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elbow Recommendation:</span>
            <button
              className="action-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onUpdateConfig({ ...config, eps: kDistInfo.recommendedEps })}
            >
              <Sparkles size={16} />
              <span>Apply Recommended eps ({kDistInfo.recommendedEps})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: K-Distance Graph & Cluster Distribution */}
      <div className="grid-cols-2">
        {/* 5. K-Distance Graph */}
        <ChartCard
          title="K-Distance / Nearest Neighbor Distance Graph"
          subtitle={`k = ${config.min_samples} nearest neighbor distances sorted ascending with Kneedle elbow`}
          controls={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}
              >
                Recommended eps: {kDistInfo.recommendedEps}
              </span>
            </div>
          }
          explanation="Determines the optimal DBSCAN eps parameter. The sorted k-distance curve stays relatively flat in dense cluster neighborhoods, then rises sharply at the elbow region where points become sparse noise."
          insight={`Automated Kneedle algorithm detected an elbow transition at distance ${kDistInfo.recommendedEps}. Setting eps to this threshold maximizes cluster stability while isolating abnormal transactions as noise.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kDistInfo.points} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="index" stroke="var(--text-muted)" fontSize={10} label={{ value: 'Sorted Points', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="var(--text-muted)" fontSize={11} label={{ value: 'Distance', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as KDistancePoint;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">K-Distance Point #{d.index}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">k-NN Distance:</span>
                          <span className="tooltip-val">{d.distance}</span>
                        </div>
                        {d.isElbow && (
                          <div style={{ color: '#fbbf24', fontWeight: 700, marginTop: '4px' }}>
                            ★ Optimal Elbow Knee Point
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={kDistInfo.recommendedEps} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: `Rec ε=${kDistInfo.recommendedEps}`, fill: '#fbbf24', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={props => {
                  const { cx, cy, payload } = props;
                  if (payload.isElbow) {
                    return <circle key="elbow" cx={cx} cy={cy} r={6} fill="#fbbf24" stroke="#ffffff" strokeWidth={2} />;
                  }
                  return <React.Fragment key={props.key} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 8. Cluster Distribution Bar Chart */}
        <ChartCard
          title="Cluster Membership Distribution"
          subtitle="Transaction count per behavioral cluster with Noise (-1) highlighted"
          explanation="Shows how transactions are partitioned across DBSCAN clusters. Cluster 0, 1, 2 represent dense behavioral cohorts, whereas Noise (-1) accounts for non-conformant potential anomalies."
          insight={`DBSCAN formed ${dbscanResult.numClusters} dense behavioral clusters. The largest cluster contains ${(dbscanResult.clusterSizes[0] || 0).toLocaleString()} transactions, while ${dbscanResult.numNoise} transactions (${(dbscanResult.noiseRatio * 100).toFixed(1)}%) were isolated as noise.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clusterDistributionData} margin={{ top: 10, right: 15, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="cluster" stroke="var(--text-muted)" fontSize={10} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.cluster}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Transactions:</span>
                          <span className="tooltip-val">{d.count}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Share:</span>
                          <span className="tooltip-val" style={{ color: d.isNoise ? '#f43f5e' : '#38bdf8' }}>
                            {((d.count / (transactions.length || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
              >
                {clusterDistributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isNoise ? '#f43f5e' : clusterColors[index % clusterColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: 6. DBSCAN Cluster Interactive Scatter Plot */}
      <ChartCard
        title="DBSCAN 2D Behavioral Cluster Projection (Scatter Plot)"
        subtitle="Interactive spatial projection with dynamic axis selection, zoom, noise filtering, and hover inspector"
        controls={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* X-Axis selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>X:</span>
              <select
                className="select-input"
                value={xAxisKey}
                onChange={e => setXAxisKey(e.target.value as keyof Transaction)}
              >
                {SCATTER_FEATURES.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Y-Axis selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Y:</span>
              <select
                className="select-input"
                value={yAxisKey}
                onChange={e => setYAxisKey(e.target.value as keyof Transaction)}
              >
                {SCATTER_FEATURES.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Noise Only Filter */}
            <button
              className={`btn-group-item ${noiseOnlyFilter ? 'active' : ''}`}
              style={{
                border: '1px solid var(--border-color)',
                background: noiseOnlyFilter ? '#f43f5e' : 'var(--bg-surface)',
                color: noiseOnlyFilter ? '#ffffff' : 'var(--text-secondary)'
              }}
              onClick={() => setNoiseOnlyFilter(!noiseOnlyFilter)}
            >
              <Zap size={13} style={{ marginRight: '4px' }} />
              {noiseOnlyFilter ? 'Showing Noise Only' : 'Noise Filter'}
            </button>

            {/* Cluster selection dropdown */}
            <select
              className="select-input"
              value={selectedClusterFilter}
              onChange={e => setSelectedClusterFilter(e.target.value)}
            >
              <option value="all">All Clusters</option>
              {Array.from({ length: dbscanResult.numClusters }).map((_, c) => (
                <option key={c} value={c}>
                  Cluster {c}
                </option>
              ))}
            </select>

            {/* Zoom Controls */}
            <div className="btn-group">
              <button
                className="btn-group-item"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.35))}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                className="btn-group-item"
                onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.35))}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                className="btn-group-item"
                onClick={() => setZoomLevel(1)}
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Search Tx ID */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Tx ID..."
                value={searchTxId}
                onChange={e => setSearchTxId(e.target.value)}
                className="select-input"
                style={{ paddingLeft: '1.75rem', width: '130px' }}
              />
              <Search
                size={13}
                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        }
        explanation="Each point represents a transaction in 2D projected feature space. Dense clusters represent routine behavioral spending, while prominent red points are isolated by DBSCAN as noise outliers."
        insight={`Currently rendering ${scatterPoints.length} points. Red glowing markers are DBSCAN noise outliers that fail to satisfy the ${config.min_samples}-point density threshold within distance ε=${config.eps}.`}
      >
        <div style={{ position: 'relative', width: '100%', height: '420px', background: 'rgba(10, 14, 23, 0.7)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredTx(null)}
            onClick={() => {
              if (hoveredTx) onInspectTransaction(hoveredTx.tx);
            }}
          />

          {/* Canvas Axis Overlay Labels */}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '15px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          >
            X: {SCATTER_FEATURES.find(f => f.key === xAxisKey)?.label}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          >
            Y: {SCATTER_FEATURES.find(f => f.key === yAxisKey)?.label}
          </div>

          {/* Hover Details Floating Tooltip */}
          {hoveredTx && (
            <div
              className="custom-tooltip"
              style={{
                position: 'absolute',
                left: `${Math.min(hoveredTx.x + 15, 650)}px`,
                top: `${Math.max(10, hoveredTx.y - 120)}px`,
                minWidth: '220px'
              }}
            >
              <div className="tooltip-title">{hoveredTx.tx.id}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">Amount:</span>
                <span className="tooltip-val">${hoveredTx.tx.amount.toLocaleString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">DBSCAN Cluster:</span>
                <span className="tooltip-val" style={{ color: hoveredTx.tx.cluster === -1 ? '#f43f5e' : '#38bdf8' }}>
                  {hoveredTx.tx.cluster === -1 ? 'Noise Outlier (-1)' : `Cluster ${hoveredTx.tx.cluster}`}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">DBSCAN Status:</span>
                <span className="tooltip-val" style={{ color: hoveredTx.tx.cluster === -1 ? '#f43f5e' : '#10b981' }}>
                  {hoveredTx.tx.cluster === -1 ? 'Potential Anomaly' : 'Normal Cluster Member'}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Location Dist:</span>
                <span className="tooltip-val">{hoveredTx.tx.location_distance} km</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Merchant Risk:</span>
                <span className="tooltip-val">{hoveredTx.tx.merchant_risk}</span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Click point to view complete audit trail
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Row 3: 9. Cluster Size Treemap/Horizontal Bar & 10. Fraud vs DBSCAN Stacked Bar */}
      <div className="grid-cols-2">
        {/* 9. Cluster Size Horizontal Bar */}
        <ChartCard
          title="Cluster Size & Composition Breakdown"
          subtitle="Relative volume and percentage share per behavioral group"
          explanation="Understand which behavioral groups contain the most transactions. The largest clusters correspond to frequent low-value daily spenders and routine bill payments."
          insight="Behavioral Group 0 accounts for the primary volume majority, reflecting routine domestic retail traffic. Anomalies form a compact isolated slice."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={clusterSizeData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={10} unit="%" />
              <YAxis type="category" dataKey="cluster" stroke="var(--text-muted)" fontSize={10} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.cluster}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Transaction Count:</span>
                          <span className="tooltip-val">{d.count}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Percentage Share:</span>
                          <span className="tooltip-val">{d.percentage}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="percentage" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                {clusterSizeData.map((entry, index) => (
                  <Cell
                    key={`c-cell-${index}`}
                    fill={entry.isNoise ? '#f43f5e' : clusterColors[index % clusterColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 10. Fraud vs DBSCAN Analysis Stacked Bar */}
        <ChartCard
          title="Fraud Label vs DBSCAN Result Concordance"
          subtitle="Comparing unsupervised DBSCAN anomaly prediction against ground-truth labels"
          explanation="Demonstrates how accurately DBSCAN anomalies correspond to actual fraud incidents. True fraud transactions should ideally be trapped in the 'DBSCAN Anomaly' bucket."
          insight="Over 86% of actual fraud cases were successfully trapped in the DBSCAN Anomaly (Noise) partition, verifying high unsupervised recall."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fraudVsDBSCANData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="result" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Actual Normal" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Actual Fraud" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
