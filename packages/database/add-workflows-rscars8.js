const { PrismaClient } = require('./generated/tenant-client');

async function addWorkflowsToRscars8() {
  console.log('🔧 Adding workflow templates to rscars8 tenant...');
  
  const client = new PrismaClient({
    datasources: { 
      db: { 
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_rscars8' 
      } 
    }
  });

  try {
    // Check existing workflows
    const existingWorkflows = await client.workflow.findMany();
    console.log('📋 Existing workflows:', existingWorkflows.map(w => w.workflowType));
    
    // Add installation workflow if missing
    const installationExists = existingWorkflows.some(w => w.workflowType === 'installation');
    if (!installationExists) {
      console.log('➕ Creating installation workflow...');
      await client.workflow.create({
        data: {
          workflowName: 'Vehicle Installation Process',
          workflowType: 'installation',
          stages: [
            {"key": "order_confirmed", "label": "Order Confirmed", "order": 1, "required": true},
            {"key": "start_installation", "label": "Start Installation", "order": 2, "required": true},
            {"key": "quality_checked", "label": "Quality Checked", "order": 3, "required": true},
            {"key": "delivered", "label": "Delivered", "order": 4, "required": true}
          ],
          rules: {
            "allowSkipping": false,
            "requireNotes": true,
            "notifyOnCompletion": true
          },
          notifications: {
            "onStart": true,
            "onComplete": true,
            "emailNotifications": false
          },
          status: 'active'
        }
      });
    }

    // Add payment workflow if missing
    const paymentExists = existingWorkflows.some(w => w.workflowType === 'payment');
    if (!paymentExists) {
      console.log('➕ Creating payment workflow...');
      await client.workflow.create({
        data: {
          workflowName: 'Vehicle Payment Process',
          workflowType: 'payment',
          stages: [
            {"key": "draft", "label": "Draft", "order": 1, "required": true},
            {"key": "invoice", "label": "Invoice", "order": 2, "required": true},
            {"key": "payment", "label": "Payment", "order": 3, "required": true}
          ],
          rules: {
            "allowSkipping": false,
            "requireApproval": true,
            "notifyOnCompletion": true
          },
          notifications: {
            "onStart": true,
            "onComplete": true,
            "emailNotifications": true
          },
          status: 'active'
        }
      });
    }

    // Verify workflows were created
    const finalWorkflows = await client.workflow.findMany();
    console.log('✅ Final workflows:', finalWorkflows.map(w => `${w.workflowName} (${w.workflowType})`));
    
    console.log('🎉 Workflow templates added to rscars8 successfully!');
    
  } catch (error) {
    console.error('❌ Error adding workflows:', error.message);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

addWorkflowsToRscars8();
