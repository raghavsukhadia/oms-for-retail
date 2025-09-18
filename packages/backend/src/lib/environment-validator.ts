import { config } from '../config/environment';

/**
 * Environment validation utility for SaaS application
 */
export class EnvironmentValidator {
  /**
   * Validate critical environment variables for production
   */
  static validateProduction(): void {
    const errors: string[] = [];

    // Validate JWT Secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (process.env.JWT_SECRET?.includes('development') || 
        process.env.JWT_SECRET?.includes('change-in-production')) {
      errors.push('JWT_SECRET appears to be a development/default value');
    }

    // Validate Database URLs
    if (process.env.MASTER_DATABASE_URL?.includes('localhost')) {
      errors.push('MASTER_DATABASE_URL should not contain localhost in production');
    }

    if (process.env.DEMO_TENANT_DATABASE_URL?.includes('localhost')) {
      errors.push('DEMO_TENANT_DATABASE_URL should not contain localhost in production');
    }

    // Validate CORS Origins
    if (process.env.CORS_ORIGIN?.includes('localhost')) {
      errors.push('CORS_ORIGIN should not contain localhost in production');
    }

    // Validate Frontend URL
    if (process.env.FRONTEND_URL?.includes('localhost')) {
      errors.push('FRONTEND_URL should not contain localhost in production');
    }

    // Validate Storage Configuration
    if (process.env.STORAGE_PROVIDER === 'local' && process.env.NODE_ENV === 'production') {
      errors.push('Local storage should not be used in production');
    }

    // Validate Email Configuration
    if (process.env.EMAIL_PROVIDER === 'console' && process.env.NODE_ENV === 'production') {
      errors.push('Console email provider should not be used in production');
    }

    if (errors.length > 0) {
      throw new Error(`Production environment validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate development environment
   */
  static validateDevelopment(): void {
    const warnings: string[] = [];

    if (!process.env.JWT_SECRET) {
      warnings.push('JWT_SECRET not set, using default (insecure for production)');
    }

    if (!process.env.NEXT_PUBLIC_API_URL) {
      warnings.push('NEXT_PUBLIC_API_URL not set, using localhost fallback');
    }

    if (warnings.length > 0) {
      console.warn('Development environment warnings:', warnings.join('\n'));
    }
  }

  /**
   * Validate required environment variables
   */
  static validateRequired(): void {
    const required = [
      'NODE_ENV',
      'PORT',
      'MASTER_DATABASE_URL',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate tenant-specific configuration
   */
  static validateTenantConfig(): void {
    if (process.env.NODE_ENV === 'production') {
      // Ensure no hardcoded tenant references
      if (config.app.corsOrigin.includes('demo.')) {
        throw new Error('Hardcoded demo tenant found in production CORS configuration');
      }

      if (config.app.frontendUrl.includes('demo.')) {
        throw new Error('Hardcoded demo tenant found in production frontend URL');
      }
    }
  }

  /**
   * Run all validations based on environment
   */
  static validate(): void {
    this.validateRequired();
    this.validateTenantConfig();

    if (process.env.NODE_ENV === 'production') {
      this.validateProduction();
    } else {
      this.validateDevelopment();
    }

    console.log(`✅ Environment validation passed for ${process.env.NODE_ENV} environment`);
  }
}
