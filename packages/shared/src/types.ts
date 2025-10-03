// Core shared types for OMSMS SaaS platform

export interface Tenant {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  databaseUrl: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings: Record<string, any>;
  features: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  address?: string;
  role: UserRole;
  departmentId?: string;
  locationId?: string;
  permissions: Record<string, any>;
  preferences: Record<string, any>;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 
  | 'admin' 
  | 'manager' 
  | 'coordinator' 
  | 'supervisor' 
  | 'salesperson' 
  | 'installer';

export interface Location {
  locationId: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactPerson?: string;
  contactMobile?: string;
  contactEmail?: string;
  status: 'active' | 'inactive';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  departmentId: string;
  departmentName: string;
  colorCode?: string;
  description?: string;
  headUserId?: string;
  status: 'active' | 'inactive';
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  vehicleId: string;
  carNumber: string;
  ownerName: string;
  ownerMobile?: string;
  ownerEmail?: string;
  ownerAddress?: string;
  modelName?: string;
  brandName?: string;
  vehicleType?: string;
  locationId?: string;
  salespersonId?: string;
  coordinatorId?: string;
  supervisorId?: string;
  inwardDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  status: VehicleStatus;
  vehicleDetails: Record<string, any>;
  customFields: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleStatus = 
  | 'pending'
  | 'in_progress' 
  | 'quality_check'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export type InstallationStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'partial' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled';

export type WorkflowStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface WorkflowInstance {
  instanceId: string;
  workflowId?: string;
  entityType: string;
  entityId: string;
  currentStage: string;
  stageData: Record<string, any>;
  stageHistory: WorkflowStageHistory[];
  status: 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStageHistory {
  stage: string;
  userId: string;
  timestamp: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface MediaFile {
  fileId: string;
  entityType: string;
  entityId: string;
  fileCategory: 'photo' | 'video' | 'document';
  fileSubcategory?: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  width?: number;
  height?: number;
  duration?: number;
  storageProvider: 'local' | 's3' | 'azure' | 'cloudflare';
  cdnUrl?: string;
  isPublic: boolean;
  workflowStage?: string;
  metadata: Record<string, any>;
  tags: string[];
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface AuthTokenPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  permissions: Record<string, any>;
  iat: number;
  exp: number;
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  tenant: Pick<Tenant, 'tenantId' | 'tenantName' | 'subdomain' | 'features'>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  role?: UserRole;
  departmentId?: string;
  locationId?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TenantRegistrationRequest {
  tenantName: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
}

export interface TenantRegistrationResponse {
  tenant: Tenant;
  adminUser: Omit<User, 'passwordHash'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface TenantContext {
  tenantId: string;
  subdomain: string;
  databaseUrl: string;
  settings: Record<string, any>;
  features: Record<string, any>;
}

export interface ConfigSettings {
  database: {
    master: {
      url: string;
      pool: { min: number; max: number };
    };
    tenant: {
      poolSize: number;
    };
  };
  storage: {
    provider: 'local' | 's3' | 'azure' | 'cloudflare';
    local?: {
      uploadPath: string;
      baseUrl: string;
    };
    s3?: {
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    azure?: {
      connectionString: string;
      containerName: string;
    };
    cloudflare?: {
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
    };
  };
  cache: {
    provider: 'memory' | 'redis';
    redis?: {
      url: string;
    };
  };
  app: {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    corsOrigin: string;
    frontendUrl: string;
  };
  email: {
    provider: 'console' | 'smtp' | 'resend';
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    resend?: {
      apiKey: string;
    };
  };
}

// Event types for real-time updates
export interface SocketEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  tenantId: string;
}

export interface VehicleUpdateEvent extends SocketEvent {
  type: 'vehicle_updated';
  payload: {
    vehicleId: string;
    status: VehicleStatus;
    updatedBy: string;
    vehicle: Partial<Vehicle>;
  };
}

export interface WorkflowUpdateEvent extends SocketEvent {
  type: 'workflow_updated';
  payload: {
    workflowInstanceId: string;
    stage: string;
    updatedBy: string;
    metadata?: Record<string, any>;
  };
}

export interface NotificationEvent extends SocketEvent {
  type: 'notification';
  payload: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    actionUrl?: string;
    metadata?: Record<string, any>;
  };
}

// Organization Settings Types
export interface OrganizationSettings {
  companyName: string;
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  gstDetails?: {
    gstNumber?: string;
    panNumber?: string;
    registrationDate?: string;
  };
  bankDetails?: BankDetails[];
  qrCodes?: QRCode[];
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  businessSettings?: {
    businessType?: string;
    establishedYear?: number;
    licenseNumber?: string;
    certifications?: string[];
  };
}

export interface BankDetails {
  id?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  accountType: 'savings' | 'current' | 'cc' | 'od';
  branchName?: string;
  isDefault?: boolean;
}

export interface QRCode {
  id?: string;
  name: string;
  type: 'payment' | 'contact' | 'website' | 'custom';
  content: string;
  description?: string;
  isActive?: boolean;
}