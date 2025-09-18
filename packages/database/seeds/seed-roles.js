const { PrismaClient } = require('../generated/tenant-client');

// Default roles and their permissions based on the shared constants
const defaultRoles = [
  {
    roleName: 'admin',
    roleDescription: 'System Administrator with full access',
    roleColor: '#ef4444', // Red
    roleLevel: 0,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'locations', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'departments', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'roles', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'workflows', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'media', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'settings', actions: ['read', 'update'] },
      // Financial permissions - Admin has full access
      { resource: 'payments', actions: ['view', 'create', 'update', 'approve', 'export'] },
      { resource: 'invoices', actions: ['view', 'create', 'update', 'send', 'export'] },
      { resource: 'pricing', actions: ['view', 'update', 'manage_discounts'] },
      { resource: 'financial_reports', actions: ['view', 'export', 'view_detailed'] },
      { resource: 'cost_analysis', actions: ['view', 'export'] },
      { resource: 'account_statements', actions: ['view', 'export'] },
      { resource: 'revenue_data', actions: ['view', 'export', 'view_profit_margins'] }
    ]
  },
  {
    roleName: 'manager',
    roleDescription: 'Manager with operational oversight',
    roleColor: '#3b82f6', // Blue
    roleLevel: 1,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['create', 'read', 'update'] },
      { resource: 'users', actions: ['read', 'update'] },
      { resource: 'locations', actions: ['read'] },
      { resource: 'departments', actions: ['read'] },
      { resource: 'roles', actions: ['read'] },
      { resource: 'workflows', actions: ['read', 'update'] },
      { resource: 'media', actions: ['create', 'read', 'update'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'settings', actions: ['read'] },
      // Financial permissions - Manager has operational access
      { resource: 'payments', actions: ['view', 'create', 'update', 'export'] },
      { resource: 'invoices', actions: ['view', 'create', 'update', 'send', 'export'] },
      { resource: 'pricing', actions: ['view', 'update'] },
      { resource: 'financial_reports', actions: ['view', 'export', 'view_detailed'] },
      { resource: 'cost_analysis', actions: ['view', 'export'] },
      { resource: 'account_statements', actions: ['view', 'export'] },
      { resource: 'revenue_data', actions: ['view', 'export'] }
    ]
  },
  {
    roleName: 'coordinator',
    roleDescription: 'Coordinator managing vehicle operations',
    roleColor: '#22c55e', // Green
    roleLevel: 2,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['create', 'read', 'update'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'locations', actions: ['read'] },
      { resource: 'departments', actions: ['read'] },
      { resource: 'workflows', actions: ['read', 'update'] },
      { resource: 'media', actions: ['create', 'read', 'update'] },
      { resource: 'reports', actions: ['read'] },
      { resource: 'settings', actions: ['read'] },
      // Financial permissions - Coordinator has limited access
      { resource: 'payments', actions: ['view', 'create'] },
      { resource: 'invoices', actions: ['view', 'create'] },
      { resource: 'pricing', actions: ['view'] },
      { resource: 'financial_reports', actions: ['view'] },
      { resource: 'cost_analysis', actions: ['view'] },
      { resource: 'account_statements', actions: ['view'] },
      { resource: 'revenue_data', actions: ['view'] }
    ]
  },
  {
    roleName: 'supervisor',
    roleDescription: 'Supervisor overseeing installations',
    roleColor: '#f59e0b', // Yellow
    roleLevel: 3,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['read', 'update'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'locations', actions: ['read'] },
      { resource: 'departments', actions: ['read'] },
      { resource: 'workflows', actions: ['read', 'update'] },
      { resource: 'media', actions: ['create', 'read', 'update'] },
      { resource: 'reports', actions: ['read'] },
      { resource: 'settings', actions: ['read'] },
      // Financial permissions - Supervisor has view-only access
      { resource: 'payments', actions: ['view'] },
      { resource: 'invoices', actions: ['view'] },
      { resource: 'pricing', actions: ['view'] },
      { resource: 'financial_reports', actions: ['view'] },
      { resource: 'cost_analysis', actions: ['view'] }
    ]
  },
  {
    roleName: 'salesperson',
    roleDescription: 'Sales representative handling customer vehicles',
    roleColor: '#a855f7', // Purple
    roleLevel: 4,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['create', 'read', 'update'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'locations', actions: ['read'] },
      { resource: 'departments', actions: ['read'] },
      { resource: 'workflows', actions: ['read'] },
      { resource: 'media', actions: ['create', 'read'] },
      { resource: 'reports', actions: ['read'] },
      { resource: 'settings', actions: ['read'] },
      // Financial permissions - Salesperson has pricing and invoice access
      { resource: 'payments', actions: ['view'] },
      { resource: 'invoices', actions: ['view', 'create'] },
      { resource: 'pricing', actions: ['view', 'manage_discounts'] },
      { resource: 'revenue_data', actions: ['view'] }
    ]
  },
  {
    roleName: 'installer',
    roleDescription: 'Technician performing installations',
    roleColor: '#64748b', // Gray
    roleLevel: 5,
    isSystemRole: true,
    permissions: [
      { resource: 'vehicles', actions: ['read', 'update'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'locations', actions: ['read'] },
      { resource: 'departments', actions: ['read'] },
      { resource: 'workflows', actions: ['read', 'update'] },
      { resource: 'media', actions: ['create', 'read', 'update'] },
      { resource: 'settings', actions: ['read'] }
      // Financial permissions - Installer has no financial access
    ]
  }
];

async function seedRoles(tenantId = 'default') {
  // Use default tenant database URL if no tenant ID provided
  const databaseUrl = tenantId && tenantId !== 'default' 
    ? process.env.TENANT_DATABASE_URL?.replace('${TENANT_ID}', tenantId)
    : process.env.DATABASE_URL || process.env.TENANT_DATABASE_URL;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    console.log(`🌱 Seeding roles for tenant: ${tenantId}`);

    // Check if roles already exist
    const existingRoles = await prisma.role.count();
    if (existingRoles > 0) {
      console.log(`✅ Roles already exist (${existingRoles} roles found). Skipping seed.`);
      return;
    }

    // Create roles and permissions
    for (const roleData of defaultRoles) {
      console.log(`Creating role: ${roleData.roleName}`);
      
      // Create the role
      const role = await prisma.role.create({
        data: {
          roleName: roleData.roleName,
          roleDescription: roleData.roleDescription,
          roleColor: roleData.roleColor,
          roleLevel: roleData.roleLevel,
          isSystemRole: roleData.isSystemRole,
        }
      });

      // Create permissions for this role
      for (const permission of roleData.permissions) {
        for (const action of permission.actions) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.roleId,
              resource: permission.resource,
              action: action,
              conditions: permission.conditions || {}
            }
          });
        }
      }

      console.log(`✅ Created role ${roleData.roleName} with ${roleData.permissions.reduce((acc, p) => acc + p.actions.length, 0)} permissions`);
    }

    console.log('🎉 Role seeding completed successfully!');
    
    // Return role mappings for reference
    const roles = await prisma.role.findMany({
      select: { roleId: true, roleName: true }
    });
    
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.roleName] = role.roleId;
    });
    
    return roleMap;

  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  const tenantId = process.argv[2] || 'default';
  seedRoles(tenantId)
    .then((roleMap) => {
      console.log('\n🎉 Role seeding completed successfully!');
      if (roleMap) {
        console.log('\nRole mappings:');
        Object.entries(roleMap).forEach(([name, id]) => {
          console.log(`  ${name}: ${id}`);
        });
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedRoles, defaultRoles };