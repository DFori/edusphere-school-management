/**
 * Grade & Assessment Service with Immutable Audit Logging and Report Card Generation
 */

import { getDatabase } from '../db/database';
import { SubjectScore, GradeAuditLog, ReportCard } from '../../domain/types';
import { GradeCalculator, DEFAULT_RUBRIC } from '../../domain/grade-calculator';
import { AcademicService } from './academic.service';
import * as crypto from 'node:crypto';

export class GradeService {
  /**
   * Record or update an assessment score with validation and audit logging
   */
  public static recordScore(
    schoolId: string,
    studentId: string,
    subjectId: string,
    termId: string,
    classId: string,
    ca1: number,
    ca2: number,
    assignment: number,
    exam: number,
    teacherId: string,
    modificationReason?: string
  ): SubjectScore {
    const db = getDatabase();
    const gradeResult = GradeCalculator.calculateSubjectGrade(ca1, ca2, assignment, exam, DEFAULT_RUBRIC);
    const now = new Date().toISOString();

    // Check if score record already exists
    const existing = db.prepare(`
      SELECT * FROM subject_scores 
      WHERE school_id = ? AND student_id = ? AND subject_id = ? AND term_id = ?
    `).get(schoolId, studentId, subjectId, termId) as any;

    if (existing) {
      // If updating, generate an immutable audit log
      if (existing.total_score !== gradeResult.totalScore) {
        const auditId = `aud_${crypto.randomBytes(6).toString('hex')}`;
        db.prepare(`
          INSERT INTO grade_audit_logs (
            id, school_id, score_id, student_id, subject_id, term_id,
            previous_total, new_total, modified_by_teacher_id, reason, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          auditId, schoolId, existing.id, studentId, subjectId, termId,
          existing.total_score, gradeResult.totalScore, teacherId,
          modificationReason || 'Score adjustment', now
        );
      }

      db.prepare(`
        UPDATE subject_scores
        SET ca1_score = ?, ca2_score = ?, assignment_score = ?, exam_score = ?,
            total_score = ?, grade_letter = ?, grade_point = ?, remarks = ?,
            recorded_by_teacher_id = ?, updated_at = ?
        WHERE id = ?
      `).run(
        ca1, ca2, assignment, exam,
        gradeResult.totalScore, gradeResult.gradeLetter, gradeResult.gradePoint,
        gradeResult.remarks, teacherId, now, existing.id
      );

      return {
        id: existing.id,
        schoolId,
        studentId,
        subjectId,
        termId,
        classId,
        ca1Score: ca1,
        ca2Score: ca2,
        assignmentScore: assignment,
        examScore: exam,
        totalScore: gradeResult.totalScore,
        gradeLetter: gradeResult.gradeLetter,
        gradePoint: gradeResult.gradePoint,
        remarks: gradeResult.remarks,
        recordedByTeacherId: teacherId,
        updatedAt: now
      };
    } else {
      // Insert new score
      const id = `scr_${crypto.randomBytes(6).toString('hex')}`;
      db.prepare(`
        INSERT INTO subject_scores (
          id, school_id, student_id, subject_id, term_id, class_id,
          ca1_score, ca2_score, assignment_score, exam_score,
          total_score, grade_letter, grade_point, remarks,
          recorded_by_teacher_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, schoolId, studentId, subjectId, termId, classId,
        ca1, ca2, assignment, exam,
        gradeResult.totalScore, gradeResult.gradeLetter, gradeResult.gradePoint,
        gradeResult.remarks, teacherId, now
      );

      return {
        id,
        schoolId,
        studentId,
        subjectId,
        termId,
        classId,
        ca1Score: ca1,
        ca2Score: ca2,
        assignmentScore: assignment,
        examScore: exam,
        totalScore: gradeResult.totalScore,
        gradeLetter: gradeResult.gradeLetter,
        gradePoint: gradeResult.gradePoint,
        remarks: gradeResult.remarks,
        recordedByTeacherId: teacherId,
        updatedAt: now
      };
    }
  }

  public static listScoresForStudent(schoolId: string, studentId: string, termId: string): SubjectScore[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM subject_scores 
      WHERE school_id = ? AND student_id = ? AND term_id = ?
    `).all(schoolId, studentId, termId) as any[];

    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      studentId: r.student_id,
      subjectId: r.subject_id,
      termId: r.term_id,
      classId: r.class_id,
      ca1Score: r.ca1_score,
      ca2Score: r.ca2_score,
      assignmentScore: r.assignment_score,
      examScore: r.exam_score,
      totalScore: r.total_score,
      gradeLetter: r.grade_letter,
      gradePoint: r.grade_point,
      remarks: r.remarks,
      recordedByTeacherId: r.recorded_by_teacher_id,
      updatedAt: r.updated_at
    }));
  }

  public static listScoresForClass(schoolId: string, classId: string, termId: string, subjectId?: string): SubjectScore[] {
    const db = getDatabase();
    let query = `SELECT * FROM subject_scores WHERE school_id = ? AND class_id = ? AND term_id = ?`;
    const params: any[] = [schoolId, classId, termId];
    if (subjectId) {
      query += ` AND subject_id = ?`;
      params.push(subjectId);
    }
    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      studentId: r.student_id,
      subjectId: r.subject_id,
      termId: r.term_id,
      classId: r.class_id,
      ca1Score: r.ca1_score,
      ca2Score: r.ca2_score,
      assignmentScore: r.assignment_score,
      examScore: r.exam_score,
      totalScore: r.total_score,
      gradeLetter: r.grade_letter,
      gradePoint: r.grade_point,
      remarks: r.remarks,
      recordedByTeacherId: r.recorded_by_teacher_id,
      updatedAt: r.updated_at
    }));
  }

  public static listAuditLogs(schoolId: string, studentId?: string): GradeAuditLog[] {
    const db = getDatabase();
    let query = `SELECT * FROM grade_audit_logs WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (studentId) {
      query += ` AND student_id = ?`;
      params.push(studentId);
    }
    query += ` ORDER BY timestamp DESC`;
    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      scoreId: r.score_id,
      studentId: r.student_id,
      subjectId: r.subject_id,
      termId: r.term_id,
      previousTotal: r.previous_total,
      newTotal: r.new_total,
      modifiedByTeacherId: r.modified_by_teacher_id,
      reason: r.reason,
      timestamp: r.timestamp
    }));
  }

  /**
   * Compile full student report card with cumulative GPA and class rank
   */
  public static generateStudentReportCard(schoolId: string, studentId: string, termId: string): ReportCard {
    const db = getDatabase();
    const school = AcademicService.getSchoolById(schoolId);
    if (!school) throw new Error(`School not found: ${schoolId}`);

    const student = AcademicService.getStudentById(schoolId, studentId);
    if (!student) throw new Error(`Student not found: ${studentId}`);

    const termRow = db.prepare(`SELECT * FROM academic_terms WHERE school_id = ? AND id = ?`).get(schoolId, termId) as any;
    if (!termRow) throw new Error(`Term not found: ${termId}`);

    const sessionRow = db.prepare(`SELECT * FROM academic_sessions WHERE school_id = ? AND id = ?`).get(schoolId, termRow.session_id) as any;
    const classRow = db.prepare(`SELECT * FROM classes WHERE school_id = ? AND id = ?`).get(schoolId, student.currentClassId) as any;

    // Get subjects and scores
    const subjectList = AcademicService.listSubjects(schoolId);
    const subjectMap = new Map(subjectList.map(s => [s.id, s]));

    const scoreRows = this.listScoresForStudent(schoolId, studentId, termId);
    const subjectsOutput = scoreRows.map(scr => {
      const sbj = subjectMap.get(scr.subjectId);
      return {
        subjectCode: sbj ? sbj.code : 'UNKNOWN',
        subjectName: sbj ? sbj.name : 'Unknown Subject',
        creditUnits: sbj ? sbj.creditUnits : 1,
        ca1: scr.ca1Score,
        ca2: scr.ca2Score,
        assignment: scr.assignmentScore,
        exam: scr.examScore,
        total: scr.totalScore,
        gradeLetter: scr.gradeLetter,
        gradePoint: scr.gradePoint,
        remarks: scr.remarks || ''
      };
    });

    // Compute GPA
    const gpa = GradeCalculator.calculateGPA(
      subjectsOutput.map(s => ({ creditUnits: s.creditUnits, gradePoint: s.gradePoint }))
    );

    const totalCredits = subjectsOutput.reduce((acc, s) => acc + s.creditUnits, 0);
    const totalScore = subjectsOutput.reduce((acc, s) => acc + s.total, 0);
    const averageScore = subjectsOutput.length > 0 ? Math.round((totalScore / subjectsOutput.length) * 10) / 10 : 0;

    // Class Rankings
    const classStudents = AcademicService.listStudents(schoolId, student.currentClassId);
    const classStudentAverages = classStudents.map(st => {
      const stScores = this.listScoresForStudent(schoolId, st.id, termId);
      const sum = stScores.reduce((a, b) => a + b.totalScore, 0);
      const avg = stScores.length > 0 ? sum / stScores.length : 0;
      return { studentId: st.id, totalAverage: avg };
    });

    const rankMap = GradeCalculator.calculateClassRanks(classStudentAverages);
    const classRank = rankMap.get(studentId) || 1;

    // Attendance stats
    const attRows = db.prepare(`SELECT status FROM attendance WHERE school_id = ? AND student_id = ?`).all(schoolId, studentId) as any[];
    const totalSchoolDays = attRows.length || 1;
    const daysPresent = attRows.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendanceRatePercentage = Math.round((daysPresent / totalSchoolDays) * 100);

    return {
      school,
      student,
      academicSession: {
        id: sessionRow.id,
        schoolId: sessionRow.school_id,
        name: sessionRow.name,
        startDate: sessionRow.start_date,
        endDate: sessionRow.end_date,
        status: sessionRow.status,
        isCurrent: Boolean(sessionRow.is_current)
      },
      academicTerm: {
        id: termRow.id,
        schoolId: termRow.school_id,
        sessionId: termRow.session_id,
        name: termRow.name,
        startDate: termRow.start_date,
        endDate: termRow.end_date,
        status: termRow.status,
        isCurrent: Boolean(termRow.is_current)
      },
      className: classRow ? classRow.name : 'Unassigned Class',
      subjectScores: subjectsOutput,
      summary: {
        totalCredits,
        totalScore,
        averageScore,
        gpa,
        classRank,
        totalStudentsInClass: classStudents.length,
        attendanceRatePercentage,
        daysPresent,
        totalSchoolDays,
        principalRemarks: GradeCalculator.generatePrincipalRemark(gpa)
      }
    };
  }
}
