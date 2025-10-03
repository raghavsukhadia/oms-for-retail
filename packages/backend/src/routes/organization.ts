import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { OrganizationController } from '../controllers/organizationController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { attachDatabases } from '../lib/database';
import { config } from '../config/environment';

const router = Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return cb(new Error('Tenant ID required'), '');
    }
    
    const uploadPath = path.join(path.resolve(config.storage.local!.uploadPath), 'logos', tenantId);
    
    // Create directory if it doesn't exist
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply authentication and database middleware to all routes
router.use(authenticate);
router.use(extractTenant);
router.use(attachDatabases());

// Apply rate limiting
router.use(rateLimiter);

/**
 * @route GET /api/organization/settings
 * @desc Get organization settings
 * @access Private (All authenticated users need basic org info)
 */
router.get('/settings', 
  authenticate,
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  OrganizationController.getOrganizationSettings
);

/**
 * @route PUT /api/organization/settings
 * @desc Update organization settings
 * @access Private (Admin/Manager)
 */
router.put('/settings', 
  authenticate,
  authorizeRoles(['admin', 'manager']),
  OrganizationController.updateOrganizationSettings
);

/**
 * @route POST /api/organization/logo
 * @desc Upload organization logo
 * @access Private (Admin/Manager)
 */
router.post('/logo', 
  (req, res, next) => {
    console.log('Logo upload route hit:', req.method, req.path);
    console.log('Tenant ID:', req.tenantId);
    next();
  },
  authorizeRoles(['admin', 'manager']),
  upload.single('logo'),
  OrganizationController.uploadLogo
);

/**
 * @route DELETE /api/organization/bank-details/:bankId
 * @desc Delete bank details
 * @access Private (Admin/Manager)
 */
router.delete('/bank-details/:bankId', 
  authorizeRoles(['admin', 'manager']),
  OrganizationController.deleteBankDetails
);

/**
 * @route DELETE /api/organization/qr-codes/:qrId
 * @desc Delete QR code
 * @access Private (Admin/Manager)
 */
router.delete('/qr-codes/:qrId', 
  authorizeRoles(['admin', 'manager']),
  OrganizationController.deleteQRCode
);

export default router;
