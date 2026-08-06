/**
 * TenderMesh Discovery Application
 * 
 * Main application entry point with proper initialization,
 * error handling, and graceful shutdown.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { configService } from './config/config.service.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRouter, setAdminPool, setTendersPool, setA2aPool, setSettingsPool, localTenders } from './routes/index.js';
import { TenderStore } from './db/store.js';
import { seedDatabaseIfEmpty } from './db/seed.js';
import { initSources } from './scrapers/sources.registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Application {
  private app: express.Application;
  private pool: Pool | null = null;
  private server: any = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    const config = configService.getConfig();

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: config.environment === 'production',
      crossOriginEmbedderPolicy: config.environment === 'production',
    }));

    // CORS - Allow Cloudflare Tunnels (*.trycloudflare.com), localhost, and configured origins
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          config.security.corsOrigins.includes('*') ||
          config.security.corsOrigins.includes(origin) ||
          origin.endsWith('.trycloudflare.com') ||
          origin.endsWith('.loca.lt') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Allow tunnel/remote connections
      },
      credentials: true,
    }));

    // Compression
    if (config.environment === 'production') {
      this.app.use(compression());
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: Math.max(1000, config.security.rateLimit.maxRequests),
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting to API routes
    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      const { method, url, ip } = req;

      res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        const logLevel = statusCode >= 500 ? 'error' :
          statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('HTTP Request', {
          method,
          url,
          ip,
          statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('user-agent'),
        });
      });

      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    const router = createRouter();
    this.app.use('/api', router);

    // Health check
    this.app.get('/health', async (req, res) => {
      let dbConnected = false;
      let hasDescriptionColumn = false;
      if (this.pool) {
        try {
          await this.pool.query('SELECT 1');
          dbConnected = true;
          const colRes = await this.pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'discovered_tenders' AND column_name = 'description'"
          );
          hasDescriptionColumn = colRes.rows.length > 0;
        } catch {}
      }

      const health = {
        status: dbConnected && hasDescriptionColumn ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: configService.getConfig().environment,
        db: {
          connected: dbConnected,
          hasDescriptionColumn,
        }
      };
      res.status(dbConnected ? 200 : 503).json(health);
    });

    // API root route
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'TenderMesh Discovery API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
      });
    });

    // Serve static frontend files
    const publicPath = path.join(process.cwd(), 'public');
    this.app.use(express.static(publicPath));

    // Agent Card
    this.app.get('/.well-known/agent.json', (req, res) => {
      res.json({
        name: 'tendermesh-buyer-agent',
        description: 'TenderMesh buyer-side procurement agent',
        version: '1.0.0',
        url: `http://${req.headers.host || 'localhost:3001'}/api/a2a`,
        capabilities: { streaming: false, pushNotifications: false },
        skills: [
          { id: 'publish-tender', name: 'Publish tender invitations to suppliers' },
          { id: 'receive-assessment', name: 'Receive supplier fit assessments' }
        ],
        authentication: { schemes: ['bearer'] },
        metadata: { role: 'buyer', region: 'PK' }
      });
    });

    // SPA Fallback for React routing
    this.app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health' || req.path.startsWith('/.well-known/')) {
        return next();
      }
      res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
          next(err);
        }
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const config = configService.getConfig();

      this.pool = new Pool({
        connectionString: config.database.url,
        max: config.database.poolSize,
        idleTimeoutMillis: config.database.connectionTimeout,
      });

      // Test connection
      await this.pool.query('SELECT 1');

      logger.info('Database connection established', {
        poolSize: config.database.poolSize,
        connectionTimeout: config.database.connectionTimeout,
      });

      // Run schema initialization
      try {
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await this.pool.query(schemaSql);
          logger.info('Database base schema applied successfully');
        }

        // Auto-apply all migrations from migrations/ directory
        const migrationsDir = path.resolve(__dirname, '..', 'migrations');
        if (fs.existsSync(migrationsDir)) {
          const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

          for (const file of migrationFiles) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            await this.pool.query(sql);
            logger.info(`Migration applied: ${file}`);
          }
        }

        // Boot-time Schema Drift Guard
        const requiredColumns = ['id', 'source', 'source_id', 'title', 'description', 'content_hash', 'similarity_hash'];
        const colRes = await this.pool.query(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'discovered_tenders'"
        );
        const existingCols = new Set(colRes.rows.map((r: any) => r.column_name));
        const missingCols = requiredColumns.filter(c => !existingCols.has(c));

        if (missingCols.length > 0) {
          const errStr = `CRITICAL: Database schema drift detected! Missing required columns in discovered_tenders: [${missingCols.join(', ')}]`;
          logger.error(errStr);
          throw new Error(errStr);
        } else {
          logger.info('Database schema drift guard passed: all required columns verified');
        }

        // Seed sample tenders if the database is empty
        await seedDatabaseIfEmpty(this.pool!);
      } catch (schemaErr: any) {
        logger.error('Failed to initialize database schema / migrations', { error: schemaErr.message });
        throw schemaErr;
      }

      // Inject pool into routes
      setAdminPool(this.pool);
      setTendersPool(this.pool);
      setA2aPool(this.pool);
      setSettingsPool(this.pool);

      // Handle connection errors
      this.pool.on('error', (err) => {
        logger.error('Database pool error', { error: err.message });
      });

    } catch (error: any) {
      logger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      const config = configService.getConfig();

      logger.info('Starting TenderMesh Discovery Application', {
        environment: config.environment,
        port: config.port,
        service: 'app',
      });

      // Initialize database (skip for in-memory mode)
      const dbUrl = configService.getConfig().database.url;
      if (dbUrl !== 'in-memory') {
        let connected = false;
        let retries = 5;
        while (!connected && retries > 0) {
          try {
            await this.initializeDatabase();

            // Load tenders from DB to memory store
            const store = new TenderStore(dbUrl);
            await store.loadFromDatabase();
            await store.close();

            // Initialize sources from DB
            await initSources(this.pool!);
            const checkTable = await this.pool!.query("SELECT to_regclass('public.discovered_tenders')");
            if (!checkTable.rows[0]?.to_regclass) {
              logger.error('CRITICAL: Database table discovered_tenders does not exist in schema!');
            } else {
              logger.info('Database table discovered_tenders verified successfully');
            }
            connected = true;
          } catch (dbError: any) {
            retries--;
            if (retries === 0) {
              logger.error('Database connection failed after multiple retries. Exiting to allow Docker to restart the container.', { error: dbError.message });
              process.exit(1);
            }
            logger.warn(`Database unavailable, retrying in 3 seconds... (${retries} retries left)`, { error: dbError.message });
            await new Promise(res => setTimeout(res, 3000));
          }
        }
      } else {
        logger.error('CRITICAL: DATABASE_URL is missing. TenderMesh strictly requires PostgreSQL!');
        process.exit(1);
      }

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Server started on port ${config.port}`, {
          url: `http://localhost:${config.port}`,
          environment: config.environment,
          service: 'server',
        });
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error: any) {
      logger.error('Failed to start application', { error: error.message });
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.shutdown().finally(() => process.exit(1));
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason: String(reason) });
    });
  }

  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down application...');

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // Close database pool
    if (this.pool) {
      await this.pool.end();
      logger.info('Database pool closed');
    }

    // Close logger
    logger.close();

    logger.info('Application shutdown complete');
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Export application instance
export const app = new Application();