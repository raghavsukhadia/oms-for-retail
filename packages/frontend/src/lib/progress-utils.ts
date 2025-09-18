/**
 * Shared progress calculation utilities for consistent progress display across the application
 */

export interface VehicleWorkflowData {
  workflowInstances?: Array<{
    workflowType: string;
    currentStage: string;
    status: string;
  }>;
}

/**
 * Standard workflow stages for each workflow type
 */
export const WORKFLOW_STAGES = {
  installation: ['order_confirmed', 'start_installation', 'quality_checked', 'delivered'],
  payment: ['draft', 'invoice', 'payment']
} as const;

/**
 * Get the current stage for a specific workflow type from vehicle data
 */
export function getWorkflowStage(
  vehicle: VehicleWorkflowData, 
  workflowType: 'installation' | 'payment'
): string {
  const workflow = vehicle.workflowInstances?.find(w => w.workflowType === workflowType);
  return workflow?.currentStage || (workflowType === 'installation' ? 'order_confirmed' : 'draft');
}

/**
 * Calculate progress percentage for a specific workflow type
 */
export function calculateWorkflowProgress(
  currentStage: string,
  workflowType: 'installation' | 'payment'
): number {
  const stages = WORKFLOW_STAGES[workflowType];
  const currentIndex = stages.indexOf(currentStage);
  
  // If stage not found, assume it's at the beginning
  if (currentIndex === -1) {
    return 0;
  }
  
  // Progress is (current stage index + 1) / total stages * 100
  // +1 because if we're at index 0, we've completed 1 out of N stages
  return Math.round(((currentIndex + 1) / stages.length) * 100);
}

/**
 * Calculate overall vehicle progress (average of installation and payment progress)
 */
export function calculateOverallProgress(vehicle: VehicleWorkflowData): number {
  const installationStage = getWorkflowStage(vehicle, 'installation');
  const paymentStage = getWorkflowStage(vehicle, 'payment');
  
  const installationProgress = calculateWorkflowProgress(installationStage, 'installation');
  const paymentProgress = calculateWorkflowProgress(paymentStage, 'payment');
  
  // Return average of both workflows
  return Math.round((installationProgress + paymentProgress) / 2);
}

/**
 * Get detailed progress breakdown
 */
export function getProgressBreakdown(vehicle: VehicleWorkflowData) {
  const installationStage = getWorkflowStage(vehicle, 'installation');
  const paymentStage = getWorkflowStage(vehicle, 'payment');
  
  const installationProgress = calculateWorkflowProgress(installationStage, 'installation');
  const paymentProgress = calculateWorkflowProgress(paymentStage, 'payment');
  const overallProgress = Math.round((installationProgress + paymentProgress) / 2);
  
  return {
    installation: {
      stage: installationStage,
      progress: installationProgress,
      total: WORKFLOW_STAGES.installation.length
    },
    payment: {
      stage: paymentStage,
      progress: paymentProgress,
      total: WORKFLOW_STAGES.payment.length
    },
    overall: {
      progress: overallProgress,
      displayText: `${overallProgress}%`
    }
  };
}

/**
 * Get human-readable stage names
 */
export function getStageDisplayName(stage: string): string {
  const stageNames: { [key: string]: string } = {
    // Installation stages
    order_confirmed: 'Order Confirmed',
    start_installation: 'Start Installation', 
    quality_checked: 'Quality Checked',
    delivered: 'Delivered',
    
    // Payment stages
    draft: 'Draft',
    invoice: 'Invoice',
    payment: 'Payment'
  };
  
  return stageNames[stage] || stage;
}

/**
 * Get stage colors for UI consistency
 */
export function getStageColor(stage: string): string {
  const stageColors: { [key: string]: string } = {
    // Installation stages
    order_confirmed: 'bg-blue-500',
    start_installation: 'bg-orange-500',
    quality_checked: 'bg-purple-500',
    delivered: 'bg-green-500',
    
    // Payment stages
    draft: 'bg-gray-400',
    invoice: 'bg-blue-400',
    payment: 'bg-green-400'
  };
  
  return stageColors[stage] || 'bg-gray-500';
}

/**
 * Format salesperson name for display
 */
export function formatSalespersonName(salesperson?: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (!salesperson) return 'Not assigned';
  
  const { firstName, lastName, email } = salesperson;
  
  // If we have both first and last name, use them
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  // If we only have first name, use it
  if (firstName) {
    return firstName;
  }
  
  // If we only have last name, use it
  if (lastName) {
    return lastName;
  }
  
  // Fallback to email username (before @)
  const emailUsername = email.split('@')[0];
  return emailUsername;
}
