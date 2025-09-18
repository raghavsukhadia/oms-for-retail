import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface StorageConfig {
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
}

export interface StorageFile {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
}

export interface StorageResult {
  fileName: string;
  filePath: string;
  url: string;
  size: number;
}

export interface StorageProvider {
  upload(file: StorageFile, destination: string): Promise<StorageResult>;
  delete(filePath: string): Promise<void>;
  getUrl(filePath: string): string;
  getSignedUrl?(filePath: string, expiresIn?: number): Promise<string>;
  exists(filePath: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private config: NonNullable<StorageConfig['local']>;

  constructor(config: NonNullable<StorageConfig['local']>) {
    this.config = config;
  }

  async upload(file: StorageFile, destination: string): Promise<StorageResult> {
    const fullPath = path.join(this.config.uploadPath, destination);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    if (file.buffer) {
      await fs.writeFile(fullPath, file.buffer);
    } else if (file.stream) {
      const writeStream = createWriteStream(fullPath);
      await pipeline(file.stream, writeStream);
    } else {
      throw new Error('File must have either buffer or stream');
    }

    return {
      fileName: file.fileName,
      filePath: destination,
      url: this.getUrl(destination),
      size: file.size
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.config.uploadPath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getUrl(filePath: string): string {
    return `${this.config.baseUrl}/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.config.uploadPath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

// AWS S3 Storage Provider (placeholder for future implementation)
export class S3StorageProvider implements StorageProvider {
  private config: NonNullable<StorageConfig['s3']>;

  constructor(config: NonNullable<StorageConfig['s3']>) {
    this.config = config;
  }

  async upload(file: StorageFile, destination: string): Promise<StorageResult> {
    // TODO: Implement S3 upload using AWS SDK
    throw new Error('S3 storage not yet implemented');
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement S3 delete
    throw new Error('S3 storage not yet implemented');
  }

  getUrl(filePath: string): string {
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`;
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    // TODO: Implement S3 signed URL
    throw new Error('S3 storage not yet implemented');
  }

  async exists(filePath: string): Promise<boolean> {
    // TODO: Implement S3 existence check
    throw new Error('S3 storage not yet implemented');
  }
}

// Azure Blob Storage Provider (placeholder for future implementation)
export class AzureStorageProvider implements StorageProvider {
  private config: NonNullable<StorageConfig['azure']>;

  constructor(config: NonNullable<StorageConfig['azure']>) {
    this.config = config;
  }

  async upload(file: StorageFile, destination: string): Promise<StorageResult> {
    // TODO: Implement Azure upload
    throw new Error('Azure storage not yet implemented');
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement Azure delete
    throw new Error('Azure storage not yet implemented');
  }

  getUrl(filePath: string): string {
    return `https://${this.config.containerName}.blob.core.windows.net/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    // TODO: Implement Azure existence check
    throw new Error('Azure storage not yet implemented');
  }
}

// Cloudflare R2 Storage Provider (placeholder for future implementation)
export class CloudflareStorageProvider implements StorageProvider {
  private config: NonNullable<StorageConfig['cloudflare']>;

  constructor(config: NonNullable<StorageConfig['cloudflare']>) {
    this.config = config;
  }

  async upload(file: StorageFile, destination: string): Promise<StorageResult> {
    // TODO: Implement Cloudflare R2 upload
    throw new Error('Cloudflare R2 storage not yet implemented');
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement Cloudflare R2 delete
    throw new Error('Cloudflare R2 storage not yet implemented');
  }

  getUrl(filePath: string): string {
    return `${this.config.endpoint}/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    // TODO: Implement Cloudflare R2 existence check
    throw new Error('Cloudflare R2 storage not yet implemented');
  }
}

export class StorageManager {
  private provider: StorageProvider;

  constructor(config: StorageConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: StorageConfig): StorageProvider {
    switch (config.provider) {
      case 'local':
        if (!config.local) {
          throw new Error('Local storage configuration is required');
        }
        return new LocalStorageProvider(config.local);
      
      case 's3':
        if (!config.s3) {
          throw new Error('S3 storage configuration is required');
        }
        return new S3StorageProvider(config.s3);
      
      case 'azure':
        if (!config.azure) {
          throw new Error('Azure storage configuration is required');
        }
        return new AzureStorageProvider(config.azure);
      
      case 'cloudflare':
        if (!config.cloudflare) {
          throw new Error('Cloudflare storage configuration is required');
        }
        return new CloudflareStorageProvider(config.cloudflare);
      
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async upload(file: StorageFile, destination: string): Promise<StorageResult> {
    return this.provider.upload(file, destination);
  }

  async delete(filePath: string): Promise<void> {
    return this.provider.delete(filePath);
  }

  getUrl(filePath: string): string {
    return this.provider.getUrl(filePath);
  }

  async getSignedUrl(filePath: string, expiresIn?: number): Promise<string> {
    if (this.provider.getSignedUrl) {
      return this.provider.getSignedUrl(filePath, expiresIn);
    }
    return this.provider.getUrl(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.provider.exists(filePath);
  }

  /**
   * Generate a unique file path for storage
   */
  generateFilePath(
    entityType: string,
    entityId: string,
    category: string,
    fileName: string,
    tenantId: string
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${tenantId}/${entityType}/${entityId}/${category}/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File, allowedTypes: string[], maxSize: number): void {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Check for malicious file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(fileExtension)) {
      throw new Error(`File extension ${fileExtension} is not allowed for security reasons`);
    }
  }
}

// Default storage configuration
export function createStorageManager(): StorageManager {
  const config: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    local: {
      uploadPath: process.env.LOCAL_UPLOAD_PATH || './uploads',
      baseUrl: process.env.LOCAL_BASE_URL || 'http://localhost:3001/uploads'
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
  };

  return new StorageManager(config);
}