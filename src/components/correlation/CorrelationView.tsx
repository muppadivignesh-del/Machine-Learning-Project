import React, { useState, useMemo } from 'react';
import { Transaction } from '../../types';
import { computeCorrelationMatrix } from '../../algorithms/correlation';
import { ChartCard } from '../common/ChartCard';
import { Info, Network, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CorrelationViewProps {
  transactions: Transaction[];
}

export const CorrelationView: React.FC<CorrelationViewProps> = ({ transactions }) => {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    featA: string;
    featB: string;
    val: number;
  } | null>(null);

  const corrData = useMemo(() => computeCorrelationMatrix(transactions), [transactions]);

  // Color generator for diverging scale -1 to +1
  const getCellColor = (val: number) => {
    if (val === 1) return 'rgba(56, 189, 248, 0.4)'; // Diagonal self
    if (val > 0) {
      // Positive: 0 to 1 -> sky blue to emerald/cyan
      const alpha = Math.min(0.85, Math.max(0.12, Math.abs(val) * 0.85));
      if (val > 0.6) return `rgba(16, 185, 129, ${alpha})`;
      return `rgba(56, 189, 248, ${alpha})`;
    } else {
      // Negative: -1 to 0 -> crimson/rose
      const alpha = Math.min(0.85, Math.max(0.12, Math.abs(val) * 0.85));
      return `rgba(244, 63, 94, ${alpha})`;
    }
  };

  const getTextColor = (val: number) => {
    if (Math.abs(val) > 0.45) return '#ffffff';
    return 'var(--text-secondary)';
  };

  const interpretation = (r: number) => {
    const abs = Math.abs(r);
    const sign = r > 0 ? 'positive' : 'negative';
    if (abs >= 0.8) return `Very strong ${sign} relationship`;
    if (abs >= 0.6) return `Strong ${sign} correlation`;
    if (abs >= 0.4) return `Moderate ${sign} correlation`;
    if (abs >= 0.2) return `Weak ${sign} association`;
    return 'Negligible / Orthogonal';
  };

  return (
    <div>
      <ChartCard
        title="Interactive Correlation Matrix Heatmap"
        subtitle="Pearson correlation coefficients (-1.00 to +1.00) calculated across 11 financial dimensions"
        explanation="Understand relationships between transaction features before applying DBSCAN. Highly collinear features can distort Euclidean distance metrics, causing the algorithm to place disproportionate weight on redundant dimensions."
        insight={`Strongest positive correlation is between ${corrData.strongestPositive.feat1} and ${corrData.strongestPositive.feat2} (r = +${corrData.strongestPositive.value}). ${
          corrData.redundantPairs.length > 0
            ? `${corrData.redundantPairs.length} feature pairs exceed |r| >= 0.70.`
            : 'No features show severe collinear redundancy (all |r| < 0.70).'
        }`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'auto', padding: '1rem 0' }}>
          {/* Heatmap Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `130px repeat(${corrData.features.length}, minmax(42px, 1fr))`,
              gap: '3px',
              maxWidth: '100%',
              userSelect: 'none'
            }}
          >
            {/* Top Header Row */}
            <div style={{ height: '38px' }} />
            {corrData.features.map((feat, colIdx) => (
              <div
                key={colIdx}
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: hoveredCell?.col === colIdx ? 'var(--color-primary)' : 'var(--text-muted)',
                  transform: 'rotate(-40deg)',
                  transformOrigin: 'bottom center',
                  whiteSpace: 'nowrap'
                }}
              >
                {feat}
              </div>
            ))}

            {/* Matrix Rows */}
            {corrData.features.map((rowFeat, rowIdx) => (
              <React.Fragment key={rowIdx}>
                {/* Row Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: hoveredCell?.row === rowIdx ? 'var(--color-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {rowFeat}
                </div>

                {/* Cells */}
                {corrData.features.map((colFeat, colIdx) => {
                  const val = corrData.matrix[rowIdx]?.[colIdx] ?? 0;
                  const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                  const isHighlighted =
                    hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx;

                  return (
                    <div
                      key={colIdx}
                      style={{
                        height: '42px',
                        background: getCellColor(val),
                        color: getTextColor(val),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: Math.abs(val) > 0.4 ? 700 : 500,
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        boxShadow: isHovered
                          ? '0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(56,189,248,0.5)'
                          : isHighlighted
                          ? '0 0 0 1px rgba(255,255,255,0.2)'
                          : 'none'
                      }}
                      onMouseEnter={() =>
                        setHoveredCell({
                          row: rowIdx,
                          col: colIdx,
                          featA: rowFeat,
                          featB: colFeat,
                          val
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Interactive Cell Inspector / Tooltip Bar */}
          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '850px',
              padding: '0.75rem 1.25rem',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            {hoveredCell ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Features:</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {hoveredCell.featA} <span style={{ color: 'var(--text-muted)' }}>&</span> {hoveredCell.featB}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correlation (r):</span>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      fontFamily: 'var(--font-mono)',
                      color: hoveredCell.val > 0 ? '#10b981' : hoveredCell.val < 0 ? '#f43f5e' : 'var(--text-primary)'
                    }}
                  >
                    {hoveredCell.val > 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interpretation:</span>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-accent)' }}>
                    {interpretation(hoveredCell.val)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Info size={16} />
                <span>Hover over any matrix cell to inspect exact pairwise Pearson correlation</span>
              </div>
            )}

            {/* Diverging Scale Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
              <span style={{ color: '#f43f5e', fontWeight: 600 }}>-1.0 (Inverse)</span>
              <div
                style={{
                  width: '120px',
                  height: '10px',
                  borderRadius: '5px',
                  background: 'linear-gradient(90deg, #f43f5e 0%, rgba(30,41,59,0.8) 50%, #10b981 100%)'
                }}
              />
              <span style={{ color: '#10b981', fontWeight: 600 }}>+1.0 (Collinear)</span>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Row 2: Deep Insight Cards on Feature Relationships */}
      <div className="grid-cols-3">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Strongest Positive Correlation</span>
            <ArrowUpRight size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            +{corrData.strongestPositive.value.toFixed(2)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
            {corrData.strongestPositive.feat1} ↔ {corrData.strongestPositive.feat2}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            These two features trend closely together. When scaling features for DBSCAN, co-movement must be preserved.
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Strongest Negative Correlation</span>
            <ArrowDownRight size={18} style={{ color: '#f43f5e' }} />
          </div>
          <div className="stat-value" style={{ color: '#f43f5e' }}>
            {corrData.strongestNegative.value.toFixed(2)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
            {corrData.strongestNegative.feat1} ↔ {corrData.strongestNegative.feat2}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Represents an inverse relationship providing complementary informational entropy for density clustering.
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Redundancy / Collinearity Check</span>
            <AlertCircle size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {corrData.redundantPairs.length}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
            Pairs with |r| ≥ 0.70
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {corrData.redundantPairs.length > 0
              ? `Watch out for ${corrData.redundantPairs.map(p => `${p.feat1}&${p.feat2}`).join(', ')} to prevent distance inflation.`
              : 'All numerical features exhibit healthy orthogonality for Euclidean space clustering.'}
          </p>
        </div>
      </div>
    </div>
  );
};
