# TenderMesh Discovery - Modular Architecture

## Overview

This document describes the new modular architecture for TenderMesh Discovery, designed to address critical security and maintainability issues identified in the original monolithic implementation.

## Architecture Changes

### 1. Security Improvements (PHASE 1 - COMPLETED)

#### Removed Security Risks
- ✅ **Removed exposed `.env` file** with real API keys from repository
- ✅ **Deleted `aerolink api key.txt`** file with exposed API key
- ✅ **Added comprehensive `.gitignore`** to prevent future secrets leakage

#### Enhanced Configuration Management
- ✅ **Secure Configuration Service** with Zod validation
- ✅ **Environment variable validation** with proper error handling
- ✅ **Masked sensitive values** in logs and responses
- ✅ **Comprehensive `.env.example`** with documentation

#### Security Middleware
- ✅ **Helmet.js** for security headers
- ✅ **CORS configuration** with whitelisted origins
- ✅ **Rate limiting** to prevent abuse
- ✅ **Request logging** with sanitization

### 2. Modular Architecture (PHASE 2 - PARTIALLY COMPLETED)

#### Application Structure
```
tendermesh-discovery/
├── src/
│   ├── app.ts              # Main application class
│   ├── main.ts            # Entry point with error handling
│   ├── config/            # Configuration management
│   │   ├── env.ts         # Environment validation
│   │   └── config.service.ts # Configuration service
│   ├── routes/            # Modular routes
│   │   ├── index.ts       # Route registry
│   │   ├── tenders.routes.ts
│   │   ├── events.routes.ts
│   │   ├── scan.routes.ts
│   │   ├── settings.routes.ts
│   │   └── health.routes.ts
│   ├── utils/             # Utilities
│   │   └── logger.ts      # Structured logging
│   └── middleware/        # Express middleware
│       └── error-handler.ts
├── .env.example          # Template for environment variables
├── .gitignore           # Prevents secret leakage
└── package.json         # Updated dependencies
```

#### Key Design Patterns

**1. Configuration Service Pattern**
- Centralized configuration management
- Type-safe configuration access
- Environment-specific defaults
- Validation on startup

**2. Dependency Injection (Future)**
- Services are injectable
- Easy testing with mocks
- Clear dependency graph

**3. Repository Pattern (Future)**
- Abstract database operations
- Database-agnostic business logic
- Easy migration between databases

**4. Service Layer Pattern (Future)**
- Business logic separation
- Reusable service components
- Clear responsibility boundaries

### 3. Enhanced Logging System

#### Features
- ✅ **Structured logging** with JSON/pretty formats
- ✅ **Log levels** (error, warn, info, debug)
- ✅ **File transport** for production
- ✅ **Sensitive data sanitization**
- ✅ **Performance timing** utilities
- ✅ **Child loggers** for service context

#### Example Log Output
```json
{
  "timestamp": "2024-12-31T23:59:59.999Z",
  "level": "info",
  "message": "HTTP Request",
  "service": "app",
  "meta": {
    "method": "GET",
    "url": "/api/tenders",
    "ip": "127.0.0.1",
    "statusCode": 200,
    "duration": "45ms"
  }
}
```

### 4. Health Monitoring

#### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system metrics
- `GET /health/readiness` - Kubernetes readiness probe
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/metrics` - Prometheus metrics

#### Metrics Collected
- Memory usage (RSS, heap, external)
- Uptime and request rates
- Database connection status
- Configuration validation
- Supplier profile metrics

### 5. API Routes

#### Organized Route Structure
- **Tenders**: `/api/tenders/*` - Tender management
- **Events**: `/api/events` - Server-Sent Events
- **Scan**: `/api/scan/*` - Discovery operations
- **Settings**: `/api/settings/*` - Profile & API keys
- **Health**: `/api/health/*` - Monitoring endpoints

### 6. Security Implementation

#### Input Validation
- All environment variables validated with Zod
- API input validation (future)
- SQL injection prevention via parameterized queries
- CORS origin validation

#### Data Protection
- API key masking in responses
- Sensitive data redaction in logs
- Secure headers via Helmet.js
- Rate limiting per IP

#### Error Handling
- Structured error responses
- No stack traces in production
- Graceful degradation with fallbacks
- Comprehensive error logging

## Migration Path

### Immediate Benefits (Already Implemented)
1. ✅ No more exposed API keys in repository
2. ✅ Better configuration management
3. ✅ Enhanced logging with sanitization
4. ✅ Security headers and rate limiting
5. ✅ Health monitoring endpoints

### Next Steps (PHASE 3 & 4)

#### Database Improvements
1. Migration system with version control
2. Connection pooling optimization
3. Database health monitoring
4. Backup and recovery procedures

#### Testing Infrastructure
1. Jest/Vitest test framework setup
2. Unit tests for critical components
3. Integration tests for API endpoints
4. Property-based testing for core logic

#### Deployment Improvements
1. Docker containerization
2. CI/CD pipeline
3. Environment-specific configurations
4. Monitoring and alerting

#### AI Integration Framework
1. Abstract AI provider interface
2. Multiple provider support (OpenAI, Anthropic, etc.)
3. Fallback mechanisms
4. Cost tracking and optimization

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Legacy Mode (if needed)
```bash
npm run dev:legacy  # Uses old server.ts
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Optional (with defaults)
API_PORT=3001
NODE_ENV=development
LOG_LEVEL=info
LOG_FORMAT=json
```

## Configuration Validation

The application validates all configuration on startup and will exit with clear error messages if required configuration is missing or invalid.

## Contributing

### Code Structure Guidelines
1. Keep routes thin - delegate logic to services
2. Use the configuration service for all config access
3. Log appropriately using the structured logger
4. Add health checks for new services
5. Follow the established patterns for consistency

### Security Guidelines
1. Never commit `.env` files
2. Mask sensitive data in logs
3. Validate all inputs
4. Use parameterized SQL queries
5. Implement rate limiting for public endpoints