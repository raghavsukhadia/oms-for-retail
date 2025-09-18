const { PrismaClient } = require('../generated/tenant-client');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function seedTenantData() {
  console.log('🌱 Seeding tenant database with admin user and master data...');

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
    // First, push the schema to create tables if they don't exist
    console.log('📊 Ensuring tenant database schema is up to date...');
    const { execSync } = require('child_process');
    
    execSync('npx prisma db push --schema=prisma/tenant-schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: { 
        ...process.env, 
        TENANT_DATABASE_URL: tenantDatabaseUrl 
      }
    });

    // 1. Create Locations
    console.log('📍 Creating locations...');
    
    // Check if Main Workshop already exists
    let mainLocation = await tenantPrisma.location.findFirst({
      where: { locationName: 'Main Workshop' }
    });

    if (!mainLocation) {
      mainLocation = await tenantPrisma.location.create({
        data: {
          locationName: 'Main Workshop',
          address: '123 Auto Service Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postalCode: '400001',
          contactPerson: 'Rajesh Kumar',
          contactMobile: '+91-9876543210',
          contactEmail: 'workshop@demo.com',
          status: 'active',
          settings: {
            workingHours: '9:00 AM - 6:00 PM',
            capacity: 10
          }
        }
      });
    }

    // Check if Branch Office already exists
    let branchLocation = await tenantPrisma.location.findFirst({
      where: { locationName: 'Branch Office' }
    });

    if (!branchLocation) {
      branchLocation = await tenantPrisma.location.create({
        data: {
          locationName: 'Branch Office',
          address: '456 Business Park',
          city: 'Pune',
          state: 'Maharashtra', 
          country: 'India',
          postalCode: '411001',
          contactPerson: 'Priya Sharma',
          contactMobile: '+91-9876543211',
          contactEmail: 'branch@demo.com',
          status: 'active',
          settings: {
            workingHours: '10:00 AM - 7:00 PM',
            capacity: 5
          }
        }
      });
    }

    console.log('✅ Locations created:', {
      main: mainLocation.locationName,
      branch: branchLocation.locationName
    });

    // 2. Create Departments
    console.log('🏢 Creating departments...');
    const departments = [
      {
        departmentName: 'Installation',
        colorCode: '#3B82F6',
        description: 'Vehicle accessory installation team'
      },
      {
        departmentName: 'Quality Control',
        colorCode: '#10B981',
        description: 'Quality assurance and testing'
      },
      {
        departmentName: 'Sales',
        colorCode: '#F59E0B',
        description: 'Sales and customer relations'
      },
      {
        departmentName: 'Accounts',
        colorCode: '#8B5CF6',
        description: 'Finance and accounting'
      }
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      // Check if department already exists
      let department = await tenantPrisma.department.findFirst({
        where: { departmentName: dept.departmentName }
      });

      if (!department) {
        department = await tenantPrisma.department.create({
          data: {
            ...dept,
            status: 'active',
            config: {
              autoAssign: true,
              notifications: true
            }
          }
        });
      }
      createdDepartments.push(department);
    }

    console.log('✅ Departments created:', createdDepartments.map(d => d.departmentName));

    // 3. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Get the admin role ID from our seeded roles
    const adminRole = await tenantPrisma.role.findUnique({
      where: { roleName: 'admin' }
    });

    if (!adminRole) {
      throw new Error('Admin role not found! Make sure roles are seeded first.');
    }

    let adminUser = await tenantPrisma.user.findUnique({
      where: { email: 'admin@demo.com' }
    });

    if (!adminUser) {
      adminUser = await tenantPrisma.user.create({
        data: {
          email: 'admin@demo.com',
          passwordHash: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          mobileNumber: '+91-9999999999',
          roleId: adminRole.roleId,
          departmentId: createdDepartments[0].departmentId, // Installation dept
          locationId: mainLocation.locationId,
          status: 'active'
        }
      });
    }

    // 4. Create additional test users
    console.log('👥 Creating additional test users...');

    // Get all role IDs for test users
    const managerRole = await tenantPrisma.role.findUnique({ where: { roleName: 'manager' } });
    const coordinatorRole = await tenantPrisma.role.findUnique({ where: { roleName: 'coordinator' } });
    const salespersonRole = await tenantPrisma.role.findUnique({ where: { roleName: 'salesperson' } });
    const supervisorRole = await tenantPrisma.role.findUnique({ where: { roleName: 'supervisor' } });

    const testUsers = [
      {
        email: 'manager@demo.com',
        firstName: 'John',
        lastName: 'Manager',
        roleId: managerRole?.roleId,
        department: createdDepartments[2] // Sales
      },
      {
        email: 'coordinator@demo.com',
        firstName: 'Sarah',
        lastName: 'Coordinator',
        roleId: coordinatorRole?.roleId,
        department: createdDepartments[0] // Installation
      },
      {
        email: 'salesperson@demo.com',
        firstName: 'Mike',
        lastName: 'Sales',
        roleId: salespersonRole?.roleId,
        department: createdDepartments[2] // Sales
      },
      {
        email: 'supervisor@demo.com',
        firstName: 'Lisa',
        lastName: 'Supervisor',
        roleId: supervisorRole?.roleId,
        department: createdDepartments[1] // Quality Control
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      if (!userData.roleId) {
        console.warn(`⚠️ Skipping user ${userData.email} - role not found`);
        continue;
      }

      const userPassword = 'password123';
      const userHashedPassword = await bcrypt.hash(userPassword, 12);

      let user = await tenantPrisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!user) {
        user = await tenantPrisma.user.create({
          data: {
            email: userData.email,
            passwordHash: userHashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            mobileNumber: `+91-98765432${Math.floor(Math.random() * 100)}`,
            roleId: userData.roleId,
            departmentId: userData.department.departmentId,
            locationId: mainLocation.locationId,
            status: 'active'
          }
        });
      }
      createdUsers.push(user);
    }

    // 5. Create Sample Product Categories
    console.log('📦 Creating product categories...');
    let audioCategory = await tenantPrisma.productCategory.findFirst({
      where: { categoryName: 'Audio Systems' }
    });

    if (!audioCategory) {
      audioCategory = await tenantPrisma.productCategory.create({
        data: {
          categoryName: 'Audio Systems',
          description: 'Car audio and entertainment systems',
          status: 'active'
        }
      });
    }

    let securityCategory = await tenantPrisma.productCategory.findFirst({
      where: { categoryName: 'Security Systems' }
    });

    if (!securityCategory) {
      securityCategory = await tenantPrisma.productCategory.create({
        data: {
          categoryName: 'Security Systems',
          description: 'Car security and tracking systems',
          status: 'active'
        }
      });
    }

    // 6. Create Sample Products
    console.log('🛍️ Creating sample products...');
    const products = [
      {
        productName: 'Pioneer Car Stereo System',
        brandName: 'Pioneer',
        categoryId: audioCategory.categoryId,
        price: 15000.00,
        installationTimeHours: 2
      },
      {
        productName: 'JBL Speaker Set',
        brandName: 'JBL',
        categoryId: audioCategory.categoryId,
        price: 8000.00,
        installationTimeHours: 1
      },
      {
        productName: 'GPS Tracking Device',
        brandName: 'Garmin',
        categoryId: securityCategory.categoryId,
        price: 12000.00,
        installationTimeHours: 3
      },
      {
        productName: 'Car Alarm System',
        brandName: 'Viper',
        categoryId: securityCategory.categoryId,
        price: 6000.00,
        installationTimeHours: 2
      }
    ];

    for (const productData of products) {
      const existingProduct = await tenantPrisma.product.findFirst({
        where: { productName: productData.productName }
      });

      if (!existingProduct) {
        await tenantPrisma.product.create({
          data: {
            ...productData,
            specifications: {
              warranty: '2 years',
              origin: 'India'
            },
            status: 'active'
          }
        });
      }
    }

    // 7. Update department heads
    console.log('🎯 Assigning department heads...');
    await tenantPrisma.department.update({
      where: { departmentId: createdDepartments[0].departmentId },
      data: { headUserId: createdUsers.find(u => u.role === 'coordinator')?.userId }
    });

    await tenantPrisma.department.update({
      where: { departmentId: createdDepartments[2].departmentId },
      data: { headUserId: createdUsers.find(u => u.role === 'manager')?.userId }
    });

    console.log('');
    console.log('🎉 Tenant seeding completed successfully!');
    console.log('');
    console.log('👤 Admin Account:');
    console.log(`  📧 Email: admin@demo.com`);
    console.log(`  🔑 Password: ${adminPassword}`);
    console.log('');
    console.log('👥 Test Users:');
    testUsers.forEach(user => {
      console.log(`  📧 ${user.email} (${user.role}) - Password: password123`);
    });
    console.log('');
    console.log('📍 Locations created: Main Workshop, Branch Office');
    console.log('🏢 Departments created: Installation, Quality Control, Sales, Accounts');
    console.log('📦 Products created: 4 sample products');
    console.log('');
    console.log('🚀 You can now:');
    console.log('  1. Start the development server: npm run dev');
    console.log('  2. Access: http://demo.localhost:3000');
    console.log('  3. Login with admin@demo.com / admin123');
    console.log('  4. Navigate to Vehicle Inward to test the functionality');

  } catch (error) {
    console.error('❌ Tenant seeding failed:', error);
    throw error;
  }
}

// Helper function for default permissions - REMOVED
// Permissions are now managed through Role and RolePermission tables

seedTenantData()
  .catch((e) => {
    console.error('❌ Tenant seeding process failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    const { PrismaClient } = require('../generated/tenant-client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  });