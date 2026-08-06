/**
 * TenderMesh Discovery - Main Entry Point
 * 
 * This is the main entry point for the TenderMesh Discovery application.
 * It initializes the application with proper error handling and graceful shutdown.
 */

import { app } from './app.js';
import { logger } from './utils/logger.js';

/**
 * Main application startup function
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting TenderMesh Discovery Application...');
    
    // Start the application
    await app.start();
    
    logger.info('Application started successfully');
    
  } catch (error: any) {
    logger.error('Failed to start application', { 
      error: error.message,
      stack: error.stack 
    });
    
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { 
    error: error.message,
    stack: error.stack 
  });
  
  // Attempt graceful shutdown
  app.shutdown().finally(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { 
    reason: String(reason),
    promise: String(promise)
  });
});

/**
 * Graceful shutdown on signals
 */
const shutdownSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

shutdownSignals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    
    try {
      await app.shutdown();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });
});

/**
 * Start the application
 */
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in main function', { error: error.message });
    process.exit(1);
  });
}

// Export for testing
export { app }; 