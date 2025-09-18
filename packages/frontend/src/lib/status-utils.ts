import { Clock, Settings, AlertTriangle, CheckCircle, XCircle, Package, CreditCard } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { 
  getVehicleStatusConfig,
  getInstallationStatusConfig,
  getPaymentStatusConfig,
  normalizeVehicleStatus,
  normalizeInstallationStatus,
  normalizePaymentStatus,
  type VehicleStatus,
  type InstallationStatus,
  type PaymentStatus
} from "@omsms/shared"

// Legacy type for backward compatibility
export type LegacyVehicleStatus = "pending" | "in-progress" | "quality-check" | "delivered" | "cancelled"

// Icon mapping for different status types
const statusIcons: Record<string, LucideIcon> = {
  pending: Clock,
  in_progress: Settings,
  quality_check: AlertTriangle,
  delivered: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  failed: XCircle,
  partial: Package,
  paid: CreditCard,
  overdue: AlertTriangle
}

export interface StatusDisplayConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  textColor: string
  description: string
}

/**
 * Get display configuration for vehicle status
 */
export function getVehicleStatusDisplay(status: string): StatusDisplayConfig {
  const normalizedStatus = normalizeVehicleStatus(status)
  const config = getVehicleStatusConfig(normalizedStatus)
  
  return {
    label: config.label,
    icon: statusIcons[normalizedStatus] || Clock,
    color: `omsms-status-${config.color}`,
    bgColor: config.bgColor,
    textColor: config.textColor,
    description: config.description
  }
}

/**
 * Get display configuration for installation status
 */
export function getInstallationStatusDisplay(status: string): StatusDisplayConfig {
  const normalizedStatus = normalizeInstallationStatus(status)
  const config = getInstallationStatusConfig(normalizedStatus)
  
  return {
    label: config.label,
    icon: statusIcons[normalizedStatus] || Clock,
    color: `omsms-status-${config.color}`,
    bgColor: config.bgColor,
    textColor: config.textColor,
    description: config.description
  }
}

/**
 * Get display configuration for payment status
 */
export function getPaymentStatusDisplay(status: string): StatusDisplayConfig {
  const normalizedStatus = normalizePaymentStatus(status)
  const config = getPaymentStatusConfig(normalizedStatus)
  
  return {
    label: config.label,
    icon: statusIcons[normalizedStatus] || Clock,
    color: `omsms-status-${config.color}`,
    bgColor: config.bgColor,
    textColor: config.textColor,
    description: config.description
  }
}

/**
 * Legacy function for backward compatibility
 */
export function getStatusConfig(status: LegacyVehicleStatus | string) {
  return getVehicleStatusDisplay(status)
}

/**
 * Get status badge classes for Tailwind CSS
 */
export function getStatusBadgeClasses(status: string, type: 'vehicle' | 'installation' | 'payment' = 'vehicle'): string {
  let config: StatusDisplayConfig
  
  switch (type) {
    case 'installation':
      config = getInstallationStatusDisplay(status)
      break
    case 'payment':
      config = getPaymentStatusDisplay(status)
      break
    default:
      config = getVehicleStatusDisplay(status)
  }
  
  return `${config.bgColor} ${config.textColor}`
}

/**
 * Format status for display
 */
export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Export types for compatibility
export type { VehicleStatus, InstallationStatus, PaymentStatus }