// FraudGuard Frontend API Service

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fraudguard_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface UserProfile {
  username: string;
  full_name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface JobStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step_index: number;
  current_step_name: string;
  steps: JobStep[];
  result?: any;
  error?: string;
}

export const api = {
  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem('fraudguard_token', data.access_token);
    localStorage.setItem('fraudguard_user', JSON.stringify(data.user));
    return data;
  },

  async register(full_name: string, email: string, username: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  getCurrentUser(): UserProfile | null {
    const stored = localStorage.getItem('fraudguard_user');
    return stored ? JSON.parse(stored) : null;
  },

  logout(): void {
    localStorage.removeItem('fraudguard_token');
    localStorage.removeItem('fraudguard_user');
  },

  // Dataset Operations
  async uploadDataset(file: File, onProgress?: (pct: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/dataset/upload`);

      const headers = getAuthHeader();
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  },

  async loadDemoDataset(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/dataset/demo`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to load demo dataset');
    return res.json();
  },

  async getDatasetPreview(page: number = 1, pageSize: number = 15): Promise<any> {
    const res = await fetch(`${API_BASE}/api/dataset/preview?page=${page}&page_size=${pageSize}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load dataset preview');
    return res.json();
  },

  async mapColumns(mapping: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/dataset/map-columns`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping })
    });
    if (!res.ok) throw new Error('Failed to map columns');
    return res.json();
  },

  // DBSCAN & Background Jobs
  async startDBSCANJob(eps: number, min_samples: number, selected_features?: string[]): Promise<string> {
    const res = await fetch(`${API_BASE}/api/dbscan/run`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ eps, min_samples, selected_features })
    });
    if (!res.ok) throw new Error('Failed to trigger DBSCAN clustering');
    const data = await res.json();
    return data.job_id;
  },

  async pollJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/status`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Job status check failed');
    return res.json();
  },

  async getKDistance(k: number = 5): Promise<any> {
    const res = await fetch(`${API_BASE}/api/dbscan/k-distance?k=${k}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to compute K-distance');
    return res.json();
  },

  // Analytics & Aggregations
  async getAnalyticsPayload(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/analytics/payload`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics payload');
    return res.json();
  },

  // Paginated Transactions Table
  async getTransactions(
    page: number = 1,
    pageSize: number = 12,
    filterType: string = 'all',
    search: string = ''
  ): Promise<any> {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      filter_type: filterType,
      ...(search ? { search } : {})
    });
    const res = await fetch(`${API_BASE}/api/transactions?${q.toString()}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  getExportUrl(): string {
    return `${API_BASE}/api/transactions/export`;
  }
};
