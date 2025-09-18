-- Initialize OMS databases
-- This script runs when PostgreSQL container starts for the first time

-- Create master database (already created by POSTGRES_DB)
-- CREATE DATABASE oms_master;

-- Create demo tenant database
CREATE DATABASE oms_tenant_demo;

-- Create test tenant database  
CREATE DATABASE oms_tenant_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE oms_master TO postgres;
GRANT ALL PRIVILEGES ON DATABASE oms_tenant_demo TO postgres;
GRANT ALL PRIVILEGES ON DATABASE oms_tenant_test TO postgres;

-- Print completion message
\echo 'OMS databases created successfully!';