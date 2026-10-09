import React from 'react';
import { X, AlertTriangle, ShieldCheck, MapPin, Smartphone, CreditCard, Clock, Activity } from 'lucide-react';
import { Transaction } from '../../types';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose
}) => {
  if (!transaction) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {transaction.id}
              </h2>
              <span
                className={`badge-tag ${
                  transaction.is_anomaly
                    ? 'danger'
                    : transaction.project_risk_score >= 70
                    ? 'warning'
                    : 'success'
                }`}
              >
                {transaction.is_anomaly ? 'DBSCAN Noise Anomaly' : 'Normal Cluster Member'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Logged at {new Date(transaction.timestamp).toLocaleString()}
            </p>
          </div>

          <button className="icon-btn" onClick={onClose} style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Primary Amount Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Executed Amount
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              ${transaction.amount.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Historical Avg</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              ${transaction.prev_tx_avg}
            </div>
            <div style={{ fontSize: '0.75rem', color: transaction.amount_deviation > 2 ? '#f43f5e' : '#10b981', fontWeight: 600 }}>
              +{transaction.amount_deviation}x Deviation
            </div>
          </div>
        </div>

        {/* Forensic Attributes Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payment Channel</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{transaction.channel}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Device Fingerprint</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: transaction.device_change === 'Changed Device' ? '#f43f5e' : '#10b981' }}>
              {transaction.device_change}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location Distance</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: transaction.location_distance > 100 ? '#f43f5e' : 'var(--text-primary)' }}>
              {transaction.location_distance} km from Home
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Velocity (24h Window)</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: transaction.frequency_24h > 6 ? '#f43f5e' : 'var(--text-primary)' }}>
              {transaction.frequency_24h} transactions
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Login Attempts</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: transaction.login_attempts >= 3 ? '#f43f5e' : 'var(--text-primary)' }}>
              {transaction.login_attempts} attempts before auth
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Merchant Risk Score</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: transaction.merchant_risk > 0.6 ? '#f43f5e' : 'var(--text-primary)' }}>
              {transaction.merchant_risk} (0.0 - 1.0)
            </div>
          </div>
        </div>

        {/* Behavioral Threat Indicators */}
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
            Behavioral Risk Audit Breakdown
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: transaction.amount_deviation > 2 ? '#f43f5e' : '#10b981' }}>
              <span>•</span> Amount deviation is {transaction.amount_deviation > 2 ? 'excessive (>2x typical volume)' : 'within normal variance bounds'}.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: transaction.device_change === 'Changed Device' ? '#f43f5e' : '#10b981' }}>
              <span>•</span> Device status: {transaction.device_change}.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: transaction.location_distance > 150 ? '#f43f5e' : '#10b981' }}>
              <span>•</span> Geographic distance: {transaction.location_distance > 150 ? 'Foreign / remote distance anomaly' : 'Domestic routine radius'}.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: transaction.cluster === -1 ? '#f43f5e' : '#10b981' }}>
              <span>•</span> DBSCAN Clustering: {transaction.cluster === -1 ? 'Isolated as noise outlier (-1) due to lack of local density' : `Belongs to dense behavioral Cluster ${transaction.cluster}`}.
            </li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          className="action-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onClose}
        >
          Close Forensic Dossier
        </button>
      </div>
    </div>
  );
};
