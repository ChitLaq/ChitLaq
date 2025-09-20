import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { getLogger } from '../../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSecurityIntegration } from './middleware/security-integration';
import authRoutes from './routes/auth-routes';
import validationRoutes from './routes/validation';
import securityRoutes from './routes/security-routes';

const logger = getLogger('AuthService');

export class AuthServiceApp {
  private app: express.Application;
  private supabase: SupabaseClient;
  private securityIntegration: any;

  constructor(supabase: SupabaseClient) {
    this.app = express();
    this.supabase = supabase;
    this.securityIntegration = getSecurityIntegration(supabase);
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // Initialize security integration
      await this.securityIntegration.initialize();

      // Basic middleware
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Security middleware stack
      const securityMiddleware = this.securityIntegration.getSecurityMiddlewareStack();
      for (const middleware of securityMiddleware) {
        this.app.use(middleware);
      }

      // Trust proxy for accurate IP addresses
      this.app.set('trust proxy', true);

      // Request logging middleware
      this.app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        });
        next();
      });

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
        });
      });

      // API routes
      this.app.use('/api/auth', authRoutes);
      this.app.use('/api/validation', validationRoutes);
      this.app.use('/api/security', securityRoutes);

      // 404 handler
      this.app.use('*', (req, res) => {
        res.status(404).json({
          success: false,
          error: 'Endpoint not found',
        });
      });

      // Global error handler
      this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('Unhandled error:', error);
        
        // Log security event for errors
        this.securityIntegration.logSystemEvent(
          'SECURITY_ERROR',
          'Unhandled application error',
          {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
          },
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'unknown',
            severity: 'HIGH',
          }
        );

        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      });

      logger.info('Auth service initialized successfully');
    } catch (error) {
      logger.error('Error initializing auth service:', error);
      throw error;
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3001): Promise<void> {
    try {
      this.app.listen(port, () => {
        logger.info(`Auth service started on port ${port}`);
      });
    } catch (error) {
      logger.error('Error starting auth service:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.securityIntegration.shutdown();
      logger.info('Auth service shutdown completed');
    } catch (error) {
      logger.error('Error shutting down auth service:', error);
    }
  }
}

export default AuthServiceApp;
