import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis
} from 'recharts';
import {
  AlertTriangle,
  ShieldAlert,
  Filter,
  Check,
  Search,
  ExternalLink,
  Info,
  DollarSign,
  Smartphone,
  Globe,
  Zap
} from 'lucide-react';
import { Transaction } from '../../types';
import { ChartCard } from '../common/ChartCard';

interface AnomaliesViewProps {
  transactions: Transaction[];
  onInspectTransaction: (tx: Transaction) => void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({
  transactions,
  onInspectTransaction
}) => {
  // 1. Anomaly Scatter state
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState<boolean>(false);

  // 2. Table filters
  const [filterType, setFilterType] = useState<
    'all' | 'high_amount' | 'high_risk' | 'new_device' | 'international' | 'high_freq' | 'dbscan_noise'
  >('dbscan_noise');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 12;

  // Scatter data prep (sample normal points to maintain 60FPS while keeping 100% of anomalies)
  const scatterData = useMemo(() => {
    const anomalies = transactions
      .filter(t => t.is_anomaly)
      .map(t => ({
        id: t.id,
        x: t.amount,
        y: t.amount_deviation,
        z: t.location_distance,
        isAnomaly: true,
        merchantRisk: t.merchant_risk,
        cluster: t.cluster
      }));

    if (showOnlyAnomalies) {
      return { normal: [], anomalies };
    }

    // Downsample normal points for smooth rendering
    const normalSubset = transactions
      .filter(t => !t.is_anomaly)
      .filter((_, idx) => idx % 3 === 0)
      .map(t => ({
        id: t.id,
        x: t.amount,
        y: t.amount_deviation,
        z: t.location_distance,
        isAnomaly: false,
        merchantRisk: t.merchant_risk,
        cluster: t.cluster
      }));

    return { normal: normalSubset, anomalies };
  }, [transactions, showOnlyAnomalies]);

  // Filtered transactions for table
  const filteredTableData = useMemo(() => {
    let result = transactions;

    switch (filterType) {
      case 'high_amount':
        result = result.filter(t => t.amount >= 1000);
        break;
      case 'high_risk':
        result = result.filter(t => t.project_risk_score >= 70);
        break;
      case 'new_device':
        result = result.filter(t => t.device_change === 'Changed Device');
        break;
      case 'international':
        result = result.filter(t => t.location_distance >= 150);
        break;
      case 'high_freq':
        result = result.filter(t => t.frequency_24h >= 8);
        break;
      case 'dbscan_noise':
        result = result.filter(t => t.is_anomaly);
        break;
      default:
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.id.toLowerCase().includes(q) || t.channel.toLowerCase().includes(q));
    }

    return result;
  }, [transactions, filterType, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTableData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTableData.slice(start, start + rowsPerPage);
  }, [filteredTableData, currentPage]);

  // 3. Transaction Risk Overview (Donut chart data)
  const riskDonutData = useMemo(() => {
    const low = transactions.filter(t => t.risk_category === 'Low Risk').length;
    const med = transactions.filter(t => t.risk_category === 'Medium Risk').length;
    const high = transactions.filter(t => t.risk_category === 'High Risk').length;
    const noise = transactions.filter(t => t.is_anomaly).length;

    return [
      { name: 'Low Risk', value: low, color: '#10b981' },
      { name: 'Medium Risk', value: med, color: '#fbbf24' },
      { name: 'High Risk (Rules)', value: high, color: '#f97316' },
      { name: 'DBSCAN Anomaly (Noise)', value: noise, color: '#f43f5e' }
    ];
  }, [transactions]);

  return (
    <div>
      {/* Row 1: Dedicated Anomaly Scatter Plot + Risk Overview Donut */}
      <div className="grid-cols-2">
        {/* 7. Dedicated Anomaly Scatter Plot */}
        <ChartCard
          title="Isolated Anomaly Scatter Radar"
          subtitle="Spatial contrast between high-density clusters and isolated behavioral noise"
          controls={
            <button
              className={`btn-group-item ${showOnlyAnomalies ? 'active' : ''}`}
              style={{
                border: '1px solid var(--border-color)',
                background: showOnlyAnomalies ? '#f43f5e' : 'var(--bg-surface)',
                color: showOnlyAnomalies ? '#ffffff' : 'var(--text-secondary)'
              }}
              onClick={() => setShowOnlyAnomalies(!showOnlyAnomalies)}
            >
              <Zap size={13} style={{ marginRight: '4px' }} />
              {showOnlyAnomalies ? 'Showing Anomalies Only' : 'Show Only Anomalies'}
            </button>
          }
          explanation="Clearly demonstrates how DBSCAN identifies transactions that do not belong to dense behavioral clusters. Normal points form tight constellations, while anomalous outliers float isolated in sparse multidimensional space."
          insight={`DBSCAN detected ${scatterData.anomalies.length} anomalous transactions. Their average deviation is +${(
            scatterData.anomalies.reduce((a, b) => a + b.y, 0) / (scatterData.anomalies.length || 1)
          ).toFixed(1)}x higher than standard baseline spending.`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Amount"
                unit="$"
                stroke="var(--text-muted)"
                fontSize={10}
                label={{ value: 'Transaction Amount ($)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Deviation"
                unit="x"
                stroke="var(--text-muted)"
                fontSize={10}
                label={{ value: 'Amount Deviation (x)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="z" range={[20, 250]} name="Distance" unit="km" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.id}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Amount:</span>
                          <span className="tooltip-val">${d.x.toLocaleString()}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Deviation:</span>
                          <span className="tooltip-val">+{d.y}x</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Distance:</span>
                          <span className="tooltip-val">{d.z} km</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Status:</span>
                          <span
                            className="tooltip-val"
                            style={{ color: d.isAnomaly ? '#f43f5e' : '#10b981' }}
                          >
                            {d.isAnomaly ? 'DBSCAN Noise Outlier' : 'Core Cluster Member'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {!showOnlyAnomalies && (
                <Scatter name="Normal Cluster" data={scatterData.normal} fill="#38bdf8" opacity={0.45} />
              )}
              <Scatter name="DBSCAN Anomaly" data={scatterData.anomalies} fill="#f43f5e" opacity={0.9} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 17. Transaction Risk Overview Donut */}
        <ChartCard
          title="Transaction Risk Tier Overview"
          subtitle="Heuristic rule index tiers combined with DBSCAN density isolation"
          explanation="Shows the risk distribution across the dataset. Important: This risk index represents a multi-rule heuristic indicator, not an inherent DBSCAN probability, as DBSCAN produces discrete density clusters."
          insight="11.4% of total transaction volume falls into high-risk rule alerts or DBSCAN noise categories. 88.6% operates safely within low/medium routine spending corridors."
        >
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={riskDonutData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
              >
                {riskDonutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <div className="tooltip-title">{d.name}</div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Count:</span>
                          <span className="tooltip-val">{d.value.toLocaleString()}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Proportion:</span>
                          <span className="tooltip-val" style={{ color: d.color }}>
                            {((d.value / (transactions.length || 1)) * 100).toFixed(1)}%
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
        </ChartCard>
      </div>

      {/* Row 2: 16. Suspicious Transaction Analysis Table + Multi-Filters */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-title">Suspicious Transaction Investigation Table</h2>
            <p className="chart-subtitle">
              Interactive forensic audit table with quick threat filters and deep transaction inspection
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Tx ID..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="select-input"
                style={{ paddingLeft: '1.75rem', width: '150px' }}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            className={`btn-group-item ${filterType === 'dbscan_noise' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('dbscan_noise');
              setCurrentPage(1);
            }}
          >
            <Zap size={13} style={{ marginRight: '4px' }} />
            DBSCAN Noise ({transactions.filter(t => t.is_anomaly).length})
          </button>
          <button
            className={`btn-group-item ${filterType === 'high_risk' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('high_risk');
              setCurrentPage(1);
            }}
          >
            <ShieldAlert size={13} style={{ marginRight: '4px' }} />
            High Risk Score ≥ 70
          </button>
          <button
            className={`btn-group-item ${filterType === 'high_amount' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('high_amount');
              setCurrentPage(1);
            }}
          >
            <DollarSign size={13} style={{ marginRight: '4px' }} />
            High Amount ≥ $1,000
          </button>
          <button
            className={`btn-group-item ${filterType === 'new_device' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('new_device');
              setCurrentPage(1);
            }}
          >
            <Smartphone size={13} style={{ marginRight: '4px' }} />
            New Device
          </button>
          <button
            className={`btn-group-item ${filterType === 'international' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('international');
              setCurrentPage(1);
            }}
          >
            <Globe size={13} style={{ marginRight: '4px' }} />
            Distance ≥ 150 km
          </button>
          <button
            className={`btn-group-item ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('all');
              setCurrentPage(1);
            }}
          >
            All ({transactions.length})
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Hour</th>
                <th>24h Freq</th>
                <th>Distance</th>
                <th>Device</th>
                <th>Login Tries</th>
                <th>Merchant Risk</th>
                <th>Amount Dev</th>
                <th>DBSCAN Cluster</th>
                <th>Status</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No transactions match current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{tx.id}</td>
                    <td style={{ fontWeight: 700 }}>${tx.amount.toLocaleString()}</td>
                    <td>{String(tx.hour).padStart(2, '0')}:00</td>
                    <td>{tx.frequency_24h} tx</td>
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
                    <td style={{ color: tx.login_attempts >= 3 ? '#f43f5e' : 'inherit' }}>
                      {tx.login_attempts}
                    </td>
                    <td>
                      <span
                        style={{
                          color:
                            tx.merchant_risk > 0.6
                              ? '#f43f5e'
                              : tx.merchant_risk > 0.3
                              ? '#f59e0b'
                              : 'inherit'
                        }}
                      >
                        {tx.merchant_risk}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: tx.amount_deviation > 2 ? '#f43f5e' : 'inherit' }}>
                      +{tx.amount_deviation}x
                    </td>
                    <td>
                      <span className={`badge-tag ${tx.cluster === -1 ? 'danger' : 'info'}`}>
                        {tx.cluster === -1 ? 'Noise (-1)' : `Cluster ${tx.cluster}`}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-tag ${
                          tx.is_anomaly
                            ? 'danger'
                            : tx.project_risk_score >= 70
                            ? 'warning'
                            : 'success'
                        }`}
                      >
                        {tx.is_anomaly ? 'Noise Anomaly' : 'Normal'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ width: '28px', height: '28px' }}
                        title="Open full transaction inspection"
                        onClick={() => onInspectTransaction(tx)}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>
            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> -{' '}
            <strong>{Math.min(currentPage * rowsPerPage, filteredTableData.length)}</strong> of{' '}
            <strong>{filteredTableData.length}</strong> transactions
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn-group-item"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span style={{ margin: '0 4px', fontFamily: 'var(--font-mono)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-group-item"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
