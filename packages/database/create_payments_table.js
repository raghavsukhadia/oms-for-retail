const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createPaymentsTable() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'omsms_tenant_demo',
    user: 'postgres',
    password: 'password'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlScript = fs.readFileSync(path.join(__dirname, 'create_payments_table.sql'), 'utf8');
    await client.query(sqlScript);
    
    console.log('✅ Payments table created successfully');
    
    // Verify the table was created
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments'"
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Payments table exists in database');
    } else {
      console.log('❌ Payments table not found');
    }
    
  } catch (error) {
    console.error('Error creating payments table:', error);
  } finally {
    await client.end();
  }
}

createPaymentsTable();
