import React from 'react';
import {
  Shield,
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Network,
  SlidersHorizontal,
  ScatterChart,
  ShieldAlert,
  Award,
  BookOpen,
  Sparkles,
  LogOut,
  Sliders
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'dataset'
  | 'eda'
  | 'correlation'
  | 'features'
  | 'dbscan'
  | 'anomalies'
  | 'performance'
  | 'model';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLoadDemo: () => void;
  onLogout: () => void;
  datasetName: string;
  isDemo: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onLoadDemo,
  onLogout,
  datasetName,
  isDemo
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} /> },
    { id: 'dataset', label: 'Dataset (CSV)', icon: <FileSpreadsheet size={17} /> },
    { id: 'eda', label: 'EDA Analytics', icon: <BarChart3 size={17} /> },
    { id: 'correlation', label: 'Correlation Matrix', icon: <Network size={17} /> },
    { id: 'features', label: 'Feature Analysis', icon: <SlidersHorizontal size={17} /> },
    { id: 'dbscan', label: 'DBSCAN Analysis', icon: <ScatterChart size={17} /> },
    { id: 'anomalies', label: 'Anomalies & Radar', icon: <ShieldAlert size={17} /> },
    { id: 'performance', label: 'Performance Evaluation', icon: <Award size={17} /> },
    { id: 'model', label: 'Model Information', icon: <BookOpen size={17} /> }
  ];

  return (
    <aside className="fraudguard-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-shield-wrapper">
          <Shield size={22} className="brand-shield-svg" />
        </div>
        <div>
          <div className="brand-title-text">
            Fraud<span style={{ color: '#38bdf8' }}>Guard</span>
          </div>
          <div className="brand-tagline">DBSCAN Surveillance</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">SURVEILLANCE WORKSPACE</div>
        {menuItems.map(item => (
          <button
            key={item.id}
            id={`sidebar-tab-${item.id}`}
            className={`sidebar-nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        <div className="sidebar-divider" />

        <div className="sidebar-section-label">DATASET & DEMO</div>
        <button
          className="sidebar-nav-item demo-action-item"
          onClick={onLoadDemo}
          title="Reload Project Sample Dataset"
        >
          <Sparkles size={16} style={{ color: '#fbbf24' }} />
          <span>Load Demo Dataset</span>
        </button>

        <button
          className="sidebar-nav-item logout-action-item"
          onClick={onLogout}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Dataset Status Footer Widget */}
      <div className="sidebar-footer-widget">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Dataset</span>
          <span className={`status-pill ${isDemo ? 'demo' : 'live'}`}>
            {isDemo ? 'DEMO' : 'LIVE'}
          </span>
        </div>
        <div className="footer-dataset-name" title={datasetName}>
          {datasetName}
        </div>
      </div>
    </aside>
  );
};
