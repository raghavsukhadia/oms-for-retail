import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { config, isDevelopment } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './lib/logger';
import { initializeSocket } from './lib/socket';
import { SecurityManager } from './lib/security';
import { PerformanceOptimizer } from './lib/performance';
import { MonitoringService } from './lib/monitoring';

// Import routes
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { tenantRoutes } from './routes/tenant';
import { userRoutes } from './routes/users';
import { locationRoutes } from './routes/locations';
import { departmentRoutes } from './routes/departments';
import { roleRoutes } from './routes/roles';
import { configRoutes } from './routes/config';
import { vehicleRoutes } from './routes/vehicles';
import { workflowRoutes } from './routes/workflows';
import { mediaRoutes } from './routes/media';
import { notificationRoutes } from './routes/notifications';
import { dashboardRoutes } from './routes/dashboard';
import { reportsRoutes } from './routes/reports';
import { superAdminRoutes } from './routes/superAdmin';
// Master data routes
import { salesRoutes } from './routes/sales';
import { coordinatorRoutes } from './routes/coordinators';
import { supervisorRoutes } from './routes/supervisors';
import { accountRoutes } from './routes/accounts';
import { productRoutes } from './routes/products';
import paymentRoutes from './routes/payments';
import organizationRoutes from './routes/organization';
// Public and tenant middleware
import publicRoutes from './routes/public';
import { tenantConnectionMiddleware } from './middleware/tenantConnection';const app = express();
const httpServer = createServer(app);

// Initialize production services
PerformanceOptimizer.initialize();
MonitoringService.initialize();

// Security middleware (enhanced)
app.use(SecurityManager.securityHeaders());
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// Security enhancements
app.use(SecurityManager.createRateLimiter());
app.use(SecurityManager.createSlowDown());
app.use(SecurityManager.sanitizeInput());
app.use(SecurityManager.sqlInjectionProtection());
app.use(SecurityManager.xssProtection());
app.use(SecurityManager.requestSizeLimit('10mb'));

// CORS configuration
app.use(cors({
  origin: config.app.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance optimization middleware
app.use(PerformanceOptimizer.compressionMiddleware());
app.use(PerformanceOptimizer.timingMiddleware());
app.use(MonitoringService.metricsMiddleware());
app.use(SecurityManager.auditTrail());

// Logging middleware
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use(rateLimiter);

// Static files for uploads (development only)
if (isDevelopment && config.storage.provider === 'local') {
  const path = require('path');
  const uploadPath = path.resolve(config.storage.local!.uploadPath);
  console.log('Static file serving configured for:', uploadPath);
  
  app.use('/uploads', express.static(uploadPath, {
    setHeaders: (res, path) => {
      // Set CORS headers for static files
      res.setHeader('Access-Control-Allow-Origin', config.app.corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
  }));
}

// API Routes

// --- PUBLIC ROUTES (No tenant required, use master DB only) ---
app.use('/api/public', publicRoutes);

// --- GENERAL ROUTES (Some public, some tenant-specific) ---
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes); // Mix of public (login, register-tenant) and tenant-specific routes

// --- TENANT-SPECIFIC ROUTES (Require tenant context) ---
// Apply tenant connection middleware to all routes below this point
app.use('/api/tenants', tenantConnectionMiddleware, tenantRoutes);
app.use('/api/users', tenantConnectionMiddleware, userRoutes);
app.use('/api/locations', tenantConnectionMiddleware, locationRoutes);
app.use('/api/departments', tenantConnectionMiddleware, departmentRoutes);
app.use('/api/roles', tenantConnectionMiddleware, roleRoutes);
app.use('/api/config', tenantConnectionMiddleware, configRoutes);
app.use('/api/vehicles', tenantConnectionMiddleware, vehicleRoutes);
app.use('/api/workflows', tenantConnectionMiddleware, workflowRoutes);
app.use('/api/media', tenantConnectionMiddleware, mediaRoutes);
app.use('/api/notifications', tenantConnectionMiddleware, notificationRoutes);
app.use('/api/dashboard', tenantConnectionMiddleware, dashboardRoutes);
app.use('/api/reports', tenantConnectionMiddleware, reportsRoutes);
app.use('/api/super-admin', superAdminRoutes); // Super admin doesn't need tenant context
// Master data routes (tenant-specific)
app.use('/api/sales', tenantConnectionMiddleware, salesRoutes);
app.use('/api/coordinators', tenantConnectionMiddleware, coordinatorRoutes);
app.use('/api/supervisors', tenantConnectionMiddleware, supervisorRoutes);
app.use('/api/accounts', tenantConnectionMiddleware, accountRoutes);
app.use('/api/products', tenantConnectionMiddleware, productRoutes);
app.use('/api/payments', tenantConnectionMiddleware, paymentRoutes);
app.use('/api/organization', tenantConnectionMiddleware, organizationRoutes);

// Health check endpoint
app.use(MonitoringService.healthCheckMiddleware());

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(''); // Placeholder for metrics
  return; // ✅ Prevent continued execution after response
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(MonitoringService.errorTrackingMiddleware());
app.use(errorHandler);

// Initialize Socket.io
const socketManager = initializeSocket(httpServer);

// Start server
const server = httpServer.listen(config.port, () => {
  logger.info(`🚀 OMSMS Backend Server started`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🌐 Port: ${config.port}`);
  logger.info(`💾 Storage Provider: ${config.storage.provider}`);
  logger.info(`🗄️ Cache Provider: ${config.cache.provider}`);
  logger.info(`⚡ Socket.io Real-time: Enabled`);
  
  if (isDevelopment) {
    logger.info(`🔗 API Base URL: http://localhost:${config.port}/api`);
    logger.info(`🏥 Health Check: http://localhost:${config.port}/api/health`);
    logger.info(`🔌 Socket.io URL: ws://localhost:${config.port}`);
    if (config.storage.provider === 'local') {
      logger.info(`📁 Static Files: http://localhost:${config.port}/uploads`);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't crash the server in development - just log the error
  if (isDevelopment) {
    logger.warn('Development mode: Server continuing despite uncaught exception');
  } else {
    logger.error('Production mode: Exiting due to uncaught exception');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { promise, reason });
  // Don't crash the server in development - just log the error
  if (isDevelopment) {
    logger.warn('Development mode: Server continuing despite unhandled rejection');
  } else {
    logger.error('Production mode: Exiting due to unhandled rejection');
    process.exit(1);
  }
});

export default app;