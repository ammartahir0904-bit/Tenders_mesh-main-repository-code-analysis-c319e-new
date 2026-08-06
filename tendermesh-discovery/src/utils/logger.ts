/**
 * Structured Logging Service
 * 
 * Provides production-ready structured logging with configurable levels,
 * formats, and transports (console, file, remote).
 */

import { configService } from '../config/config.service.js';
import fs from 'fs';
import path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogFormat = 'json' | 'pretty' | 'simple';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  service?: string;
  traceId?: string;
  spanId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  format: LogFormat;
  enableFileLogging: boolean;
  logDirectory: string;
  serviceName: string;
}

/**
 * Log Level Utilities
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(configuredLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] <= LOG_LEVELS[configuredLevel];
}

/**
 * Format Log Entry
 */
function formatLogEntry(entry: LogEntry, format: LogFormat): string {
  const baseEntry = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    service: entry.service || 'tendermesh-discovery',
    ...(entry.traceId && { traceId: entry.traceId }),
    ...(entry.spanId && { spanId: entry.spanId }),
    ...(entry.meta && { meta: entry.meta }),
  };

  switch (format) {
    case 'json':
      return JSON.stringify(baseEntry);
    
    case 'pretty':
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const levelColors: Record<LogLevel, string> = {
        error: '\x1b[31m', // red
        warn: '\x1b[33m',  // yellow
        info: '\x1b[32m',  // green
        debug: '\x1b[36m', // cyan
      };
      const resetColor = '\x1b[0m';
      const levelColor = levelColors[entry.level] || resetColor;
      
      let formatted = `${timestamp} ${levelColor}[${entry.level.toUpperCase()}]${resetColor} ${entry.message}`;
      if (entry.service) {
        formatted += ` (${entry.service})`;
      }
      if (entry.meta && Object.keys(entry.meta).length > 0) {
        formatted += ` ${JSON.stringify(entry.meta, null, 0)}`;
      }
      return formatted;
    
    case 'simple':
    default:
      return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  }
}

/**
 * File Transport
 */
class FileTransport {
  private logStream: fs.WriteStream | null = null;
  private readonly logPath: string;

  constructor(logDirectory: string) {
    this.logPath = path.join(logDirectory, `app-${new Date().toISOString().split('T')[0]}.log`);
    
    // Ensure log directory exists
    try {
      fs.mkdirSync(logDirectory, { recursive: true });
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`);
    }
  }

  write(entry: LogEntry): void {
    if (!this.logStream) {
      try {
        this.logStream = fs.createWriteStream(this.logPath, { flags: 'a' });
      } catch (error) {
        console.error(`Failed to create log file: ${error}`);
        return;
      }
    }

    const formattedEntry = `${JSON.stringify(entry)}\n`;
    this.logStream.write(formattedEntry);
  }

  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

/**
 * Main Logger Class
 */
export class Logger {
  private config: LoggerConfig;
  private fileTransport: FileTransport | null = null;
  private serviceContext: string;

  constructor(service?: string) {
    const appConfig = configService.getConfig();
    this.config = {
      level: appConfig.logging.level,
      format: appConfig.logging.format,
      enableFileLogging: appConfig.logging.enableFileLogging,
      logDirectory: appConfig.logging.logDirectory,
      serviceName: 'tendermesh-discovery',
    };
    
    this.serviceContext = service || 'app';

    if (this.config.enableFileLogging) {
      this.fileTransport = new FileTransport(this.config.logDirectory);
    }

    // Log configuration on initialization
    this.info('Logger initialized', {
      level: this.config.level,
      format: this.config.format,
      fileLogging: this.config.enableFileLogging,
      service: this.serviceContext,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(service: string): Logger {
    const childLogger = new Logger(service);
    childLogger.serviceContext = `${this.serviceContext}.${service}`;
    return childLogger;
  }

  /**
   * Base logging method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>, traceId?: string, spanId?: string): void {
    if (!shouldLog(this.config.level, level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceContext,
      ...(meta && { meta: this.sanitizeMeta(meta) }),
      ...(traceId && { traceId }),
      ...(spanId && { spanId }),
    };

    // Format and output to console
    const formattedMessage = formatLogEntry(entry, this.config.format);
    this.writeToConsole(level, formattedMessage);

    // Write to file if enabled
    if (this.fileTransport && this.config.enableFileLogging) {
      this.fileTransport.write(entry);
    }
  }

  /**
   * Write to appropriate console stream
   */
  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'info':
        console.log(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMeta(meta: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...meta };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'authorization', 'apiKey', 'api_key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
      
      // Check nested objects
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeMeta(sanitized[key]);
        }
      });
    }
    
    return sanitized;
  }

  /**
   * Public logging methods
   */
  error(message: string, meta?: Record<string, any>, traceId?: string, spanId?: string): void {
    this.log('error', message, meta, traceId, spanId);
  }

  warn(message: string, meta?: Record<string, any>, traceId?: string, spanId?: string): void {
    this.log('warn', message, meta, traceId, spanId);
  }

  info(message: string, meta?: Record<string, any>, traceId?: string, spanId?: string): void {
    this.log('info', message, meta, traceId, spanId);
  }

  debug(message: string, meta?: Record<string, any>, traceId?: string, spanId?: string): void {
    this.log('debug', message, meta, traceId, spanId);
  }

  /**
   * Performance logging
   */
  time<T>(operation: string, fn: () => Promise<T>): Promise<T>;
  time<T>(operation: string, fn: () => T): T;
  time<T>(operation: string, fn: (() => T) | (() => Promise<T>)): T | Promise<T> {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      return result.then(res => {
        const duration = performance.now() - start;
        this.debug(`Operation completed: ${operation}`, { duration: `${duration.toFixed(2)}ms` });
        return res;
      });
    } else {
      const duration = performance.now() - start;
      this.debug(`Operation completed: ${operation}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    }
  }

  /**
   * Close resources
   */
  close(): void {
    if (this.fileTransport) {
      this.fileTransport.close();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new Logger();
