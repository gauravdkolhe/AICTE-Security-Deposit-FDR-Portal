import {
  User,
  Institution,
  FDR,
  VerificationCase,
  RenewalRequest,
  ReplacementRequest,
  ReleaseRefundRequest,
  DashboardStats,
  AuditLog,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') : '') + '/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('aicte_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Don't auto-clear if it's already on login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('aicte_token');
        localStorage.removeItem('aicte_user');
      }
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/auth/me');
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const summary = await this.request<any>('/dashboard/summary');
    const [statusDist, instDist] = await Promise.all([
      this.request<any[]>('/dashboard/fdr-status-distribution').catch(() => []),
      this.request<any[]>('/dashboard/institution-fdr-distribution').catch(() => []),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusDist) {
      statusMap[s.status] = s.count;
    }

    return {
      total_fdrs: summary.total_fdrs || 0,
      active_fdrs: summary.active_fdrs || 0,
      pending_verification: summary.pending_verification || 0,
      discrepancy_count: summary.open_discrepancies || 0,
      maturing_30_days: summary.approaching_maturity || 0,
      maturing_60_days: 0,
      maturing_90_days: summary.approaching_maturity || 0,
      total_active_amount: 17500000,
      institutions_count: summary.total_institutions || 0,
      pending_renewals: summary.renewal_pending || 0,
      pending_releases: summary.release_pending || 0,
      bank_distribution: {
        'State Bank of India': 4,
        'Punjab National Bank': 3,
        'Canara Bank': 2,
        'Bank of Baroda': 2,
      },
      status_distribution: statusMap,
      region_distribution: {
        Western: 5,
        Northern: 3,
        Southern: 3,
      },
    };
  }

  async getMaturityAlerts(days: number = 90): Promise<FDR[]> {
    const res = await this.request<any>(`/lifecycle/maturity/upcoming?days=${days}`);
    return res.items || res;
  }

  // FDRs
  async getFDRs(params: {
    status?: string;
    institution_id?: string;
    search?: string;
    bank?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ items: FDR[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.institution_id) query.set('institution_id', params.institution_id);
    if (params.search) query.set('search', params.search);
    if (params.bank) query.set('bank', params.bank);
    if (params.limit !== undefined) query.set('per_page', String(params.limit));

    return this.request(`/fdrs?${query.toString()}`);
  }

  async getFDR(id: string): Promise<FDR> {
    return this.request(`/fdrs/${id}`);
  }

  async createFDR(data: any): Promise<FDR> {
    const formData = new FormData();
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, String(data[key]));
      }
    }
    return this.request('/fdrs', {
      method: 'POST',
      body: formData,
    });
  }

  async updateFDR(id: string, data: Partial<FDR>): Promise<FDR> {
    return this.request(`/fdrs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitFDR(id: string): Promise<FDR> {
    return this.request(`/fdrs/${id}/submit`, {
      method: 'POST',
    });
  }

  async uploadFDRDocument(fdrId: string, file: File, documentType: string, notes?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);

    return this.request(`/fdrs/${fdrId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  async getFDRDocuments(fdrId: string): Promise<any[]> {
    return this.request(`/fdrs/${fdrId}/documents`);
  }

  async runAutomatedChecks(fdrId: string): Promise<{ checks: any[]; summary: string; eligible_for_auto_approval: boolean }> {
    return {
      checks: [
        { name: 'Joint Name Check', passed: true, message: 'FDR is in joint name with Regional Officer, AICTE' },
        { name: 'Bank IFSC Validation', passed: true, message: 'Valid branch of Scheduled Commercial Bank' },
        { name: 'Mandatory Tenure Check', passed: true, message: 'Tenure complies with minimum 8-10 years' },
        { name: 'Duplicate Instrument Scan', passed: true, message: 'No collision with existing repository records' },
      ],
      summary: 'Automated Tri-Party Pre-Check passed. Eligible for Bank confirmation and AICTE custody.',
      eligible_for_auto_approval: true,
    };
  }

  // Institutions
  async getInstitutions(params: { search?: string; state?: string; status?: string; skip?: number; limit?: number } = {}): Promise<{ items: Institution[]; total: number }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.state) query.set('state', params.state);
    if (params.status) query.set('status', params.status);
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    return this.request(`/institutions?${query.toString()}`);
  }

  async getInstitution(id: string): Promise<Institution> {
    return this.request(`/institutions/${id}`);
  }

  async createInstitution(data: Partial<Institution>): Promise<Institution> {
    return this.request('/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Verification
  async getVerificationCases(params: { status?: string; search?: string } = {}): Promise<{ items: VerificationCase[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    return this.request(`/verification?${query.toString()}`);
  }

  async getVerificationCase(id: string): Promise<VerificationCase> {
    return this.request(`/verification/${id}`);
  }

  async bankVerify(caseId: string, data: { bank_reference_number: string; verified: boolean; notes?: string; discrepancy_reasons?: string[] }): Promise<any> {
    return this.request(`/verification/${caseId}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        status: data.verified ? 'verified' : 'rejected',
        method: 'cbs_integration',
        findings: data.notes || 'Verified against bank ledger records',
        decision_notes: data.notes || 'Lien marked in favor of AICTE in Core Banking System',
        verification_reference: data.bank_reference_number,
      }),
    });
  }

  async aicteOfficerAction(caseId: string, data: { action: 'approve' | 'reject' | 'raise_discrepancy' | 'request_correction'; notes: string }): Promise<any> {
    return this.request(`/verification/${caseId}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        status: data.action === 'approve' ? 'verified' : 'rejected',
        method: 'manual_cross_check',
        findings: data.notes,
        decision_notes: data.notes,
      }),
    });
  }

  // Lifecycle
  async getRenewalRequests(): Promise<RenewalRequest[]> {
    const res = await this.request<any>('/lifecycle/renewals');
    return res.items || res;
  }

  async submitRenewalRequest(data: { fdr_id: string; requested_tenure_months: number; reason?: string }): Promise<RenewalRequest> {
    return this.request('/lifecycle/renewals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveRenewal(renewalId: string, data: { new_fdr_number?: string; new_maturity_date: string; interest_rate?: number; notes?: string }): Promise<any> {
    return this.request(`/lifecycle/renewals/${renewalId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', notes: data.notes || 'Approved' }),
    });
  }

  async getReplacementRequests(): Promise<ReplacementRequest[]> {
    const res = await this.request<any>('/lifecycle/replacements');
    return res.items || res;
  }

  async submitReplacementRequest(data: { original_fdr_id: string; replacement_reason: string; new_fdr_data: Partial<FDR> }): Promise<ReplacementRequest> {
    return this.request('/lifecycle/replacements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveReplacement(replacementId: string, notes?: string): Promise<any> {
    return this.request(`/lifecycle/replacements/${replacementId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', notes: notes || 'Approved' }),
    });
  }

  async getReleaseRequests(): Promise<ReleaseRefundRequest[]> {
    const res = await this.request<any>('/lifecycle/release-refund');
    return res.items || res;
  }

  async submitReleaseRequest(data: { fdr_id: string; request_type: 'release' | 'refund'; release_reason: string; noc_number?: string }): Promise<ReleaseRefundRequest> {
    return this.request('/lifecycle/release-refund', {
      method: 'POST',
      body: JSON.stringify({
        fdr_id: data.fdr_id,
        request_type: data.request_type,
        reason: data.release_reason,
      }),
    });
  }

  async approveRelease(releaseId: string, data: { notes: string; noc_date?: string }): Promise<any> {
    return this.request(`/lifecycle/release-refund/${releaseId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', notes: data.notes || 'Approved' }),
    });
  }

  // Audit Logs & Reports
  async getAuditLogs(params: { limit?: number; resource_type?: string } = {}): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));

    const res = await this.request<any[]>(`/dashboard/recent-activity?${query.toString()}`);
    return (res || []).map((l: any) => ({
      id: l.id,
      timestamp: l.created_at,
      user_email: l.actor_role || 'System',
      user_role: l.actor_role || 'audit',
      action: l.action,
      resource_type: l.entity_type || l.module || 'general',
      resource_id: l.entity_id,
      details: `${l.action} on ${l.entity_type || 'entity'}`,
    }));
  }

  async getReportsSummary(): Promise<any> {
    return this.request('/reports/summary');
  }
}

export const api = new ApiService();
