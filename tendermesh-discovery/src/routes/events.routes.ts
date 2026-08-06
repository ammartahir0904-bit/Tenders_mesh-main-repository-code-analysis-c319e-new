/**
 * Server-Sent Events (SSE) Routes
 * 
 * Handles real-time event streaming for live updates.
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── SSE clients management ───
interface SSEClient {
  id: number;
  res: any;
  lastHeartbeat: number;
}

class SSEManager {
  private clients: Map<number, SSEClient> = new Map();
  private nextClientId = 1;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(res: any): number {
    const clientId = this.nextClientId++;
    const client: SSEClient = {
      id: clientId,
      res,
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    // Send initial connection event
    this.sendToClient(clientId, 'CONNECTED', {
      id: clientId,
      type: 'CONNECTED',
      message: 'SSE connected',
      timestamp: new Date().toISOString(),
    });

    logger.info('SSE client connected', { clientId, totalClients: this.clients.size });

    return clientId;
  }

  removeClient(clientId: number): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info('SSE client disconnected', { clientId, totalClients: this.clients.size });
    }
  }

  broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    for (const [clientId, client] of this.clients) {
      try {
        client.res.write(message);
        client.lastHeartbeat = Date.now();
      } catch (error) {
        // Client disconnected, clean up
        this.removeClient(clientId);
      }
    }
  }

  sendToClient(clientId: number, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.res.write(message);
      client.lastHeartbeat = Date.now();
    } catch (error) {
      this.removeClient(clientId);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatMessage = ':heartbeat\n\n';

      for (const [clientId, client] of this.clients) {
        try {
          // Send heartbeat
          client.res.write(heartbeatMessage);
          
          // Check for stale connections (no activity for 2 minutes)
          if (now - client.lastHeartbeat > 120000) {
            logger.warn('Removing stale SSE client', { clientId, lastHeartbeat: client.lastHeartbeat });
            this.removeClient(clientId);
          }
        } catch (error) {
          this.removeClient(clientId);
        }
      }
    }, 30000); // Every 30 seconds
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const [clientId, client] of this.clients) {
      try {
        client.res.end();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    this.clients.clear();
    logger.info('SSE manager stopped');
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton SSE manager
export const sseManager = new SSEManager();

/**
 * GET /api/events - SSE endpoint for real-time updates
 */
router.get('/', (req, res) => {
  const eventsLogger = logger.child('events');
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Encoding': 'none',
  });

  // Add client to SSE manager
  const clientId = sseManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(clientId);
    eventsLogger.info('SSE connection closed', { clientId });
  });

  req.on('error', (error) => {
    sseManager.removeClient(clientId);
    eventsLogger.error('SSE connection error', { clientId, error: error.message });
  });
});

// Export router
export const eventsRouter = router;