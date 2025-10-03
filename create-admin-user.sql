-- Create admin user in tenant database for testing
-- Password hash for 'admin123'
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
  'user_admin_' || EXTRACT(EPOCH FROM NOW())::text,
  'admin@demo.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYm4l7/PRQ7NQFa', -- admin123
  'Admin',
  'User',
  '+91-9999999999',
  (SELECT "role_id" FROM "roles" WHERE "role_name" = 'admin' LIMIT 1),
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "updated_at" = CURRENT_TIMESTAMP;

