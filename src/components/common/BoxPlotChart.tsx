import React, { useState } from 'react';
import { BoxPlotStats } from '../../types';

interface BoxPlotChartProps {
  data: BoxPlotStats[];
  yAxisLabel?: string;
  unit?: string;
  height?: number;
}

export const BoxPlotChart: React.FC<BoxPlotChartProps> = ({
  data,
  yAxisLabel = 'Value',
  unit = '',
  height = 290
}) => {
  const [hoveredStat, setHoveredStat] = useState<{
    stat: BoxPlotStats;
    x: number;
    y: number;
  } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
        <p style={{ color: 'var(--text-muted)' }}>No data available for box plot</p>
      </div>
    );
  }

  // Find global min and max across all stats (including outliers if any)
  let globalMin = Infinity;
  let globalMax = -Infinity;

  data.forEach(d => {
    if (d.count === 0) return;
    if (d.min < globalMin) globalMin = d.min;
    if (d.max > globalMax) globalMax = d.max;
    d.outliers.forEach(o => {
      if (o < globalMin) globalMin = o;
      if (o > globalMax) globalMax = o;
    });
  });

  if (globalMin === Infinity) {
    globalMin = 0;
    globalMax = 100;
  }

  // Add 10% padding
  const range = globalMax - globalMin || 1;
  const plotMin = Math.max(0, globalMin - range * 0.05);
  const plotMax = globalMax + range * 0.08;
  const plotRange = plotMax - plotMin || 1;

  // Layout parameters
  const paddingLeft = 65;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 45;

  const svgWidth = 600;
  const svgHeight = height;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotH = svgHeight - paddingTop - paddingBottom;

  const yScale = (val: number) => {
    return paddingTop + plotH - ((val - plotMin) / plotRange) * plotH;
  };

  // Generate 5 nice Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1.0].map(ratio => {
    const val = plotMin + ratio * (plotMax - plotMin);
    return {
      value: Number(val.toFixed(val > 10 ? 0 : 2)),
      y: yScale(val)
    };
  });

  const categoryWidth = plotWidth / data.length;
  const boxWidth = Math.min(65, categoryWidth * 0.5);

  const colors: Record<string, { fill: string; stroke: string; glow: string }> = {
    Normal: { fill: 'rgba(16, 185, 129, 0.2)', stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    Fraud: { fill: 'rgba(244, 63, 94, 0.25)', stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
    'Potential Anomaly': { fill: 'rgba(251, 113, 133, 0.25)', stroke: '#fb7185', glow: 'rgba(251, 113, 133, 0.4)' },
    'DBSCAN Anomaly': { fill: 'rgba(251, 113, 133, 0.25)', stroke: '#fb7185', glow: 'rgba(251, 113, 133, 0.4)' }
  };

  const defaultColor = { fill: 'rgba(56, 189, 248, 0.2)', stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: `${height}px`, overflow: 'visible' }}
        onMouseLeave={() => setHoveredStat(null)}
      >
        {/* Y-axis label */}
        <text
          x={12}
          y={svgHeight / 2}
          fill="var(--text-muted)"
          fontSize="11"
          fontWeight="600"
          transform={`rotate(-90, 12, ${svgHeight / 2})`}
          textAnchor="middle"
        >
          {yAxisLabel} {unit ? `(${unit})` : ''}
        </text>

        {/* Horizontal gridlines */}
        {ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={t.y}
              x2={svgWidth - paddingRight}
              y2={t.y}
              stroke="var(--border-color)"
              strokeDasharray="3 3"
            />
            <text
              x={paddingLeft - 8}
              y={t.y + 4}
              fill="var(--text-secondary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              {t.value.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Category boxes */}
        {data.map((stat, i) => {
          const cx = paddingLeft + i * categoryWidth + categoryWidth / 2;
          const style = colors[stat.category] || defaultColor;

          const yMin = yScale(stat.min);
          const yMax = yScale(stat.max);
          const yQ1 = yScale(stat.q1);
          const yQ3 = yScale(stat.q3);
          const yMedian = yScale(stat.median);
          const yMean = yScale(stat.mean);

          const boxTop = Math.min(yQ1, yQ3);
          const boxHeight = Math.max(2, Math.abs(yQ3 - yQ1));

          return (
            <g
              key={stat.category}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHoveredStat({
                  stat,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }}
            >
              {/* Whiskers (Vertical stem from min to max) */}
              <line
                x1={cx}
                y1={yMin}
                x2={cx}
                y2={yMax}
                stroke={style.stroke}
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />

              {/* Lower Whisker Cap (Min) */}
              <line
                x1={cx - boxWidth * 0.3}
                y1={yMin}
                x2={cx + boxWidth * 0.3}
                y2={yMin}
                stroke={style.stroke}
                strokeWidth={2}
              />

              {/* Upper Whisker Cap (Max) */}
              <line
                x1={cx - boxWidth * 0.3}
                y1={yMax}
                x2={cx + boxWidth * 0.3}
                y2={yMax}
                stroke={style.stroke}
                strokeWidth={2}
              />

              {/* IQR Box (Q1 to Q3) */}
              <rect
                x={cx - boxWidth / 2}
                y={boxTop}
                width={boxWidth}
                height={boxHeight}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={2}
                rx={3}
              />

              {/* Median Line */}
              <line
                x1={cx - boxWidth / 2}
                y1={yMedian}
                x2={cx + boxWidth / 2}
                y2={yMedian}
                stroke="#ffffff"
                strokeWidth={2.5}
              />

              {/* Mean Indicator (Diamond) */}
              <polygon
                points={`${cx},${yMean - 4} ${cx + 4},${yMean} ${cx},${yMean + 4} ${cx - 4},${yMean}`}
                fill="#fbbf24"
              />

              {/* Outliers dots */}
              {stat.outliers.slice(0, 15).map((val, oIdx) => (
                <circle
                  key={oIdx}
                  cx={cx + (oIdx % 2 === 0 ? 3 : -3)}
                  cy={yScale(val)}
                  r={2.5}
                  fill={style.stroke}
                  opacity={0.65}
                />
              ))}

              {/* Category label on X-axis */}
              <text
                x={cx}
                y={svgHeight - paddingBottom + 20}
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {stat.category}
              </text>

              <text
                x={cx}
                y={svgHeight - paddingBottom + 34}
                fill="var(--text-muted)"
                fontSize="9.5"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                (n={stat.count})
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredStat && (
        <div
          className="custom-tooltip"
          style={{
            position: 'absolute',
            left: `${hoveredStat.x + 15}px`,
            top: `${Math.max(10, hoveredStat.y - 120)}px`,
            minWidth: '200px'
          }}
        >
          <div className="tooltip-title">{hoveredStat.stat.category} Statistics</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Max (Upper Whisker):</span>
            <span className="tooltip-val">{hoveredStat.stat.max.toLocaleString()} {unit}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Q3 (75th pct):</span>
            <span className="tooltip-val">{hoveredStat.stat.q3.toLocaleString()} {unit}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Median (50th pct):</span>
            <span className="tooltip-val" style={{ color: '#38bdf8' }}>
              {hoveredStat.stat.median.toLocaleString()} {unit}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Mean (Average):</span>
            <span className="tooltip-val" style={{ color: '#fbbf24' }}>
              {hoveredStat.stat.mean.toLocaleString()} {unit}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Q1 (25th pct):</span>
            <span className="tooltip-val">{hoveredStat.stat.q1.toLocaleString()} {unit}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Min (Lower Whisker):</span>
            <span className="tooltip-val">{hoveredStat.stat.min.toLocaleString()} {unit}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">IQR (Q3 - Q1):</span>
            <span className="tooltip-val">{(hoveredStat.stat.q3 - hoveredStat.stat.q1).toFixed(2)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Outliers detected:</span>
            <span className="tooltip-val" style={{ color: '#f43f5e' }}>
              {hoveredStat.stat.outliers.length} points
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
