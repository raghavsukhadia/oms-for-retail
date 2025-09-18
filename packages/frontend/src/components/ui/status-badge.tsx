/**
 * Centralized Status Badge Component
 * 
 * Provides consistent status display across the application using
 * the centralized status management system.
 */

import React from 'react';
import { Badge } from './badge';
import { 
  getVehicleStatusDisplay, 
  getInstallationStatusDisplay, 
  getPaymentStatusDisplay,
  type StatusDisplayConfig
} from '@/lib/status-utils';

export interface StatusBadgeProps {
  status: string;
  type?: 'vehicle' | 'installation' | 'payment';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  type = 'vehicle', 
  variant = 'secondary',
  size = 'default',
  showIcon = false,
  className = ''
}: StatusBadgeProps) {
  let config: StatusDisplayConfig;
  
  switch (type) {
    case 'installation':
      config = getInstallationStatusDisplay(status);
      break;
    case 'payment':
      config = getPaymentStatusDisplay(status);
      break;
    default:
      config = getVehicleStatusDisplay(status);
  }

  const Icon = config.icon;
  const badgeClasses = `${config.bgColor} ${config.textColor} ${className}`;

  return (
    <Badge 
      variant={variant} 
      className={badgeClasses}
      title={config.description}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

// Specific status badge components for convenience
export function VehicleStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="vehicle" {...props} />;
}

export function InstallationStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="installation" {...props} />;
}

export function PaymentStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="payment" {...props} />;
}

// Status indicator component (just the colored dot)
export interface StatusIndicatorProps {
  status: string;
  type?: 'vehicle' | 'installation' | 'payment';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StatusIndicator({ 
  status, 
  type = 'vehicle', 
  size = 'default',
  className = ''
}: StatusIndicatorProps) {
  let config: StatusDisplayConfig;
  
  switch (type) {
    case 'installation':
      config = getInstallationStatusDisplay(status);
      break;
    case 'payment':
      config = getPaymentStatusDisplay(status);
      break;
    default:
      config = getVehicleStatusDisplay(status);
  }

  const sizeClasses = {
    sm: 'h-2 w-2',
    default: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <div 
      className={`rounded-full ${config.bgColor.replace('bg-', 'bg-').replace('-100', '-500')} ${sizeClasses[size]} ${className}`}
      title={`${config.label}: ${config.description}`}
    />
  );
}

// Status text component (just the label)
export interface StatusTextProps {
  status: string;
  type?: 'vehicle' | 'installation' | 'payment';
  className?: string;
}

export function StatusText({ 
  status, 
  type = 'vehicle', 
  className = ''
}: StatusTextProps) {
  let config: StatusDisplayConfig;
  
  switch (type) {
    case 'installation':
      config = getInstallationStatusDisplay(status);
      break;
    case 'payment':
      config = getPaymentStatusDisplay(status);
      break;
    default:
      config = getVehicleStatusDisplay(status);
  }

  return (
    <span 
      className={`${config.textColor} font-medium ${className}`}
      title={config.description}
    >
      {config.label}
    </span>
  );
}