import type { Request, Response, NextFunction } from 'express';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[Server] Unexpected error:', message);
  res.status(500).json({ error: message });
}
