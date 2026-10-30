export type UserRole = 'system_admin' | 'aicte_officer' | 'bank_officer' | 'institution_admin' | 'auditor';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: string | null;
  designation?: string | null;
}

export type FDRStatus =
  | 'draft'
  | 'submitted'
  | 'pending_verification'
  | 'in_review'
  | 'verified'
  | 'manually_reviewed'
  | 'discrepancy_found'
  | 'correction_required'
  | 'rejected'
  | 'active'
  | 'approaching_maturity'
  | 'matured'
  | 'renewal_pending'
  | 'renewal_submitted'
  | 'renewed'
  | 'replacement_pending'
  | 'replaced'
  | 'release_requested'
  | 'released'
  | 'closed';

export interface Institution {
  id: string;
  aicte_permanent_id: string;
  current_application_number?: string;
  name: string;
  institution_type: string;
  state: string;
  city: string;
  region: string;
  status: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  pincode?: string;
  head_of_institution?: string;
  total_fdrs_count?: number;
  total_active_deposit_amount?: number;
}

export interface FDRDocument {
  id: string;
  document_type: string;
  original_filename: string;
  file_size?: string;
  uploaded_at: string;
  file_path: string;
}

export interface FDR {
  id: string;
  fdr_record_id: string;
  institution_id: string;
  fdr_number: string;
  deposit_reference_number?: string;
  approval_reference?: string;
  deposit_amount: number;
  currency: string;
  issuing_bank: string;
  bank_branch: string;
  ifsc_code: string;
  issue_date: string;
  maturity_date: string;
  deposit_type: string;
  interest_rate?: number;
  auto_renewal: boolean;
  renewal_tenure_months?: string;
  status: FDRStatus;
  submission_date?: string;
  verification_status?: string;
  lifecycle_status?: string;
  notes?: string;
  parent_fdr_id?: string;
  institution?: Institution;
  documents?: FDRDocument[];
  days_to_maturity?: number;
  is_maturing_soon?: boolean;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

export interface VerificationCase {
  id: string;
  fdr_id: string;
  case_number: string;
  status: string;
  verification_type: string;
  bank_name?: string;
  bank_reference_number?: string;
  verification_method?: string;
  created_at: string;
  verified_at?: string;
  notes?: string;
  discrepancy_reasons?: string[];
  fdr?: FDR;
  auto_checks?: VerificationCheck[];
}

export interface LifecycleEvent {
  id: string;
  fdr_id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  created_at: string;
  action_by_name?: string;
  notes?: string;
}

export interface RenewalRequest {
  id: string;
  fdr_id: string;
  request_number: string;
  status: string;
  requested_tenure_months: number;
  reason?: string;
  submitted_at: string;
  approved_at?: string;
  new_maturity_date?: string;
  fdr?: FDR;
}

export interface ReplacementRequest {
  id: string;
  original_fdr_id: string;
  request_number: string;
  status: string;
  replacement_reason: string;
  submitted_at: string;
  approved_at?: string;
  original_fdr?: FDR;
  new_fdr?: FDR;
}

export interface ReleaseRefundRequest {
  id: string;
  fdr_id: string;
  request_number: string;
  request_type: string;
  status: string;
  release_reason: string;
  noc_number?: string;
  submitted_at: string;
  fdr?: FDR;
}

export interface DashboardStats {
  total_fdrs: number;
  active_fdrs: number;
  pending_verification: number;
  discrepancy_count: number;
  maturing_30_days: number;
  maturing_60_days: number;
  maturing_90_days: number;
  total_active_amount: number;
  institutions_count: number;
  pending_renewals: number;
  pending_releases: number;
  recent_activities?: any[];
  bank_distribution?: Record<string, number>;
  status_distribution?: Record<string, number>;
  region_distribution?: Record<string, number>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
}
