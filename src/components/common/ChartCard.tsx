import React from 'react';
import { HelpCircle, Lightbulb } from 'lucide-react';

interface ChartCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  explanation?: string;
  insight?: string;
  children: React.ReactNode;
  minHeight?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  id,
  title,
  subtitle,
  controls,
  explanation,
  insight,
  children,
  minHeight = '320px'
}) => {
  return (
    <div className="chart-card" id={id}>
      <div className="chart-card-header">
        <div className="chart-title-area">
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        {controls && <div className="chart-controls">{controls}</div>}
      </div>

      <div className="chart-body" style={{ minHeight }}>
        {children}
      </div>

      {(explanation || insight) && (
        <div className="chart-meta-box">
          {explanation && (
            <div className="explanation-row">
              <HelpCircle size={15} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span className="explanation-title">What does this show?</span>
                <span>{explanation}</span>
              </div>
            </div>
          )}

          {insight && (
            <div className="insight-card">
              <span className="insight-badge">CALCULATED INSIGHT</span>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <Lightbulb size={15} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
                <p className="insight-text">{insight}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
