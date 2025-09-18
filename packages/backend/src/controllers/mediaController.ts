import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { getTenantDb } from '../lib/database';
import { createStorageManager } from '../lib/storage';
import { MediaProcessor } from '../lib/mediaProcessor';
import {
  ApiResponse
} from '@omsms/shared';

// Validation schemas
const uploadSchema = z.object({
  entityType: z.enum(['vehicle', 'installation', 'user', 'location']),
  entityId: z.string().uuid(),
  fileCategory: z.enum(['photo', 'video', 'document']),
  fileSubcategory: z.string().optional(),
  workflowStage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.any()).default({})
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  entityType: z.enum(['vehicle', 'installation', 'user', 'location']).optional(),
  entityId: z.string().uuid().optional(),
  fileCategory: z.enum(['photo', 'video', 'document']).optional(),
  fileSubcategory: z.string().optional(),
  workflowStage: z.string().optional(),
  uploadedBy: z.string().uuid().optional()
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedMimes = [
      ...MediaProcessor.getAllowedMimeTypes('photo'),
      ...MediaProcessor.getAllowedMimeTypes('video'),
      ...MediaProcessor.getAllowedMimeTypes('document')
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

export const uploadMiddleware = upload.array('files', 10);

export class MediaController {
  /**
   * Upload media files
   */
  static async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const body = uploadSchema.parse(req.body);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files provided'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);
      const storageManager = createStorageManager();

      // Validate entity exists
      await MediaController.validateEntity(tenantDb, body.entityType, body.entityId);

      const uploadResults = [];

      for (const file of files) {
        try {
          // Determine file category if not provided
          const fileCategory = body.fileCategory || MediaProcessor.getFileCategory(file.mimetype);
          
          // Validate file
          const allowedTypes = MediaProcessor.getAllowedMimeTypes(fileCategory);
          const maxSize = MediaProcessor.getMaxFileSize(fileCategory);
          
          if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} not allowed for category ${fileCategory}`);
          }

          if (file.size > maxSize) {
            throw new Error(`File size exceeds maximum allowed size for ${fileCategory}`);
          }

          // Process file based on type
          let processedFile = file;
          let metadata = body.metadata;

          if (fileCategory === 'photo') {
            await MediaProcessor.validateImage(file.buffer);
            const imageMetadata = await MediaProcessor.extractImageMetadata(file.buffer);
            metadata = { ...metadata, ...imageMetadata };
            
            // TODO: Generate image variants (thumbnail, web-optimized)
          }

          // Generate storage path
          const fileName = `${Date.now()}_${file.originalname}`;
          const filePath = storageManager.generateFilePath(
            body.entityType,
            body.entityId,
            fileCategory,
            fileName,
            req.tenantId
          );

          // Upload file to storage
          const storageResult = await storageManager.upload({
            originalName: file.originalname,
            fileName,
            mimeType: file.mimetype,
            size: file.size,
            buffer: processedFile.buffer
          }, filePath);

          // Save file record to database
          const mediaFile = await tenantDb.mediaFile.create({
            data: {
              entityType: body.entityType,
              entityId: body.entityId,
              fileCategory,
              fileSubcategory: body.fileSubcategory,
              originalFilename: file.originalname,
              storedFilename: fileName,
              filePath: storageResult.filePath,
              fileSize: BigInt(file.size),
              mimeType: file.mimetype,
              fileExtension: file.originalname.split('.').pop()?.toLowerCase() || '',
              width: metadata.width,
              height: metadata.height,
              duration: metadata.duration,
              storageProvider: 'local', // TODO: Use actual provider
              cdnUrl: storageResult.url,
              isPublic: body.isPublic,
              workflowStage: body.workflowStage,
              metadata,
              tags: body.tags,
              uploadedBy: req.user.userId
            }
          });

          uploadResults.push({
            fileId: mediaFile.fileId,
            originalFilename: mediaFile.originalFilename,
            url: storageResult.url,
            fileCategory: mediaFile.fileCategory,
            size: file.size,
            metadata
          });

        } catch (error) {
          console.error(`Error uploading file ${file.originalname}:`, error);
          uploadResults.push({
            originalFilename: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }

      const response: ApiResponse<typeof uploadResults> = {
        success: true,
        data: uploadResults,
        message: `Uploaded ${uploadResults.filter(r => !r.error).length} of ${files.length} files successfully`
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Upload files error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to upload files'
      } as ApiResponse);
    }
  }

  /**
   * Get media files with filtering and pagination
   */
  static async getMediaFiles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const query = paginationSchema.parse(req.query);
      const tenantDb = await getTenantDb(req.tenantId);

      // Build where clause
      const where: any = {};
      
      if (query.search) {
        where.OR = [
          { originalFilename: { contains: query.search, mode: 'insensitive' } },
          { fileSubcategory: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search } }
        ];
      }

      if (query.entityType) where.entityType = query.entityType;
      if (query.entityId) where.entityId = query.entityId;
      if (query.fileCategory) where.fileCategory = query.fileCategory;
      if (query.fileSubcategory) where.fileSubcategory = query.fileSubcategory;
      if (query.workflowStage) where.workflowStage = query.workflowStage;
      if (query.uploadedBy) where.uploadedBy = query.uploadedBy;

      // Filter deleted files
      where.deletedAt = null;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get media files
      const [mediaFiles, total] = await Promise.all([
        tenantDb.mediaFile.findMany({
          where,
          include: {
            uploader: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.mediaFile.count({ where })
      ]);

      const response: ApiResponse<typeof mediaFiles> = {
        success: true,
        data: mediaFiles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get media files error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get media files'
      } as ApiResponse);
    }
  }

  /**
   * Get media file by ID
   */
  static async getMediaFileById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { fileId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const mediaFile = await tenantDb.mediaFile.findUnique({
        where: { 
          fileId,
          deletedAt: null
        },
        include: {
          uploader: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!mediaFile) {
        res.status(404).json({
          success: false,
          error: 'Media file not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof mediaFile> = {
        success: true,
        data: mediaFile
      };

      res.json(response);
    } catch (error) {
      console.error('Get media file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get media file'
      } as ApiResponse);
    }
  }

  /**
   * Update media file metadata
   */
  static async updateMediaFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { fileId } = req.params;
      const { fileSubcategory, workflowStage, tags, metadata, isPublic } = req.body;
      const tenantDb = await getTenantDb(req.tenantId);

      const mediaFile = await tenantDb.mediaFile.update({
        where: { fileId },
        data: {
          fileSubcategory,
          workflowStage,
          tags,
          metadata,
          isPublic
        }
      });

      const response: ApiResponse<typeof mediaFile> = {
        success: true,
        data: mediaFile,
        message: 'Media file updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update media file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update media file'
      } as ApiResponse);
    }
  }

  /**
   * Delete media file
   */
  static async deleteMediaFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { fileId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Get media file
      const mediaFile = await tenantDb.mediaFile.findUnique({
        where: { fileId }
      });

      if (!mediaFile) {
        res.status(404).json({
          success: false,
          error: 'Media file not found'
        } as ApiResponse);
        return;
      }

      // Soft delete the record
      await tenantDb.mediaFile.update({
        where: { fileId },
        data: { deletedAt: new Date() }
      });

      // TODO: Delete file from storage (implement cleanup job)
      // const storageManager = createStorageManager();
      // await storageManager.delete(mediaFile.filePath);

      const response: ApiResponse = {
        success: true,
        message: 'Media file deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete media file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete media file'
      } as ApiResponse);
    }
  }

  /**
   * Get media statistics
   */
  static async getMediaStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      const [
        totalFiles,
        filesByCategory,
        filesByEntity,
        storageUsed,
        recentFiles
      ] = await Promise.all([
        tenantDb.mediaFile.count({ where: { deletedAt: null } }),
        tenantDb.mediaFile.groupBy({
          by: ['fileCategory'],
          _count: { fileCategory: true },
          where: { deletedAt: null }
        }),
        tenantDb.mediaFile.groupBy({
          by: ['entityType'],
          _count: { entityType: true },
          where: { deletedAt: null }
        }),
        tenantDb.mediaFile.aggregate({
          where: { deletedAt: null },
          _sum: { fileSize: true }
        }),
        tenantDb.mediaFile.findMany({
          where: { deletedAt: null },
          select: {
            fileId: true,
            originalFilename: true,
            fileCategory: true,
            createdAt: true,
            uploader: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          totalFiles,
          storageUsedBytes: Number(storageUsed._sum.fileSize || 0)
        },
        distribution: {
          byCategory: filesByCategory,
          byEntityType: filesByEntity
        },
        recent: recentFiles
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get media stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get media statistics'
      } as ApiResponse);
    }
  }

  // Helper methods
  private static async validateEntity(
    tenantDb: any,
    entityType: string,
    entityId: string
  ): Promise<void> {
    let entity;

    switch (entityType) {
      case 'vehicle':
        entity = await tenantDb.vehicle.findUnique({ where: { vehicleId: entityId } });
        break;
      case 'user':
        entity = await tenantDb.user.findUnique({ where: { userId: entityId } });
        break;
      case 'location':
        entity = await tenantDb.location.findUnique({ where: { locationId: entityId } });
        break;
      // Add other entity types as needed
    }

    if (!entity) {
      throw new Error(`${entityType} with ID ${entityId} not found`);
    }
  }
}