const { PrismaClient } = require('../generated/tenant-client');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function resetAndSeedUsers() {
  console.log('🔄 Resetting users and seeding new users with roles...');

  // Use demo tenant database by default, or allow override
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
    // 1. First, get all role IDs
    console.log('📋 Fetching available roles...');
    const roles = await tenantPrisma.role.findMany({
      select: {
        roleId: true,
        roleName: true,
        roleDescription: true
      }
    });

    if (roles.length === 0) {
      console.error('❌ No roles found! Please seed roles first using: npm run seed:roles');
      return;
    }

    console.log('✅ Found roles:');
    roles.forEach(role => {
      console.log(`  - ${role.roleName}: ${role.roleDescription}`);
    });

    // Create role mapping for easy access
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.roleName] = role.roleId;
    });

    // 2. Get locations and departments for user assignment
    console.log('📍 Fetching locations and departments...');
    const locations = await tenantPrisma.location.findMany();
    const departments = await tenantPrisma.department.findMany();

    if (locations.length === 0 || departments.length === 0) {
      console.error('❌ No locations or departments found! Please seed master data first.');
      return;
    }

    const defaultLocation = locations[0];
    const defaultDepartment = departments[0];

    // 3. Remove all existing users
    console.log('🗑️ Removing all existing users...');
    const deletedUsersCount = await tenantPrisma.user.deleteMany({});
    console.log(`✅ Removed ${deletedUsersCount.count} existing users`);

    // 4. Define new users with roles
    const newUsers = [
      {
        email: 'admin@demo.com',
        firstName: 'System',
        lastName: 'Administrator',
        mobileNumber: '+91-9999999999',
        address: '123 Admin Street, Mumbai',
        roleId: roleMap['admin'],
        department: departments.find(d => d.departmentName.includes('IT')) || defaultDepartment
      },
      {
        email: 'manager@demo.com',
        firstName: 'John',
        lastName: 'Manager',
        mobileNumber: '+91-9999999998',
        address: '124 Manager Road, Mumbai',
        roleId: roleMap['manager'],
        department: departments.find(d => d.departmentName.includes('Operations')) || defaultDepartment
      },
      {
        email: 'coordinator@demo.com',
        firstName: 'Sarah',
        lastName: 'Coordinator',
        mobileNumber: '+91-9999999997',
        address: '125 Coordinator Ave, Mumbai',
        roleId: roleMap['coordinator'],
        department: departments.find(d => d.departmentName.includes('Installation')) || defaultDepartment
      },
      {
        email: 'supervisor@demo.com',
        firstName: 'Mike',
        lastName: 'Supervisor',
        mobileNumber: '+91-9999999996',
        address: '126 Supervisor Lane, Mumbai',
        roleId: roleMap['supervisor'],
        department: departments.find(d => d.departmentName.includes('Quality')) || defaultDepartment
      },
      {
        email: 'salesperson@demo.com',
        firstName: 'Lisa',
        lastName: 'Sales',
        mobileNumber: '+91-9999999995',
        address: '127 Sales Street, Mumbai',
        roleId: roleMap['salesperson'],
        department: departments.find(d => d.departmentName.includes('Sales')) || defaultDepartment
      },
      {
        email: 'installer@demo.com',
        firstName: 'David',
        lastName: 'Installer',
        mobileNumber: '+91-9999999994',
        address: '128 Installer Road, Mumbai',
        roleId: roleMap['installer'],
        department: departments.find(d => d.departmentName.includes('Installation')) || defaultDepartment
      },
      // Additional users for variety
      {
        email: 'sales.manager@demo.com',
        firstName: 'Emma',
        lastName: 'Wilson',
        mobileNumber: '+91-9999999993',
        address: '129 Wilson Street, Pune',
        roleId: roleMap['manager'],
        department: departments.find(d => d.departmentName.includes('Sales')) || defaultDepartment
      },
      {
        email: 'senior.installer@demo.com',
        firstName: 'Alex',
        lastName: 'Rodriguez',
        mobileNumber: '+91-9999999992',
        address: '130 Rodriguez Ave, Delhi',
        roleId: roleMap['installer'],
        department: departments.find(d => d.departmentName.includes('Installation')) || defaultDepartment
      },
      {
        email: 'quality.supervisor@demo.com',
        firstName: 'Priya',
        lastName: 'Patel',
        mobileNumber: '+91-9999999991',
        address: '131 Patel Colony, Bangalore',
        roleId: roleMap['supervisor'],
        department: departments.find(d => d.departmentName.includes('Quality')) || defaultDepartment
      },
      {
        email: 'field.coordinator@demo.com',
        firstName: 'Rahul',
        lastName: 'Singh',
        mobileNumber: '+91-9999999990',
        address: '132 Singh Nagar, Chennai',
        roleId: roleMap['coordinator'],
        department: departments.find(d => d.departmentName.includes('Field')) || departments.find(d => d.departmentName.includes('Operations')) || defaultDepartment
      }
    ];

    // 5. Create new users
    console.log('👥 Creating new users...');
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const createdUsers = [];
    for (const userData of newUsers) {
      if (!userData.roleId) {
        console.warn(`⚠️ Skipping user ${userData.email} - role not found`);
        continue;
      }

      try {
        const user = await tenantPrisma.user.create({
          data: {
            email: userData.email,
            passwordHash: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            mobileNumber: userData.mobileNumber,
            address: userData.address,
            roleId: userData.roleId,
            departmentId: userData.department.departmentId,
            locationId: defaultLocation.locationId,
            status: 'active',
            permissions: {},
            preferences: {}
          },
          include: {
            role: {
              select: {
                roleName: true,
                roleDescription: true
              }
            },
            department: {
              select: {
                departmentName: true
              }
            },
            location: {
              select: {
                locationName: true
              }
            }
          }
        });

        createdUsers.push(user);
        console.log(`✅ Created user: ${user.email} (${user.role.roleName}) in ${user.department.departmentName}`);
        
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully created ${createdUsers.length} new users!`);
    
    // 6. Display summary
    console.log('\n📊 User Summary:');
    console.log('================');
    console.log(`Total Users Created: ${createdUsers.length}`);
    console.log(`Default Password: ${defaultPassword}`);
    console.log('\nUser Accounts:');
    
    const usersByRole = {};
    createdUsers.forEach(user => {
      const roleName = user.role.roleName;
      if (!usersByRole[roleName]) {
        usersByRole[roleName] = [];
      }
      usersByRole[roleName].push(user);
    });

    Object.entries(usersByRole).forEach(([roleName, users]) => {
      console.log(`\n${roleName.toUpperCase()}:`);
      users.forEach(user => {
        console.log(`  📧 ${user.email} | ${user.firstName} ${user.lastName} | ${user.department.departmentName}`);
      });
    });

    console.log('\n🔐 Login Instructions:');
    console.log('=====================');
    console.log('1. Go to http://localhost:3000/login');
    console.log('2. Use any of the email addresses above');
    console.log(`3. Password for all accounts: ${defaultPassword}`);
    console.log('\n💡 Tip: Start with admin@demo.com for full system access');

  } catch (error) {
    console.error('❌ Error during user reset and seeding:', error);
    throw error;
  } finally {
    await tenantPrisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  resetAndSeedUsers()
    .then(() => {
      console.log('\n🎉 User reset and seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ User reset and seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { resetAndSeedUsers };