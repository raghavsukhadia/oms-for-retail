const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function setupDatabases() {
  console.log('🚀 Setting up OMSMS databases...');

  try {
    // Check if PostgreSQL is running
    console.log('🔍 Checking PostgreSQL connection...');
    
    if (!process.env.MASTER_DATABASE_URL) {
      console.error('❌ MASTER_DATABASE_URL environment variable is not set');
      console.log('💡 Make sure to set it in your .env file');
      process.exit(1);
    }

    // 1. Setup master database
    console.log('📊 Setting up master database...');
    
    // Generate Prisma client for master
    console.log('  📦 Generating master database client...');
    execSync('npx prisma generate --schema=prisma/master-schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });
    
    // Push master schema to database
    console.log('  🔧 Pushing master database schema...');
    execSync('npx prisma db push --schema=prisma/master-schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: { 
        ...process.env, 
        DATABASE_URL: process.env.MASTER_DATABASE_URL 
      }
    });

    // 2. Generate tenant client
    console.log('🏢 Generating tenant database client...');
    execSync('npx prisma generate --schema=prisma/tenant-schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });

    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Run "npm run seed" to add initial data');
    console.log('  2. Start development with "npm run dev"');
    console.log('');
    console.log('🔧 Available commands:');
    console.log('  - npm run db:studio:master   # Open Prisma Studio for master DB');
    console.log('  - npm run db:studio:tenant   # Open Prisma Studio for tenant DB');
    console.log('  - npm run seed               # Seed master database');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('  - Make sure PostgreSQL is running');
    console.log('  - Check your .env file has MASTER_DATABASE_URL set');
    console.log('  - Verify database connection string is correct');
    process.exit(1);
  }
}

setupDatabases();