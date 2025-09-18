"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { vehicleApi, type VehicleWithRelations } from "@/lib/api/vehicles";
import { paymentApi } from "@/lib/api/payments";
import { calculateOverallProgress, getProgressBreakdown, formatSalespersonName } from "@/lib/progress-utils";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { formatPriceWithFallback, getTotalValueDisplay } from "@/lib/utils/pricing";
import { getDepartmentRowStyling, getDepartmentBadgeStyling } from "@/lib/utils/department-colors";
import { useDepartmentColors } from "@/lib/hooks/useDepartmentColors";
import { PaymentDetailsForm, PaymentDetails } from "./payment-details-form";
import { useAuthStore } from "@/store/authStore";

// Use the VehicleWithRelations type from the API
type Vehicle = VehicleWithRelations & {
  workflowInstances?: Array<{
    workflowType: string;
    currentStage: string;
    status: string;
  }>;
};

interface WorkflowStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowType: 'installation' | 'payment';
  productName?: string;
  currentStages: { [key: string]: boolean };
  onStagesUpdate: (stages: { [key: string]: boolean }, paymentDetails?: PaymentDetails) => Promise<void>;
}

// Individual product workflow stages (simplified to Pending/Done)
const productWorkflowStages = {
  installation: [
    { key: 'completed', label: 'Done' }
  ],
  payment: [
    { key: 'completed', label: 'Done' }
  ]
};

// Overall vehicle workflow stages (for Update Installation/Payment buttons)
const vehicleWorkflowStages = {
  installation: [
    { key: 'order_confirmed', label: 'Order Confirmed' },
    { key: 'start_installation', label: 'Start Installation' },
    { key: 'quality_checked', label: 'Quality Checked' },
    { key: 'delivered', label: 'Delivered' }
  ],
  payment: [
    { key: 'draft', label: 'Draft' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'payment', label: 'Payment' }
  ]
};

function WorkflowStageDialog({
  open,
  onOpenChange,
  workflowType,
  productName,
  currentStages,
  onStagesUpdate
}: WorkflowStageDialogProps) {
  const [stages, setStages] = useState<{ [key: string]: boolean }>(currentStages);
  const [saving, setSaving] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});
  const [isPaymentDetailsValid, setIsPaymentDetailsValid] = useState(true);

  // Determine which workflow stages to use based on whether this is for a product or vehicle
  const workflowStages = productName ? productWorkflowStages : vehicleWorkflowStages;

  useEffect(() => {
    setStages(currentStages);
    setPaymentDetails({});
    setIsPaymentDetailsValid(true);
  }, [currentStages, open]);

  const handleStageChange = (stageKey: string, checked: boolean) => {
    if (productName) {
      // For individual products, it's a simple toggle (Pending/Done)
      const newStages = { completed: checked };
      setStages(newStages);
    } else {
      // For overall vehicle workflow, implement progressive stage selection
      const currentWorkflowStages = workflowStages[workflowType];
      const stageIndex = currentWorkflowStages.findIndex(stage => stage.key === stageKey);
      
      setStages(prev => {
        const newStages = { ...prev };
        
        if (checked) {
          // When checking a stage, also check all previous stages
          for (let i = 0; i <= stageIndex; i++) {
            newStages[currentWorkflowStages[i].key] = true;
          }
        } else {
          // When unchecking a stage, also uncheck all subsequent stages
          for (let i = stageIndex; i < currentWorkflowStages.length; i++) {
            newStages[currentWorkflowStages[i].key] = false;
          }
        }
        
        return newStages;
      });
    }
  };

  const handleSave = async () => {
    // Check if payment details are required and valid
    if (workflowType === 'payment' && !productName && !isPaymentDetailsValid) {
      toast.error('Please fill in all required payment details');
      return;
    }
    
    setSaving(true);
    try {
      await onStagesUpdate(stages, workflowType === 'payment' && !productName ? paymentDetails : undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setStages(currentStages);
    setPaymentDetails({});
    onOpenChange(false);
  };

  // Helper functions to determine current and target stages for payment details
  const getCurrentStage = () => {
    if (productName) return 'completed'; // Product workflows are simple
    
    const stageOrder = ['draft', 'invoice', 'payment'];
    for (let i = stageOrder.length - 1; i >= 0; i--) {
      if (currentStages[stageOrder[i]]) {
        return stageOrder[i];
      }
    }
    return 'draft';
  };

  const getTargetStage = () => {
    if (productName) return 'completed'; // Product workflows are simple
    
    const stageOrder = ['draft', 'invoice', 'payment'];
    for (let i = stageOrder.length - 1; i >= 0; i--) {
      if (stages[stageOrder[i]]) {
        return stageOrder[i];
      }
    }
    return 'draft';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {productName 
              ? `${productName} - ${workflowType === 'installation' ? 'Installation' : 'Payment'} Status`
              : `Overall ${workflowType === 'installation' ? 'Installation' : 'Payment'} Progress`
            }
          </DialogTitle>
          <DialogDescription>
            {productName 
              ? `Mark this product as completed or pending for ${workflowType}.`
              : `Update the overall vehicle ${workflowType} workflow stages.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {productName ? (
            // Simple toggle for individual products
            <div className="flex items-center space-x-3">
              <Checkbox
                id="completed"
                checked={stages.completed || false}
                onCheckedChange={(checked) => handleStageChange('completed', !!checked)}
              />
              <label 
                htmlFor="completed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mark as Done
              </label>
            </div>
          ) : (
            // Multiple stages for overall vehicle workflow
            workflowStages[workflowType].map((stage) => (
              <div key={stage.key} className="flex items-center space-x-3">
                <Checkbox
                  id={stage.key}
                  checked={stages[stage.key] || false}
                  onCheckedChange={(checked) => handleStageChange(stage.key, !!checked)}
                />
                <label 
                  htmlFor={stage.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {stage.label}
                </label>
              </div>
            ))
          )}
        </div>

        {/* Payment Details Form - Only show for payment workflow on vehicle (not products) */}
        {workflowType === 'payment' && !productName && (
          <PaymentDetailsForm
            currentStage={getCurrentStage()}
            targetStage={getTargetStage()}
            existingDetails={paymentDetails}
            onDetailsChange={setPaymentDetails}
            onValidationChange={setIsPaymentDetailsValid}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact Vehicle Workflow Card Component
interface VehicleWorkflowCardProps {
  vehicle: Vehicle;
  onRefresh: () => void;
}

function VehicleWorkflowCard({ vehicle, onRefresh }: VehicleWorkflowCardProps) {
  const { user } = useAuthStore();
  

  const [workflowDialog, setWorkflowDialog] = useState<{
    open: boolean;
    type: 'installation' | 'payment';
    productName?: string;
    currentStages: { [key: string]: boolean };
  }>({
    open: false,
    type: 'installation',
    currentStages: {}
  });

  // Initialize workflow states for products - simplified to just overall status
  const [productWorkflows, setProductWorkflows] = useState<{
    [productName: string]: {
      completed: boolean;
    };
  }>({});

  const loadProductWorkflows = async (products: any[]) => {
    try {
      const initialWorkflows: typeof productWorkflows = {};
      
      // For each product, initialize with simple completed status
      for (const product of products) {
        initialWorkflows[product.productName] = {
          completed: false
        };

        // Try to fetch existing workflow instances for this product
        try {
          let isCompleted = false;

          const installationResponse = await vehicleApi.getProductWorkflowStage(
            vehicle.vehicleId,
            product.productName,
            'installation'
          );
          if (installationResponse.success && installationResponse.data?.stageData?.stages) {
            const stages = installationResponse.data.stageData.stages;
            if (stages.completed || stages.delivered) {
              isCompleted = true;
            }
          }

          // If installation isn't completed, check payment
          if (!isCompleted) {
            const paymentResponse = await vehicleApi.getProductWorkflowStage(
              vehicle.vehicleId,
              product.productName,
              'payment'
            );
            if (paymentResponse.success && paymentResponse.data?.stageData?.stages) {
              const stages = paymentResponse.data.stageData.stages;
              if (stages.completed || stages.payment) {
                isCompleted = true;
              }
            }
          }

          initialWorkflows[product.productName].completed = isCompleted;
        } catch (error) {
          console.error(`Error fetching workflow data for ${product.productName}:`, error);
        }
      }
      
      setProductWorkflows(initialWorkflows);
    } catch (error) {
      console.error('Error loading product workflows:', error);
    }
  };

  useEffect(() => {
    const products = (vehicle.vehicleDetails as any)?.products || [];
    if (products.length > 0) {
      loadProductWorkflows(products);
    }
  }, [vehicle]);

  const getWorkflowStatus = (productName: string) => {
    const workflow = productWorkflows[productName];
    if (!workflow) return 'pending';
    return workflow.completed ? 'completed' : 'pending';
  };

  // Get overall vehicle workflow status
  const getVehicleWorkflowStage = (workflowType: 'installation' | 'payment'): string => {
    const workflow = vehicle?.workflowInstances?.find(w => w.workflowType === workflowType);
    return workflow?.currentStage || (workflowType === 'installation' ? 'order_confirmed' : 'draft');
  };

  const getVehicleStageLabel = (stage: string): string => {
    const stageLabels = {
      order_confirmed: 'Order Confirmed',
      start_installation: 'Start Installation',
      quality_checked: 'Quality Checked',
      delivered: 'Delivered',
      draft: 'Draft',
      invoice: 'Invoice',
      payment: 'Payment'
    };
    return stageLabels[stage as keyof typeof stageLabels] || stage;
  };

  const getVehicleStageColor = (stage: string): string => {
    const stageColors = {
      order_confirmed: 'bg-blue-500',
      start_installation: 'bg-orange-500',
      quality_checked: 'bg-purple-500',
      delivered: 'bg-green-500',
      draft: 'bg-gray-400',
      invoice: 'bg-blue-400',
      payment: 'bg-green-400'
    };
    return stageColors[stage as keyof typeof stageColors] || 'bg-gray-500';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Done';
      case 'pending':
        return 'Pending';
      default:
        return 'Pending';
    }
  };

  const openWorkflowDialog = (type: 'installation' | 'payment', productName?: string) => {
    let currentStages = {};
    
    if (productName) {
      // For product workflows, get simple completed status
      const productWorkflow = productWorkflows[productName];
      currentStages = { completed: productWorkflow?.completed || false };
    } else {
      // For vehicle workflows, get from vehicle workflow instances
      const workflow = vehicle?.workflowInstances?.find(w => w.workflowType === type);
      
      if (workflow) {
        // Convert current stage to stages object for the dialog
        const stage = workflow.currentStage;
        
        if (type === 'installation') {
          currentStages = {
            order_confirmed: stage === 'order_confirmed' || stage === 'start_installation' || stage === 'quality_checked' || stage === 'delivered',
            start_installation: stage === 'start_installation' || stage === 'quality_checked' || stage === 'delivered',
            quality_checked: stage === 'quality_checked' || stage === 'delivered',
            delivered: stage === 'delivered'
          };
        } else {
          currentStages = {
            draft: stage === 'draft' || stage === 'invoice' || stage === 'payment',
            invoice: stage === 'invoice' || stage === 'payment',
            payment: stage === 'payment'
          };
        }
      }
    }

    setWorkflowDialog({
      open: true,
      type,
      productName,
      currentStages
    });
  };

  // Helper function to determine current stage from stages object
  const determineCurrentStageFromStages = (stages: { [key: string]: boolean }, isProductWorkflow: boolean = false): string => {
    if (isProductWorkflow) {
      return stages.completed ? 'completed' : 'pending';
    }
    
    const stageOrder = [
      'order_confirmed', 'start_installation', 'quality_checked', 'delivered',
      'draft', 'invoice', 'payment'
    ];
    
    for (let i = stageOrder.length - 1; i >= 0; i--) {
      if (stages[stageOrder[i]]) {
        return stageOrder[i];
      }
    }
    
    return 'order_confirmed';
  };

  const handleWorkflowUpdate = async (stages: { [key: string]: boolean }, paymentDetails?: PaymentDetails, productName?: string) => {
    try {
      if (productName) {
        // For simplified product workflow, update both installation and payment to match overall status
        const isCompleted = stages.completed;
        const workflowStages = { completed: isCompleted };
        
        // Update both workflows
        const [installationResponse, paymentResponse] = await Promise.all([
          vehicleApi.updateProductWorkflowStage(
            vehicle.vehicleId,
            productName,
            'installation',
            {
              stages: workflowStages,
              notes: `Updated product status to ${isCompleted ? 'completed' : 'pending'} for ${productName}`
            }
          ),
          vehicleApi.updateProductWorkflowStage(
            vehicle.vehicleId,
            productName,
            'payment',
            {
              stages: workflowStages,
              notes: `Updated product status to ${isCompleted ? 'completed' : 'pending'} for ${productName}`
            }
          )
        ]);

        if (!installationResponse.success || !paymentResponse.success) {
          throw new Error('Failed to update product workflow');
        }
      } else {
        // Handle global vehicle workflow update
        const targetStage = determineCurrentStageFromStages(stages, false);
        
        // Update vehicle workflow
        const response = await vehicleApi.updateVehicleWorkflowStage(
          vehicle.vehicleId,
          workflowDialog.type,
          {
            stage: targetStage,
            notes: `Updated ${workflowDialog.type} workflow`,
            paymentDetails: paymentDetails
          }
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to update workflow');
        }

        // If payment details are provided and this is a payment workflow update, create/update payment record
        if (paymentDetails && workflowDialog.type === 'payment') {
          try {
            // First check if payment already exists for this vehicle
            const existingPayments = await paymentApi.getVehiclePayments(vehicle.vehicleId);
            console.log(`Found ${existingPayments.length} existing payment records for vehicle ${vehicle.vehicleId}`);
            
            // Get existing payment data to preserve values when only partial updates are made
            const existingPayment = existingPayments.length > 0 ? existingPayments.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0] : null;
            
            const currentAmount = existingPayment ? Number(existingPayment.amount) : 0;
            const currentPaidAmount = existingPayment ? Number(existingPayment.paidAmount) : 0;

            console.log('DEBUGGING - Existing payment data:', {
              hasExistingPayment: !!existingPayment,
              existingPaymentId: existingPayment?.paymentId,
              currentAmount,
              currentPaidAmount,
              existingPaymentRaw: existingPayment ? {
                amount: existingPayment.amount,
                paidAmount: existingPayment.paidAmount,
                status: existingPayment.status
              } : null
            });
            
            console.log('DEBUGGING - PaymentDetails received:', {
              paymentDetails,
              hasInvoiceAmount: paymentDetails.invoiceAmount !== undefined,
              hasAmountReceived: paymentDetails.amountReceived !== undefined,
              hasDirectAmount: paymentDetails.amount !== undefined,
              hasDirectPaidAmount: paymentDetails.paidAmount !== undefined
            });

            // Map PaymentDetails to the expected format - preserve existing values when updating partial fields
            const amount = paymentDetails.invoiceAmount !== undefined ? paymentDetails.invoiceAmount : 
                          paymentDetails.amount !== undefined ? paymentDetails.amount : 
                          currentAmount;
            const paidAmount = paymentDetails.amountReceived !== undefined ? paymentDetails.amountReceived : 
                              paymentDetails.paidAmount !== undefined ? paymentDetails.paidAmount : 
                              currentPaidAmount;
            
            console.log('Payment data being sent:', {
              amount,
              paidAmount,
              existingAmount: currentAmount,
              existingPaidAmount: currentPaidAmount,
              invoiceAmount: paymentDetails.invoiceAmount,
              amountReceived: paymentDetails.amountReceived,
              directAmount: paymentDetails.amount,
              directPaidAmount: paymentDetails.paidAmount
            });
            
            const paymentData = {
              amount: amount,
              paidAmount: paidAmount,
              paymentMethod: paymentDetails.paymentMethod || existingPayment?.paymentMethod || '',
              transactionId: paymentDetails.transactionId || existingPayment?.transactionId || '',
              referenceNumber: paymentDetails.referenceNumber || existingPayment?.referenceNumber || '',
              bankDetails: paymentDetails.bankDetails || existingPayment?.bankDetails || '',
              paymentDate: paymentDetails.paymentDate || existingPayment?.paymentDate || null,
              notes: paymentDetails.remarks || paymentDetails.notes || existingPayment?.notes || '',
              workflowStage: targetStage,
              invoiceNumber: paymentDetails.invoiceNumber || existingPayment?.invoiceNumber || '',
              dueDate: paymentDetails.paymentDate || existingPayment?.dueDate || null
            };
            
            if (existingPayments.length > 0) {
              // Update the most recent payment record for this vehicle
              const mostRecentPayment = existingPayments.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              
              console.log(`Updating existing payment record ${mostRecentPayment.paymentId} for vehicle ${vehicle.vehicleId}`);
              await paymentApi.updatePayment(mostRecentPayment.paymentId, paymentData);
            } else {
              // Create new payment record
              console.log(`Creating new payment record for vehicle ${vehicle.vehicleId}`);
              await paymentApi.createPayment({
                vehicleId: vehicle.vehicleId,
                ...paymentData
              });
            }
            
            console.log('Payment record updated successfully');
          } catch (paymentError) {
            console.error('Failed to update payment record:', paymentError);
            // Don't throw here - workflow update succeeded, payment update is secondary
            toast.error("Workflow updated but failed to update payment record");
          }
        }
      }

      toast.success("Workflow updated successfully");
      onRefresh(); // Refresh the parent grid
      
    } catch (error) {
      console.error('Workflow update failed:', error);
      toast.error("Failed to update workflow");
      throw error;
    }
  };

  const toggleProductStatus = async (productName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    console.log(`Toggling ${productName} from ${currentStatus} to ${newStatus}`);

    // Optimistic update: Update local state immediately for instant UI feedback
    setProductWorkflows(prev => ({
      ...prev,
      [productName]: {
        completed: newStatus === 'completed'
      }
    }));

    // Show immediate feedback
    toast.success(`${productName} marked as ${newStatus}`);

    try {
      // Update both installation and payment workflows for the product
      const workflowStages = { completed: newStatus === 'completed' };

      const [installationResponse, paymentResponse] = await Promise.all([
        vehicleApi.updateProductWorkflowStage(
          vehicle.vehicleId,
          productName,
          'installation',
          {
            stages: workflowStages,
            notes: `Updated product status to ${newStatus} for ${productName}`
          }
        ),
        vehicleApi.updateProductWorkflowStage(
          vehicle.vehicleId,
          productName,
          'payment',
          {
            stages: workflowStages,
            notes: `Updated product status to ${newStatus} for ${productName}`
          }
        )
      ]);

      if (!installationResponse.success || !paymentResponse.success) {
        throw new Error('Failed to update product workflow');
      }

      // Success - no need to refresh entire dashboard, optimistic update was correct
      console.log(`Successfully updated ${productName} to ${newStatus}`);
      
    } catch (error) {
      console.error('Error toggling product status:', error);
      
      // Rollback optimistic update on error
      setProductWorkflows(prev => ({
        ...prev,
        [productName]: {
          completed: currentStatus === 'completed'
        }
      }));
      
      toast.error("Failed to update product status - reverted changes");
    }
  };

  const onStagesUpdate = async (stages: { [key: string]: boolean }, paymentDetails?: PaymentDetails) => {
    return handleWorkflowUpdate(stages, paymentDetails, workflowDialog.productName);
  };

  const products = (vehicle.vehicleDetails as any)?.products || [];

  return (
    <>
      <Card className="bg-slate-700 text-white">
        <CardContent className="p-4 space-y-3">
          {/* Vehicle Header Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Inward Date:</span>
              <span>{vehicle.inwardDate ? new Date(vehicle.inwardDate).toLocaleDateString() : 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Owner:</span>
              <span>{vehicle.ownerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Model:</span>
              <span>{vehicle.modelName || vehicle.brandName || 'Audi'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Car Number:</span>
              <span className="font-semibold">{vehicle.carNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Location:</span>
              <span>{vehicle.location?.locationName || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Vehicle Type:</span>
              <span>{vehicle.vehicleType || 'Retail'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Overall Progress:</span>
              <span className="font-semibold text-blue-300">{calculateOverallProgress(vehicle)}%</span>
            </div>
          </div>

          {/* Salesperson - Always show even if not assigned */}
          <div className="bg-yellow-500 text-black px-2 py-1 rounded text-center text-sm font-medium">
            Sales Person: {formatSalespersonName(vehicle.salesperson)}
          </div>

          <div className="flex justify-between text-sm">
            <span>Expected Date:</span>
            <span>{vehicle.expectedDeliveryDate ? new Date(vehicle.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</span>
          </div>

          {/* Status Indicators */}
          <div className="flex gap-2 justify-center">
            <Badge className={`${getVehicleStageColor(getVehicleWorkflowStage('installation'))} text-white px-2 py-1 text-xs`}>
              {getVehicleStageLabel(getVehicleWorkflowStage('installation'))}
            </Badge>
            <Badge className={`${getVehicleStageColor(getVehicleWorkflowStage('payment'))} text-white px-2 py-1 text-xs`}>
              {getVehicleStageLabel(getVehicleWorkflowStage('payment'))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {products.length > 0 && (
        <Card>
          <CardContent className="p-3">
            {/* Total Price Header - Hidden for installers */}
            {user?.role !== 'installer' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                <div className="text-xs font-medium text-green-800 text-center">
                  {getTotalValueDisplay(products)}
                </div>
              </div>
            )}
            <div className={`grid gap-2 mb-2 ${user?.role === 'installer' ? 'grid-cols-10' : 'grid-cols-12'}`}>
              <div className="col-span-3 bg-green-500 text-white text-center py-1 text-xs font-medium rounded">
                Product
              </div>
              <div className="col-span-2 bg-red-500 text-white text-center py-1 text-xs font-medium rounded">
                Brand
              </div>
              {user?.role !== 'installer' && (
                <div className="col-span-2 bg-blue-500 text-white text-center py-1 text-xs font-medium rounded">
                  Price
                </div>
              )}
              <div className="col-span-2 bg-purple-500 text-white text-center py-1 text-xs font-medium rounded">
                Department
              </div>
              <div className="col-span-3 bg-yellow-600 text-white text-center py-1 text-xs font-medium rounded">
                Status
              </div>
            </div>
            
            {products.map((product: any, index: number) => {
              const status = getWorkflowStatus(product.productName);
              // console.log('Product:', product.productName, 'Department:', product.departmentName);
              return (
                <div 
                  key={index} 
                  className={`grid gap-2 mb-2 items-center p-2 rounded ${user?.role === 'installer' ? 'grid-cols-10' : 'grid-cols-12'}`}
                  style={{
                    ...getDepartmentRowStyling(product.departmentName),
                    // Force visible styling for testing
                    minHeight: '40px',
                  }}
                >
                  <div className="col-span-3 text-xs truncate" title={product.productName}>
                    {product.productName}
                  </div>
                  <div className="col-span-2 text-xs truncate" title={product.brandName}>
                    {product.brandName}
                  </div>
                  {user?.role !== 'installer' && (
                    <div className="col-span-2 text-xs font-medium text-green-600">
                      {formatPriceWithFallback(product.price)}
                      {product.quantity > 1 && <div className="text-gray-500 text-xs">(Qty: {product.quantity})</div>}
                    </div>
                  )}
                  <div className="col-span-2 text-xs">
                    {product.departmentName ? (
                      <Badge 
                        className="text-xs px-1 py-0 truncate"
                        style={getDepartmentBadgeStyling(product.departmentName)}
                        title={product.departmentName}
                      >
                        {product.departmentName}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">No Dept</span>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center justify-center">
                    <Button
                      size="sm"
                      variant={status === 'completed' ? "default" : "outline"}
                      onClick={() => toggleProductStatus(product.productName, status)}
                      className={`text-xs px-2 py-1 h-6 w-8 ${
                        status === 'completed' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'border-orange-500 text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {status === 'completed' ? '✓' : '⏳'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Update Buttons */}
      <div className="flex gap-2 justify-center">
        <Button 
          onClick={() => openWorkflowDialog('installation')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
          size="sm"
        >
          Update Installation
        </Button>
        <Button 
          onClick={() => openWorkflowDialog('payment')}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
          size="sm"
        >
          Update Payment
        </Button>
      </div>

      {/* Workflow Dialog */}
      <WorkflowStageDialog
        open={workflowDialog.open}
        onOpenChange={(open) => setWorkflowDialog(prev => ({ ...prev, open }))}
        workflowType={workflowDialog.type}
        productName={workflowDialog.productName}
        currentStages={workflowDialog.currentStages}
        onStagesUpdate={onStagesUpdate}
      />
    </>
  );
}

export function VehicleWorkflowGrid() {
  // Load department colors at the grid level to ensure they're available for all cards
  const { loading: departmentLoading, error: departmentError } = useDepartmentColors();
  
  // Use shared vehicle data hook for consistency
  // Disabled auto-refresh to prevent unnecessary API calls during user interactions
  const { vehicles, loading, error, refreshVehicles } = useVehicles({ 
    includeWorkflows: true,
    autoRefresh: false, // Disabled for better performance
    refreshInterval: 60000 // Reduced frequency when needed
  });

  // console.log('Department loading status:', departmentLoading, 'error:', departmentError);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vehicles</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshVehicles} variant="outline">
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No vehicles found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={refreshVehicles}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          🔄 Refresh Data
        </Button>
      </div>
      
      {/* Vehicle Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <div key={vehicle.vehicleId} className="space-y-3">
            <VehicleWorkflowCard vehicle={vehicle} onRefresh={refreshVehicles} />
          </div>
        ))}
      </div>
    </div>
  );
}