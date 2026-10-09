import React from 'react';
import {
  BookOpen,
  Cpu,
  Layers,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  GitBranch,
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { ChartCard } from '../common/ChartCard';

export const ModelArchitectureView: React.FC = () => {
  return (
    <div>
      {/* Overview Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '2rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '900px' }}>
          <span className="brand-badge" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
            ALGORITHMIC FOUNDATION
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem' }}>
            Density-Based Spatial Clustering of Applications with Noise (DBSCAN)
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            DBSCAN is a non-parametric, density-based unsupervised clustering algorithm proposed by Martin Ester, Hans-Peter Kriegel, Jörg Sander, and Xiaowei Xu in 1996. In financial transaction surveillance, DBSCAN discovers clusters of arbitrary geometric shape and identifies isolated low-density records as <strong>Noise Points (-1)</strong>, making it naturally tailored for fraud detection without requiring ground-truth training labels.
          </p>
        </div>
      </div>

      {/* Grid: Mathematical Mechanics & Pipeline */}
      <div className="grid-cols-2">
        {/* Core Concepts */}
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
            Core Mathematical Formalism
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #38bdf8' }}>
              <strong style={{ color: '#38bdf8' }}>1. ε-Neighborhood:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                For a transaction point <code>p</code>, its neighborhood is defined as{' '}
                <code>N_ε(p) = &#123; q ∈ D | dist(p, q) ≤ ε &#125;</code>, using standardized Euclidean distance.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #10b981' }}>
              <strong style={{ color: '#10b981' }}>2. Core Points:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                A point <code>p</code> is a Core Point if <code>|N_ε(p)| ≥ MinPts</code>. These represent dense, high-frequency regular transaction corridors.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #f59e0b' }}>
              <strong style={{ color: '#f59e0b' }}>3. Border Points & Density Reachability:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                A point <code>p</code> is density-reachable from <code>q</code> if there is a chain of core points connecting them. Border points fall within radius ε of a core point but have fewer than <code>MinPts</code> neighbors.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #f43f5e' }}>
              <strong style={{ color: '#f43f5e' }}>4. Noise / Anomaly Points:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                A point <code>p</code> is marked as <strong>Noise (Cluster -1)</strong> if it is neither a core point nor density-reachable from any core point. In this platform, these represent <strong>potential financial fraud incidents</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* End-to-End Processing Pipeline */}
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: '#818cf8' }} />
            End-to-End Fraud Surveillance Pipeline
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>1</div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Feature Extraction & Hygiene</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ingestion of raw payment streams; extraction of velocity, geo-distance, amount deviation, and device fingerprint.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>2</div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>StandardScaler (Z-Score Normalization)</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zero-centering and unit variance scaling <code>(x - μ) / σ</code> to prevent dollar amounts from dominating smaller scales like risk index.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>3</div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>K-Distance Elbow Tuning</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automated Kneedle algorithm determines optimal ε inflection point to calibrate neighborhood sensitivity.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>4</div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>DBSCAN Density Graph Traversal</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region queries expand dense components; isolated non-dense records tagged with cluster <code>-1</code>.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>5</div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Risk Fusion & Case Escalation</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DBSCAN noise flags fused with deterministic business risk rules for triage and fraud team investigation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DBSCAN vs K-Means Comparison & Limitations */}
      <div className="grid-cols-2">
        {/* Why DBSCAN over K-Means for Fraud */}
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            Why DBSCAN vs K-Means for Financial Surveillance
          </h2>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>DBSCAN</th>
                  <th>K-Means</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Cluster Geometry</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Arbitrary non-convex shapes</td>
                  <td style={{ color: '#f43f5e' }}>Strictly spherical/convex</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Explicit Outlier Isolation</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Native Noise Label (-1)</td>
                  <td style={{ color: '#f43f5e' }}>Forces outliers into clusters</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Pre-specifying 'k'</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Not required (auto-discovered)</td>
                  <td style={{ color: '#f59e0b' }}>Must guess cluster count k</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Sensitivity to Scaled Density</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Directly leverages local density</td>
                  <td style={{ color: '#f59e0b' }}>Sensitive to global centroid mean</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Limitations & Future Roadmap */}
        <div className="chart-card">
          <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={18} style={{ color: '#f59e0b' }} />
            Production Limitations & Architecture Roadmap
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: '#f59e0b' }}>1. Single Global Density (ε) Limitation:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Standard DBSCAN struggles when transaction sub-populations exhibit vastly different densities (e.g. ultra-dense micropayments vs sparse corporate wire transfers).
                <em> Roadmap: Upgrade to HDBSCAN (Hierarchical DBSCAN) to accommodate variable density profiles.</em>
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: '#f59e0b' }}>2. Computational Complexity O(n²):</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Brute-force pairwise Euclidean queries scale quadratically.
                <em> Roadmap: Implement spatial indexing trees (KD-Tree, BallTree) to achieve O(n log n) throughput for streaming volumes exceeding 500,000 tx/sec.</em>
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: '#f59e0b' }}>3. Curse of Dimensionality:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                As feature dimensionality expands beyond 20+ variables, Euclidean distance becomes equidistant.
                <em> Roadmap: UMAP / PCA dimensionality reduction prior to density evaluation.</em>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
