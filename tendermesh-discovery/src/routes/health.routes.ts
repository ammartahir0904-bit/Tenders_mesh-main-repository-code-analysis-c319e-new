/**
 * Health Routes
 * 
 * Handles health checks and system status monitoring.
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { configService } from '../config/config.service.js';

const router = Router();
const healthLogger = logger.child('health');

// System metrics
let requestCount = 0;
const startTime = Date.now();

/**
 * GET /api/health - Basic health check
 */
router.get('/', (req, res) => {
  requestCount++;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tendermesh-discovery',
    version: '1.0.0',
    environment: configService.getConfig().environment,
    uptime: process.uptime(),
  };

  healthLogger.debug('Health check requested', { requestCount });
  res.json(health);
});

/**
 * GET /api/health/detailed - Detailed health check with system metrics
 */
router.get('/detailed', (req, res) => {
  requestCount++;
  
  const memoryUsage = process.memoryUsage();
  const uptime = Date.now() - startTime;

  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    
    // Application info
    service: 'tendermesh-discovery',
    version: '1.0.0',
    environment: configService.getConfig().environment,
    nodeVersion: process.version,
    
    // Performance metrics
    uptime: {
      seconds: Math.floor(process.uptime()),
      human_readable: formatDuration(process.uptime() * 1000),
    },
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
      arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
    },
    cpu: {
      usage: process.cpuUsage(),
      architecture: process.arch,
      platform: process.platform,
    },
    
    // Application metrics
    metrics: {
      requestCount,
      avgRequestRate: (requestCount / (uptime / 1000)).toFixed(2) + ' req/sec',
    },
    
    // Configuration summary
    config: {
      environment: configService.getConfig().environment,
      port: configService.getConfig().port,
      logLevel: configService.getConfig().logging.level,
      supplierCategories: configService.getSupplierConfig().categories.length,
      supplierRegions: configService.getSupplierConfig().regions.length,
    },
    
    // Dependencies status
    dependencies: {
      database: 'connected', // TODO: Implement actual database health check
      ai_service: configService.getAIConfig().apiKey ? 'configured' : 'not_configured',
      scraping_service: configService.getConfig().scraping.zenrowsApiKey ? 'configured' : 'not_configured',
    },
  };

  healthLogger.info('Detailed health check', { 
    memory: detailedHealth.memory.rss,
    uptime: detailedHealth.uptime.human_readable,
  });
  
  res.json(detailedHealth);
});

/**
 * GET /api/health/readiness - Readiness probe for Kubernetes/containers
 */
router.get('/readiness', (req, res) => {
  // Check critical dependencies
  const checks = {
    database: true, // TODO: Implement actual database check
    configuration: configService.validateRequiredConfig().length === 0,
    memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // Less than 500MB
  };

  const allHealthy = Object.values(checks).every(Boolean);
  const statusCode = allHealthy ? 200 : 503;

  const readiness = {
    ready: allHealthy,
    timestamp: new Date().toISOString(),
    checks,
    message: allHealthy ? 'Service is ready' : 'Service is not ready',
  };

  if (!allHealthy) {
    healthLogger.warn('Readiness check failed', { checks });
  } else {
    healthLogger.debug('Readiness check passed');
  }

  res.status(statusCode).json(readiness);
});

/**
 * GET /api/health/liveness - Liveness probe for Kubernetes/containers
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - just ensure the process is running
  const liveness = {
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
    message: 'Service is alive and responding',
  };

  res.json(liveness);
});

/**
 * GET /api/health/metrics - Prometheus-style metrics (text format)
 */
router.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  const metrics = [
    '# HELP tendermesh_request_total Total number of HTTP requests',
    '# TYPE tendermesh_request_total counter',
    `tendermesh_request_total ${requestCount}`,
    
    '# HELP tendermesh_uptime_seconds Service uptime in seconds',
    '# TYPE tendermesh_uptime_seconds gauge',
    `tendermesh_uptime_seconds ${process.uptime()}`,
    
    '# HELP tendermesh_memory_bytes Memory usage in bytes',
    '# TYPE tendermesh_memory_bytes gauge',
    `tendermesh_memory_rss_bytes ${memoryUsage.rss}`,
    `tendermesh_memory_heap_total_bytes ${memoryUsage.heapTotal}`,
    `tendermesh_memory_heap_used_bytes ${memoryUsage.heapUsed}`,
    `tendermesh_memory_external_bytes ${memoryUsage.external}`,
    
    '# HELP tendermesh_environment_info Service environment information',
    '# TYPE tendermesh_environment_info gauge',
    `tendermesh_environment_info{environment="${configService.getConfig().environment}"} 1`,
    
    '# HELP tendermesh_supplier_categories_total Total number of supplier categories',
    '# TYPE tendermesh_supplier_categories_total gauge',
    `tendermesh_supplier_categories_total ${configService.getSupplierConfig().categories.length}`,
    
    '# HELP tendermesh_supplier_regions_total Total number of supplier regions',
    '# TYPE tendermesh_supplier_regions_total gauge',
    `tendermesh_supplier_regions_total ${configService.getSupplierConfig().regions.length}`,
  ].join('\n');

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

/**
 * Helper functions
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export const healthRouter = router;