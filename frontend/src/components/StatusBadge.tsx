import React from 'react';
import { FDRStatus } from '../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw, FileText, Lock } from 'lucide-react';

interface Props {
  status: FDRStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'active':
        return {
          className: 'badge-active',
          label: 'Active & Lien Marked',
          icon: <Lock size={size === 'sm' ? 12 : 14} />,
        };
      case 'verified':
        return {
          className: 'badge-verified',
          label: 'Verified by Bank',
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} />,
        };
      case 'pending_verification':
      case 'in_review':
        return {
          className: 'badge-pending',
          label: 'Pending 3-Way Verification',
          icon: <Clock size={size === 'sm' ? 12 : 14} />,
        };
      case 'approaching_maturity':
        return {
          className: 'badge-maturing',
          label: 'Approaching Maturity',
          icon: <AlertTriangle size={size === 'sm' ? 12 : 14} />,
        };
      case 'matured':
        return {
          className: 'badge-matured',
          label: 'Matured - Action Req.',
          icon: <AlertTriangle size={size === 'sm' ? 12 : 14} />,
        };
      case 'discrepancy_found':
      case 'correction_required':
        return {
          className: 'badge-discrepancy',
          label: 'Discrepancy / Return',
          icon: <XCircle size={size === 'sm' ? 12 : 14} />,
        };
      case 'renewal_pending':
      case 'renewal_submitted':
        return {
          className: 'badge-pending',
          label: 'Renewal in Progress',
          icon: <RefreshCw size={size === 'sm' ? 12 : 14} />,
        };
      case 'renewed':
        return {
          className: 'badge-active',
          label: 'Renewed',
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} />,
        };
      case 'release_requested':
        return {
          className: 'badge-pending',
          label: 'Release Requested',
          icon: <FileText size={size === 'sm' ? 12 : 14} />,
        };
      case 'released':
      case 'closed':
        return {
          className: 'badge-released',
          label: 'Released & Closed',
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} />,
        };
      case 'draft':
      default:
        return {
          className: 'badge-draft',
          label: status.replace(/_/g, ' '),
          icon: <Clock size={size === 'sm' ? 12 : 14} />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`badge ${config.className}`}
      style={{
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.625rem',
      }}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
