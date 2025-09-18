"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, Package, CreditCard, User, Calendar, MapPin, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { vehicleApi } from "@/lib/api/vehicles";
import { formatPriceWithFallback, getProductPriceDisplay, getTotalValueDisplay } from "@/lib/utils/pricing";
import { getDepartmentRowStyling, getDepartmentBadgeStyling } from "@/lib/utils/department-colors";
import { useDepartmentColors } from "@/lib/hooks/useDepartmentColors";
import { PaymentDetailsForm, PaymentDetails } from "./payment-details-form";
import { useAuthStore } from "@/store/authStore";

interface Vehicle {
  vehicleId: string;
  carNumber: string;
  ownerName: string;
  ownerMobile?: string;
  modelName?: string;
  brandName?: string;
  vehicleType?: string;
  inwardDate?: string | Date;
  expectedDeliveryDate?: string | Date;
  status: string;
  vehicleDetails: {
    products?: Array<{
      productName: string;
      brandName: string;
      price: number;
      quantity: number;
      departmentName?: string;
      status?: string;
    }>;
  };
  location?: {
    locationName: string;
  };
  salesperson?: {
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  workflowInstances?: Array<{
    workflowType: string;
    currentStage: string;
    status: string;
    stageHistory?: any[];
  }>;
}

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
    console.log('🔄 [STAGE CHANGE]', {
      stageKey,
      checked,
      isProductWorkflow: !!productName,
      workflowType,
      currentStages: stages
    });

    if (productName) {
      console.log('🎯 [PRODUCT] Simple toggle for product workflow');
      // For individual products, it's a simple toggle (Pending/Done)
      const newStages = { completed: checked };
      console.log('📝 [NEW STAGES]', newStages);
      setStages(newStages);
    } else {
      console.log('🚗 [VEHICLE] Progressive stage selection for vehicle workflow');
      // For overall vehicle workflow, implement progressive stage selection
      const currentWorkflowStages = workflowStages[workflowType];
      const stageIndex = currentWorkflowStages.findIndex(stage => stage.key === stageKey);
      
      console.log('📊 [STAGE INFO]', {
        availableStages: currentWorkflowStages,
        stageIndex,
        stageKey
      });
      
      setStages(prev => {
        const newStages = { ...prev };
        
        if (checked) {
          console.log('✅ [CHECKING] Checking stage and all previous stages');
          // When checking a stage, also check all previous stages
          for (let i = 0; i <= stageIndex; i++) {
            newStages[currentWorkflowStages[i].key] = true;
            console.log(`  ✓ ${currentWorkflowStages[i].key} = true`);
          }
        } else {
          console.log('❌ [UNCHECKING] Unchecking stage and all subsequent stages');
          // When unchecking a stage, also uncheck all subsequent stages
          for (let i = stageIndex; i < currentWorkflowStages.length; i++) {
            newStages[currentWorkflowStages[i].key] = false;
            console.log(`  ✗ ${currentWorkflowStages[i].key} = false`);
          }
        }
        
        console.log('📝 [NEW STAGES]', newStages);
        return newStages;
      });
    }
  };

  const handleSave = async () => {
    console.log('💾 [SAVE] Starting save process with stages:', stages);
    
    // Check if payment details are required and valid
    if (workflowType === 'payment' && !productName && !isPaymentDetailsValid) {
      toast.error('Please fill in all required payment details');
      return;
    }
    
    setSaving(true);
    try {
      await onStagesUpdate(stages, workflowType === 'payment' && !productName ? paymentDetails : undefined);
      console.log('✅ [SAVE SUCCESS] Stages updated successfully');
      onOpenChange(false);
      // Success toast is now handled in the parent component
    } catch (error) {
      console.error('❌ [SAVE ERROR] Error updating workflow:', error);
      // Error handling is done in the parent component
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
      <DialogContent className={`${workflowType === 'payment' && !productName ? 'max-w-2xl' : 'max-w-md'}`}>
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

interface VehicleWorkflowDashboardProps {
  vehicleId: string;
}

export function VehicleWorkflowDashboard({ vehicleId }: VehicleWorkflowDashboardProps) {
  const { user } = useAuthStore();
  // Load department colors to ensure we use actual colors from the system
  const { loading: departmentLoading, error: departmentError } = useDepartmentColors();
  // console.log('Dashboard - Department loading status:', departmentLoading, 'error:', departmentError);
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        // Initialize with simple completed flag
        initialWorkflows[product.productName] = {
            completed: false
        };

        // Try to fetch existing workflow instances for this product
        // Check both installation and payment - if either is completed, mark overall as completed
        try {
          let isCompleted = false;

          const installationResponse = await vehicleApi.getProductWorkflowStage(
            vehicleId,
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
            vehicleId,
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
          // Continue with default values
        }
      }
      
      setProductWorkflows(initialWorkflows);
    } catch (error) {
      console.error('Error loading product workflows:', error);
    }
  };

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      setError(null);
      

      
      const response = await vehicleApi.getVehicleById(vehicleId, 'workflows');
      
      if (response.success && response.data) {
        const responseData = response.data as any; // Cast to any to access workflowInstances
        
        console.log('🚗 [VEHICLE DATA]', {
          vehicleId: responseData.vehicleId,
          workflowInstances: responseData.workflowInstances?.length || 0,
          workflows: responseData.workflowInstances?.map((w: any) => ({
            type: w.workflowType,
            stage: w.currentStage,
            status: w.status
          }))
        });

        // Check if vehicle has workflow instances
        if (!responseData.workflowInstances || responseData.workflowInstances.length === 0) {
          console.log('⚠️ [NO WORKFLOWS] Vehicle has no workflow instances, initializing...');
          toast.info('Initializing workflow instances for this vehicle...');
          
          try {
            const initResponse = await vehicleApi.initializeMissingWorkflows(vehicleId);
            if (initResponse.success) {
              console.log('✅ [WORKFLOWS INITIALIZED] Successfully initialized workflows');
              toast.success('Workflow instances initialized successfully');
              
              // Refetch vehicle data to get the new workflow instances
              const updatedResponse = await vehicleApi.getVehicleById(vehicleId, 'workflows');
              if (updatedResponse.success && updatedResponse.data) {
                setVehicle(updatedResponse.data);
              }
            } else {
              console.error('❌ [INIT FAILED]', initResponse.error);
              toast.error('Failed to initialize workflow instances');
            }
          } catch (initError) {
            console.error('❌ [INIT ERROR]', initError);
            toast.error('Error initializing workflow instances');
          }
        }
        
        // Always update vehicle data regardless of workflow initialization
        console.log('🔄 [VEHICLE UPDATE] Setting updated vehicle data with workflows:', {
          vehicleId: responseData.vehicleId,
          workflowCount: responseData.workflowInstances?.length || 0,
          latestWorkflows: responseData.workflowInstances?.map((w: any) => ({
            type: w.workflowType,
            stage: w.currentStage,
            updated: w.updatedAt
          }))
        });
        
        // Convert dates to strings for consistency and cast to Vehicle type
        const vehicleData: Vehicle = {
          ...responseData,
          inwardDate: responseData.inwardDate instanceof Date 
            ? responseData.inwardDate.toISOString().split('T')[0] 
            : responseData.inwardDate,
          expectedDeliveryDate: responseData.expectedDeliveryDate instanceof Date 
            ? responseData.expectedDeliveryDate.toISOString().split('T')[0] 
            : responseData.expectedDeliveryDate,
          salesperson: responseData.salesperson ? {
            userId: responseData.salesperson.userId,
            firstName: responseData.salesperson.firstName,
            lastName: responseData.salesperson.lastName,
            email: responseData.salesperson.email
          } : undefined
        } as Vehicle;
        
        setVehicle(vehicleData);
        
        // Initialize workflow states for products
        if (responseData.vehicleDetails?.products) {
          await loadProductWorkflows(responseData.vehicleDetails.products);
        }
      } else {
        console.error('Error response:', response);
        setError(`Failed to fetch vehicle: ${response.error || 'Unknown error'}`);
        toast.error(`Failed to fetch vehicle details: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error loading vehicle details:", error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Network error loading vehicle details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
    }
  }, [vehicleId]);

  const getWorkflowStatus = (productName: string) => {
    const workflow = productWorkflows[productName];
    if (!workflow) return 'pending';
    
    // For simplified product workflow, just check if completed
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

  const openWorkflowDialog = (type: 'installation' | 'payment', productName?: string) => {
    console.log('🔓 [OPEN DIALOG] Opening workflow dialog', {
      type,
      productName,
      isProductWorkflow: !!productName
    });

    let currentStages = {};
    
    if (productName) {
      console.log('🎯 [PRODUCT WORKFLOW] Getting product workflow state');
      // For product workflows, get simple completed status
      const productWorkflow = productWorkflows[productName];
      currentStages = { completed: productWorkflow?.completed || false };
      console.log('📊 [PRODUCT STATE]', {
        productName,
        type,
        availableWorkflows: Object.keys(productWorkflows),
        currentStages
      });
    } else {
      console.log('🚗 [VEHICLE WORKFLOW] Getting vehicle workflow state');
      // For vehicle workflows, get from vehicle workflow instances
      const workflow = vehicle?.workflowInstances?.find(w => w.workflowType === type);
      
      console.log('🔍 [WORKFLOW SEARCH]', {
        type,
        availableWorkflows: vehicle?.workflowInstances?.map(w => ({
          workflowType: w.workflowType,
          currentStage: w.currentStage,
          status: w.status
        })),
        foundWorkflow: workflow ? {
          workflowType: workflow.workflowType,
          currentStage: workflow.currentStage,
          status: workflow.status,
          stageHistory: workflow.stageHistory
        } : null
      });

      if (workflow) {
        // Convert current stage to stages object for the dialog
        const stage = workflow.currentStage;
        console.log('📝 [STAGE CONVERSION]', { currentStage: stage, workflowType: type });
        
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

        console.log('🎯 [CONVERTED STAGES]', {
          originalStage: stage,
          convertedStages: currentStages
        });
      } else {
        console.log('⚠️ [NO WORKFLOW] No workflow instance found for type:', type);
      }
    }
    
    console.log('📋 [DIALOG STATE]', {
      open: true,
      type,
      productName,
      currentStages
    });

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
      // For product workflows, just check if completed
      return stages.completed ? 'completed' : 'pending';
    }
    
    // For vehicle workflows, check the complex stage order
    const stageOrder = [
      'order_confirmed', 'start_installation', 'quality_checked', 'delivered',
      'draft', 'invoice', 'payment'
    ];
    
    for (let i = stageOrder.length - 1; i >= 0; i--) {
      if (stages[stageOrder[i]]) {
        return stageOrder[i];
      }
    }
    
    return 'order_confirmed'; // Default to first stage for vehicle workflow
  };

  const handleWorkflowUpdate = useCallback(async (stages: { [key: string]: boolean }, paymentDetails?: PaymentDetails, productName?: string) => {
    console.log('🚀 [FRONTEND] Starting workflow update process');
    console.log('📊 [INPUT DATA]', {
      vehicleId,
      workflowType: workflowDialog.type,
      productName,
      stages,
      isProductWorkflow: !!productName
    });

    try {
      if (productName) {
        console.log('🎯 [PRODUCT WORKFLOW] Updating product-specific workflow');
        
         // For simplified product workflow, update both installation and payment to match overall status
         const isCompleted = stages.completed;
         const workflowStages = { completed: isCompleted };
         
         // Update both installation and payment workflows to keep them in sync
         const installationCall = {
          vehicleId,
          productName,
           workflowType: 'installation',
          payload: {
             stages: workflowStages,
             notes: `Updated product status to ${isCompleted ? 'completed' : 'pending'} for ${productName}`
          }
        };

         const paymentCall = {
          vehicleId,
          productName,
           workflowType: 'payment',
           payload: {
             stages: workflowStages,
             notes: `Updated product status to ${isCompleted ? 'completed' : 'pending'} for ${productName}`
           }
         };

         console.log('📤 [API CALL] Product workflow updates:', { installationCall, paymentCall });

         // Update both workflows
         const [installationResponse, paymentResponse] = await Promise.all([
           vehicleApi.updateProductWorkflowStage(
             vehicleId,
             productName,
             'installation',
             installationCall.payload
           ),
           vehicleApi.updateProductWorkflowStage(
             vehicleId,
             productName,
             'payment',
             paymentCall.payload
           )
         ]);

         console.log('📥 [API RESPONSE] Product workflow responses:', { installationResponse, paymentResponse });

         if (!installationResponse.success || !paymentResponse.success) {
           throw new Error('Failed to update product workflow');
        }
      } else {
        console.log('🚗 [VEHICLE WORKFLOW] Updating global vehicle workflow');
        
        // Handle global vehicle workflow update
        const targetStage = determineCurrentStageFromStages(stages, false); // false = vehicle workflow
        
        console.log('🎯 [STAGE DETERMINATION]', {
          inputStages: stages,
          determinedStage: targetStage,
          stageOrder: ['order_confirmed', 'start_installation', 'quality_checked', 'delivered', 'draft', 'invoice', 'payment']
        });

        const apiCall = {
          vehicleId,
          workflowType: workflowDialog.type,
          payload: {
            stage: targetStage,
            notes: `Updated ${workflowDialog.type} workflow`
          }
        };

        console.log('📤 [API CALL] Vehicle workflow update:', apiCall);
        
        const response = await vehicleApi.updateVehicleWorkflowStage(
          vehicleId,
          workflowDialog.type,
          {
            stage: targetStage,
            notes: `Updated ${workflowDialog.type} workflow`,
            paymentDetails: paymentDetails
          }
        );

        console.log('📥 [API RESPONSE] Vehicle workflow response:', response);

        if (!response.success) {
          console.error('❌ [API ERROR]', response.error);
          throw new Error(response.error || 'Failed to update workflow');
        }
      }

      console.log('✅ [SUCCESS] Workflow update completed successfully');
      toast.success("Workflow updated successfully");
      
      // Refetch the latest data to ensure UI shows actual persisted state
      console.log('🔄 [REFRESH] Refetching vehicle data...');
      await fetchVehicle();
      
    } catch (error) {
      console.error('❌ [ERROR] Workflow update failed:', error);
      console.error('🔍 [ERROR DETAILS]', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      toast.error("Failed to update workflow");
      
      // Revert local state changes if API call failed
      console.log('🔄 [REVERT] Reverting UI state...');
      await fetchVehicle();
      
      // Re-throw the error so the dialog can handle it
      throw error;
    }
  }, [vehicleId, workflowDialog.type, fetchVehicle, determineCurrentStageFromStages]);

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
          vehicleId,
          productName,
          'installation',
          {
            stages: workflowStages,
            notes: `Updated product status to ${newStatus} for ${productName}`
          }
        ),
        vehicleApi.updateProductWorkflowStage(
          vehicleId,
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

      // Success - no need to refresh entire vehicle data, optimistic update was correct
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
        <div className="text-center text-muted-foreground">Loading vehicle details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vehicle</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2 text-sm text-red-500">
                <p><strong>Vehicle ID:</strong> {vehicleId}</p>
                <p><strong>Troubleshooting:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check if the backend server is running</li>
                  <li>Verify you're logged in properly</li>
                  <li>Ensure the vehicle ID exists in the database</li>
                  <li>Check browser console for authentication errors</li>
                </ul>
              </div>
              <Button 
                onClick={fetchVehicle} 
                className="mt-4"
                variant="outline"
              >
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Vehicle not found</p>
            <Button onClick={fetchVehicle} className="mt-4" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = vehicle.vehicleDetails?.products || [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white bg-slate-700 py-2 px-4 rounded">
          WELCOME, OMSMS
        </h1>
      </div>

      {/* Vehicle Information Card */}
      <Card className="bg-slate-700 text-white">
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Inward Date:</span>
              <span>{vehicle.inwardDate ? new Date(vehicle.inwardDate).toLocaleDateString() : 'Not set'}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Owner:</span>
              <span>{vehicle.ownerName}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Model:</span>
              <span>{vehicle.modelName || 'Not specified'}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Car Number:</span>
              <span className="font-semibold">{vehicle.carNumber}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Location:</span>
              <span>{vehicle.location?.locationName || 'Not assigned'}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-600 pb-2">
              <span className="text-sm text-slate-300">Vehicle Type:</span>
              <span>{vehicle.vehicleType || 'Retail'}</span>
            </div>
          </div>
          
          {/* Sales Person */}
          {vehicle.salesperson && (
            <div className="bg-yellow-500 text-black px-4 py-2 rounded text-center font-medium">
              Sales Person: {vehicle.salesperson.firstName || ''} {vehicle.salesperson.lastName || ''}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Expected Date:</span>
            <span>{vehicle.expectedDeliveryDate ? new Date(vehicle.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</span>
          </div>

          {/* Status Indicators */}
          <div className="flex gap-4 justify-center mt-4">
            <Badge className={`${getVehicleStageColor(getVehicleWorkflowStage('installation'))} text-white px-4 py-2`}>
              {getVehicleStageLabel(getVehicleWorkflowStage('installation'))}
            </Badge>
            <Badge className={`${getVehicleStageColor(getVehicleWorkflowStage('payment'))} text-white px-4 py-2`}>
              {getVehicleStageLabel(getVehicleWorkflowStage('payment'))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Product Workflows Card */}
      {products.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Product Workflows</span>
              <div className="text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {getTotalValueDisplay(products)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {products.map((product, index) => {
                 const status = getWorkflowStatus(product.productName);
                 // console.log('Dashboard Product:', product.productName, 'Department:', product.departmentName);
                
                return (
                   <div 
                     key={index} 
                     className="p-4 rounded-lg shadow-sm"
                     style={getDepartmentRowStyling(product.departmentName)}
                   >
                     <div className="flex items-center justify-between">
                                           <div>
                        <div className="font-semibold text-lg">{product.productName}</div>
                       <div className="text-sm text-muted-foreground">{product.brandName}</div>
                       {user?.role?.roleName !== 'installer' && (
                         <div className="text-sm font-medium text-green-600">
                           {getProductPriceDisplay(product)}
                         </div>
                       )}
                       {product.departmentName && (
                         <div className="mt-1">
                           <Badge 
                             className="text-xs px-2 py-1"
                             style={getDepartmentBadgeStyling(product.departmentName)}
                           >
                             {product.departmentName}
                           </Badge>
                         </div>
                       )}
                   </div>
                    
                       {/* Single Toggle Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={status === 'completed' ? "default" : "outline"}
                          onClick={() => toggleProductStatus(product.productName, status)}
                          className={`px-3 py-2 w-10 ${
                            status === 'completed' 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'border-orange-500 text-orange-600 hover:bg-orange-50'
                          }`}
                        >
                          {status === 'completed' ? '✓' : '⏳'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
           </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No products added to this vehicle yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Workflow Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          onClick={() => openWorkflowDialog('installation')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
        >
          Update Vehicle Installation
        </Button>
        <Button 
          onClick={() => openWorkflowDialog('payment')}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
        >
          Update Vehicle Payment
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
    </div>
  );
}