/**
 * Relational SQLite Database Provider with WAL Mode for School Management System
 * Uses Node.js 24 native `node:sqlite` for high-throughput zero-dependency transactional storage.
 */

import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as fs from 'node:fs';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance) return dbInstance;

  const targetPath = dbPath || path.resolve(process.cwd(), 'data', 'edusphere.db');
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new DatabaseSync(targetPath);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  initSchema(dbInstance);

  return dbInstance;
}

export function resetDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  const targetPath = dbPath || path.resolve(process.cwd(), 'data', 'edusphere.db');
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  return getDatabase(targetPath);
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      currency TEXT NOT NULL DEFAULT 'USD',
      address TEXT,
      contact_email TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      linked_student_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS academic_sessions (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      is_current INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS academic_terms (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      is_current INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 35,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      credit_units INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff_assignments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      admission_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      guardian_name TEXT NOT NULL,
      guardian_email TEXT NOT NULL,
      guardian_phone TEXT NOT NULL,
      current_class_id TEXT NOT NULL,
      enrollment_status TEXT NOT NULL DEFAULT 'ENROLLED',
      created_at TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (current_class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS subject_scores (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      ca1_score REAL NOT NULL DEFAULT 0,
      ca2_score REAL NOT NULL DEFAULT 0,
      assignment_score REAL NOT NULL DEFAULT 0,
      exam_score REAL NOT NULL DEFAULT 0,
      total_score REAL NOT NULL DEFAULT 0,
      grade_letter TEXT NOT NULL DEFAULT 'F',
      grade_point REAL NOT NULL DEFAULT 0,
      remarks TEXT,
      recorded_by_teacher_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grade_audit_logs (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      score_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      previous_total REAL NOT NULL,
      new_total REAL NOT NULL,
      modified_by_teacher_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      marked_by_teacher_id TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fee_schedules (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      class_id TEXT,
      term_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fee_invoices (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      total_amount_minor INTEGER NOT NULL,
      paid_amount_minor INTEGER NOT NULL DEFAULT 0,
      balance_minor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_receipts (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT NOT NULL,
      recorded_by_user_id TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Multi-tenant lookup indexes
    CREATE INDEX IF NOT EXISTS idx_users_school ON users (school_id, email);
    CREATE INDEX IF NOT EXISTS idx_students_school ON students (school_id, current_class_id);
    CREATE INDEX IF NOT EXISTS idx_scores_lookup ON subject_scores (school_id, student_id, term_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_lookup ON attendance (school_id, class_id, date);
    CREATE INDEX IF NOT EXISTS idx_invoices_student ON fee_invoices (school_id, student_id, term_id);
  `);
}
