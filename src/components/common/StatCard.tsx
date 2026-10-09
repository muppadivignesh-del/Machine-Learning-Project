import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  tooltip?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  tooltip
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="stat-card"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {tooltip && (
            <div style={{ position: 'relative', cursor: 'help' }}>
              <Info size={14} style={{ color: 'var(--text-muted)' }} />
              {showTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '220px',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(15, 23, 42, 0.95)',
                    color: '#f8fafc',
                    fontSize: '0.72rem',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    zIndex: 60,
                    lineHeight: 1.4
                  }}
                >
                  {tooltip}
                </div>
              )}
            </div>
          )}
          {icon && <div className="stat-icon-wrapper">{icon}</div>}
        </div>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-footer">
        {badge && (
          <span className={`stat-badge ${badge.type}`}>
            {badge.text}
          </span>
        )}
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
  );
};
