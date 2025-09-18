const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function setupComplete() {
  console.log('🚀 Starting complete OMSMS setup...');
  console.log('');

  try {
    // Check required environment variables
    if (!process.env.MASTER_DATABASE_URL) {
      console.error('❌ MASTER_DATABASE_URL environment variable is not set');
      console.log('💡 Make sure to set it in your .env file');
      process.exit(1);
    }

    // Step 1: Setup databases and generate clients
    console.log('📊 Step 1: Setting up databases...');
    execSync('node setup-databases.js', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    // Step 2: Setup demo tenant in master database
    console.log('');
    console.log('🏢 Step 2: Setting up demo tenant...');
    execSync('node setup-demo-tenant.js', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    // Step 3: Seed tenant data
    console.log('');
    console.log('🌱 Step 3: Seeding tenant data...');
    execSync('node seed-tenant-data.js', { 
      stdio: 'inherit',
      cwd: __dirname
    });

    console.log('');
    console.log('🎉 Complete OMSMS setup finished successfully!');
    console.log('');
    console.log('✅ What was set up:');
    console.log('  📊 Master database with tenant registry');
    console.log('  🏢 Demo tenant record in master database'); 
    console.log('  🗄️ Demo tenant database with sample data');
    console.log('  👤 Admin user: admin@demo.com / admin123');
    console.log('  👥 Test users with different roles');
    console.log('  📍 Sample locations and departments');
    console.log('  📦 Sample products and categories');
    console.log('');
    console.log('🚀 Ready to start:');
    console.log('  1. npm run dev              # Start development server');
    console.log('  2. http://localhost:3000    # Access application');
    console.log('  3. Login with admin@demo.com / admin123');
    console.log('');
    console.log('🔧 Useful commands:');
    console.log('  - npm run db:studio:master   # View master database');
    console.log('  - npm run db:studio:tenant   # View tenant database');

  } catch (error) {
    console.error('❌ Complete setup failed:', error.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('  - Make sure PostgreSQL is running');
    console.log('  - Check your .env file has correct database URLs');
    console.log('  - Verify database connection strings');
    console.log('  - Try running steps individually:');
    console.log('    * node setup-databases.js');
    console.log('    * node setup-demo-tenant.js');
    console.log('    * node seed-tenant-data.js');
    process.exit(1);
  }
}

setupComplete();