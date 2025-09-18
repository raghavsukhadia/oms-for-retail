/**
 * Status Service
 * 
 * Centralized service for calculating and managing vehicle, installation, 
 * and payment statuses across the application.
 */

import { 
  VehicleData,
  calculateInstallationStatus,
  calculatePaymentStatus,
  normalizeVehicleStatus,
  normalizeInstallationStatus,
  normalizePaymentStatus,
  VEHICLE_STATUSES,
  INSTALLATION_STATUSES,
  PAYMENT_STATUSES,
  type VehicleStatus,
  type InstallationStatus,
  type PaymentStatus
} from '@omsms/shared';
import { getTenantDb } from '../lib/database.js';

export interface VehicleStatusData {
  vehicleId: string;
  vehicleStatus: VehicleStatus;
  installationStatus: InstallationStatus;
  paymentStatus: PaymentStatus;
  lastUpdated: Date;
}

export interface EnhancedVehicleData extends VehicleData {
  // Calculated statuses
  calculatedInstallationStatus: InstallationStatus;
  calculatedPaymentStatus: PaymentStatus;
  
  // Additional metadata
  statusLastUpdated: Date;
  hasActiveWorkflows: boolean;
  workflowProgress: {
    installation: number; // 0-100
    payment: number; // 0-100
  };
}

export class StatusService {
  /**
   * Get enhanced vehicle data with calculated statuses
   */
  static async getVehicleWithStatuses(
    tenantId: string, 
    vehicleId: string
  ): Promise<EnhancedVehicleData | null> {
    const tenantDb = await getTenantDb(tenantId);
    
    const vehicle = await tenantDb.vehicle.findUnique({
      where: { vehicleId },
      include: {
        installations: {
          include: {
            product: {
              select: {
                price: true
              }
            }
          }
        },
        location: {
          select: {
            locationName: true
          }
        }
      }
    });

    if (!vehicle) {
      return null;
    }

    // Fetch workflow instances
    const workflowInstances = await tenantDb.workflowInstance.findMany({
      where: {
        entityType: 'vehicle',
        entityId: vehicleId
      },
      include: {
        workflow: {
          select: {
            workflowType: true,
            stages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to VehicleData format
    const vehicleData: VehicleData = {
      vehicleId: vehicle.vehicleId,
      status: normalizeVehicleStatus(vehicle.status),
      installations: vehicle.installations.map(inst => ({
        installationId: inst.installationId,
        status: inst.status,
        amount: inst.amount ? Number(inst.amount) : 0,
        createdAt: inst.createdAt
      })),
      workflowInstances: workflowInstances.map(wi => ({
        instanceId: wi.instanceId,
        workflowType: wi.workflow?.workflowType || 'unknown',
        currentStage: wi.currentStage,
        status: wi.status,
        stageHistory: Array.isArray(wi.stageHistory) ? wi.stageHistory : []
      })),
      expectedDeliveryDate: vehicle.expectedDeliveryDate || undefined,
      actualDeliveryDate: vehicle.actualDeliveryDate || undefined,
      totalAmount: vehicle.installations.reduce((sum, inst) => 
        sum + (inst.amount ? Number(inst.amount) : 0), 0
      ),
      totalPaid: 0 // TODO: Calculate from payment records when payment table is added
    };

    // Calculate statuses
    const calculatedInstallationStatus = calculateInstallationStatus(vehicleData);
    const calculatedPaymentStatus = calculatePaymentStatus(vehicleData);

    // Calculate workflow progress
    const installationWorkflow = workflowInstances.find(w => w.workflow?.workflowType === 'installation');
    const paymentWorkflow = workflowInstances.find(w => w.workflow?.workflowType === 'payment');

    const installationProgress = this.calculateWorkflowProgress(installationWorkflow);
    const paymentProgress = this.calculateWorkflowProgress(paymentWorkflow);

    return {
      ...vehicleData,
      calculatedInstallationStatus,
      calculatedPaymentStatus,
      statusLastUpdated: new Date(),
      hasActiveWorkflows: workflowInstances.some(w => w.status === 'in_progress'),
      workflowProgress: {
        installation: installationProgress,
        payment: paymentProgress
      }
    };
  }

  /**
   * Get multiple vehicles with calculated statuses
   */
  static async getVehiclesWithStatuses(
    tenantId: string,
    vehicleIds: string[]
  ): Promise<EnhancedVehicleData[]> {
    const results = await Promise.all(
      vehicleIds.map(id => this.getVehicleWithStatuses(tenantId, id))
    );
    
    return results.filter((vehicle): vehicle is EnhancedVehicleData => vehicle !== null);
  }

  /**
   * Calculate workflow progress percentage
   */
  private static calculateWorkflowProgress(workflowInstance: any): number {
    if (!workflowInstance || !workflowInstance.workflow?.stages) {
      return 0;
    }

    const stages = Array.isArray(workflowInstance.workflow.stages) 
      ? workflowInstance.workflow.stages 
      : [];
    
    if (stages.length === 0) {
      return workflowInstance.status === 'completed' ? 100 : 0;
    }

    // Find current stage index
    const currentStageIndex = stages.findIndex(
      (stage: any) => stage.key === workflowInstance.currentStage
    );

    if (currentStageIndex === -1) {
      return 0;
    }

    if (workflowInstance.status === 'completed') {
      return 100;
    }

    // Calculate progress based on current stage
    return Math.round(((currentStageIndex + 1) / stages.length) * 100);
  }

  /**
   * Update vehicle status and sync related workflows
   */
  static async updateVehicleStatus(
    tenantId: string,
    vehicleId: string,
    newStatus: VehicleStatus,
    userId?: string
  ): Promise<void> {
    const tenantDb = await getTenantDb(tenantId);

    // Update vehicle status
    await tenantDb.vehicle.update({
      where: { vehicleId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // Update related workflow instances if needed
    if (newStatus === VEHICLE_STATUSES.DELIVERED) {
      // Mark installation workflow as completed
      await tenantDb.workflowInstance.updateMany({
        where: {
          entityType: 'vehicle',
          entityId: vehicleId,
          workflow: {
            workflowType: 'installation'
          },
          status: 'in_progress'
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mark payment workflow as completed
      await tenantDb.workflowInstance.updateMany({
        where: {
          entityType: 'vehicle',
          entityId: vehicleId,
          workflow: {
            workflowType: 'payment'
          },
          status: 'in_progress'
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Bulk status calculation for reports
   */
  static async calculateBulkStatuses(
    tenantId: string,
    vehicles: Array<{
      vehicleId: string;
      status: string;
      installations: Array<{
        installationId: string;
        status: string;
        amount?: number;
        createdAt: Date;
      }>;
      expectedDeliveryDate?: Date;
      actualDeliveryDate?: Date;
    }>
  ): Promise<Array<{
    vehicleId: string;
    vehicleStatus: VehicleStatus;
    installationStatus: InstallationStatus;
    paymentStatus: PaymentStatus;
  }>> {
    const tenantDb = await getTenantDb(tenantId);
    
    // Fetch all workflow instances for these vehicles in one query
    const vehicleIds = vehicles.map(v => v.vehicleId);
    const workflowInstances = await tenantDb.workflowInstance.findMany({
      where: {
        entityType: 'vehicle',
        entityId: { in: vehicleIds }
      },
      include: {
        workflow: {
          select: {
            workflowType: true
          }
        }
      }
    });

    // Group workflows by vehicle
    const workflowsByVehicle = workflowInstances.reduce((acc, wi) => {
      if (!acc[wi.entityId]) {
        acc[wi.entityId] = [];
      }
      acc[wi.entityId].push({
        instanceId: wi.instanceId,
        workflowType: wi.workflow?.workflowType || 'unknown',
        currentStage: wi.currentStage,
        status: wi.status,
        stageHistory: Array.isArray(wi.stageHistory) ? wi.stageHistory : []
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate statuses for each vehicle
    return vehicles.map(vehicle => {
      const vehicleData: VehicleData = {
        vehicleId: vehicle.vehicleId,
        status: normalizeVehicleStatus(vehicle.status),
        installations: vehicle.installations,
        workflowInstances: workflowsByVehicle[vehicle.vehicleId] || [],
        expectedDeliveryDate: vehicle.expectedDeliveryDate,
        actualDeliveryDate: vehicle.actualDeliveryDate,
        totalAmount: vehicle.installations.reduce((sum, inst) => 
          sum + (inst.amount || 0), 0
        ),
        totalPaid: 0 // TODO: Calculate from payment records
      };

      return {
        vehicleId: vehicle.vehicleId,
        vehicleStatus: vehicleData.status,
        installationStatus: calculateInstallationStatus(vehicleData),
        paymentStatus: calculatePaymentStatus(vehicleData)
      };
    });
  }

  /**
   * Get status summary for dashboard
   */
  static async getStatusSummary(tenantId: string): Promise<{
    vehicles: Record<VehicleStatus, number>;
    installations: Record<InstallationStatus, number>;
    payments: Record<PaymentStatus, number>;
  }> {
    const tenantDb = await getTenantDb(tenantId);

    // Get all vehicles with basic data
    const vehicles = await tenantDb.vehicle.findMany({
      select: {
        vehicleId: true,
        status: true,
        expectedDeliveryDate: true,
        actualDeliveryDate: true,
        installations: {
          select: {
            installationId: true,
            status: true,
            amount: true,
            createdAt: true
          }
        }
      }
    });

    // Transform vehicles data to match expected interface
    const vehiclesForCalculation = vehicles.map(vehicle => ({
      vehicleId: vehicle.vehicleId,
      status: vehicle.status,
      installations: vehicle.installations.map(inst => ({
        installationId: inst.installationId,
        status: inst.status,
        amount: inst.amount ? Number(inst.amount) : 0,
        createdAt: inst.createdAt
      })),
      expectedDeliveryDate: vehicle.expectedDeliveryDate || undefined,
      actualDeliveryDate: vehicle.actualDeliveryDate || undefined
    }));

    // Calculate statuses for all vehicles
    const statusData = await this.calculateBulkStatuses(tenantId, vehiclesForCalculation);

    // Count statuses
    const vehicleCounts = Object.values(VEHICLE_STATUSES).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<VehicleStatus, number>);

    const installationCounts = Object.values(INSTALLATION_STATUSES).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<InstallationStatus, number>);

    const paymentCounts = Object.values(PAYMENT_STATUSES).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    statusData.forEach(data => {
      vehicleCounts[data.vehicleStatus]++;
      installationCounts[data.installationStatus]++;
      paymentCounts[data.paymentStatus]++;
    });

    return {
      vehicles: vehicleCounts,
      installations: installationCounts,
      payments: paymentCounts
    };
  }
}
