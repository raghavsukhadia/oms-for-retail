import { Router } from 'express';
import { MediaController, uploadMiddleware } from '../controllers/mediaController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const mediaRoutes = Router();

// Apply authentication and database middleware to all routes
mediaRoutes.use(authenticate);
mediaRoutes.use(extractTenant);
mediaRoutes.use(attachDatabases());

/**
 * POST /api/media/upload
 * Upload multiple media files
 * Supports photos, videos, and documents
 */
mediaRoutes.post('/upload',
  uploadMiddleware, // Multer middleware for file parsing
  MediaController.uploadFiles
);

/**
 * GET /api/media
 * Get media files with filtering and pagination
 * All authenticated users can access media
 */
mediaRoutes.get('/',
  MediaController.getMediaFiles
);

/**
 * GET /api/media/stats
 * Get media statistics
 * Requires: manager+ role
 */
mediaRoutes.get('/stats',
  authorizeRoles(['admin', 'manager']),
  MediaController.getMediaStats
);

/**
 * GET /api/media/:fileId
 * Get media file by ID with metadata
 * All authenticated users can access media details
 */
mediaRoutes.get('/:fileId',
  MediaController.getMediaFileById
);

/**
 * PUT /api/media/:fileId
 * Update media file metadata (tags, category, etc.)
 * Requires: coordinator+ role or file uploader
 */
mediaRoutes.put('/:fileId',
  authorizeRoles(['admin', 'manager', 'coordinator', 'salesperson']),
  MediaController.updateMediaFile
);

/**
 * DELETE /api/media/:fileId
 * Delete media file (soft delete)
 * Requires: manager+ role or file uploader
 */
mediaRoutes.delete('/:fileId',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  MediaController.deleteMediaFile
);