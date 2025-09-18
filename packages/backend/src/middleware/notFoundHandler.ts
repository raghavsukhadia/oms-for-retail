import { Request, Response } from 'express';
import { createApiError } from '@omsms/shared';

export function notFoundHandler(req: Request, res: Response): void {
  const response = createApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    'The requested endpoint does not exist'
  );
  
  res.status(404).json(response);
}