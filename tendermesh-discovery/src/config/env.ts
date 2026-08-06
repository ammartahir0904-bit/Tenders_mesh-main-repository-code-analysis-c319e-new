import { z } from 'zod';
import 'dotenv/config';
import path from 'path';

/**
 * Environment Configuration Manager
 * 
 * This module provides a secure, validated configuration system for TenderMesh Discovery.
 * All environment variables are validated using Zod schemas with proper defaults and error handling.
 */

// Load environment variables from .env file at project root
const envPath = path.join(__dirname, '..', '..', '.env');
try {
  require('dotenv').config({ path: envPath });
} catch (error) {
  console.warn(`Warning: Could not load .env file at ${envPath}. Using system environment variables.`);
}

/**
 * Safely get environment variable with validation
 */
function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.string().regex(/^\d+$/).default('3001').transform(Number),

  // Database Configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI/LLM Configuration
  GROQ_API_KEY: z.string().optional(),
  SAM_GOV_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('llama-3.1-8b-instant'),

  // Web Scraping Configuration
  ZENROWS_API_KEY: z.string().optional(),

  // Supplier Matching Configuration
  SUPPLIER_CATEGORIES: z.string().default('IT Equipment,IT Services,Software Development'),
  SUPPLIER_REGIONS: z.string().default('Islamabad,Rawalpindi,Lahore,Karachi,Peshawar,Quetta,Faisalabad,Multan,Gujranwala,Hyderabad,Sukkur,Gilgit,Muzaffarabad'),
  SUPPLIER_VALUE_MIN: z.string().regex(/^\d+$/).default('100000000').transform(Number),
  SUPPLIER_VALUE_MAX: z.string().regex(/^\d+$/).default('5000000000').transform(Number),
  SUPPLIER_ENDPOINT: z.string().default('https://tendermesh-api.onrender.com/tenders/receive'),
  MAX_SOURCES_PER_SCAN: z.string().regex(/^\d+$/).default('5').transform(Number),
  AUTO_SCAN_INTERVAL_MIN: z.string().regex(/^\d+$/).default('0').transform(Number),
  A2A_API_KEY: z.string().default('tendermesh-shared-secret'),
  API_BASE_URL: z.string().default('http://localhost:3001'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Security Configuration
  JWT_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100').transform(Number),
});

/**
 * Parse and validate environment variables
 */
let parsedEnv;
try {
  parsedEnv = envSchema.parse({
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    API_PORT: getEnv('API_PORT', '3001'),
    DATABASE_URL: getEnv('DATABASE_URL'),
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    LLM_MODEL: getEnv('LLM_MODEL', 'llama-3.1-8b-instant'),
    ZENROWS_API_KEY: process.env.ZENROWS_API_KEY,
    SUPPLIER_CATEGORIES: getEnv('SUPPLIER_CATEGORIES', 'IT Equipment,IT Services,Software Development'),
    SUPPLIER_REGIONS: getEnv('SUPPLIER_REGIONS', 'Islamabad,Rawalpindi,Lahore,Karachi,Peshawar,Quetta,Faisalabad,Multan,Gujranwala,Hyderabad,Sukkur,Gilgit,Muzaffarabad'),
    SUPPLIER_VALUE_MIN: getEnv('SUPPLIER_VALUE_MIN', '100000000'),
    SUPPLIER_VALUE_MAX: getEnv('SUPPLIER_VALUE_MAX', '5000000000'),
    SUPPLIER_ENDPOINT: getEnv('SUPPLIER_ENDPOINT', 'http://localhost:8000/tenders/receive'),
    MAX_SOURCES_PER_SCAN: getEnv('MAX_SOURCES_PER_SCAN', '5'),
    A2A_API_KEY: getEnv('A2A_API_KEY', 'tendermesh-shared-secret'),
    API_BASE_URL: getEnv('API_BASE_URL', 'http://localhost:3001'),
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
    LOG_FORMAT: getEnv('LOG_FORMAT', 'json'),
    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: getEnv('RATE_LIMIT_WINDOW_MS', '900000'),
    RATE_LIMIT_MAX_REQUESTS: getEnv('RATE_LIMIT_MAX_REQUESTS', '100'),
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment configuration validation failed:');
    (error as any).errors.forEach((err: any) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

/**
 * Application configuration object
 */
export const config = {
  // Server
  nodeEnv: parsedEnv.NODE_ENV,
  apiPort: parsedEnv.API_PORT,
  isDevelopment: parsedEnv.NODE_ENV === 'development',
  isProduction: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test',

  // Database
  databaseUrl: parsedEnv.DATABASE_URL,

  // AI/LLM
  groqApiKey: parsedEnv.GROQ_API_KEY,
  samGovApiKey: parsedEnv.SAM_GOV_API_KEY,
  llmModel: parsedEnv.LLM_MODEL,
  supplierEndpoint: parsedEnv.SUPPLIER_ENDPOINT,
  a2aApiKey: parsedEnv.A2A_API_KEY,
  apiBaseUrl: parsedEnv.API_BASE_URL,
  maxSourcesPerScan: parsedEnv.MAX_SOURCES_PER_SCAN,

  // Web Scraping
  zenrowsApiKey: parsedEnv.ZENROWS_API_KEY,

  // Supplier Matching
  supplierCategories: parsedEnv.SUPPLIER_CATEGORIES.split(',').map((value) => value.trim()).filter(Boolean),
  supplierRegions: parsedEnv.SUPPLIER_REGIONS.split(',').map((value) => value.trim()).filter(Boolean),
  supplierValueMin: parsedEnv.SUPPLIER_VALUE_MIN,
  supplierValueMax: parsedEnv.SUPPLIER_VALUE_MAX,

  // Logging
  logLevel: parsedEnv.LOG_LEVEL,
  logFormat: parsedEnv.LOG_FORMAT,

  // Security
  jwtSecret: parsedEnv.JWT_SECRET,
  corsOrigin: parsedEnv.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean),

  // Rate Limiting
  rateLimitWindowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: parsedEnv.RATE_LIMIT_MAX_REQUESTS,
};

/**
 * Validate configuration and return any errors
 */
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.apiPort || config.apiPort <= 0 || config.apiPort > 65535) {
    errors.push('API_PORT must be a valid port number (1-65535)');
  }

  if (config.supplierValueMin > config.supplierValueMax) {
    errors.push('SUPPLIER_VALUE_MIN cannot be greater than SUPPLIER_VALUE_MAX');
  }

  if (config.isProduction && !config.groqApiKey) {
    errors.push('GROQ_API_KEY is required in production mode');
  }

  if (config.isProduction && config.jwtSecret && config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production');
  }

  return errors;
}

/**
 * Get a summary of the current configuration (safe for logging)
 */
export function getConfigSummary(): Record<string, string> {
  const summary: Record<string, string> = {
    NODE_ENV: config.nodeEnv,
    API_PORT: config.apiPort.toString(),
    DATABASE_URL: config.databaseUrl ? '[SET]' : '[MISSING]',
    LLM_MODEL: config.llmModel,
    LOG_LEVEL: config.logLevel,
    LOG_FORMAT: config.logFormat,
    SUPPLIER_CATEGORIES: config.supplierCategories.join(', '),
    SUPPLIER_REGIONS: config.supplierRegions.join(', '),
    SUPPLIER_VALUE_MIN: config.supplierValueMin.toString(),
    SUPPLIER_VALUE_MAX: config.supplierValueMax.toString(),
    SAM_GOV_API_KEY: getEnv('SAM_GOV_API_KEY', ''),
  };

  // Mask sensitive values
  if (config.groqApiKey) {
    summary.GROQ_API_KEY = '[SET]';
  }
  if (config.zenrowsApiKey) {
    summary.ZENROWS_API_KEY = '[SET]';
  }
  if (config.jwtSecret) {
    summary.JWT_SECRET = '[SET]';
  }

  return summary;
}
