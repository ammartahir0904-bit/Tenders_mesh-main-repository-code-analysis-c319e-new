/**
 * Configuration Service
 * 
 * Provides a centralized, type-safe configuration service with validation,
 * encryption for sensitive values, and environment-specific defaults.
 */

import { config, validateConfig, getConfigSummary } from './env';

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  connectionTimeout: number;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'groq';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface A2AConfig {
  endpoint: string;
  apiKey: string;
  replyBaseUrl: string;
}

export interface ScrapingConfig {
  zenrowsApiKey?: string;
  requestTimeout: number;
  maxConcurrentRequests: number;
}

export interface SupplierConfig {
  categories: string[];
  regions: string[];
  valueRange: {
    min: number;
    max: number;
  };
}

export interface SecurityConfig {
  jwtSecret?: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'pretty';
  enableFileLogging: boolean;
  logDirectory: string;
}

export interface AppConfig {
  environment: 'development' | 'test' | 'production';
  port: number;
  database: DatabaseConfig;
  ai: AIConfig;
  a2a: A2AConfig;
  scraping: ScrapingConfig;
  supplier: SupplierConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

/**
 * Configuration Service Class
 */
export class ConfigService {
  private static instance: ConfigService;
  private readonly config: AppConfig;

  private constructor() {
    // Validate configuration on startup
    const validationErrors = validateConfig();
    if (validationErrors.length > 0) {
      console.error('Configuration validation failed:');
      validationErrors.forEach((error) => console.error(`  - ${error}`));
      throw new Error('Invalid configuration');
    }

    // Build configuration object
    this.config = {
      environment: config.nodeEnv,
      port: config.apiPort,
      
      database: {
        url: config.databaseUrl,
        poolSize: config.isProduction ? 20 : 10,
        connectionTimeout: 30000,
      },
      
      ai: {
        provider: 'groq',
        apiKey: config.groqApiKey,
        model: config.llmModel,
        maxTokens: 4096,
        temperature: 0.7,
      },
      
      scraping: {
        zenrowsApiKey: config.zenrowsApiKey,
        requestTimeout: 30000,
        maxConcurrentRequests: 5,
      },
      
      supplier: {
        categories: config.supplierCategories,
        regions: config.supplierRegions,
        valueRange: {
          min: config.supplierValueMin,
          max: config.supplierValueMax,
        },
      },
      
      a2a: {
        endpoint: config.supplierEndpoint,
        apiKey: config.a2aApiKey,
        replyBaseUrl: config.apiBaseUrl,
      },
      
      security: {
        jwtSecret: config.jwtSecret,
        corsOrigins: config.corsOrigin,
        rateLimit: {
          windowMs: config.rateLimitWindowMs,
          maxRequests: config.rateLimitMaxRequests,
        },
      },
      
      logging: {
        level: config.logLevel,
        format: config.logFormat,
        enableFileLogging: config.isProduction,
        logDirectory: 'logs',
      },
    };

    // Log configuration summary (safe version)
    this.logConfigSummary();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Get full configuration
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig(): DatabaseConfig {
    return { ...this.config.database };
  }

  /**
   * Get AI configuration
   */
  public getAIConfig(): AIConfig {
    return { ...this.config.ai };
  }

  /**
   * Dynamically update AI keys at runtime
   */
  public setAIKey(provider: string, apiKey: string): void {
    if (provider && apiKey) {
      this.config.ai.provider = provider as any;
      this.config.ai.apiKey = apiKey;
    }
  }

  /**
   * Dynamically update LLM model at runtime
   */
  public setLLMModel(model: string): void {
    if (model) {
      this.config.ai.model = model;
    }
  }

  /**
   * Get supplier configuration
   */
  public getSupplierConfig(): SupplierConfig {
    return { ...this.config.supplier };
  }

  /**
   * Get A2A configuration
   */
  public getA2AConfig(): A2AConfig {
    return { ...this.config.a2a };
  }

  /**
   * Dynamically update A2A endpoint at runtime
   */
  public setA2AEndpoint(endpoint: string): void {
    if (endpoint) {
      this.config.a2a.endpoint = endpoint;
    }
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): SecurityConfig {
    return { ...this.config.security };
  }

  /**
   * Check if a required configuration is missing
   */
  public validateRequiredConfig(): string[] {
    const errors: string[] = [];

    if (!this.config.database.url) {
      errors.push('Database URL is required');
    }

    if (this.config.environment === 'production') {
      if (!this.config.ai.apiKey) {
        errors.push('AI API key is required in production');
      }
      if (!this.config.security.jwtSecret) {
        errors.push('JWT secret is required in production');
      }
    }

    if (this.config.supplier.valueRange.min > this.config.supplier.valueRange.max) {
      errors.push('Supplier value range is invalid (min > max)');
    }

    return errors;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if running in production mode
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if running in test mode
   */
  public isTest(): boolean {
    return this.config.environment === 'test';
  }

  /**
   * Get environment-specific configuration
   */
  public getEnvironmentConfig(): Record<string, any> {
    if (this.isDevelopment()) {
      return {
        enableDebugLogs: true,
        skipAuth: false, // Should be true only for local development
        mockAiResponses: false,
        cacheDuration: 0,
      };
    } else if (this.isProduction()) {
      return {
        enableDebugLogs: false,
        skipAuth: false,
        mockAiResponses: false,
        cacheDuration: 3600000, // 1 hour
        enableCompression: true,
        enableCaching: true,
      };
    } else {
      // Test environment
      return {
        enableDebugLogs: true,
        skipAuth: true,
        mockAiResponses: true,
        cacheDuration: 0,
      };
    }
  }

  /**
   * Log configuration summary (safe - doesn't expose secrets)
   */
  private logConfigSummary(): void {
    const summary = getConfigSummary();
    console.log('Configuration loaded:');
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  /**
   * Get configuration for external services
   */
  public getServiceConfig(service: string): Record<string, any> {
    switch (service) {
      case 'postgres':
        return {
          connectionString: this.config.database.url,
          max: this.config.database.poolSize,
          idleTimeoutMillis: this.config.database.connectionTimeout,
        };
      case 'groq':
        return {
          apiKey: this.config.ai.apiKey,
          baseUrl: 'https://api.groq.com/openai/v1',
          defaultModel: this.config.ai.model,
        };
      case 'zenrows':
        return {
          apiKey: this.config.scraping.zenrowsApiKey,
          timeout: this.config.scraping.requestTimeout,
        };
      case 'logging':
        return {
          level: this.config.logging.level,
          format: this.config.logging.format,
          enabled: true,
        };
      default:
        return {};
    }
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();