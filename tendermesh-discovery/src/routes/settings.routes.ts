/**
 * Settings Routes
 * 
 * Handles supplier profile and API key management.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { configService } from '../config/config.service.js';

const router = Router();
const settingsLogger = logger.child('settings');

let pool: Pool | null = null;
export function setSettingsPool(p: Pool) {
  pool = p;
}

// In-memory storage (temporary - should be replaced with database)
let supplierProfile = {
  company_name: 'Default Supplier',
  categories: configService.getSupplierConfig().categories,
  locations: configService.getSupplierConfig().regions,
  certifications: ['PEC', 'SECP'],
  min_value: configService.getSupplierConfig().valueRange.min,
  max_value: configService.getSupplierConfig().valueRange.max,
};

let apiKeys = {
  openai_key: '',
  anthropic_key: '',
  custom_endpoint: '',
};

/**
 * Supplier Profile Routes
 */

/**
 * GET /api/settings/profile - Get supplier profile
 */
router.get('/profile', (req, res) => {
  settingsLogger.info('Fetching supplier profile');
  res.json(supplierProfile);
});

/**
 * PUT /api/settings/profile - Update supplier profile
 */
router.put('/profile', (req, res) => {
  const { company_name, categories, locations, certifications, min_value, max_value } = req.body;
  
  // Validate inputs
  if (min_value !== undefined && max_value !== undefined && min_value > max_value) {
    return res.status(400).json({ error: 'Minimum value cannot be greater than maximum value' });
  }

  // Update profile
  if (company_name !== undefined) supplierProfile.company_name = company_name;
  if (categories !== undefined) {
    supplierProfile.categories = Array.isArray(categories) 
      ? categories 
      : categories.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (locations !== undefined) {
    supplierProfile.locations = Array.isArray(locations)
      ? locations
      : locations.split(',').map((l: string) => l.trim()).filter(Boolean);
  }
  if (certifications !== undefined) {
    supplierProfile.certifications = Array.isArray(certifications)
      ? certifications
      : certifications.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (min_value !== undefined) supplierProfile.min_value = Number(min_value);
  if (max_value !== undefined) supplierProfile.max_value = Number(max_value);

  settingsLogger.info('Supplier profile updated', { 
    company_name: supplierProfile.company_name,
    category_count: supplierProfile.categories.length,
    location_count: supplierProfile.locations.length,
  });

  res.json(supplierProfile);
});

/**
 * API Keys Routes
 */

/**
 * GET /api/settings/keys - Get API keys (masked)
 */
router.get('/keys', (req, res) => {
  // Return masked keys for security
  const masked = {
    openai_key: apiKeys.openai_key ? maskApiKey(apiKeys.openai_key) : '',
    anthropic_key: apiKeys.anthropic_key ? maskApiKey(apiKeys.anthropic_key) : '',
    custom_endpoint: apiKeys.custom_endpoint || '',
  };

  settingsLogger.info('Fetching API keys (masked)');
  res.json(masked);
});

/**
 * PUT /api/settings/keys - Update API keys
 */
router.put('/keys', (req, res) => {
  const { openai_key, anthropic_key, custom_endpoint } = req.body;

  // Update keys
  if (openai_key !== undefined) {
    apiKeys.openai_key = openai_key;
    if (openai_key) configService.setAIKey('openai', openai_key);
    settingsLogger.info('OpenAI API key updated', { masked: maskApiKey(openai_key) });
  }
  if (anthropic_key !== undefined) {
    apiKeys.anthropic_key = anthropic_key;
    if (anthropic_key) configService.setAIKey('anthropic', anthropic_key);
    settingsLogger.info('Anthropic API key updated', { masked: maskApiKey(anthropic_key) });
  }
  if (custom_endpoint !== undefined) {
    apiKeys.custom_endpoint = custom_endpoint;
    settingsLogger.info('Custom endpoint updated', { endpoint: custom_endpoint });
  }

  // Return masked keys
  const masked = {
    openai_key: apiKeys.openai_key ? maskApiKey(apiKeys.openai_key) : '',
    anthropic_key: apiKeys.anthropic_key ? maskApiKey(apiKeys.anthropic_key) : '',
    custom_endpoint: apiKeys.custom_endpoint || '',
  };

  res.json(masked);
});

/**
 * Supplier Management Routes (DB-backed)
 */

router.get('/suppliers', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const result = await pool.query('SELECT * FROM supplier_registry ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error: any) {
    settingsLogger.error('Failed to get suppliers', { error: error.message });
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

router.post('/suppliers', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { name, endpoint, api_key, categories, regions, is_active } = req.body;
    const result = await pool.query(`
      INSERT INTO supplier_registry (name, endpoint, api_key, categories, regions, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, endpoint, api_key, JSON.stringify(categories || []), JSON.stringify(regions || []), is_active ?? true]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    settingsLogger.error('Failed to add supplier', { error: error.message });
    res.status(500).json({ error: 'Failed to add supplier' });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { name, endpoint, api_key, categories, regions, is_active } = req.body;
    const result = await pool.query(`
      UPDATE supplier_registry
      SET name = $1, endpoint = $2, api_key = $3, categories = $4, regions = $5, is_active = $6
      WHERE id = $7
      RETURNING *
    `, [name, endpoint, api_key, JSON.stringify(categories || []), JSON.stringify(regions || []), is_active, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    settingsLogger.error('Failed to update supplier', { error: error.message });
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM supplier_registry WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    settingsLogger.error('Failed to delete supplier', { error: error.message });
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

import fs from 'fs';
import path from 'path';

// Helper to locate .env.docker — try multiple candidate paths so the
// file is found regardless of the container WORKDIR or local dev cwd.
const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.docker'),          // /app/.env.docker (Docker) or project root (local)
  path.resolve(__dirname, '..', '..', '.env.docker'),   // relative to compiled src/
  path.resolve(__dirname, '..', '..', '..', '.env.docker'),
  '/app/.env.docker',                                   // explicit Docker WORKDIR
];

function findEnvFile(): string | null {
  for (const candidate of ENV_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore and try next
    }
  }
  return null;
}

router.get('/env', (req, res) => {
  try {
    const envPath = findEnvFile();
    if (!envPath) {
      // File not found — fall back to in-memory process.env so the UI
      // still shows the currently active values instead of erroring.
      settingsLogger.warn('.env.docker not found on disk; returning process.env values');
      return res.json({
        SUPPLIER_ENDPOINT: process.env.SUPPLIER_ENDPOINT || '',
        LLM_MODEL: process.env.LLM_MODEL || '',
        _warning: '.env.docker file not found — showing runtime values only',
      });
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    
    // Parse it minimally
    const envVars: Record<string, string> = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });

    res.json({
      SUPPLIER_ENDPOINT: envVars.SUPPLIER_ENDPOINT || process.env.SUPPLIER_ENDPOINT || '',
      LLM_MODEL: envVars.LLM_MODEL || process.env.LLM_MODEL || ''
    });
  } catch (err: any) {
    settingsLogger.error('Failed to read .env.docker', { error: err.message });
    res.status(500).json({ error: 'Failed to read env file' });
  }
});

router.post('/env', (req, res) => {
  const { SUPPLIER_ENDPOINT, LLM_MODEL } = req.body;

  // Always update in-memory state first so the change takes effect
  // immediately even if the .env.docker file is not writable/missing.
  if (SUPPLIER_ENDPOINT !== undefined) {
    process.env.SUPPLIER_ENDPOINT = SUPPLIER_ENDPOINT;
    configService.setA2AEndpoint(SUPPLIER_ENDPOINT);
    settingsLogger.info('Updated runtime SUPPLIER_ENDPOINT', { endpoint: SUPPLIER_ENDPOINT });
  }
  if (LLM_MODEL !== undefined) {
    process.env.LLM_MODEL = LLM_MODEL;
    configService.setLLMModel(LLM_MODEL);
  }

  // Best-effort persist to .env.docker so the change survives restarts.
  const envPath = findEnvFile();
  if (!envPath) {
    settingsLogger.warn('.env.docker not found on disk; runtime values updated but will not persist across restarts');
    return res.json({
      success: true,
      SUPPLIER_ENDPOINT: SUPPLIER_ENDPOINT ?? process.env.SUPPLIER_ENDPOINT ?? '',
      LLM_MODEL: LLM_MODEL ?? process.env.LLM_MODEL ?? '',
      _warning: 'Runtime updated, but .env.docker file not found — change will not persist across restarts',
    });
  }

  try {
    let content = fs.readFileSync(envPath, 'utf-8');

    if (SUPPLIER_ENDPOINT !== undefined) {
      if (/^SUPPLIER_ENDPOINT=.*$/m.test(content)) {
        content = content.replace(/^SUPPLIER_ENDPOINT=.*$/m, `SUPPLIER_ENDPOINT=${SUPPLIER_ENDPOINT}`);
      } else {
        content += `\nSUPPLIER_ENDPOINT=${SUPPLIER_ENDPOINT}`;
      }
    }

    if (LLM_MODEL !== undefined) {
      if (/^LLM_MODEL=.*$/m.test(content)) {
        content = content.replace(/^LLM_MODEL=.*$/m, `LLM_MODEL=${LLM_MODEL}`);
      } else {
        content += `\nLLM_MODEL=${LLM_MODEL}`;
      }
    }

    fs.writeFileSync(envPath, content, 'utf-8');
    settingsLogger.info('Updated .env.docker', { path: envPath, SUPPLIER_ENDPOINT, LLM_MODEL });

    res.json({ success: true, SUPPLIER_ENDPOINT, LLM_MODEL });
  } catch (err: any) {
    settingsLogger.error('Failed to write .env.docker', { error: err.message });
    // Still return success because in-memory state was updated above
    res.json({
      success: true,
      SUPPLIER_ENDPOINT: SUPPLIER_ENDPOINT ?? process.env.SUPPLIER_ENDPOINT ?? '',
      LLM_MODEL: LLM_MODEL ?? process.env.LLM_MODEL ?? '',
      _warning: 'Runtime updated, but file write failed — change will not persist across restarts',
    });
  }
});
router.post('/env/test', async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || configService.getA2AConfig().endpoint;
    if (!endpoint) return res.status(400).json({ error: 'Global endpoint not configured' });
    
    const pingUrl = new URL(endpoint);
    let reachable = false;
    let message = '';
    
    try {
      const resHealth = await fetch(pingUrl.origin + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      reachable = true;
      message = `Connected to ${pingUrl.host} (HTTP ${resHealth.status})`;
    } catch (e) {
      try {
        const resRoot = await fetch(pingUrl.origin, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        reachable = true;
        message = `Host ${pingUrl.host} is reachable (HTTP ${resRoot.status})`;
      } catch (errRoot: any) {
        message = `Cannot reach ${pingUrl.host}: ${errRoot.message}`;
      }
    }

    if (reachable) {
      res.json({ success: true, message });
    } else {
      res.status(502).json({ error: message });
    }
  } catch (error: any) {
    res.status(500).json({ error: `Connection failed: ${error.message}` });
  }
});

router.post('/suppliers/:id/test', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT endpoint, api_key FROM supplier_registry WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    
    const { endpoint, api_key } = result.rows[0];
    
    // Perform a basic health check or dummy POST depending on supplier API
    // We'll just do a GET to the endpoint's base host/health or similar, 
    // or just assume if it's an HTTP URL we can try to fetch it.
    try {
      const pingUrl = new URL(endpoint);
      const resTest = await fetch(pingUrl.origin + '/health', { 
        method: 'GET',
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(5000)
      });
      res.json({ success: resTest.ok, status: resTest.status });
    } catch (fetchErr: any) {
      res.json({ success: false, error: fetchErr.message });
    }
  } catch (error: any) {
    settingsLogger.error('Failed to test supplier', { error: error.message });
    res.status(500).json({ error: 'Failed to test supplier' });
  }
});

/**
 * Helper function to mask API keys
 */
function maskApiKey(key: string): string {
  if (!key || key.length <= 8) {
    return '[INVALID]';
  }
  return key.substring(0, 8) + '...';
}

/**
 * Settings Validation
 */

/**
 * GET /api/settings/validate - Validate current settings
 */
router.get('/validate', (req, res) => {
  const errors: string[] = [];

  // Validate supplier profile
  if (supplierProfile.min_value > supplierProfile.max_value) {
    errors.push('Supplier minimum value cannot be greater than maximum value');
  }

  if (supplierProfile.categories.length === 0) {
    errors.push('Supplier must have at least one category');
  }

  if (supplierProfile.locations.length === 0) {
    errors.push('Supplier must have at least one location');
  }

  // Validate API keys (optional validation)
  if (apiKeys.openai_key && apiKeys.openai_key.length < 20) {
    errors.push('OpenAI API key appears to be invalid (too short)');
  }

  if (apiKeys.anthropic_key && apiKeys.anthropic_key.length < 20) {
    errors.push('Anthropic API key appears to be invalid (too short)');
  }

  const isValid = errors.length === 0;

  settingsLogger.info('Settings validation completed', { isValid, errorCount: errors.length });

  res.json({
    valid: isValid,
    errors: errors,
    profile: {
      company_name: supplierProfile.company_name,
      categories_count: supplierProfile.categories.length,
      locations_count: supplierProfile.locations.length,
      certifications_count: supplierProfile.certifications.length,
      value_range: {
        min: supplierProfile.min_value,
        max: supplierProfile.max_value,
      },
    },
    api_keys: {
      openai_set: !!apiKeys.openai_key,
      anthropic_set: !!apiKeys.anthropic_key,
      custom_endpoint_set: !!apiKeys.custom_endpoint,
    },
  });
});

export const settingsRouter = router;
/**
 * Tender Sources Management Routes (DB-backed)
 */

router.get('/sources', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const result = await pool.query('SELECT * FROM tender_sources ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (error: any) {
    settingsLogger.error('Failed to get tender sources', { error: error.message });
    res.status(500).json({ error: 'Failed to get tender sources' });
  }
});

router.post('/sources', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { name, label, region, urls, enabled, parser_type, use_playwright } = req.body;
    const result = await pool.query(`
      INSERT INTO tender_sources (name, label, region, urls, enabled, parser_type, use_playwright)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, label, region, JSON.stringify(urls || []), enabled ?? true, parser_type || 'ai', use_playwright ?? true]);
    
    // Dynamically update memory
    import('../scrapers/sources.registry.js').then(m => m.initSources(pool!));
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    settingsLogger.error('Failed to add tender source', { error: error.message });
    res.status(500).json({ error: 'Failed to add tender source' });
  }
});

router.put('/sources/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { name, label, region, urls, enabled, parser_type, use_playwright } = req.body;
    const result = await pool.query(`
      UPDATE tender_sources
      SET name = $1, label = $2, region = $3, urls = $4, enabled = $5, parser_type = $6, use_playwright = $7
      WHERE id = $8
      RETURNING *
    `, [name, label, region, JSON.stringify(urls || []), enabled, parser_type, use_playwright, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tender source not found' });
    
    // Dynamically update memory
    import('../scrapers/sources.registry.js').then(m => m.initSources(pool!));
    
    res.json(result.rows[0]);
  } catch (error: any) {
    settingsLogger.error('Failed to update tender source', { error: error.message });
    res.status(500).json({ error: 'Failed to update tender source' });
  }
});

router.delete('/sources/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tender_sources WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tender source not found' });
    
    // Dynamically update memory
    import('../scrapers/sources.registry.js').then(m => m.initSources(pool!));
    
    res.json({ message: 'Tender source deleted successfully' });
  } catch (error: any) {
    settingsLogger.error('Failed to delete tender source', { error: error.message });
    res.status(500).json({ error: 'Failed to delete tender source' });
  }
});
