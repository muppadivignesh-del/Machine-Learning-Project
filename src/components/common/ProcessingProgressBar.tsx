import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import { JobStatus } from '../../services/api';

interface ProcessingProgressBarProps {
  jobStatus: JobStatus | null;
  onClose?: () => void;
}

export const ProcessingProgressBar: React.FC<ProcessingProgressBarProps> = ({
  jobStatus,
  onClose
}) => {
  if (!jobStatus || jobStatus.status === 'completed') return null;

  return (
    <div className="processing-modal-overlay">
      <div className="processing-modal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <span className="brand-badge" style={{ marginBottom: '0.35rem', display: 'inline-block' }}>
              DISTRIBUTED ML PIPELINE
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Analyzing Transaction Dataset
            </h2>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {jobStatus.progress}%
          </span>
        </div>

        {/* Linear progress track */}
        <div className="progress-bar-track" style={{ height: '8px', marginBottom: '1.5rem' }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${jobStatus.progress}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
          />
        </div>

        {/* Step-by-Step Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {jobStatus.steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isRunning = step.status === 'running';
            const isFailed = step.status === 'failed';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: isCompleted
                    ? 'var(--text-primary)'
                    : isRunning
                    ? '#38bdf8'
                    : isFailed
                    ? '#f43f5e'
                    : 'var(--text-muted)'
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                ) : isRunning ? (
                  <Loader2 size={16} className="spin" style={{ color: '#38bdf8', flexShrink: 0 }} />
                ) : isFailed ? (
                  <AlertCircle size={16} style={{ color: '#f43f5e', flexShrink: 0 }} />
                ) : (
                  <Circle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: isRunning ? 700 : isCompleted ? 600 : 400 }}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        {jobStatus.error && (
          <div className="auth-error-box" style={{ marginTop: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{jobStatus.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
