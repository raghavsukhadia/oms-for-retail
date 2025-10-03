/**
 * Status management utilities for OMSMS
 * Provides consistent status handling across the application
 */

import type { LucideIcon } from 'lucide-react';
import { Clock, Settings, AlertTriangle, CheckCircle, XCircle, Package, CreditCard } from 'lucide-react';
import type { VehicleStatus, InstallationStatus, PaymentStatus, WorkflowStatus } from './types.js';

// =====================================================
// STATUS CONFIGURATION INTERFACES
// =====================================================

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  description?: string;
}

export interface VehicleStatusConfig extends StatusConfig {
  status: VehicleStatus;
}

export interface InstallationStatusConfig extends StatusConfig {
  status: InstallationStatus;
}

export interface PaymentStatusConfig extends StatusConfig {
  status: PaymentStatus;
}

export interface WorkflowStatusConfig extends StatusConfig {
  status: WorkflowStatus;
}

// =====================================================
// VEHICLE STATUS CONFIGURATIONS
// =====================================================

export const VEHICLE_STATUS_CONFIGS: Record<VehicleStatus, VehicleStatusConfig> = {
  pending: {
    status: 'pending',
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Clock,
    description: 'Vehicle is waiting to be processed'
  },
  in_progress: {
    status: 'in_progress',
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: Settings,
    description: 'Vehicle is currently being processed'
  },
  quality_check: {
    status: 'quality_check',
    label: 'Quality Check',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    icon: AlertTriangle,
    description: 'Vehicle is undergoing quality inspection'
  },
  completed: {
    status: 'completed',
    label: 'Completed',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: CheckCircle,
    description: 'Vehicle processing is complete'
  },
  delivered: {
    status: 'delivered',
    label: 'Delivered',
    color: '#059669',
    bgColor: '#a7f3d0',
    icon: Package,
    description: 'Vehicle has been delivered to customer'
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: XCircle,
    description: 'Vehicle processing has been cancelled'
  }
};

// =====================================================
// INSTALLATION STATUS CONFIGURATIONS
// =====================================================

export const INSTALLATION_STATUS_CONFIGS: Record<InstallationStatus, InstallationStatusConfig> = {
  pending: {
    status: 'pending',
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Clock,
    description: 'Installation is waiting to begin'
  },
  in_progress: {
    status: 'in_progress',
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: Settings,
    description: 'Installation is currently in progress'
  },
  completed: {
    status: 'completed',
    label: 'Completed',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: CheckCircle,
    description: 'Installation has been completed'
  },
  failed: {
    status: 'failed',
    label: 'Failed',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: XCircle,
    description: 'Installation has failed'
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: XCircle,
    description: 'Installation has been cancelled'
  }
};

// =====================================================
// PAYMENT STATUS CONFIGURATIONS
// =====================================================

export const PAYMENT_STATUS_CONFIGS: Record<PaymentStatus, PaymentStatusConfig> = {
  pending: {
    status: 'pending',
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Clock,
    description: 'Payment is pending'
  },
  partial: {
    status: 'partial',
    label: 'Partial',
    color: '#f97316',
    bgColor: '#fed7aa',
    icon: CreditCard,
    description: 'Partial payment received'
  },
  paid: {
    status: 'paid',
    label: 'Paid',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: CheckCircle,
    description: 'Payment has been completed'
  },
  overdue: {
    status: 'overdue',
    label: 'Overdue',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: AlertTriangle,
    description: 'Payment is overdue'
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: XCircle,
    description: 'Payment has been cancelled'
  }
};

// =====================================================
// WORKFLOW STATUS CONFIGURATIONS
// =====================================================

export const WORKFLOW_STATUS_CONFIGS: Record<WorkflowStatus, WorkflowStatusConfig> = {
  pending: {
    status: 'pending',
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Clock,
    description: 'Workflow is waiting to start'
  },
  in_progress: {
    status: 'in_progress',
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: Settings,
    description: 'Workflow is currently running'
  },
  completed: {
    status: 'completed',
    label: 'Completed',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: CheckCircle,
    description: 'Workflow has been completed'
  },
  failed: {
    status: 'failed',
    label: 'Failed',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: XCircle,
    description: 'Workflow has failed'
  },
  cancelled: {
    status: 'cancelled',
    label: 'Cancelled',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: XCircle,
    description: 'Workflow has been cancelled'
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get vehicle status configuration
 */
export function getVehicleStatusConfig(status: VehicleStatus): VehicleStatusConfig {
  return VEHICLE_STATUS_CONFIGS[status] || VEHICLE_STATUS_CONFIGS.pending;
}

/**
 * Get installation status configuration
 */
export function getInstallationStatusConfig(status: InstallationStatus): InstallationStatusConfig {
  return INSTALLATION_STATUS_CONFIGS[status] || INSTALLATION_STATUS_CONFIGS.pending;
}

/**
 * Get payment status configuration
 */
export function getPaymentStatusConfig(status: PaymentStatus): PaymentStatusConfig {
  return PAYMENT_STATUS_CONFIGS[status] || PAYMENT_STATUS_CONFIGS.pending;
}

/**
 * Get workflow status configuration
 */
export function getWorkflowStatusConfig(status: WorkflowStatus): WorkflowStatusConfig {
  return WORKFLOW_STATUS_CONFIGS[status] || WORKFLOW_STATUS_CONFIGS.pending;
}

/**
 * Normalize vehicle status (handle legacy formats)
 */
export function normalizeVehicleStatus(status: string): VehicleStatus {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Handle legacy formats
  const legacyMapping: Record<string, VehicleStatus> = {
    'in-progress': 'in_progress',
    'quality-check': 'quality_check',
    'in_progress': 'in_progress',
    'quality_check': 'quality_check'
  };
  
  const mappedStatus = legacyMapping[normalizedStatus] || normalizedStatus;
  
  if (mappedStatus in VEHICLE_STATUS_CONFIGS) {
    return mappedStatus as VehicleStatus;
  }
  
  return 'pending';
}

/**
 * Normalize installation status (handle legacy formats)
 */
export function normalizeInstallationStatus(status: string): InstallationStatus {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Handle legacy formats
  const legacyMapping: Record<string, InstallationStatus> = {
    'in-progress': 'in_progress',
    'in_progress': 'in_progress'
  };
  
  const mappedStatus = legacyMapping[normalizedStatus] || normalizedStatus;
  
  if (mappedStatus in INSTALLATION_STATUS_CONFIGS) {
    return mappedStatus as InstallationStatus;
  }
  
  return 'pending';
}

/**
 * Normalize payment status (handle legacy formats)
 */
export function normalizePaymentStatus(status: string): PaymentStatus {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Handle legacy formats
  const legacyMapping: Record<string, PaymentStatus> = {
    'in-progress': 'pending',
    'in_progress': 'pending'
  };
  
  const mappedStatus = legacyMapping[normalizedStatus] || normalizedStatus;
  
  if (mappedStatus in PAYMENT_STATUS_CONFIGS) {
    return mappedStatus as PaymentStatus;
  }
  
  return 'pending';
}

/**
 * Normalize workflow status (handle legacy formats)
 */
export function normalizeWorkflowStatus(status: string): WorkflowStatus {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  
  // Handle legacy formats
  const legacyMapping: Record<string, WorkflowStatus> = {
    'in-progress': 'in_progress',
    'in_progress': 'in_progress'
  };
  
  const mappedStatus = legacyMapping[normalizedStatus] || normalizedStatus;
  
  if (mappedStatus in WORKFLOW_STATUS_CONFIGS) {
    return mappedStatus as WorkflowStatus;
  }
  
  return 'pending';
}

/**
 * Get all available vehicle statuses
 */
export function getVehicleStatuses(): VehicleStatus[] {
  return Object.keys(VEHICLE_STATUS_CONFIGS) as VehicleStatus[];
}

/**
 * Get all available installation statuses
 */
export function getInstallationStatuses(): InstallationStatus[] {
  return Object.keys(INSTALLATION_STATUS_CONFIGS) as InstallationStatus[];
}

/**
 * Get all available payment statuses
 */
export function getPaymentStatuses(): PaymentStatus[] {
  return Object.keys(PAYMENT_STATUS_CONFIGS) as PaymentStatus[];
}

/**
 * Get all available workflow statuses
 */
export function getWorkflowStatuses(): WorkflowStatus[] {
  return Object.keys(WORKFLOW_STATUS_CONFIGS) as WorkflowStatus[];
}

/**
 * Check if a status is considered "active" (in progress)
 */
export function isActiveStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  return normalizedStatus === 'in_progress' || normalizedStatus === 'in-progress';
}

/**
 * Check if a status is considered "completed"
 */
export function isCompletedStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  return normalizedStatus === 'completed' || normalizedStatus === 'delivered' || normalizedStatus === 'paid';
}

/**
 * Check if a status is considered "failed" or "cancelled"
 */
export function isFailedStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  return normalizedStatus === 'failed' || normalizedStatus === 'cancelled';
}

/**
 * Get status priority for sorting (lower number = higher priority)
 */
export function getStatusPriority(status: string): number {
  const priorityMap: Record<string, number> = {
    'pending': 1,
    'in_progress': 2,
    'quality_check': 3,
    'completed': 4,
    'delivered': 5,
    'paid': 6,
    'partial': 7,
    'overdue': 8,
    'failed': 9,
    'cancelled': 10
  };
  
  const normalizedStatus = status.toLowerCase().replace(/[^a-z_]/g, '_');
  return priorityMap[normalizedStatus] || 99;
}

/**
 * Get status color for UI components
 */
export function getStatusColor(status: string, type: 'vehicle' | 'installation' | 'payment' | 'workflow' = 'vehicle'): string {
  switch (type) {
    case 'vehicle':
      return getVehicleStatusConfig(normalizeVehicleStatus(status)).color;
    case 'installation':
      return getInstallationStatusConfig(normalizeInstallationStatus(status)).color;
    case 'payment':
      return getPaymentStatusConfig(normalizePaymentStatus(status)).color;
    case 'workflow':
      return getWorkflowStatusConfig(normalizeWorkflowStatus(status)).color;
    default:
      return '#6b7280';
  }
}

/**
 * Get status background color for UI components
 */
export function getStatusBgColor(status: string, type: 'vehicle' | 'installation' | 'payment' | 'workflow' = 'vehicle'): string {
  switch (type) {
    case 'vehicle':
      return getVehicleStatusConfig(normalizeVehicleStatus(status)).bgColor;
    case 'installation':
      return getInstallationStatusConfig(normalizeInstallationStatus(status)).bgColor;
    case 'payment':
      return getPaymentStatusConfig(normalizePaymentStatus(status)).bgColor;
    case 'workflow':
      return getWorkflowStatusConfig(normalizeWorkflowStatus(status)).bgColor;
    default:
      return '#f3f4f6';
  }
}
