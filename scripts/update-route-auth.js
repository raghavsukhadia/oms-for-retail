const fs = require('fs');
const path = require('path');

// Routes directory
const routesDir = path.join(__dirname, '../packages/backend/src/routes');

// Files to update
const routeFiles = [
  'users.ts',
  'locations.ts', 
  'workflows.ts',
  'supervisors.ts',
  'sales.ts',
  'reports.ts',
  'products.ts',
  'notifications.ts',
  'media.ts',
  'dashboard.ts',
  'coordinators.ts',
  'config.ts',
  'accounts.ts'
];

function updateRouteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already updated
    if (content.includes('authorizeRoles')) {
      console.log(`✅ ${path.basename(filePath)} already updated`);
      return;
    }
    
    // Update import statement
    content = content.replace(
      /import { authenticate, authorize,/g,
      'import { authenticate, authorizeRoles,'
    );
    
    // Update authorize calls to authorizeRoles
    content = content.replace(/authorize\(/g, 'authorizeRoles(');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${path.basename(filePath)}:`, error.message);
  }
}

console.log('🔄 Updating route authentication...');

routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (fs.existsSync(filePath)) {
    updateRouteFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 Route authentication update complete!');
console.log('🔧 Now restart your backend server for changes to take effect.');