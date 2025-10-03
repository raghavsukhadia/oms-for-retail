-- Create admin role and user in tenant database for testing
-- First create roles if they don't exist
INSERT INTO "roles" (
  "role_id",
  "role_name",
  "role_description",
  "role_level",
  "is_system_role",
  "created_at",
  "updated_at"
) VALUES (
  'role_admin_001',
  'admin',
  'System Administrator',
  100,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("role_name") DO NOTHING;

-- Create role permissions for admin
INSERT INTO "role_permissions" (
  "role_permission_id",
  "role_id",
  "resource",
  "action",
  "created_at"
) VALUES (
  'perm_admin_all',
  'role_admin_001',
  '*',
  '*',
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Create admin user
INSERT INTO "users" (
  "user_id",
  "email",
  "password_hash",
  "first_name",
  "last_name",
  "mobile_number",
  "role_id",
  "status",
  "created_at",
  "updated_at"
) VALUES (
  'user_admin_001',
  'admin@demo.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYm4l7/PRQ7NQFa', -- admin123
  'Admin',
  'User',
  '+91-9999999999',
  'role_admin_001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "role_id" = EXCLUDED."role_id",
  "updated_at" = CURRENT_TIMESTAMP;

