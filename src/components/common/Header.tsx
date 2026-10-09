import React from 'react';
import { Download, Sun, Moon, Database, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { UserProfile } from '../../services/api';

interface HeaderProps {
  pageTitle: string;
  datasetName: string;
  isDemo: boolean;
  statusText: string;
  user: UserProfile | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onExportCSV: () => void;
  onRefreshAnalytics?: () => void;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  datasetName,
  isDemo,
  statusText,
  user,
  theme,
  onToggleTheme,
  onExportCSV,
  onRefreshAnalytics,
  isProcessing = false
}) => {
  return (
    <header className="fraudguard-header">
      {/* Page Title & Status Pill */}
      <div className="header-title-block">
        <h1 className="header-page-title">{pageTitle}</h1>
        <div className="header-meta-pills">
          <div className="header-dataset-pill">
            <Database size={13} style={{ color: '#38bdf8' }} />
            <span>Dataset: <strong>{datasetName}</strong></span>
          </div>

          <div className="header-status-pill">
            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
            <span>Status: <strong style={{ color: '#10b981' }}>{statusText}</strong></span>
          </div>
        </div>
      </div>

      {/* Header Actions & Profile */}
      <div className="header-actions-block">
        {onRefreshAnalytics && (
          <button
            className="icon-btn"
            onClick={onRefreshAnalytics}
            title="Refresh Analysis Results"
            disabled={isProcessing}
          >
            <RefreshCw size={16} className={isProcessing ? 'spin' : ''} />
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onExportCSV}
          title="Export Active Transactions to CSV"
        >
          <Download size={16} />
        </button>

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Profile Pill */}
        <div className="user-profile-badge">
          <div className="user-avatar-circle">
            <User size={14} />
          </div>
          <div className="user-info-text">
            <span className="user-name-text">{user?.full_name || 'System Administrator'}</span>
            <span className="user-role-text">@{user?.username || 'admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
