/**
 * REST API Routes for School Management System
 */

import { Router, Response } from 'express';
import { TenantRequest, requirePermission } from '../middleware/tenant-context';
import { AcademicService } from '../services/academic.service';
import { GradeService } from '../services/grade.service';
import { FeeService } from '../services/fee.service';
import { AttendanceService } from '../services/attendance.service';

export const apiRouter = Router();

const paramStr = (val: any): string => (Array.isArray(val) ? val[0] : val) || '';

// Helper to ensure tenant presence
function getReqSchoolId(req: TenantRequest): string {
  const schoolId = req.schoolId || (req.body && req.body.schoolId);
  if (!schoolId) {
    throw new Error('School tenant context (x-school-id header or schoolId body) is required');
  }
  return schoolId;
}

// 1. Schools & System
apiRouter.post('/schools', (req: TenantRequest, res: Response): void => {
  const { name, code, currency, address, contactEmail } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: 'name and code are required' });
    return;
  }
  try {
    const school = AcademicService.createSchool(name, code, currency, address, contactEmail);
    res.status(201).json(school);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/schools', (_req: TenantRequest, res: Response): void => {
  const list = AcademicService.listSchools();
  res.status(200).json(list);
});

apiRouter.get('/schools/:id', (req: TenantRequest, res: Response): void => {
  const school = AcademicService.getSchoolById(paramStr(req.params.id));
  if (!school) {
    res.status(404).json({ error: 'School not found' });
    return;
  }
  res.status(200).json(school);
});

// 2. Users & Staff
apiRouter.post('/users', requirePermission('school:manage_staff'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { role, email, fullName, phone, linkedStudentId } = req.body;
    if (!role || !email || !fullName) {
      res.status(400).json({ error: 'role, email, and fullName are required' });
      return;
    }
    const user = AcademicService.createUser(schoolId, role, email, fullName, phone, linkedStudentId);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/users', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const role = req.query.role as any;
    const users = AcademicService.listUsers(schoolId, role);
    res.status(200).json(users);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Academic Sessions & Terms
apiRouter.post('/sessions', requirePermission('academic:create_session'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: 'name, startDate, and endDate are required' });
      return;
    }
    const session = AcademicService.createSession(schoolId, name, startDate, endDate, Boolean(isCurrent));
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/sessions', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const sessions = AcademicService.listSessions(schoolId);
    res.status(200).json(sessions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/terms', requirePermission('academic:create_session'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { sessionId, name, startDate, endDate, isCurrent } = req.body;
    if (!sessionId || !name || !startDate || !endDate) {
      res.status(400).json({ error: 'sessionId, name, startDate, and endDate are required' });
      return;
    }
    const term = AcademicService.createTerm(schoolId, sessionId, name, startDate, endDate, Boolean(isCurrent));
    res.status(201).json(term);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/terms', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const sessionId = req.query.sessionId as string;
    const terms = AcademicService.listTerms(schoolId, sessionId);
    res.status(200).json(terms);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Classes & Subjects
apiRouter.post('/classes', requirePermission('academic:manage_classes'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { name, level, capacity } = req.body;
    if (!name || level === undefined) {
      res.status(400).json({ error: 'name and level are required' });
      return;
    }
    const cls = AcademicService.createClass(schoolId, name, Number(level), capacity ? Number(capacity) : 35);
    res.status(201).json(cls);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/classes', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const classes = AcademicService.listClasses(schoolId);
    res.status(200).json(classes);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/subjects', requirePermission('academic:manage_subjects'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { code, name, creditUnits } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'code and name are required' });
      return;
    }
    const subject = AcademicService.createSubject(schoolId, code, name, creditUnits ? Number(creditUnits) : 1);
    res.status(201).json(subject);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/subjects', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const subjects = AcademicService.listSubjects(schoolId);
    res.status(200).json(subjects);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Students & Enrollment
apiRouter.post('/students', requirePermission('student:enroll'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const {
      admissionNumber,
      fullName,
      gender,
      dateOfBirth,
      guardianName,
      guardianEmail,
      guardianPhone,
      currentClassId
    } = req.body;

    if (!admissionNumber || !fullName || !currentClassId) {
      res.status(400).json({ error: 'admissionNumber, fullName, and currentClassId are required' });
      return;
    }

    const student = AcademicService.enrollStudent(
      schoolId,
      admissionNumber,
      fullName,
      gender || 'MALE',
      dateOfBirth || '2010-01-01',
      guardianName || 'Guardian',
      guardianEmail || 'guardian@example.com',
      guardianPhone || '555-0100',
      currentClassId
    );

    res.status(201).json(student);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/students', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const classId = req.query.classId as string;
    const students = AcademicService.listStudents(schoolId, classId);
    res.status(200).json(students);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/students/:id', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const student = AcademicService.getStudentById(schoolId, paramStr(req.params.id));
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json(student);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Assessment & Gradebook
apiRouter.post('/grades/record', requirePermission('grade:record_scores'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const {
      studentId,
      subjectId,
      termId,
      classId,
      ca1,
      ca2,
      assignment,
      exam,
      teacherId,
      modificationReason
    } = req.body;

    if (!studentId || !subjectId || !termId || !classId) {
      res.status(400).json({ error: 'studentId, subjectId, termId, and classId are required' });
      return;
    }

    const score = GradeService.recordScore(
      schoolId,
      studentId,
      subjectId,
      termId,
      classId,
      Number(ca1 || 0),
      Number(ca2 || 0),
      Number(assignment || 0),
      Number(exam || 0),
      teacherId || req.userId || 'usr_teacher',
      modificationReason
    );

    res.status(200).json(score);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/grades/student/:studentId', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const termId = req.query.termId as string;
    if (!termId) {
      res.status(400).json({ error: 'termId query parameter is required' });
      return;
    }
    const scores = GradeService.listScoresForStudent(schoolId, paramStr(req.params.studentId), termId);
    res.status(200).json(scores);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/grades/class/:classId', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const termId = req.query.termId as string;
    const subjectId = req.query.subjectId as string;
    if (!termId) {
      res.status(400).json({ error: 'termId query parameter is required' });
      return;
    }
    const scores = GradeService.listScoresForClass(schoolId, paramStr(req.params.classId), termId, subjectId);
    res.status(200).json(scores);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/grades/report-card/:studentId/:termId', requirePermission('grade:view_report_card'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const studentId = paramStr(req.params.studentId);
    const termId = paramStr(req.params.termId);
    const reportCard = GradeService.generateStudentReportCard(schoolId, studentId, termId);
    res.status(200).json(reportCard);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/grades/audit-logs', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const studentId = req.query.studentId as string;
    const logs = GradeService.listAuditLogs(schoolId, studentId);
    res.status(200).json(logs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Attendance
apiRouter.post('/attendance/mark', requirePermission('attendance:mark'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { studentId, classId, date, status, teacherId, notes } = req.body;
    if (!studentId || !classId || !date || !status) {
      res.status(400).json({ error: 'studentId, classId, date, and status are required' });
      return;
    }
    const record = AttendanceService.markAttendance(
      schoolId,
      studentId,
      classId,
      date,
      status,
      teacherId || req.userId || 'usr_teacher',
      notes
    );
    res.status(200).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/attendance/class/:classId', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const date = req.query.date as string;
    if (!date) {
      res.status(400).json({ error: 'date query parameter is required' });
      return;
    }
    const records = AttendanceService.listAttendanceForClass(schoolId, paramStr(req.params.classId), date);
    res.status(200).json(records);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/attendance/summary/:studentId', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const summary = AttendanceService.getStudentAttendanceSummary(schoolId, paramStr(req.params.studentId));
    res.status(200).json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Fee Management & Invoicing
apiRouter.post('/fees/schedules', requirePermission('fee:manage_schedules'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { termId, category, amountMinor, classId, isMandatory } = req.body;
    if (!termId || !category || amountMinor === undefined) {
      res.status(400).json({ error: 'termId, category, and amountMinor are required' });
      return;
    }
    const schedule = FeeService.createFeeSchedule(
      schoolId,
      termId,
      category,
      Number(amountMinor),
      classId,
      isMandatory !== undefined ? Boolean(isMandatory) : true
    );
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/fees/schedules', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const termId = req.query.termId as string;
    const schedules = FeeService.listFeeSchedules(schoolId, termId);
    res.status(200).json(schedules);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/fees/invoices/generate', requirePermission('fee:manage_schedules'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { studentId, termId, dueDate } = req.body;
    if (!studentId || !termId || !dueDate) {
      res.status(400).json({ error: 'studentId, termId, and dueDate are required' });
      return;
    }
    const invoice = FeeService.generateStudentInvoice(schoolId, studentId, termId, dueDate);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/fees/invoices', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const studentId = req.query.studentId as string;
    const termId = req.query.termId as string;
    const invoices = FeeService.listInvoices(schoolId, studentId, termId);
    res.status(200).json(invoices);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/fees/pay', requirePermission('fee:record_payments'), (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const { invoiceId, amountMinor, paymentMethod, referenceNumber } = req.body;
    if (!invoiceId || amountMinor === undefined || !paymentMethod) {
      res.status(400).json({ error: 'invoiceId, amountMinor, and paymentMethod are required' });
      return;
    }
    const receipt = FeeService.recordPayment(
      schoolId,
      invoiceId,
      Number(amountMinor),
      paymentMethod,
      referenceNumber || `REF_${Date.now()}`,
      req.userId || 'usr_accountant'
    );
    res.status(201).json(receipt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/fees/payments', (req: TenantRequest, res: Response): void => {
  try {
    const schoolId = getReqSchoolId(req);
    const studentId = req.query.studentId as string;
    const payments = FeeService.listPayments(schoolId, studentId);
    res.status(200).json(payments);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
