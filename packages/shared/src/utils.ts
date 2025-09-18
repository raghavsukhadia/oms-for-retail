// Utility functions for OMSMS

import type { ApiResponse, PaginationParams } from './types.js';

/**
 * Creates a standardized API response
 */
export function createApiResponse<T>(
  data?: T,
  message?: string,
  pagination?: ApiResponse<T>['pagination']
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination
  };
}

/**
 * Creates a standardized API error response
 */
export function createApiError(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message
  };
}

/**
 * Generates a tenant database name from tenant ID
 */
export function generateTenantDbName(tenantId: string): string {
  return `omsms_tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Generates a tenant database URL
 */
export function generateTenantDbUrl(baseUrl: string, tenantId: string): string {
  const dbName = generateTenantDbName(tenantId);
  // Remove the database name from base URL and append our tenant DB name
  const urlParts = baseUrl.split('/');
  urlParts[urlParts.length - 1] = dbName;
  return urlParts.join('/');
}

/**
 * Extracts subdomain from hostname
 */
export function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generates a secure random password
 */
export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Checks if file type is allowed based on category
 */
export function isFileTypeAllowed(mimeType: string, category: 'photo' | 'video' | 'document'): boolean {
  const allowedTypes = {
    photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  };
  
  return allowedTypes[category].includes(mimeType);
}

/**
 * Sanitizes filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove special characters and spaces, keep only alphanumeric, dots, and hyphens
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

/**
 * Generates a unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const extension = getFileExtension(originalFilename);
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  const sanitizedName = sanitizeFilename(nameWithoutExt);
  
  return `${sanitizedName}_${timestamp}.${extension}`;
}

/**
 * Calculates pagination metadata
 */
export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Applies default pagination parameters
 */
export function applyPaginationDefaults(params: PaginationParams) {
  return {
    page: params.page || 1,
    limit: Math.min(params.limit || 20, 100), // Max 100 items per page
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
    search: params.search || ''
  };
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if an object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
}

/**
 * Capitalizes first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Formats a date to ISO string without milliseconds
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Parses environment variable as integer with default value
 */
export function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parses environment variable as boolean with default value
 */
export function parseEnvBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Masks sensitive data in logs (passwords, tokens, etc.)
 */
export function maskSensitiveData(obj: any): any {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  const cloned = deepClone(obj);
  
  function maskRecursive(item: any): any {
    if (typeof item === 'object' && item !== null) {
      for (const key in item) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          item[key] = '***MASKED***';
        } else if (typeof item[key] === 'object') {
          item[key] = maskRecursive(item[key]);
        }
      }
    }
    return item;
  }
  
  return maskRecursive(cloned);
}
