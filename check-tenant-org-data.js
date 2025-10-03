const { Client } = require('pg');

async function checkTenantOrgData() {
  const client = new Client({
    connectionString: 'postgresql://omsms_admin:Password123%21@35.200.141.110:5432/omsms_tenant_demo'
  });

  try {
    await client.connect();
    console.log('Connected to tenant database');

    // Check if organizations table exists and has data
    const orgResult = await client.query('SELECT * FROM organizations LIMIT 5');
    console.log('\n=== Organizations Table ===');
    console.log('Count:', orgResult.rows.length);
    if (orgResult.rows.length > 0) {
      console.log('Sample data:', JSON.stringify(orgResult.rows[0], null, 2));
    }

    // Check if users table has data
    const userResult = await client.query('SELECT id, email, first_name, last_name, role_id FROM users LIMIT 5');
    console.log('\n=== Users Table ===');
    console.log('Count:', userResult.rows.length);
    if (userResult.rows.length > 0) {
      console.log('Sample data:', JSON.stringify(userResult.rows, null, 2));
    }

    // Check if there are any organization settings
    const settingsResult = await client.query('SELECT * FROM organization_settings LIMIT 5');
    console.log('\n=== Organization Settings Table ===');
    console.log('Count:', settingsResult.rows.length);
    if (settingsResult.rows.length > 0) {
      console.log('Sample data:', JSON.stringify(settingsResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTenantOrgData();
