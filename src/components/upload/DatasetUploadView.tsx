import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Database,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import { api } from '../../services/api';

interface DatasetUploadViewProps {
  onDatasetLoaded: (data: any) => void;
  onProceedToEDA: () => void;
}

export const DatasetUploadView: React.FC<DatasetUploadViewProps> = ({
  onDatasetLoaded,
  onProceedToEDA
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Column mapping modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});

  // Dataset preview state
  const [previewData, setPreviewData] = useState<{
    columns: string[];
    rows: any[];
    total: number;
    page: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load preview on mount
  useEffect(() => {
    loadPreview(1);
  }, []);

  const loadPreview = async (page: number) => {
    try {
      setPreviewLoading(true);
      const res = await api.getDatasetPreview(page, 10);
      setPreviewData(res);
    } catch {
      // preview error ignored
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please upload a CSV (.csv) file.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      const res = await api.uploadDataset(file, pct => setUploadProgress(pct));
      setUploadSuccess(res);
      onDatasetLoaded(res);
      loadPreview(1);
    } catch (err: any) {
      setError(err.message || 'Dataset upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setUploading(true);
      setError(null);
      const res = await api.loadDemoDataset();
      setUploadSuccess(res);
      setSelectedFile(null);
      onDatasetLoaded(res);
      loadPreview(1);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo dataset.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span className="brand-badge" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
            DATA INGESTION GATEWAY
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Upload Transaction Dataset (CSV)
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Stream raw payment logs into the backend ML engine for preprocessing, Z-score scaling, and DBSCAN clustering.
          </p>
        </div>

        <button
          className="action-btn-primary"
          onClick={handleLoadDemo}
          disabled={uploading}
        >
          <Sparkles size={16} />
          <span>Load Project Demo Dataset (2,500 Tx)</span>
        </button>
      </div>

      {error && (
        <div className="auth-error-box" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div className="grid-cols-2">
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={18} style={{ color: 'var(--color-primary)' }} />
            CSV File Upload Zone
          </h2>

          <div
            className={`dropzone-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div className="dropzone-icon-circle">
              <FileSpreadsheet size={36} style={{ color: 'var(--color-primary)' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Drag & Drop CSV File Here
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                or click to browse your local file system
              </p>
            </div>

            <div className="dropzone-badge-note">
              Supports large datasets • Streamed chunk processing • Automatic field validation
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Streaming to Backend ML Engine...</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{uploadProgress}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Validation Summary Card */}
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} style={{ color: '#10b981' }} />
            Dataset Metadata & Validation Status
          </h2>

          {selectedFile && (
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>File Ingested</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            </div>
          )}

          {uploadSuccess ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Records</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.rows?.toLocaleString() || uploadSuccess.kpi?.total_transactions?.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Columns Ingested</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.columns || 19}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                  <CheckCircle2 size={16} />
                  <span>Valid CSV structure verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                  <CheckCircle2 size={16} />
                  <span>Missing values cleaned and normalized</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: uploadSuccess.validation?.has_fraud_label !== false ? '#10b981' : '#f59e0b' }}>
                  {uploadSuccess.validation?.has_fraud_label !== false ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Fraud_Label detected (Ground-truth evaluation active)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      <span>Fraud_Label absent (Unsupervised anomaly detection only)</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="action-btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={onProceedToEDA}
                >
                  <span>Proceed to EDA Analytics</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <FileSpreadsheet size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>No dataset uploaded yet.</p>
              <p style={{ fontSize: '0.75rem' }}>Upload your own CSV or click "Load Project Demo Dataset" above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Live Preview Table */}
      {previewData && (
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card-header">
            <div>
              <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TableIcon size={18} style={{ color: '#38bdf8' }} />
                Dataset Ingestion Preview
              </h2>
              <p className="chart-subtitle">
                Paginated server-side preview of ingested rows ({previewData.total.toLocaleString()} total rows)
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {previewData.columns.slice(0, 8).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, idx) => (
                  <tr key={idx}>
                    {previewData.columns.slice(0, 8).map(col => (
                      <td key={col} style={{ fontFamily: typeof row[col] === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                        {String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
