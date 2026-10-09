import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Network,
  SlidersHorizontal,
  ScatterChart,
  ShieldAlert,
  Award,
  BookOpen,
  Sun,
  Moon,
  RefreshCw,
  Download
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'eda'
  | 'correlation'
  | 'features'
  | 'dbscan'
  | 'anomalies'
  | 'performance'
  | 'model';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRegenerateData: () => void;
  onExportData: () => void;
  isProcessing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  theme,
  onToggleTheme,
  onRegenerateData,
  onExportData,
  isProcessing = false
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'eda', label: 'EDA Analytics', icon: <BarChart3 size={16} /> },
    { id: 'correlation', label: 'Correlation', icon: <Network size={16} /> },
    { id: 'features', label: 'Features', icon: <SlidersHorizontal size={16} /> },
    { id: 'dbscan', label: 'DBSCAN Clusters', icon: <ScatterChart size={16} /> },
    { id: 'anomalies', label: 'Anomalies & Radar', icon: <ShieldAlert size={16} /> },
    { id: 'performance', label: 'Evaluation', icon: <Award size={16} /> },
    { id: 'model', label: 'Architecture & Guide', icon: <BookOpen size={16} /> }
  ];

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="nav-brand">
        <span className="brand-badge">PRO DENSITY AI</span>
        <div>
          <h1 className="brand-title">
            <span style={{ color: 'var(--color-primary)' }}>Fraud</span>Radar DBSCAN
          </h1>
          <p className="brand-subtitle">Financial Transaction Intelligence & Anomaly Platform</p>
        </div>
      </div>

      <div className="nav-tabs" role="tablist">
        {navItems.map(item => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={currentTab === item.id}
            className={`nav-tab-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-actions">
        <button
          className="icon-btn"
          onClick={onRegenerateData}
          title="Regenerate Seeded Dataset & Re-run Clustering"
          disabled={isProcessing}
        >
          <RefreshCw size={17} className={isProcessing ? 'spin' : ''} />
        </button>

        <button
          className="icon-btn"
          onClick={onExportData}
          title="Export Filtered Transactions to CSV"
        >
          <Download size={17} />
        </button>

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </nav>
  );
};
