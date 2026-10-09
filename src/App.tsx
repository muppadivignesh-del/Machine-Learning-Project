import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction, DBSCANConfig, DBSCANResult } from './types';
import { generateTransactions } from './data/mockDataGenerator';
import { runDBSCAN } from './algorithms/dbscan';
import { api, UserProfile, JobStatus } from './services/api';

import { Sidebar, NavTab } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { DatasetUploadView } from './components/upload/DatasetUploadView';
import { ProcessingProgressBar } from './components/common/ProcessingProgressBar';

import { DashboardView } from './components/dashboard/DashboardView';
import { EDAView } from './components/eda/EDAView';
import { CorrelationView } from './components/correlation/CorrelationView';
import { FeatureAnalysisView } from './components/features/FeatureAnalysisView';
import { DBSCANView } from './components/dbscan/DBSCANView';
import { AnomaliesView } from './components/anomalies/AnomaliesView';
import { PerformanceView } from './components/performance/PerformanceView';
import { ModelArchitectureView } from './components/model/ModelArchitectureView';
import { TransactionDetailModal } from './components/common/TransactionDetailModal';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('fraudguard_token');
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return api.getCurrentUser() || {
      username: 'admin',
      full_name: 'System Administrator',
      email: 'admin@fraudguard.internal'
    };
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  // Dataset info
  const [datasetName, setDatasetName] = useState<string>('fraud_transaction_dataset.csv (Demo)');
  const [isDemo, setIsDemo] = useState<boolean>(true);

  // Background Job & Processing State
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Inspected transaction
  const [inspectedTx, setInspectedTx] = useState<Transaction | null>(null);

  // DBSCAN Configuration
  const [config, setConfig] = useState<DBSCANConfig>({
    eps: 0.50,
    min_samples: 5,
    selectedFeatures: [
      'amount',
      'frequency_24h',
      'location_distance',
      'amount_deviation',
      'merchant_risk'
    ]
  });

  // Base raw transactions
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>(() => {
    return generateTransactions(2500, 42);
  });

  // Apply theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Execute DBSCAN clustering
  const { transactions, result: dbscanResult } = useMemo(() => {
    return runDBSCAN(rawTransactions, config);
  }, [rawTransactions, config]);

  // Auth Handlers
  const handleLoginSuccess = (authData: any) => {
    setIsAuthenticated(true);
    setCurrentUser(authData.user);
    setCurrentTab('overview');
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setAuthView('login');
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Trigger background job when re-clustering via backend or sliders
  const handleUpdateConfig = useCallback(async (newConfig: DBSCANConfig) => {
    setConfig(newConfig);
    try {
      setIsProcessing(true);
      const jobId = await api.startDBSCANJob(newConfig.eps, newConfig.min_samples);
      
      // Poll job progress
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.pollJobStatus(jobId);
          setActiveJob(status);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setTimeout(() => setActiveJob(null), 800);
          }
        } catch {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setActiveJob(null);
        }
      }, 250);
    } catch {
      // If backend is not reached, client-side useMemo handles it instantly
      setIsProcessing(false);
    }
  }, []);

  // Handle CSV Dataset Uploaded / Loaded
  const handleDatasetLoaded = (data: any) => {
    setDatasetName(data.filename || 'uploaded_dataset.csv');
    setIsDemo(!!data.is_demo);
    
    // Convert backend payload scatter points into Transaction format if provided
    if (data.payload?.scatter_points) {
      const converted: Transaction[] = data.payload.scatter_points.map((p: any, idx: number) => ({
        id: p.id || `TX-${100000 + idx}`,
        timestamp: new Date().toISOString(),
        hour: p.hour || 12,
        amount: p.amount,
        frequency_24h: p.frequency_24h || 2,
        location_distance: p.location_distance || 10,
        device_change: p.device_change || 'Known Device',
        login_attempts: p.login_attempts || 1,
        account_age: p.account_age || 365,
        prev_tx_avg: p.prev_tx_avg || p.amount * 0.9,
        amount_deviation: p.amount_deviation || 0.2,
        merchant_risk: p.merchant_risk || 0.1,
        tx_duration: 45,
        account_balance: p.account_balance || 5000,
        amount_to_balance: 0.02,
        channel: p.channel || 'Mobile',
        fraud_label: p.fraud_label || 0,
        project_risk_score: p.project_risk_score || 25,
        risk_category: p.is_anomaly ? 'Potential Anomaly' : 'Low Risk',
        cluster: p.cluster,
        is_anomaly: p.is_anomaly
      }));
      setRawTransactions(converted);
    } else {
      // Re-generate seeded sample
      setRawTransactions(generateTransactions(data.rows || 2500, Math.floor(Math.random() * 1000)));
    }
  };

  // 1-Click Load Demo Dataset
  const handleLoadDemoDataset = async () => {
    try {
      setIsProcessing(true);
      const res = await api.loadDemoDataset();
      handleDatasetLoaded(res);
      setDatasetName('fraud_transaction_dataset.csv (Demo)');
      setIsDemo(true);
    } catch {
      setRawTransactions(generateTransactions(2500, 42));
      setDatasetName('fraud_transaction_dataset.csv (Demo)');
      setIsDemo(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'Transaction_ID',
      'Timestamp',
      'Transaction_Hour',
      'Transaction_Amount',
      'Transaction_Frequency_24H',
      'Location_Distance_KM',
      'Device_Change',
      'Login_Attempts',
      'Amount_Deviation',
      'Merchant_Risk_Score',
      'Channel',
      'Cluster',
      'Is_Anomaly',
      'Fraud_Label',
      'Project_Risk_Score'
    ];
    const rows = transactions.map(t =>
      [
        t.id,
        t.timestamp,
        t.hour,
        t.amount,
        t.frequency_24h,
        t.location_distance,
        t.device_change,
        t.login_attempts,
        t.amount_deviation,
        t.merchant_risk,
        t.channel,
        t.cluster,
        t.is_anomaly ? 1 : 0,
        t.fraud_label,
        t.project_risk_score
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fraudguard_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Page titles mapping
  const pageTitles: Record<NavTab, string> = {
    overview: 'Executive Surveillance Dashboard',
    dataset: 'Transaction Dataset Management & Ingestion',
    eda: 'Exploratory Data Analytics (EDA)',
    correlation: 'Pairwise Correlation Matrix Analysis',
    features: 'Unsupervised Feature Distribution Deep-Dive',
    dbscan: 'DBSCAN Hyperparameter Tuning & 2D Projection',
    anomalies: 'Anomaly Radar & Threat Investigation',
    performance: 'Algorithmic Benchmark Evaluation',
    model: 'DBSCAN Architecture & Theoretical Guide'
  };

  // Unauthenticated Flow
  if (!isAuthenticated) {
    if (authView === 'login') {
      return (
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setAuthView('register')}
        />
      );
    }
    return (
      <RegisterView
        onRegisterSuccess={() => setAuthView('login')}
        onNavigateToLogin={() => setAuthView('login')}
      />
    );
  }

  // Authenticated FraudGuard Terminal Flow
  return (
    <div className="fraudguard-layout">
      {/* Redesigned Dark Navy Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLoadDemo={handleLoadDemoDataset}
        onLogout={handleLogout}
        datasetName={datasetName}
        isDemo={isDemo}
      />

      {/* Main Workspace Area */}
      <div className="fraudguard-main-area">
        <Header
          pageTitle={pageTitles[currentTab]}
          datasetName={datasetName}
          isDemo={isDemo}
          statusText={isProcessing ? 'Processing Pipeline...' : 'Analysis Ready'}
          user={currentUser}
          theme={theme}
          onToggleTheme={toggleTheme}
          onExportCSV={handleExportCSV}
          onRefreshAnalytics={() => handleUpdateConfig(config)}
          isProcessing={isProcessing}
        />

        <main className="main-content">
          {currentTab === 'overview' && (
            <DashboardView
              transactions={transactions}
              dbscanResult={dbscanResult}
              onNavigateToAnomalies={() => setCurrentTab('anomalies')}
              onInspectTransaction={setInspectedTx}
            />
          )}

          {currentTab === 'dataset' && (
            <DatasetUploadView
              onDatasetLoaded={handleDatasetLoaded}
              onProceedToEDA={() => setCurrentTab('eda')}
            />
          )}

          {currentTab === 'eda' && <EDAView transactions={transactions} />}

          {currentTab === 'correlation' && <CorrelationView transactions={transactions} />}

          {currentTab === 'features' && <FeatureAnalysisView transactions={transactions} />}

          {currentTab === 'dbscan' && (
            <DBSCANView
              transactions={transactions}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              dbscanResult={dbscanResult}
              onInspectTransaction={setInspectedTx}
            />
          )}

          {currentTab === 'anomalies' && (
            <AnomaliesView
              transactions={transactions}
              onInspectTransaction={setInspectedTx}
            />
          )}

          {currentTab === 'performance' && (
            <PerformanceView
              transactions={transactions}
              onApplyEps={eps => handleUpdateConfig({ ...config, eps })}
            />
          )}

          {currentTab === 'model' && <ModelArchitectureView />}
        </main>
      </div>

      {/* Asynchronous ML Progress Checklist */}
      <ProcessingProgressBar jobStatus={activeJob} />

      {/* Transaction Forensic Dossier Modal */}
      <TransactionDetailModal
        transaction={inspectedTx}
        onClose={() => setInspectedTx(null)}
      />
    </div>
  );
};

export default App;
