// Constants for OMSMS application

// Application constants
export const APP_NAME = 'OMSMS';
export const APP_DESCRIPTION = 'Order Management System for Vehicle Accessories';
export const APP_VERSION = '1.0.0';

// Database constants
export const MASTER_DB_NAME = 'omsms_master';
export const TENANT_DB_PREFIX = 'omsms_tenant_';

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

// User roles and permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  COORDINATOR: 'coordinator',
  SUPERVISOR: 'supervisor',
  SALESPERSON: 'salesperson',
  INSTALLER: 'installer'
} as const;

// Financial permission resources and actions
export const FINANCIAL_RESOURCES = {
  PAYMENTS: 'payments',
  INVOICES: 'invoices', 
  PRICING: 'pricing',
  FINANCIAL_REPORTS: 'financial_reports',
  COST_ANALYSIS: 'cost_analysis',
  ACCOUNT_STATEMENTS: 'account_statements',
  REVENUE_DATA: 'revenue_data'
} as const;

export const FINANCIAL_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  SEND: 'send',
  MANAGE_DISCOUNTS: 'manage_discounts',
  VIEW_DETAILED: 'view_detailed',
  VIEW_PROFIT_MARGINS: 'view_profit_margins'
} as const;

export const DEFAULT_USER_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    vehicles: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    locations: ['create', 'read', 'update', 'delete'],
    departments: ['create', 'read', 'update', 'delete'],
    workflows: ['create', 'read', 'update', 'delete'],
    media: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export'],
    settings: ['read', 'update'],
    // Financial permissions - Admin has full access
    payments: ['view', 'create', 'update', 'approve', 'export'],
    invoices: ['view', 'create', 'update', 'send', 'export'],
    pricing: ['view', 'update', 'manage_discounts'],
    financial_reports: ['view', 'export', 'view_detailed'],
    cost_analysis: ['view', 'export'],
    account_statements: ['view', 'export'],
    revenue_data: ['view', 'export', 'view_profit_margins']
  },
  [USER_ROLES.MANAGER]: {
    vehicles: ['create', 'read', 'update'],
    users: ['read', 'update'],
    locations: ['read'],
    departments: ['read'],
    workflows: ['read', 'update'],
    media: ['create', 'read', 'update'],
    reports: ['read', 'export'],
    settings: ['read'],
    // Financial permissions - Manager has operational access
    payments: ['view', 'create', 'update', 'export'],
    invoices: ['view', 'create', 'update', 'send', 'export'],
    pricing: ['view', 'update'],
    financial_reports: ['view', 'export', 'view_detailed'],
    cost_analysis: ['view', 'export'],
    account_statements: ['view', 'export'],
    revenue_data: ['view', 'export']
  },
  [USER_ROLES.COORDINATOR]: {
    vehicles: ['create', 'read', 'update'],
    users: ['read'],
    locations: ['read'],
    departments: ['read'],
    workflows: ['read', 'update'],
    media: ['create', 'read', 'update'],
    reports: ['read'],
    settings: ['read'],
    // Financial permissions - Coordinator has limited access
    payments: ['view', 'create'],
    invoices: ['view', 'create'],
    pricing: ['view'],
    financial_reports: ['view'],
    cost_analysis: ['view'],
    account_statements: ['view'],
    revenue_data: ['view']
  },
  [USER_ROLES.SUPERVISOR]: {
    vehicles: ['read', 'update'],
    users: ['read'],
    locations: ['read'],
    departments: ['read'],
    workflows: ['read', 'update'],
    media: ['create', 'read', 'update'],
    reports: ['read'],
    settings: ['read'],
    // Financial permissions - Supervisor has view-only access
    payments: ['view'],
    invoices: ['view'],
    pricing: ['view'],
    financial_reports: ['view'],
    cost_analysis: ['view'],
    account_statements: [],
    revenue_data: []
  },
  [USER_ROLES.SALESPERSON]: {
    vehicles: ['create', 'read', 'update'],
    users: ['read'],
    locations: ['read'],
    departments: ['read'],
    workflows: ['read'],
    media: ['create', 'read'],
    reports: ['read'],
    settings: ['read'],
    // Financial permissions - Salesperson has pricing and invoice access
    payments: ['view'],
    invoices: ['view', 'create'],
    pricing: ['view', 'manage_discounts'],
    financial_reports: [],
    cost_analysis: [],
    account_statements: [],
    revenue_data: ['view']
  },
  [USER_ROLES.INSTALLER]: {
    vehicles: ['read', 'update'],
    users: ['read'],
    locations: ['read'],
    departments: ['read'],
    workflows: ['read', 'update'],
    media: ['create', 'read', 'update'],
    reports: [],
    settings: ['read'],
    // Financial permissions - Installer has minimal access
    payments: [],
    invoices: [],
    pricing: [],
    financial_reports: [],
    cost_analysis: [],
    account_statements: [],
    revenue_data: []
  }
} as const;

// Vehicle statuses
export const VEHICLE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  QUALITY_CHECK: 'quality_check',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

// Workflow stages
export const INSTALLATION_WORKFLOW_STAGES = {
  START_INSTALLATION: 'start_installation',
  QUALITY_CHECKED: 'quality_checked',
  DELIVERED: 'delivered'
} as const;

export const ACCOUNT_WORKFLOW_STAGES = {
  DRAFT: 'draft',
  INVOICE: 'invoice',
  PAYMENT: 'payment'
} as const;

// File upload constants
export const MAX_FILE_SIZE = {
  PHOTO: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 5 * 1024 * 1024 // 5MB
} as const;

export const ALLOWED_FILE_TYPES = {
  PHOTO: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
} as const;

export const FILE_CATEGORIES = {
  PHOTO: 'photo',
  VIDEO: 'video', 
  DOCUMENT: 'document'
} as const;

export const FILE_SUBCATEGORIES = {
  BEFORE_INSTALLATION: 'before_installation',
  AFTER_INSTALLATION: 'after_installation',
  DAMAGE_DOCUMENTATION: 'damage_documentation',
  INVOICE: 'invoice',
  CERTIFICATE: 'certificate',
  WARRANTY: 'warranty'
} as const;

// Storage providers
export const STORAGE_PROVIDERS = {
  LOCAL: 'local',
  S3: 's3',
  AZURE: 'azure',
  CLOUDFLARE: 'cloudflare'
} as const;

// Email providers
export const EMAIL_PROVIDERS = {
  CONSOLE: 'console',
  SMTP: 'smtp',
  RESEND: 'resend'
} as const;

// Cache providers
export const CACHE_PROVIDERS = {
  MEMORY: 'memory',
  REDIS: 'redis'
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
} as const;

export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.STARTER]: {
    maxVehicles: 100,
    maxUsers: 10,
    storageGB: 10,
    customWorkflows: false,
    apiAccess: false,
    priority_support: false
  },
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    maxVehicles: 1000,
    maxUsers: 50,
    storageGB: 100,
    customWorkflows: true,
    apiAccess: true,
    priority_support: true
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    maxVehicles: -1, // Unlimited
    maxUsers: -1, // Unlimited
    storageGB: 1000,
    customWorkflows: true,
    apiAccess: true,
    priority_support: true,
    whiteLabel: true,
    dedicatedSupport: true
  }
} as const;

// Status values
export const STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted'
} as const;

// Date formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  US: 'MM/DD/YYYY',
  EU: 'DD/MM/YYYY',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss'
} as const;

// Time zones (common ones)
export const TIMEZONES = {
  UTC: 'UTC',
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  IST: 'Asia/Kolkata',
  GMT: 'Europe/London'
} as const;

// Currency codes
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  INR: 'INR',
  CAD: 'CAD',
  AUD: 'AUD'
} as const;

// API rate limiting
export const RATE_LIMITS = {
  DEFAULT: 100, // requests per minute
  AUTH: 5, // login attempts per minute
  UPLOAD: 10, // file uploads per minute
  EXPORT: 5 // report exports per minute
} as const;

// Socket.io events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  VEHICLE_UPDATED: 'vehicle_updated',
  WORKFLOW_UPDATED: 'workflow_updated',
  NOTIFICATION: 'notification',
  USER_ACTIVITY: 'user_activity',
  SYSTEM_ANNOUNCEMENT: 'system_announcement'
} as const;

// Cache keys
export const CACHE_KEYS = {
  USER_SESSION: 'user_session:',
  TENANT_CONFIG: 'tenant_config:',
  VEHICLE_STATUS: 'vehicle_status:',
  WORKFLOW_INSTANCE: 'workflow_instance:',
  FILE_METADATA: 'file_metadata:'
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  SESSION: 86400 // 24 hours
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  STORAGE_ERROR: 'STORAGE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  TENANT: {
    timezone: 'Asia/Kolkata', // Default to Indian timezone
    currency: CURRENCIES.INR, // Default to Indian Rupee
    dateFormat: 'DD/MM/YYYY', // Indian date format
    theme: 'light',
    language: 'en'
  },
  USER: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sound: true
    }
  }
} as const;