import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export interface SecurityEvent {
  type: 'authentication_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_breach_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
}

export class SecurityManager {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      skipSuccessfulRequests: true
    },
    slowDown: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes at full speed
      delayMs: 100 // add 100ms delay per request after delayAfter
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32
    },
    session: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    }
  };

  /**
   * Create rate limiting middleware
   */
  static createRateLimiter(config?: Partial<SecurityConfig['rateLimit']>) {
    const rateLimitConfig = { ...this.DEFAULT_CONFIG.rateLimit, ...config };
    
    return rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.max,
      skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            endpoint: req.path,
            method: req.method
          },
          timestamp: new Date()
        });
        
        res.status(429).json({
          success: false,
          error: 'Too many requests from this IP, please try again later'
        });
      }
    });
  }

  /**
   * Create slow down middleware for gradual rate limiting
   */
  static createSlowDown(config?: Partial<SecurityConfig['slowDown']>) {
    const slowDownConfig = { ...this.DEFAULT_CONFIG.slowDown, ...config };
    
    return slowDown({
      windowMs: slowDownConfig.windowMs,
      delayAfter: slowDownConfig.delayAfter,
      delayMs: () => slowDownConfig.delayMs, // Fixed according to warning
      maxDelayMs: 10000, // max 10 seconds delay
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'low',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            endpoint: req.path,
            method: req.method,
            reason: 'slow_down_triggered'
          },
          timestamp: new Date()
        });
        
        res.status(429).json({
          success: false,
          error: 'Too many requests, please slow down'
        });
      }
    });
  }

  /**
   * Input sanitization middleware
   */
  static sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sanitizeString = (str: string): string => {
        return str
          .replace(/[<>]/g, '') // Remove potential XSS characters
          .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
          .trim();
      };

      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };

      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        Object.assign(req.query, sanitizeObject(req.query));
      }
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    };
  }

  /**
   * SQL injection protection middleware
   */
  static sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|\/\*|\*\/|;)/g,
        /(\b(OR|AND)\b.*=.*)/gi,
        /('|("|`)).*\1/g
      ];

      const checkForSQLInjection = (value: string): boolean => {
        return sqlPatterns.some(pattern => pattern.test(value));
      };

      const scanObject = (obj: any): boolean => {
        if (typeof obj === 'string') {
          return checkForSQLInjection(obj);
        }
        if (Array.isArray(obj)) {
          return obj.some(scanObject);
        }
        if (obj && typeof obj === 'object') {
          return Object.values(obj).some(scanObject);
        }
        return false;
      };

      const hasSQLInjection = [req.body, req.query, req.params]
        .some(obj => obj && scanObject(obj));

      if (hasSQLInjection) {
        this.logSecurityEvent({
          type: 'data_breach_attempt',
          severity: 'critical',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            endpoint: req.path,
            method: req.method,
            reason: 'sql_injection_attempt',
            payload: {
              body: req.body,
              query: req.query,
              params: req.params
            }
          },
          timestamp: new Date()
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid request parameters'
        });
      }

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  static xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
      ];

      const checkForXSS = (value: string): boolean => {
        return xssPatterns.some(pattern => pattern.test(value));
      };

      const scanObject = (obj: any): boolean => {
        if (typeof obj === 'string') {
          return checkForXSS(obj);
        }
        if (Array.isArray(obj)) {
          return obj.some(scanObject);
        }
        if (obj && typeof obj === 'object') {
          return Object.values(obj).some(scanObject);
        }
        return false;
      };

      const hasXSS = [req.body, req.query, req.params]
        .some(obj => obj && scanObject(obj));

      if (hasXSS) {
        this.logSecurityEvent({
          type: 'data_breach_attempt',
          severity: 'high',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            endpoint: req.path,
            method: req.method,
            reason: 'xss_attempt',
            payload: {
              body: req.body,
              query: req.query,
              params: req.params
            }
          },
          timestamp: new Date()
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid request content'
        });
      }

      next();
    };
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string, key?: string): { encrypted: string; iv: string } {
    const algorithm = this.DEFAULT_CONFIG.encryption.algorithm;
    const secretKey = key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: { encrypted: string; iv: string }, key?: string): string {
    const algorithm = this.DEFAULT_CONFIG.encryption.algorithm;
    const secretKey = key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash password with salt
   */
  static async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token with security enhancements
   */
  static generateSecureJWT(payload: object, expiresIn: string = '24h'): string {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: this.generateSecureToken(16) // JWT ID for tracking
      },
      secret,
      {
        expiresIn,
        algorithm: 'HS256',
        issuer: 'omsms-saas',
        audience: 'omsms-users'
      }
    );
  }

  /**
   * Validate and verify JWT token
   */
  static verifySecureJWT(token: string): any {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'omsms-saas',
      audience: 'omsms-users'
    });
  }

  /**
   * Security headers middleware
   */
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Prevent XSS attacks
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Enforce HTTPS
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join('; '));
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  /**
   * Log security events
   */
  private static logSecurityEvent(event: SecurityEvent): void {
    logger.warn('Security Event:', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      tenantId: event.tenantId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: event.timestamp
    });

    // In production, you would also:
    // 1. Store in security events database
    // 2. Send alerts for high/critical severity events
    // 3. Trigger automated responses (IP blocking, account lockout, etc.)
    // 4. Send notifications to security team
  }

  /**
   * Audit trail middleware
   */
  static auditTrail() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Use 'finish' event instead of overriding res.send to avoid header conflicts
      res.on('finish', () => {
        try {
          const duration = Date.now() - startTime;
          
          // Log API call for audit purposes
          logger.info('API Audit:', {
            method: req.method,
            path: req.path,
            query: req.query,
            userId: (req as any).user?.userId,
            tenantId: (req as any).tenantId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration,
            timestamp: new Date()
          });
        } catch (auditError) {
          // Silently handle audit logging errors to prevent response interference
          console.error('Audit logging error:', auditError);
        }
      });

      next();
    };
  }

  /**
   * IP whitelist/blacklist middleware
   */
  static ipFilter(whitelist?: string[], blacklist?: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check blacklist first
      if (blacklist && blacklist.includes(clientIP)) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            reason: 'blacklisted_ip',
            endpoint: req.path
          },
          timestamp: new Date()
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check whitelist if provided
      if (whitelist && !whitelist.includes(clientIP)) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            reason: 'ip_not_whitelisted',
            endpoint: req.path
          },
          timestamp: new Date()
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      next();
    };
  }

  /**
   * Request size limiter
   */
  static requestSizeLimit(maxSize: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.headers['content-length'];
      const maxSizeBytes = this.parseSize(maxSize);

      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          details: {
            reason: 'request_size_exceeded',
            contentLength: parseInt(contentLength),
            maxSize: maxSizeBytes,
            endpoint: req.path
          },
          timestamp: new Date()
        });

        return res.status(413).json({
          success: false,
          error: 'Request entity too large'
        });
      }

      next();
    };
  }

  private static parseSize(size: string): number {
    const units: { [key: string]: number } = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return Math.floor(value * (units[unit] || 1));
  }
}