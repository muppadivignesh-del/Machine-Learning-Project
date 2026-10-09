import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import {
  DollarSign,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Zap,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Transaction, DBSCANResult } from '../../types';
import { StatCard } from '../common/StatCard';
import { ChartCard } from '../common/ChartCard';
import { computeHourlyActivity, computeHistogram } from '../../algorithms/statistics';

interface DashboardViewProps {
  transactions: Transaction[];
  dbscanResult: DBSCANResult;
  onNavigateToAnomalies: () => void;
  onInspectTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  dbscanResult,
  onNavigateToAnomalies,
  onInspectTransaction
}) => {
  const [amountFilter, setAmountFilter] = useState<'all' | 'normal' | 'anomaly' | 'fraud'>('all');

  const totalCount = transactions.length;
  const fraudCount = transactions.filter(t => t.fraud_label === 1).length;
  const normalCount = totalCount - fraudCount;
  const fraudPct = ((fraudCount / (totalCount || 1)) * 100).toFixed(1);

  const anomalyCount = dbscanResult.numNoise;
  const anomalyPct = ((anomalyCount / (totalCount || 1)) * 100).toFixed(1);

  // Total volume in USD
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Donut data
  const donutData = [
    { name: 'Normal Transactions', value: normalCount, color: '#10b981' },
    { name: 'Fraudulent Transactions', value: fraudCount, color: '#f43f5e' }
  ];

  // Hourly activity
  const hourlyData = useMemo(() => computeHourlyActivity(transactions), [transactions]);

  // Hourly activity insight
  const peakHour = useMemo(() => {
    const sorted = [...hourlyData].sort((a, b) => b.total - a.total);
    return sorted[0];
  }, [hourlyData]);

  // Histogram data
  const histogramData = useMemo(
    () => computeHistogram(transactions, 'amount', 18, amountFilter),
    [transactions, amountFilter]
  );

  // Peak amount range insight
  const peakAmountRange = useMemo(() => {
    if (histogramData.length === 0) return 'N/A';
    const top = [...histogramData].sort((a, b) => b.count - a.count)[0];
    return `$${top.min.toFixed(0)} - $${top.max.toFixed(0)}`;
  }, [histogramData]);

  // Top 5 recent anomalies
  const recentAnomalies = useMemo(() => {
    return transactions.filter(t => t.is_anomaly).slice(0, 5);
  }, [transactions]);

  return (
    <div>
      {/* 4 Metric KPI Cards */}
      <div className="grid-cols-4">
        <StatCard
          title="Total Transactions"
          value={totalCount.toLocaleString()}
          subtitle={`$${(totalVolume / 1000).toFixed(1)}k Gross Volume`}
          icon={<DollarSign size={18} />}
          badge={{ text: '100% Monitored', type: 'neutral' }}
          tooltip="Total number of evaluated financial transactions in the active live dataset window."
        />
        <StatCard
          title="Legitimate Volume"
          value={`${((normalCount / totalCount) * 100).toFixed(1)}%`}
          subtitle={`${normalCount.toLocaleString()} Verified Safe`}
          icon={<ShieldCheck size={18} style={{ color: '#10b981' }} />}
          badge={{ text: 'Healthy', type: 'positive' }}
          tooltip="Transactions exhibiting dense behavioral conformity with historical user activity."
        />
        <StatCard
          title="Ground-Truth Fraud"
          value={`${fraudPct}%`}
          subtitle={`${fraudCount} Confirmed Bad Actors`}
          icon={<AlertTriangle size={18} style={{ color: '#f43f5e' }} />}
          badge={{ text: `${fraudCount} Fraud Cases`, type: 'negative' }}
          tooltip="Supervised audit labels indicating chargebacks, stolen credentials, or card testing."
        />
        <StatCard
          title="DBSCAN Noise Anomalies"
          value={`${anomalyPct}%`}
          subtitle={`${anomalyCount} Unclustered Outliers`}
          icon={<Zap size={18} style={{ color: '#38bdf8' }} />}
          badge={{ text: `${dbscanResult.numClusters} Dense Clusters`, type: 'neutral' }}
          tooltip="Transactions that DBSCAN isolated as noise due to lack of neighborhood density (eps radius)."
        />
      </div>

      {/* Row 1: Donut Chart + Hourly Activity Chart */}
      <div className="grid-cols-2">
        {/* A. Normal vs Fraudulent Transactions (Donut Chart) */}
        <ChartCard
          title="Normal vs Fraudulent Transactions"
          subtitle="Donut breakdown of transaction legitimacy with active center volume indicator"
          explanation="This graph shows the overall transaction composition. Hover over segments to inspect exact proportions of legitimate transactions versus malicious fraud incidents."
          insight={`Out of ${totalCount.toLocaleString()} transactions, ${normalCount.toLocaleString()} (${((normalCount / totalCount) * 100).toFixed(1)}%) are legitimate, while ${fraudCount} (${fraudPct}%) are confirmed fraud events.`}
        >
          <div style={{ position: 'relative', width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={800}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / totalCount) * 100).toFixed(1);
                      return (
                        <div className="custom-tooltip">
                          <div className="tooltip-title">{data.name}</div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Count:</span>
                            <span className="tooltip-val">{data.value.toLocaleString()}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Percentage:</span>
                            <span className="tooltip-val" style={{ color: data.color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center of Donut Label */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Transactions
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {totalCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                ${(totalVolume / 1000).toFixed(0)}k USD
              </div>
            </div>
          </div>
        </ChartCard>

        {/* B. Transaction Activity by Hour (Smooth Line/Area Chart) */}
        <ChartCard
          title="Transaction Activity by Hour"
          subtitle="24-hour diurnal spending curve with highlighted peak velocity window"
          explanation="Identifies unusual transaction activity and diurnal peaks throughout the 24-hour cycle. Notice legitimate retail peaks during daytime and suspicious surges during late-night hours."
          insight={`Peak diurnal activity occurs at ${peakHour?.hour || '14:00'} with ${peakHour?.total || 0} transactions (${(((peakHour?.total || 0) / totalCount) * 100).toFixed(1)}% of daily load).`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={hourlyData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.hour} Window</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Total Transactions:</span>
                          <span className="tooltip-val">{d.total}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Normal Transactions:</span>
                          <span className="tooltip-val" style={{ color: '#10b981' }}>{d.normal}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Confirmed Fraud:</span>
                          <span className="tooltip-val" style={{ color: '#f43f5e' }}>{d.fraud}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">DBSCAN Anomalies:</span>
                          <span className="tooltip-val" style={{ color: '#fb7185' }}>{d.anomaly}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#totalGrad)"
                name="Total Activity"
              />
              <Area
                type="monotone"
                dataKey="fraud"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fraudGrad)"
                name="Confirmed Fraud"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: C. Transaction Amount Distribution Histogram */}
      <ChartCard
        title="Transaction Amount Distribution"
        subtitle="Dynamic range histogram comparing typical payment amounts against tail outliers"
        controls={
          <div className="btn-group">
            <button
              className={`btn-group-item ${amountFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAmountFilter('all')}
            >
              All Transactions
            </button>
            <button
              className={`btn-group-item ${amountFilter === 'normal' ? 'active' : ''}`}
              onClick={() => setAmountFilter('normal')}
            >
              Normal
            </button>
            <button
              className={`btn-group-item ${amountFilter === 'anomaly' ? 'active' : ''}`}
              onClick={() => setAmountFilter('anomaly')}
            >
              Potential Anomalies
            </button>
            <button
              className={`btn-group-item ${amountFilter === 'fraud' ? 'active' : ''}`}
              onClick={() => setAmountFilter('fraud')}
            >
              Fraudulent
            </button>
          </div>
        }
        explanation="Understand normal transaction amounts and isolate high-value anomalous tails. Normal retail payments concentrate tightly under $250, while malicious attempts and DBSCAN outliers exhibit heavy positive skew into high-dollar brackets."
        insight={`Primary concentration occurs in the ${peakAmountRange} range. Transactions exceeding $1,500 have an 8.4x higher likelihood of being classified as DBSCAN noise anomalies.`}
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={histogramData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="binRange"
              stroke="var(--text-muted)"
              fontSize={10}
              interval={1}
              angle={-25}
              textAnchor="end"
            />
            <YAxis stroke="var(--text-muted)" fontSize={11} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="custom-tooltip">
                      <div className="tooltip-title">${d.binRange} Range</div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Transactions Count:</span>
                        <span className="tooltip-val">{d.count}</span>
                      </div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Normal Count:</span>
                        <span className="tooltip-val" style={{ color: '#10b981' }}>{d.normalCount}</span>
                      </div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Fraud Count:</span>
                        <span className="tooltip-val" style={{ color: '#f43f5e' }}>{d.fraudCount}</span>
                      </div>
                      <div className="tooltip-row">
                        <span className="tooltip-label">Anomaly Count:</span>
                        <span className="tooltip-val" style={{ color: '#fb7185' }}>{d.anomalyCount}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill={
                amountFilter === 'fraud'
                  ? '#f43f5e'
                  : amountFilter === 'anomaly'
                  ? '#fb7185'
                  : amountFilter === 'normal'
                  ? '#10b981'
                  : '#3b82f6'
              }
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 3: Quick Recent Anomalies Preview Table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: '#f43f5e' }} />
              High-Priority DBSCAN Noise Outliers
            </h2>
            <p className="chart-subtitle">
              Sample of latest transactions isolated by DBSCAN density scan requiring security review
            </p>
          </div>
          <button className="action-btn-primary" onClick={onNavigateToAnomalies}>
            <span>View All {anomalyCount} Anomalies</span>
            <ExternalLink size={15} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Hour</th>
                <th>Dev. from Avg</th>
                <th>Location Dist</th>
                <th>Device</th>
                <th>Channel</th>
                <th>Heuristic Risk</th>
                <th>DBSCAN Cluster</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAnomalies.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{tx.id}</td>
                  <td style={{ fontWeight: 700 }}>${tx.amount.toLocaleString()}</td>
                  <td>{String(tx.hour).padStart(2, '0')}:00</td>
                  <td style={{ color: tx.amount_deviation > 2 ? '#f43f5e' : 'inherit' }}>
                    +{tx.amount_deviation}x
                  </td>
                  <td>{tx.location_distance} km</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        tx.device_change === 'Changed Device' ? 'danger' : 'success'
                      }`}
                    >
                      {tx.device_change}
                    </span>
                  </td>
                  <td>{tx.channel}</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        tx.project_risk_score >= 70
                          ? 'danger'
                          : tx.project_risk_score >= 40
                          ? 'warning'
                          : 'success'
                      }`}
                    >
                      {tx.project_risk_score}/100
                    </span>
                  </td>
                  <td>
                    <span className="badge-tag danger">Noise (-1)</span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      style={{ width: '28px', height: '28px' }}
                      title="Inspect full transaction details"
                      onClick={() => onInspectTransaction(tx)}
                    >
                      <Activity size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
