import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/server';
import { resetDatabase } from '../src/server/db/database';
import * as path from 'node:path';

describe('EduSphere School Management — End-to-End Multi-Tenant Integration Tests', () => {
  const testDbPath = path.resolve(process.cwd(), 'data', 'test_edusphere.db');

  beforeEach(() => {
    resetDatabase(testDbPath);
  });

  it('1. should create two independent schools with strict data isolation', async () => {
    // School A: St. Jude Academy
    const resA = await request(app)
      .post('/api/schools')
      .send({ name: 'St. Jude Academy', code: 'SJA', currency: 'USD' });
    expect(resA.status).toBe(201);
    const schoolA = resA.body;

    // School B: Apex International School
    const resB = await request(app)
      .post('/api/schools')
      .send({ name: 'Apex International School', code: 'AIS', currency: 'EUR' });
    expect(resB.status).toBe(201);
    const schoolB = resB.body;

    // Create Class in School A
    const classA = await request(app)
      .post('/api/classes')
      .set('x-school-id', schoolA.id)
      .send({ name: 'Grade 10-A', level: 10, capacity: 30 });
    expect(classA.status).toBe(201);

    // Create Class in School B
    const classB = await request(app)
      .post('/api/classes')
      .set('x-school-id', schoolB.id)
      .send({ name: 'Year 11 Science', level: 11, capacity: 25 });
    expect(classB.status).toBe(201);

    // Enroll Student in School A
    const stuA = await request(app)
      .post('/api/students')
      .set('x-school-id', schoolA.id)
      .send({
        admissionNumber: 'SJA/2025/001',
        fullName: 'Alexander Wright',
        gender: 'MALE',
        dateOfBirth: '2009-05-12',
        guardianName: 'Robert Wright',
        guardianEmail: 'robert.wright@example.com',
        guardianPhone: '555-0199',
        currentClassId: classA.body.id
      });
    expect(stuA.status).toBe(201);

    // Verify School B cannot list or access School A students
    const listB = await request(app)
      .get('/api/students')
      .set('x-school-id', schoolB.id);
    expect(listB.status).toBe(200);
    expect(listB.body.length).toBe(0); // Zero bleed!

    // Verify School A lists its student
    const listA = await request(app)
      .get('/api/students')
      .set('x-school-id', schoolA.id);
    expect(listA.status).toBe(200);
    expect(listA.body.length).toBe(1);
    expect(listA.body[0].fullName).toBe('Alexander Wright');
  });

  it('2. should manage academic session, term, and subjects', async () => {
    const schoolRes = await request(app)
      .post('/api/schools')
      .send({ name: 'Cambridge Model High', code: 'CMH', currency: 'GBP' });
    const schoolId = schoolRes.body.id;

    // Create Academic Session
    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('x-school-id', schoolId)
      .send({ name: '2025/2026 Academic Year', startDate: '2025-09-01', endDate: '2026-07-15', isCurrent: true });
    expect(sessionRes.status).toBe(201);

    // Create Academic Term
    const termRes = await request(app)
      .post('/api/terms')
      .set('x-school-id', schoolId)
      .send({
        sessionId: sessionRes.body.id,
        name: 'First Term',
        startDate: '2025-09-01',
        endDate: '2025-12-15',
        isCurrent: true
      });
    expect(termRes.status).toBe(201);

    // Create Subjects
    const mathRes = await request(app)
      .post('/api/subjects')
      .set('x-school-id', schoolId)
      .send({ code: 'MTH101', name: 'Mathematics', creditUnits: 4 });
    expect(mathRes.status).toBe(201);

    const engRes = await request(app)
      .post('/api/subjects')
      .set('x-school-id', schoolId)
      .send({ code: 'ENG101', name: 'English Literature', creditUnits: 3 });
    expect(engRes.status).toBe(201);

    const listSub = await request(app)
      .get('/api/subjects')
      .set('x-school-id', schoolId);
    expect(listSub.body.length).toBe(2);
  });

  it('3. should record assessment scores, log modifications, and compute report card', async () => {
    const schoolRes = await request(app)
      .post('/api/schools')
      .send({ name: 'Global Scholars Academy', code: 'GSA', currency: 'USD' });
    const schoolId = schoolRes.body.id;

    const classRes = await request(app)
      .post('/api/classes')
      .set('x-school-id', schoolId)
      .send({ name: 'Grade 12-Alpha', level: 12 });
    const classId = classRes.body.id;

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('x-school-id', schoolId)
      .send({ name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30' });

    const termRes = await request(app)
      .post('/api/terms')
      .set('x-school-id', schoolId)
      .send({ sessionId: sessionRes.body.id, name: 'First Term', startDate: '2025-09-01', endDate: '2025-12-15' });
    const termId = termRes.body.id;

    const math = await request(app)
      .post('/api/subjects')
      .set('x-school-id', schoolId)
      .send({ code: 'MTH301', name: 'Advanced Mathematics', creditUnits: 4 });

    const physics = await request(app)
      .post('/api/subjects')
      .set('x-school-id', schoolId)
      .send({ code: 'PHY301', name: 'Physics Mechanics', creditUnits: 3 });

    const student = await request(app)
      .post('/api/students')
      .set('x-school-id', schoolId)
      .send({
        admissionNumber: 'GSA/2025/101',
        fullName: 'Clara Oswald',
        currentClassId: classId
      });
    const studentId = student.body.id;

    // Record Math score: CA1: 14, CA2: 14, Assignment: 9, Exam: 50 -> 87 (A, 4.0)
    const score1 = await request(app)
      .post('/api/grades/record')
      .set('x-school-id', schoolId)
      .send({
        studentId,
        subjectId: math.body.id,
        termId,
        classId,
        ca1: 14,
        ca2: 14,
        assignment: 9,
        exam: 50,
        teacherId: 'teacher_01'
      });
    expect(score1.status).toBe(200);
    expect(score1.body.totalScore).toBe(87);
    expect(score1.body.gradeLetter).toBe('A');

    // Record Physics score: CA1: 10, CA2: 10, Assignment: 7, Exam: 43 -> 70 (B, 3.0)
    const score2 = await request(app)
      .post('/api/grades/record')
      .set('x-school-id', schoolId)
      .send({
        studentId,
        subjectId: physics.body.id,
        termId,
        classId,
        ca1: 10,
        ca2: 10,
        assignment: 7,
        exam: 43,
        teacherId: 'teacher_02'
      });
    expect(score2.status).toBe(200);
    expect(score2.body.totalScore).toBe(70);

    // Update Physics score to 78 (A, 4.0) with remark and check audit log
    await request(app)
      .post('/api/grades/record')
      .set('x-school-id', schoolId)
      .send({
        studentId,
        subjectId: physics.body.id,
        termId,
        classId,
        ca1: 12,
        ca2: 12,
        assignment: 8,
        exam: 46, // 78
        teacherId: 'teacher_02',
        modificationReason: 'Re-graded physics lab assignment'
      });

    // Check Audit Logs
    const auditRes = await request(app)
      .get('/api/grades/audit-logs')
      .set('x-school-id', schoolId);
    expect(auditRes.body.length).toBe(1);
    expect(auditRes.body[0].previousTotal).toBe(70);
    expect(auditRes.body[0].newTotal).toBe(78);
    expect(auditRes.body[0].reason).toBe('Re-graded physics lab assignment');

    // Generate Full Student Report Card
    const reportRes = await request(app)
      .get(`/api/grades/report-card/${studentId}/${termId}`)
      .set('x-school-id', schoolId);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.student.fullName).toBe('Clara Oswald');
    expect(reportRes.body.subjectScores.length).toBe(2);
    expect(reportRes.body.summary.gpa).toBe(4.0); // Both subjects are A (4.0)
    expect(reportRes.body.summary.classRank).toBe(1);
  });

  it('4. should manage fee schedules, generate student invoices, and record partial/full payments', async () => {
    const schoolRes = await request(app)
      .post('/api/schools')
      .send({ name: 'Westminster Collegiate', code: 'WCL', currency: 'USD' });
    const schoolId = schoolRes.body.id;

    const classRes = await request(app)
      .post('/api/classes')
      .set('x-school-id', schoolId)
      .send({ name: 'Grade 9', level: 9 });

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('x-school-id', schoolId)
      .send({ name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30' });

    const termRes = await request(app)
      .post('/api/terms')
      .set('x-school-id', schoolId)
      .send({ sessionId: sessionRes.body.id, name: 'First Term', startDate: '2025-09-01', endDate: '2025-12-15' });
    const termId = termRes.body.id;

    const student = await request(app)
      .post('/api/students')
      .set('x-school-id', schoolId)
      .send({
        admissionNumber: 'WCL/2025/55',
        fullName: 'Ethan Hunt',
        currentClassId: classRes.body.id
      });
    const studentId = student.body.id;

    // Create Fee Schedule: Tuition = $3,500.00 (350000 cents), Tech Fee = $500.00 (50000 cents) -> Total = $4,000.00 (400000 cents)
    await request(app)
      .post('/api/fees/schedules')
      .set('x-school-id', schoolId)
      .send({ termId, category: 'Tuition', amountMinor: 350000 });

    await request(app)
      .post('/api/fees/schedules')
      .set('x-school-id', schoolId)
      .send({ termId, category: 'Technology & Lab', amountMinor: 50000 });

    // Generate Invoice for student
    const invRes = await request(app)
      .post('/api/fees/invoices/generate')
      .set('x-school-id', schoolId)
      .send({ studentId, termId, dueDate: '2025-10-15' });
    expect(invRes.status).toBe(201);
    expect(invRes.body.totalAmountMinor).toBe(400000);
    expect(invRes.body.paidAmountMinor).toBe(0);
    expect(invRes.body.balanceMinor).toBe(400000);
    expect(invRes.body.status).toBe('UNPAID');

    const invoiceId = invRes.body.id;

    // Record Partial Payment: $2,500.00 (250000 cents)
    const pay1 = await request(app)
      .post('/api/fees/pay')
      .set('x-school-id', schoolId)
      .send({
        invoiceId,
        amountMinor: 250000,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TXN-998811'
      });
    expect(pay1.status).toBe(201);

    // Verify Invoice is PARTIALLY_PAID with remaining balance $1,500.00
    const invList = await request(app)
      .get('/api/fees/invoices')
      .set('x-school-id', schoolId)
      .query({ studentId, termId });
    expect(invList.body[0].status).toBe('PARTIALLY_PAID');
    expect(invList.body[0].paidAmountMinor).toBe(250000);
    expect(invList.body[0].balanceMinor).toBe(150000);

    // Record Final Payment: $1,500.00 (150000 cents)
    await request(app)
      .post('/api/fees/pay')
      .set('x-school-id', schoolId)
      .send({
        invoiceId,
        amountMinor: 150000,
        paymentMethod: 'CARD',
        referenceNumber: 'TXN-998812'
      });

    // Verify Invoice is now fully PAID
    const invList2 = await request(app)
      .get('/api/fees/invoices')
      .set('x-school-id', schoolId)
      .query({ studentId, termId });
    expect(invList2.body[0].status).toBe('PAID');
    expect(invList2.body[0].balanceMinor).toBe(0);
  });
});
