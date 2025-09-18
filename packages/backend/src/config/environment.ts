import { parseEnvInt, parseEnvBool } from '@omsms/shared';

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
      poolSize: number;
    };
  };

  // Storage Configuration
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
  const requiredEnvVars = ['MASTER_DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config: Config = {
    nodeEnv,
    port: parseEnvInt(process.env.PORT, 3001),

    database: {
      master: {
        url: process.env.MASTER_DATABASE_URL!,
        pool: {
          min: parseEnvInt(process.env.DB_POOL_MIN, 2),
          max: parseEnvInt(process.env.DB_POOL_MAX, 20)
        }
      },
      tenant: {
        poolSize: parseEnvInt(process.env.TENANT_DB_POOL_SIZE, 10)
      }
    },

    storage: {
      provider: (process.env.STORAGE_PROVIDER as any) || 'local',
      local: {
        uploadPath: process.env.LOCAL_UPLOAD_PATH || './packages/backend/uploads',
        baseUrl: process.env.LOCAL_BASE_URL || `http://localhost:${parseEnvInt(process.env.PORT, 3001)}/uploads`
      },
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
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      maxFileSize: parseEnvInt(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024), // 100MB
      rateLimitMax: parseEnvInt(process.env.RATE_LIMIT_MAX, 100),
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