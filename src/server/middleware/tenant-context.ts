/**
 * Tenant Context & RBAC Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../domain/types';
import { RBACGuard, Permission } from '../../domain/rbac';

export interface TenantRequest extends Request {
  schoolId?: string;
  userRole?: UserRole;
  userId?: string;
}

export function tenantContextMiddleware(req: TenantRequest, _res: Response, next: NextFunction): void {
  // Extract school tenant context from header or query param
  const headerSchoolId = req.headers['x-school-id'] as string;
  const headerRole = req.headers['x-user-role'] as UserRole;
  const headerUserId = req.headers['x-user-id'] as string;

  req.schoolId = headerSchoolId || (req.query.schoolId as string) || undefined;
  req.userRole = headerRole || 'SUPER_ADMIN'; // Default to admin for initial dashboard demo
  req.userId = headerUserId || 'usr_root';

  next();
}

export function requirePermission(permission: Permission) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    const role = req.userRole || 'SUPER_ADMIN';
    if (!RBACGuard.hasPermission(role, permission)) {
      res.status(403).json({
        error: `Forbidden: Role '${role}' lacks required permission '${permission}'`
      });
      return;
    }
    next();
  };
}
