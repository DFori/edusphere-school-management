/**
 * Role-Based Access Control (RBAC) Engine for Multi-Tenant School Management
 */

import { UserRole } from './types';

export type Permission = 
  | 'school:manage_settings'
  | 'school:manage_staff'
  | 'academic:create_session'
  | 'academic:manage_classes'
  | 'academic:manage_subjects'
  | 'student:enroll'
  | 'student:view_records'
  | 'student:view_all'
  | 'grade:record_scores'
  | 'grade:publish_results'
  | 'grade:view_report_card'
  | 'attendance:mark'
  | 'attendance:view'
  | 'fee:manage_schedules'
  | 'fee:record_payments'
  | 'fee:view_invoices';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'school:manage_settings',
    'school:manage_staff',
    'academic:create_session',
    'academic:manage_classes',
    'academic:manage_subjects',
    'student:enroll',
    'student:view_records',
    'student:view_all',
    'grade:record_scores',
    'grade:publish_results',
    'grade:view_report_card',
    'attendance:mark',
    'attendance:view',
    'fee:manage_schedules',
    'fee:record_payments',
    'fee:view_invoices'
  ],
  SCHOOL_ADMIN: [
    'school:manage_settings',
    'school:manage_staff',
    'academic:create_session',
    'academic:manage_classes',
    'academic:manage_subjects',
    'student:enroll',
    'student:view_records',
    'student:view_all',
    'grade:publish_results',
    'grade:view_report_card',
    'attendance:mark',
    'attendance:view',
    'fee:manage_schedules',
    'fee:record_payments',
    'fee:view_invoices'
  ],
  TEACHER: [
    'student:view_records',
    'grade:record_scores',
    'grade:view_report_card',
    'attendance:mark',
    'attendance:view'
  ],
  ACCOUNTANT: [
    'student:view_records',
    'fee:manage_schedules',
    'fee:record_payments',
    'fee:view_invoices'
  ],
  PARENT: [
    'student:view_records',
    'grade:view_report_card',
    'attendance:view',
    'fee:view_invoices'
  ],
  STUDENT: [
    'student:view_records',
    'grade:view_report_card',
    'attendance:view',
    'fee:view_invoices'
  ]
};

export class RBACGuard {
  /**
   * Check if a given role possesses a specific permission
   */
  public static hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Validate if a user can access a specific student's record
   */
  public static canAccessStudentRecord(
    userRole: UserRole,
    userId: string,
    targetStudentId: string,
    linkedStudentId?: string
  ): boolean {
    if (['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT'].includes(userRole)) {
      return true;
    }
    if (userRole === 'STUDENT' && userId === targetStudentId) {
      return true;
    }
    if (userRole === 'PARENT' && linkedStudentId === targetStudentId) {
      return true;
    }
    return false;
  }
}
