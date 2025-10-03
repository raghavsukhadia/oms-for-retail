import { PrismaClient as MasterClient } from '../../packages/database/generated/master-client';
import { PrismaClient as TenantClient } from '../../packages/database/generated/tenant-client';

// Validate required environment variables
if (!process.env.MASTER_DATABASE_URL) {
  throw new Error('MASTER_DATABASE_URL environment variable is required');
}

if (!process.env.TENANT_DATABASE_URL_TEMPLATE) {
  throw new Error('TENANT_DATABASE_URL_TEMPLATE environment variable is required');
}

// Cache for tenant database connections
const tenantClients = new Map<string, TenantClient>();

/**
 * Generate tenant database URL from template
 */
function generateTenantDatabaseUrl(databaseName: string): string {
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE!;
  return template.replace('{database}', databaseName);
}

// Master database client (singleton)
export const masterDb = new MasterClient({
  datasources: {
    db: {
      url: process.env.MASTER_DATABASE_URL!
    }
  }
});

/**
 * Get tenant database client for a specific tenant
 */
export async function getTenantDb(tenantId: string): Promise<TenantClient> {
  // Return cached client if exists
  if (tenantClients.has(tenantId)) {
    return tenantClients.get(tenantId)!;
  }

  // Get tenant info from master database using subdomain
  const tenant = await masterDb.tenant.findUnique({
    where: { subdomain: tenantId }, // tenantId is actually the subdomain (e.g., "demo")
    select: { databaseUrl: true, status: true }
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  if (tenant.status !== 'active') {
    throw new Error(`Tenant is not active: ${tenantId}`);
  }

  // Create new tenant client
  const tenantClient = new TenantClient({
    datasources: {
      db: {
        url: tenant.databaseUrl
      }
    }
  });

  // Test connection
  try {
    await tenantClient.$connect();
  } catch (error) {
    console.error(`Failed to connect to tenant database for ${tenantId}:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tenantId,
      databaseUrl: tenant.databaseUrl
    });
    throw new Error(`Failed to connect to tenant database: ${tenantId} - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Cache the client
  tenantClients.set(tenantId, tenantClient);

  return tenantClient;
}

/**
 * Get tenant database client by subdomain
 */
export async function getTenantDbBySubdomain(subdomain: string): Promise<TenantClient> {
  const tenant = await masterDb.tenant.findUnique({
    where: { subdomain },
    select: { tenantId: true }
  });

  if (!tenant) {
    throw new Error(`Tenant not found for subdomain: ${subdomain}`);
  }

  return getTenantDb(tenant.tenantId);
}

/**
 * Close all database connections
 */
export async function closeAllConnections(): Promise<void> {
  // Close master connection
  await masterDb.$disconnect();

  // Close all tenant connections
  for (const client of tenantClients.values()) {
    await client.$disconnect();
  }

  tenantClients.clear();
}

/**
 * Health check for database connections
 */
export async function checkDatabaseHealth(): Promise<{
  master: boolean;
  tenants: Record<string, boolean>;
}> {
  const result = {
    master: false,
    tenants: {} as Record<string, boolean>
  };

  // Check master database
  try {
    await masterDb.$queryRaw`SELECT 1`;
    result.master = true;
  } catch (error) {
    console.error('Master database health check failed:', error);
  }

  // Check tenant databases
  for (const [tenantId, client] of tenantClients.entries()) {
    try {
      await client.$queryRaw`SELECT 1`;
      result.tenants[tenantId] = true;
    } catch (error) {
      console.error(`Tenant database health check failed for ${tenantId}:`, error);
      result.tenants[tenantId] = false;
    }
  }

  return result;
}

/**
 * Create new tenant database with proper schema setup
 */
export async function createTenantDatabase(tenantId: string, subdomain: string): Promise<string> {
  const databaseName = subdomain; // Don't add prefix, template already has it
  const databaseUrl = generateTenantDatabaseUrl(databaseName);

  let newTenantClient: TenantClient | null = null;

  try {
    console.log(`Creating tenant database: ${databaseName}`);
    
    // Create the database using raw SQL
    await masterDb.$executeRawUnsafe(`CREATE DATABASE "omsms_tenant_${subdomain}"`);

    // Create tenant client to apply schema
    newTenantClient = new TenantClient({
      datasources: {
        db: { url: databaseUrl }
      }
    });

    // Connect to new database
    await newTenantClient.$connect();
    
    console.log(`Connected to new tenant database: ${databaseName}`);
    
    // Apply database schema by running the necessary migrations
    // We need to actually create the tables
    await applyTenantSchema(newTenantClient, subdomain);
    
    // Add basic seed data
    await seedTenantData(newTenantClient, subdomain);
    
    console.log(`Database schema applied for tenant: ${subdomain}`);

    // Close the connection
    await newTenantClient.$disconnect();

    return databaseUrl;
  } catch (error) {
    console.error(`Failed to create tenant database for ${subdomain}:`, error);
    
    // Ensure tenant client is disconnected before cleanup
    if (newTenantClient) {
      try {
        await newTenantClient.$disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting tenant client:', disconnectError);
      }
    }
    
    // Cleanup on failure - attempt to drop the database if it was created
    try {
      await masterDb.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      console.log(`Cleaned up failed database: ${databaseName}`);
    } catch (cleanupError) {
      console.error(`Failed to cleanup database ${databaseName}:`, cleanupError);
    }
    
    throw new Error(`Database creation failed: ${error}`);
  }
}

/**
 * Apply schema to a new tenant database
 */
async function applyTenantSchema(tenantClient: TenantClient, subdomain: string): Promise<void> {
  try {
    console.log(`🔧 Applying complete schema for tenant: ${subdomain}`);
    
    // Apply the complete database schema from our existing migration
    // This creates all the necessary tables with proper relationships
    
    // Create roles table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "roles" (
        "role_id" TEXT NOT NULL,
        "role_name" TEXT NOT NULL,
        "role_description" TEXT,
        "role_color" TEXT,
        "role_level" INTEGER NOT NULL DEFAULT 0,
        "is_system_role" BOOLEAN NOT NULL DEFAULT false,
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
      )
    `);

    // Create role_permissions table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "role_permissions" (
        "role_permission_id" TEXT NOT NULL,
        "role_id" TEXT NOT NULL,
        "resource" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "conditions" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_permission_id")
      )
    `);

    // Create locations table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "locations" (
        "location_id" TEXT NOT NULL,
        "location_name" TEXT NOT NULL,
        "address" TEXT,
        "city" TEXT,
        "state" TEXT,
        "country" TEXT,
        "postal_code" TEXT,
        "contact_person" TEXT,
        "contact_mobile" TEXT,
        "contact_email" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "settings" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id")
      )
    `);

    // Create departments table with color_code
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "departments" (
        "department_id" TEXT NOT NULL,
        "department_name" TEXT NOT NULL,
        "color_code" TEXT,
        "description" TEXT,
        "head_user_id" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "config" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
      )
    `);

    // Create users table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "users" (
        "user_id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password_hash" TEXT NOT NULL,
        "first_name" TEXT,
        "last_name" TEXT,
        "mobile_number" TEXT,
        "address" TEXT,
        "role_id" TEXT NOT NULL,
        "department_id" TEXT,
        "location_id" TEXT,
        "permissions" JSONB NOT NULL DEFAULT '{}',
        "preferences" JSONB NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'active',
        "last_login_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
      )
    `);

    // Create sales_persons table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "sales_persons" (
        "salesperson_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "employee_code" TEXT,
        "territory" TEXT,
        "commission_rate" DECIMAL(5,2),
        "target_amount" DECIMAL(12,2),
        "manager_id" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "performance_metrics" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "sales_persons_pkey" PRIMARY KEY ("salesperson_id")
      )
    `);

    // Create vehicles table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "vehicles" (
        "vehicle_id" TEXT NOT NULL,
        "car_number" TEXT NOT NULL,
        "owner_name" TEXT NOT NULL,
        "owner_mobile" TEXT,
        "owner_email" TEXT,
        "owner_address" TEXT,
        "model_name" TEXT,
        "brand_name" TEXT,
        "vehicle_type" TEXT,
        "location_id" TEXT,
        "salesperson_id" TEXT,
        "coordinator_id" TEXT,
        "supervisor_id" TEXT,
        "inward_date" DATE,
        "expected_delivery_date" DATE,
        "actual_delivery_date" DATE,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "vehicle_details" JSONB NOT NULL DEFAULT '{}',
        "custom_fields" JSONB NOT NULL DEFAULT '{}',
        "created_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
      )
    `);

    // Create workflows table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "workflows" (
        "workflow_id" TEXT NOT NULL,
        "workflow_name" TEXT NOT NULL,
        "workflow_type" TEXT NOT NULL,
        "stages" JSONB NOT NULL DEFAULT '[]',
        "rules" JSONB NOT NULL DEFAULT '{}',
        "notifications" JSONB NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "workflows_pkey" PRIMARY KEY ("workflow_id")
      )
    `);

    // Create workflow_instances table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "workflow_instances" (
        "instance_id" TEXT NOT NULL,
        "workflow_id" TEXT,
        "entity_type" TEXT NOT NULL,
        "entity_id" TEXT NOT NULL,
        "current_stage" TEXT NOT NULL,
        "stage_data" JSONB NOT NULL DEFAULT '{}',
        "stage_history" JSONB NOT NULL DEFAULT '[]',
        "status" TEXT NOT NULL DEFAULT 'in_progress',
        "assigned_to" TEXT,
        "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("instance_id")
      )
    `);

    // Create additional required tables
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "product_categories" (
        "category_id" TEXT NOT NULL,
        "category_name" TEXT NOT NULL,
        "parent_category_id" TEXT,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "product_categories_pkey" PRIMARY KEY ("category_id")
      )
    `);

    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "products" (
        "product_id" TEXT NOT NULL,
        "product_name" TEXT NOT NULL,
        "brand_name" TEXT,
        "category_id" TEXT,
        "price" DECIMAL(10,2),
        "installation_time_hours" INTEGER,
        "specifications" JSONB NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
      )
    `);

    // Create installations table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "installations" (
        "installation_id" TEXT NOT NULL,
        "vehicle_id" TEXT,
        "product_id" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "amount" DECIMAL(10,2),
        "installation_date" DATE,
        "installer_id" TEXT,
        "quality_checked_by" TEXT,
        "quality_check_date" DATE,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "installation_notes" TEXT,
        "installation_details" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "installations_pkey" PRIMARY KEY ("installation_id")
      )
    `);

    // Create media_files table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "media_files" (
        "file_id" TEXT NOT NULL,
        "entity_type" TEXT NOT NULL,
        "entity_id" TEXT NOT NULL,
        "file_category" TEXT NOT NULL,
        "file_subcategory" TEXT,
        "original_filename" TEXT NOT NULL,
        "stored_filename" TEXT NOT NULL,
        "file_path" TEXT NOT NULL,
        "file_size" BIGINT NOT NULL,
        "mime_type" TEXT NOT NULL,
        "file_extension" TEXT NOT NULL,
        "width" INTEGER,
        "height" INTEGER,
        "duration" INTEGER,
        "storage_provider" TEXT NOT NULL DEFAULT 'local',
        "cdn_url" TEXT,
        "is_public" BOOLEAN NOT NULL DEFAULT false,
        "workflow_stage" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "tags" JSONB NOT NULL DEFAULT '[]',
        "uploaded_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "media_files_pkey" PRIMARY KEY ("file_id")
      )
    `);

    // Create audit_logs table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "audit_logs" (
        "log_id" TEXT NOT NULL,
        "user_id" TEXT,
        "action" TEXT NOT NULL,
        "entity_type" TEXT,
        "entity_id" TEXT,
        "old_values" JSONB,
        "new_values" JSONB,
        "details" JSONB,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
      )
    `);

    // Create notifications table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "notifications" (
        "id" SERIAL NOT NULL,
        "notification_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "action_label" TEXT,
        "action_url" TEXT,
        "entity_type" TEXT,
        "entity_id" TEXT,
        "read_at" TIMESTAMP(3),
        "created_by" TEXT,
        "expires_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      )
    `);

    // Create payments table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "payments" (
        "payment_id" TEXT NOT NULL,
        "vehicle_id" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "outstanding_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "payment_method" TEXT,
        "transaction_id" TEXT,
        "reference_number" TEXT,
        "bank_details" JSONB DEFAULT '{}',
        "payment_date" TIMESTAMP(3),
        "due_date" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "invoice_number" TEXT,
        "workflow_stage" TEXT,
        "created_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
      )
    `);

    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "system_config" (
        "config_id" TEXT NOT NULL,
        "config_category" TEXT NOT NULL,
        "config_key" TEXT NOT NULL,
        "config_value" JSONB NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "system_config_pkey" PRIMARY KEY ("config_id")
      )
    `);

    // Create indexes
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name")`);
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "role_permissions_role_id_resource_action_key" ON "role_permissions"("role_id", "resource", "action")`);
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "users_email_key" ON "users"("email")`);
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "sales_persons_user_id_key" ON "sales_persons"("user_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "vehicles_car_number_key" ON "vehicles"("car_number")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_vehicles_status" ON "vehicles"("status")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_vehicles_location" ON "vehicles"("location_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_vehicles_salesperson" ON "vehicles"("salesperson_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_workflow_instances_entity" ON "workflow_instances"("entity_type", "entity_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_workflow_instances_status" ON "workflow_instances"("status")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_media_entity" ON "media_files"("entity_type", "entity_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_media_category" ON "media_files"("file_category", "file_subcategory")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id", "created_at")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "read_at")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_notifications_notification_id" ON "notifications"("notification_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_notifications_entity" ON "notifications"("entity_type", "entity_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_payments_vehicle" ON "payments"("vehicle_id")`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX "idx_payments_status" ON "payments"("status")`);
    await tenantClient.$executeRawUnsafe(`CREATE UNIQUE INDEX "system_config_config_category_config_key_key" ON "system_config"("config_category", "config_key")`);

    // Add foreign key constraints
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "users" ADD CONSTRAINT "users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "sales_persons" ADD CONSTRAINT "sales_persons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "sales_persons" ADD CONSTRAINT "sales_persons_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("workflow_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "product_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "installations" ADD CONSTRAINT "installations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "installations" ADD CONSTRAINT "installations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "installations" ADD CONSTRAINT "installations_installer_id_fkey" FOREIGN KEY ("installer_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "installations" ADD CONSTRAINT "installations_quality_checked_by_fkey" FOREIGN KEY ("quality_checked_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "media_files" ADD CONSTRAINT "media_files_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);

    console.log(`✅ Complete schema applied for tenant: ${subdomain}`);
    
  } catch (error) {
    console.error(`❌ Failed to apply schema for tenant ${subdomain}:`, error);
    throw error;
  }
}

/**
 * Seed basic data for a new tenant database
 */
async function seedTenantData(tenantClient: TenantClient, subdomain: string): Promise<void> {
  try {
    console.log(`🌱 Seeding basic data for tenant: ${subdomain}`);
    
    // Generate unique IDs for seed data
    const adminRoleId = `role_${Date.now()}_admin`;
    const userRoleId = `role_${Date.now()}_user`;
    
    // 1. Create basic roles
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "roles" ("role_id", "role_name", "role_description", "role_level", "is_system_role", "created_at", "updated_at")
      VALUES 
        ('${adminRoleId}', 'Admin', 'System Administrator with full access', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('${userRoleId}', 'User', 'Standard user with basic access', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    // 2. Create basic permissions for admin role
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "role_permissions" ("role_permission_id", "role_id", "resource", "action", "created_at")
      VALUES 
        ('perm_${Date.now()}_1', '${adminRoleId}', '*', '*', CURRENT_TIMESTAMP),
        ('perm_${Date.now()}_2', '${userRoleId}', 'vehicles', 'read', CURRENT_TIMESTAMP),
        ('perm_${Date.now()}_3', '${userRoleId}', 'dashboard', 'read', CURRENT_TIMESTAMP)
    `);

    // 3. Create a default location
    const locationId = `location_${Date.now()}_default`;
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "locations" ("location_id", "location_name", "address", "city", "status", "created_at", "updated_at")
      VALUES ('${locationId}', 'Main Office', 'Default Location', 'City', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    // 4. Create a default department  
    const departmentId = `dept_${Date.now()}_default`;
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "departments" ("department_id", "department_name", "color_code", "description", "status", "created_at", "updated_at")
      VALUES ('${departmentId}', 'General', '#3B82F6', 'General Department', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    // 5. Create default workflows
    const installationWorkflowId = `workflow_${Date.now()}_installation`;
    const paymentWorkflowId = `workflow_${Date.now()}_payment`;
    
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "workflows" ("workflow_id", "workflow_name", "workflow_type", "stages", "rules", "notifications", "status", "created_at", "updated_at")
      VALUES 
        ('${installationWorkflowId}', 'Vehicle Installation Process', 'installation', 
         '[
           {"key": "order_confirmed", "label": "Order Confirmed", "order": 1, "required": true},
           {"key": "start_installation", "label": "Start Installation", "order": 2, "required": true},
           {"key": "quality_checked", "label": "Quality Checked", "order": 3, "required": true},
           {"key": "delivered", "label": "Delivered", "order": 4, "required": true}
         ]'::jsonb, 
         '{"allowSkipping": false, "requireNotes": true, "notifyOnCompletion": true}'::jsonb, 
         '{"onStart": true, "onComplete": true, "emailNotifications": false}'::jsonb, 
         'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('${paymentWorkflowId}', 'Vehicle Payment Process', 'payment', 
         '[
           {"key": "draft", "label": "Draft", "order": 1, "required": true},
           {"key": "invoice", "label": "Invoice", "order": 2, "required": true},
           {"key": "payment", "label": "Payment", "order": 3, "required": true}
         ]'::jsonb, 
         '{"allowSkipping": false, "requireApproval": true, "notifyOnCompletion": true}'::jsonb, 
         '{"onStart": true, "onComplete": true, "emailNotifications": true}'::jsonb, 
         'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    // 6. Create basic system configuration
    await tenantClient.$executeRawUnsafe(`
      INSERT INTO "system_config" ("config_id", "config_category", "config_key", "config_value", "description", "created_at", "updated_at")
      VALUES 
        ('config_${Date.now()}_1', 'organization', 'name', '"${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Organization"', 'Organization name', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('config_${Date.now()}_2', 'system', 'timezone', '"UTC"', 'System timezone', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('config_${Date.now()}_3', 'system', 'currency', '"USD"', 'Default currency', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    console.log(`✅ Basic data seeded for tenant: ${subdomain}`);
    
  } catch (error) {
    console.error(`❌ Failed to seed data for tenant ${subdomain}:`, error);
    throw error;
  }
}

/**
 * Middleware to attach database clients to request
 */
export function attachDatabases() {
  return async (req: any, res: any, next: any) => {
    try {
      // Always attach master database
      req.masterDb = masterDb;

      // Attach tenant database if tenant is identified
      if (req.tenantId) {
        try {
          req.tenantDb = await getTenantDb(req.tenantId);
        } catch (tenantError) {
          console.error(`Failed to connect to tenant database for ${req.tenantId}:`, tenantError);
          
          // Provide more specific error messages
          let errorMessage = 'Database connection failed';
          if (tenantError instanceof Error) {
            if (tenantError.message.includes('Tenant not found')) {
              errorMessage = `Tenant '${req.tenantId}' not found. Please check your configuration.`;
            } else if (tenantError.message.includes('not active')) {
              errorMessage = `Tenant '${req.tenantId}' is not active.`;
            } else if (tenantError.message.includes('Failed to connect')) {
              errorMessage = `Cannot connect to tenant database for '${req.tenantId}'. Please ensure the database is running.`;
            }
          }

          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'TENANT_DB_CONNECTION_ERROR',
            tenantId: req.tenantId
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Database middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR'
      });
      return; // ✅ Prevent continued execution after error response
    }
  };
}