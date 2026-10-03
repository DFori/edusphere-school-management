import { describe, it, expect } from 'vitest';
import { RBACGuard } from '../src/domain/rbac';

describe('RBACGuard — Role Permissions & Record Access Guard', () => {
  it('should grant Super Admin all platform permissions', () => {
    expect(RBACGuard.hasPermission('SUPER_ADMIN', 'school:manage_settings')).toBe(true);
    expect(RBACGuard.hasPermission('SUPER_ADMIN', 'grade:record_scores')).toBe(true);
    expect(RBACGuard.hasPermission('SUPER_ADMIN', 'fee:manage_schedules')).toBe(true);
  });

  it('should allow School Admin to manage academic terms and enroll students', () => {
    expect(RBACGuard.hasPermission('SCHOOL_ADMIN', 'academic:create_session')).toBe(true);
    expect(RBACGuard.hasPermission('SCHOOL_ADMIN', 'student:enroll')).toBe(true);
    expect(RBACGuard.hasPermission('SCHOOL_ADMIN', 'fee:manage_schedules')).toBe(true);
  });

  it('should restrict Teacher to scoring, viewing records, and marking attendance', () => {
    expect(RBACGuard.hasPermission('TEACHER', 'grade:record_scores')).toBe(true);
    expect(RBACGuard.hasPermission('TEACHER', 'attendance:mark')).toBe(true);
    expect(RBACGuard.hasPermission('TEACHER', 'school:manage_settings')).toBe(false);
    expect(RBACGuard.hasPermission('TEACHER', 'fee:manage_schedules')).toBe(false);
  });

  it('should restrict Student and Parent from modifying grades or settings', () => {
    expect(RBACGuard.hasPermission('STUDENT', 'grade:view_report_card')).toBe(true);
    expect(RBACGuard.hasPermission('STUDENT', 'grade:record_scores')).toBe(false);
    expect(RBACGuard.hasPermission('PARENT', 'grade:record_scores')).toBe(false);
    expect(RBACGuard.hasPermission('PARENT', 'fee:record_payments')).toBe(false);
  });

  it('should enforce student record privacy for parents and students', () => {
    // Parent P1 is linked to student S1
    expect(RBACGuard.canAccessStudentRecord('PARENT', 'p1', 's1', 's1')).toBe(true);
    // Parent P1 cannot access student S2
    expect(RBACGuard.canAccessStudentRecord('PARENT', 'p1', 's2', 's1')).toBe(false);

    // Student S1 can view own record
    expect(RBACGuard.canAccessStudentRecord('STUDENT', 's1', 's1')).toBe(true);
    // Student S1 cannot view student S2
    expect(RBACGuard.canAccessStudentRecord('STUDENT', 's1', 's2')).toBe(false);

    // Admin & Teacher can access any student in their school
    expect(RBACGuard.canAccessStudentRecord('SCHOOL_ADMIN', 'adm1', 's1')).toBe(true);
    expect(RBACGuard.canAccessStudentRecord('TEACHER', 'tch1', 's1')).toBe(true);
  });
});
