-- Create default workflows for vehicle tracking system
-- Run this against your tenant database (usually omsms_tenant_demo)

-- First, check if workflows already exist
SELECT 'Checking existing workflows...' as status;
SELECT workflow_name, workflow_type FROM workflows WHERE workflow_type IN ('installation', 'payment');

-- Create Installation Workflow if it doesn't exist
INSERT INTO workflows (
    workflow_id,
    workflow_name,
    workflow_type,
    stages,
    rules,
    notifications,
    status,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    'Vehicle Installation Process',
    'installation',
    '[
        {
            "key": "start_installation",
            "label": "Start Installation",
            "order": 1,
            "required": true
        },
        {
            "key": "quality_checked", 
            "label": "Quality Checked",
            "order": 2,
            "required": true
        },
        {
            "key": "delivered",
            "label": "Delivered", 
            "order": 3,
            "required": true
        }
    ]'::json,
    '{
        "allowSkipping": false,
        "requireNotes": true,
        "notifyOnCompletion": true
    }'::json,
    '{
        "onStart": true,
        "onComplete": true,
        "emailNotifications": false
    }'::json,
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM workflows WHERE workflow_type = 'installation'
);

-- Create Payment Workflow if it doesn't exist  
INSERT INTO workflows (
    workflow_id,
    workflow_name,
    workflow_type,
    stages,
    rules,
    notifications,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Vehicle Payment Process',
    'payment',
    '[
        {
            "key": "draft",
            "label": "Draft",
            "order": 1,
            "required": true
        },
        {
            "key": "invoice",
            "label": "Invoice",
            "order": 2,
            "required": true
        },
        {
            "key": "payment",
            "label": "Payment",
            "order": 3,
            "required": true
        }
    ]'::json,
    '{
        "allowSkipping": false,
        "requireApproval": true,
        "notifyOnCompletion": true
    }'::json,
    '{
        "onStart": true,
        "onComplete": true,
        "emailNotifications": true
    }'::json,
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM workflows WHERE workflow_type = 'payment'
);

-- Verify the workflows were created
SELECT 'Workflows created successfully!' as status;
SELECT workflow_name, workflow_type, status FROM workflows WHERE workflow_type IN ('installation', 'payment');