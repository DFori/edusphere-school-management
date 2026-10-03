/**
 * Attendance Tracking Service
 */

import { getDatabase } from '../db/database';
import { AttendanceRecord, AttendanceStatus } from '../../domain/types';
import * as crypto from 'node:crypto';

export class AttendanceService {
  public static markAttendance(
    schoolId: string,
    studentId: string,
    classId: string,
    date: string,
    status: AttendanceStatus,
    teacherId: string,
    notes?: string
  ): AttendanceRecord {
    const db = getDatabase();

    // Check if record exists for this date and student
    const existing = db.prepare(`
      SELECT id FROM attendance WHERE school_id = ? AND student_id = ? AND date = ?
    `).get(schoolId, studentId, date) as any;

    if (existing) {
      db.prepare(`
        UPDATE attendance SET status = ?, marked_by_teacher_id = ?, notes = ?
        WHERE id = ?
      `).run(status, teacherId, notes || null, existing.id);

      return {
        id: existing.id,
        schoolId,
        studentId,
        classId,
        date,
        status,
        markedByTeacherId: teacherId,
        notes
      };
    } else {
      const id = `att_${crypto.randomBytes(6).toString('hex')}`;
      db.prepare(`
        INSERT INTO attendance (id, school_id, student_id, class_id, date, status, marked_by_teacher_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, schoolId, studentId, classId, date, status, teacherId, notes || null);

      return {
        id,
        schoolId,
        studentId,
        classId,
        date,
        status,
        markedByTeacherId: teacherId,
        notes
      };
    }
  }

  public static listAttendanceForClass(schoolId: string, classId: string, date: string): AttendanceRecord[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM attendance WHERE school_id = ? AND class_id = ? AND date = ?
    `).all(schoolId, classId, date) as any[];

    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      studentId: r.student_id,
      classId: r.class_id,
      date: r.date,
      status: r.status,
      markedByTeacherId: r.marked_by_teacher_id,
      notes: r.notes || undefined
    }));
  }

  public static getStudentAttendanceSummary(schoolId: string, studentId: string): {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRatePercentage: number;
  } {
    const db = getDatabase();
    const rows = db.prepare(`SELECT status FROM attendance WHERE school_id = ? AND student_id = ?`).all(schoolId, studentId) as any[];

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const r of rows) {
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'LATE') late++;
      else if (r.status === 'EXCUSED') excused++;
    }

    const totalDays = rows.length;
    const effectivePresent = present + late;
    const attendanceRatePercentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 100;

    return {
      totalDays,
      present,
      absent,
      late,
      excused,
      attendanceRatePercentage
    };
  }
}
