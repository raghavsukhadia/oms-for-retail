// Extend shared types for frontend-specific needs
import type { User as BaseUser } from '@omsms/shared';

export interface User extends BaseUser {
  avatar?: string;
}

// Re-export other shared types
export * from '@omsms/shared';