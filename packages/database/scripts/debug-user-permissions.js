const { PrismaClient } = require('../generated/tenant-client');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function debugUserPermissions() {
  console.log('🔍 Debugging user permissions...');

  const tenantDatabaseUrl = process.env.DEMO_TENANT_DATABASE_URL || 
    'postgresql://postgres:password@localhost:5432/omsms_tenant_demo';

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: tenantDatabaseUrl
      }
    }
  });

  try {
    // Check if roles exist
    const roles = await tenantPrisma.role.findMany({
      include: {
        rolePermissions: {
          select: {
            resource: true,
            action: true
          }
        }
      }
    });

    console.log('\n📋 Available Roles:');
    roles.forEach(role => {
      console.log(`\n🔰 ${role.roleName} (${role.roleDescription})`);
      console.log(`  Level: ${role.roleLevel}, System Role: ${role.isSystemRole}`);
      console.log('  Permissions:');
      role.rolePermissions.forEach(perm => {
        console.log(`    - ${perm.resource}.${perm.action}`);
      });
    });

    // Check users and their roles
    const users = await tenantPrisma.user.findMany({
      include: {
        role: {
          include: {
            rolePermissions: {
              select: {
                resource: true,
                action: true
              }
            }
          }
        }
      }
    });

    console.log('\n👥 Users and their permissions:');
    users.forEach(user => {
      console.log(`\n📧 ${user.email} (${user.firstName} ${user.lastName})`);
      console.log(`  Role: ${user.role.roleName}`);
      console.log(`  Status: ${user.status}`);
      console.log('  Effective Permissions:');
      
      if (user.role.roleName === 'admin') {
        console.log('    - *: true (Admin has all permissions)');
      } else {
        user.role.rolePermissions.forEach(perm => {
          console.log(`    - ${perm.resource}.${perm.action}: true`);
        });
      }
    });

    // Check specific vehicles permissions
    console.log('\n🚗 Checking vehicles permissions specifically:');
    const vehiclePermissions = await tenantPrisma.rolePermission.findMany({
      where: {
        resource: 'vehicles'
      },
      include: {
        role: {
          select: {
            roleName: true
          }
        }
      }
    });

    vehiclePermissions.forEach(perm => {
      console.log(`  ${perm.role.roleName}: vehicles.${perm.action}`);
    });

  } catch (error) {
    console.error('❌ Error debugging permissions:', error);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  debugUserPermissions()
    .then(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugUserPermissions };