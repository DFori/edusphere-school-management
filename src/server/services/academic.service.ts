/**
 * Academic & Multi-Tenant Organization Service
 */

import { getDatabase } from '../db/database';
import { 
  School, 
  User, 
  UserRole, 
  AcademicSession, 
  AcademicTerm, 
  ClassArm, 
  Subject, 
  StaffAssignment, 
  StudentProfile 
} from '../../domain/types';
import * as crypto from 'node:crypto';

export class AcademicService {
  // 1. Schools
  public static createSchool(
    name: string, 
    code: string, 
    currency: string = 'USD', 
    address?: string, 
    contactEmail?: string
  ): School {
    const db = getDatabase();
    const id = `sch_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO schools (id, name, code, currency, address, contact_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, code.toUpperCase(), currency.toUpperCase(), address || null, contactEmail || null, createdAt);

    return { id, name, code: code.toUpperCase(), currency: currency.toUpperCase(), address, contactEmail, createdAt };
  }

  public static listSchools(): School[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM schools ORDER BY created_at ASC`);
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      currency: r.currency,
      address: r.address || undefined,
      contactEmail: r.contact_email || undefined,
      createdAt: r.created_at
    }));
  }

  public static getSchoolById(id: string): School | null {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM schools WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      currency: row.currency,
      address: row.address || undefined,
      contactEmail: row.contact_email || undefined,
      createdAt: row.created_at
    };
  }

  // 2. Users & Staff
  public static createUser(
    schoolId: string, 
    role: UserRole, 
    email: string, 
    fullName: string, 
    phone?: string, 
    linkedStudentId?: string
  ): User {
    const db = getDatabase();
    const id = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, school_id, role, email, full_name, phone, is_active, linked_student_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    stmt.run(id, schoolId, role, email.toLowerCase(), fullName, phone || null, linkedStudentId || null, createdAt);

    return { id, schoolId, role, email: email.toLowerCase(), fullName, phone, isActive: true, linkedStudentId, createdAt };
  }

  public static listUsers(schoolId: string, role?: UserRole): User[] {
    const db = getDatabase();
    let query = `SELECT * FROM users WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }
    query += ` ORDER BY full_name ASC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      role: r.role,
      email: r.email,
      fullName: r.full_name,
      phone: r.phone || undefined,
      isActive: Boolean(r.is_active),
      linkedStudentId: r.linked_student_id || undefined,
      createdAt: r.created_at
    }));
  }

  // 3. Academic Sessions & Terms
  public static createSession(
    schoolId: string, 
    name: string, 
    startDate: string, 
    endDate: string, 
    isCurrent: boolean = true
  ): AcademicSession {
    const db = getDatabase();
    const id = `ses_${crypto.randomBytes(6).toString('hex')}`;

    if (isCurrent) {
      db.prepare(`UPDATE academic_sessions SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    }

    const stmt = db.prepare(`
      INSERT INTO academic_sessions (id, school_id, name, start_date, end_date, status, is_current)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);
    stmt.run(id, schoolId, name, startDate, endDate, isCurrent ? 1 : 0);

    return { id, schoolId, name, startDate, endDate, status: 'ACTIVE', isCurrent };
  }

  public static listSessions(schoolId: string): AcademicSession[] {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM academic_sessions WHERE school_id = ? ORDER BY start_date DESC`).all(schoolId) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      name: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      isCurrent: Boolean(r.is_current)
    }));
  }

  public static createTerm(
    schoolId: string, 
    sessionId: string, 
    name: string, 
    startDate: string, 
    endDate: string, 
    isCurrent: boolean = true
  ): AcademicTerm {
    const db = getDatabase();
    const id = `trm_${crypto.randomBytes(6).toString('hex')}`;

    if (isCurrent) {
      db.prepare(`UPDATE academic_terms SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    }

    const stmt = db.prepare(`
      INSERT INTO academic_terms (id, school_id, session_id, name, start_date, end_date, status, is_current)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);
    stmt.run(id, schoolId, sessionId, name, startDate, endDate, isCurrent ? 1 : 0);

    return { id, schoolId, sessionId, name, startDate, endDate, status: 'ACTIVE', isCurrent };
  }

  public static listTerms(schoolId: string, sessionId?: string): AcademicTerm[] {
    const db = getDatabase();
    let query = `SELECT * FROM academic_terms WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (sessionId) {
      query += ` AND session_id = ?`;
      params.push(sessionId);
    }
    query += ` ORDER BY start_date ASC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      sessionId: r.session_id,
      name: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      isCurrent: Boolean(r.is_current)
    }));
  }

  // 4. Classes & Subjects
  public static createClass(schoolId: string, name: string, level: number, capacity: number = 35): ClassArm {
    const db = getDatabase();
    const id = `cls_${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`INSERT INTO classes (id, school_id, name, level, capacity) VALUES (?, ?, ?, ?, ?)`).run(
      id, schoolId, name, level, capacity
    );
    return { id, schoolId, name, level, capacity };
  }

  public static listClasses(schoolId: string): ClassArm[] {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM classes WHERE school_id = ? ORDER BY level ASC, name ASC`).all(schoolId) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      name: r.name,
      level: r.level,
      capacity: r.capacity
    }));
  }

  public static createSubject(schoolId: string, code: string, name: string, creditUnits: number = 1): Subject {
    const db = getDatabase();
    const id = `sbj_${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`INSERT INTO subjects (id, school_id, code, name, credit_units) VALUES (?, ?, ?, ?, ?)`).run(
      id, schoolId, code.toUpperCase(), name, creditUnits
    );
    return { id, schoolId, code: code.toUpperCase(), name, creditUnits };
  }

  public static listSubjects(schoolId: string): Subject[] {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM subjects WHERE school_id = ? ORDER BY code ASC`).all(schoolId) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      code: r.code,
      name: r.name,
      creditUnits: r.credit_units
    }));
  }

  public static assignStaff(schoolId: string, teacherId: string, classId: string, subjectId: string): StaffAssignment {
    const db = getDatabase();
    const id = `asg_${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`INSERT INTO staff_assignments (id, school_id, teacher_id, class_id, subject_id) VALUES (?, ?, ?, ?, ?)`).run(
      id, schoolId, teacherId, classId, subjectId
    );
    return { id, schoolId, teacherId, classId, subjectId };
  }

  // 5. Students
  public static enrollStudent(
    schoolId: string,
    admissionNumber: string,
    fullName: string,
    gender: 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: string,
    guardianName: string,
    guardianEmail: string,
    guardianPhone: string,
    currentClassId: string
  ): StudentProfile {
    const db = getDatabase();
    const id = `stu_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO students (
        id, school_id, admission_number, full_name, gender, date_of_birth,
        guardian_name, guardian_email, guardian_phone, current_class_id, enrollment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ENROLLED', ?)
    `).run(
      id, schoolId, admissionNumber, fullName, gender, dateOfBirth,
      guardianName, guardianEmail, guardianPhone, currentClassId, createdAt
    );

    return {
      id,
      schoolId,
      admissionNumber,
      fullName,
      gender,
      dateOfBirth,
      guardianName,
      guardianEmail,
      guardianPhone,
      currentClassId,
      enrollmentStatus: 'ENROLLED',
      createdAt
    };
  }

  public static listStudents(schoolId: string, classId?: string): StudentProfile[] {
    const db = getDatabase();
    let query = `SELECT * FROM students WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (classId) {
      query += ` AND current_class_id = ?`;
      params.push(classId);
    }
    query += ` ORDER BY full_name ASC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      admissionNumber: r.admission_number,
      fullName: r.full_name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      guardianName: r.guardian_name,
      guardianEmail: r.guardian_email,
      guardianPhone: r.guardian_phone,
      currentClassId: r.current_class_id,
      enrollmentStatus: r.enrollment_status,
      createdAt: r.created_at
    }));
  }

  public static getStudentById(schoolId: string, studentId: string): StudentProfile | null {
    const db = getDatabase();
    const row = db.prepare(`SELECT * FROM students WHERE school_id = ? AND id = ?`).get(schoolId, studentId) as any;
    if (!row) return null;
    return {
      id: row.id,
      schoolId: row.school_id,
      admissionNumber: row.admission_number,
      fullName: row.full_name,
      gender: row.gender,
      dateOfBirth: row.date_of_birth,
      guardianName: row.guardian_name,
      guardianEmail: row.guardian_email,
      guardianPhone: row.guardian_phone,
      currentClassId: row.current_class_id,
      enrollmentStatus: row.enrollment_status,
      createdAt: row.created_at
    };
  }
}
