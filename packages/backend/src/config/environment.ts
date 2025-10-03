import { parseEnvInt, parseEnvBool } from '@omsms/shared';

/**
 * URL encode special characters in database passwords
 * This is required for GCP Cloud SQL connections with special characters
 */
function encodeDatabaseUrl(url: string): string {
  // For Cloud SQL Unix socket connections, the URL is already properly formatted
  // and doesn't need additional encoding
  if (url.includes('/cloudsql/')) {
    return url;
  }

  try {
    // Handle template URLs with placeholders - don't try to parse them
    if (url.includes('{database}')) {
      // For template URLs, just encode the password part manually
      return url.replace(/(:)([^@]+)(@)/, (match, colon, password, at) => {
        return colon + encodeURIComponent(password) + at;
      });
    }

    // For regular URLs, try to parse and encode
    const urlObj = new URL(url);

    // If password exists, encode it
    if (urlObj.password) {
      urlObj.password = encodeURIComponent(urlObj.password);
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try manual password encoding
    console.warn('Failed to parse database URL for encoding, trying manual encoding:', error);

    // Try to encode password manually even if URL parsing fails
    try {
      return url.replace(/(:)([^@]+)(@)/, (match, colon, password, at) => {
        return colon + encodeURIComponent(password) + at;
      });
    } catch (manualError) {
      console.warn('Manual password encoding also failed:', manualError);
      return url; // Return original URL as last resort
    }
  }
}

export interface Config {
  // Node Environment
  nodeEnv: string;
  port: number;

  // Database Configuration
  database: {
    master: {
      url: string;
      pool: {
        min: number;
        max: number;
      };
    };
    tenant: {
      urlTemplate: string;
      poolSize: number;
    };
  };

  // Storage Configuration
  storage: {
    provider: 'local' | 's3' | 'azure' | 'cloudflare' | 'gcs'; // Added 'gcs'
    local?: {
      uploadPath: string;
      baseUrl: string;
    };
    gcs?: {
      bucketName: string;
      projectId: string;
      keyFilename?: string;
      credentials?: Record<string, any>;
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

  // Cache Configuration
  cache: {
    provider: 'memory' | 'redis';
    redis?: {
      url: string;
    };
  };

  // Authentication
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };

  // Application Configuration
  app: {
    corsOrigin: string;
    frontendUrl: string;
    maxFileSize: number;
    rateLimitMax: number;
    rateLimitWindowMs: number;
  };

  // Email Configuration
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

  // External Services
  services: {
    stripe?: {
      secretKey: string;
      webhookSecret: string;
    };
  };
}

function loadConfig(): Config {
  // Load environment variables
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Validate required environment variables
  const requiredEnvVars = ['MASTER_DATABASE_URL', 'TENANT_DATABASE_URL_TEMPLATE', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config: Config = {
    nodeEnv,
    port: parseEnvInt(process.env.PORT, 3001),

    database: {
      master: {
        url: encodeDatabaseUrl(process.env.MASTER_DATABASE_URL!),
        pool: {
          min: parseEnvInt(process.env.DB_POOL_MIN, 2),
          max: parseEnvInt(process.env.DB_POOL_MAX, 20)
        }
      },
      tenant: {
        urlTemplate: encodeDatabaseUrl(process.env.TENANT_DATABASE_URL_TEMPLATE!),
        poolSize: parseEnvInt(process.env.TENANT_DB_POOL_SIZE, 10)
      }
    },

    storage: {
      provider: (process.env.STORAGE_PROVIDER as any) || 'local',
      local: {
        uploadPath: process.env.LOCAL_UPLOAD_PATH || './packages/backend/uploads',
        baseUrl: process.env.LOCAL_BASE_URL || `http://localhost:${parseEnvInt(process.env.PORT, 3001)}/uploads`
      },
      gcs: process.env.GCS_BUCKET_NAME ? {
        bucketName: process.env.GCS_BUCKET_NAME!,
        projectId: process.env.GCS_PROJECT_ID!,
        keyFilename: process.env.GCS_KEY_FILENAME,
        credentials: process.env.GCS_CREDENTIALS ? JSON.parse(process.env.GCS_CREDENTIALS) : undefined
      } : undefined,
      s3: process.env.AWS_S3_BUCKET ? {
        region: process.env.AWS_REGION!,
        bucket: process.env.AWS_S3_BUCKET!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      } : undefined,
      azure: process.env.AZURE_STORAGE_CONNECTION_STRING ? {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        containerName: process.env.AZURE_CONTAINER_NAME!
      } : undefined,
      cloudflare: process.env.CLOUDFLARE_R2_ENDPOINT ? {
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
        bucket: process.env.CLOUDFLARE_R2_BUCKET!
      } : undefined
    },

    cache: {
      provider: (process.env.CACHE_PROVIDER as any) || 'memory',
      redis: process.env.REDIS_URL ? {
        url: process.env.REDIS_URL
      } : undefined
    },

    auth: {
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      bcryptRounds: parseEnvInt(process.env.BCRYPT_ROUNDS, 12)
    },

    app: {
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://192.168.1.23:3001',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      maxFileSize: parseEnvInt(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024), // 100MB
      rateLimitMax: parseEnvInt(process.env.RATE_LIMIT_MAX, 1000),
      rateLimitWindowMs: parseEnvInt(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000) // 1 minute
    },

    email: {
      provider: (process.env.EMAIL_PROVIDER as any) || 'console',
      smtp: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST!,
        port: parseEnvInt(process.env.SMTP_PORT, 587),
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      } : undefined,
      resend: process.env.RESEND_API_KEY ? {
        apiKey: process.env.RESEND_API_KEY
      } : undefined
    },

    services: {
      stripe: process.env.STRIPE_SECRET_KEY ? {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
      } : undefined
    }
  };

  return config;
}

// Load and export configuration
export const config = loadConfig();

// Helper function to check if we're in development
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';