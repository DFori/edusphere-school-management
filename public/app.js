/**
 * EduSphere — Frontend Application Logic
 * Multi-tenant academic management, live continuous assessment calculation,
 * student report card rendering, fee invoicing ledger, and attendance register.
 */

let activeSchoolId = null;
let activeRole = 'SUPER_ADMIN';
let schools = [];
let classes = [];
let subjects = [];
let students = [];
let activeTermId = null;

// DOM Elements
const selectSchool = document.getElementById('select-school');
const selectRole = document.getElementById('select-role');
const schoolDisplayName = document.getElementById('school-display-name');
const schoolDisplayCode = document.getElementById('school-display-code');
const activeTermBadge = document.getElementById('active-term-badge');

// KPIs
const kpiTotalStudents = document.getElementById('kpi-total-students');
const kpiAvgGpa = document.getElementById('kpi-avg-gpa');
const kpiFeeCollection = document.getElementById('kpi-fee-collection');
const kpiAttendanceRate = document.getElementById('kpi-attendance-rate');

// Gradebook Form & Table
const gradeClassSelect = document.getElementById('grade-class-select');
const gradeSubjectSelect = document.getElementById('grade-subject-select');
const gradeStudentSelect = document.getElementById('grade-student-select');
const scoreCa1 = document.getElementById('score-ca1');
const scoreCa2 = document.getElementById('score-ca2');
const scoreAssignment = document.getElementById('score-assignment');
const scoreExam = document.getElementById('score-exam');
const scoreReason = document.getElementById('score-reason');
const gradeLivePreview = document.getElementById('grade-live-preview');
const gradeTableBody = document.getElementById('grade-table-body');
const formRecordGrade = document.getElementById('form-record-grade');

// Report Card
const reportStudentSelect = document.getElementById('report-student-select');
const reportCardContainer = document.getElementById('report-card-container');
const btnPrintReport = document.getElementById('btn-print-report');

// Invoices & Ledger
const invoicesTableBody = document.getElementById('invoices-table-body');
const modalPay = document.getElementById('modal-pay');
const formPayFee = document.getElementById('form-pay-fee');
const payInvoiceId = document.getElementById('pay-invoice-id');
const payInvoiceDisplay = document.getElementById('pay-invoice-display');
const payAmount = document.getElementById('pay-amount');
const payMethod = document.getElementById('pay-method');

// Attendance
const attClassSelect = document.getElementById('att-class-select');
const attDateInput = document.getElementById('att-date-input');
const attendanceTableBody = document.getElementById('attendance-table-body');

// Audit Log
const auditTableBody = document.getElementById('audit-table-body');

// Enrollment Modal
const modalEnroll = document.getElementById('modal-enroll');
const formEnrollStudent = document.getElementById('form-enroll-student');
const enrollClass = document.getElementById('enroll-class');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  attDateInput.value = new Date().toISOString().split('T')[0];
  setupEvents();
  await initializeSchools();
});

function setupEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'tab-report-card') loadReportCard();
      if (btn.dataset.tab === 'tab-fees') loadInvoices();
      if (btn.dataset.tab === 'tab-attendance') loadAttendance();
      if (btn.dataset.tab === 'tab-audit') loadAuditLogs();
    });
  });

  // Tenant switcher
  selectSchool.addEventListener('change', async (e) => {
    activeSchoolId = e.target.value;
    await switchSchool(activeSchoolId);
  });

  // Role switcher
  selectRole.addEventListener('change', (e) => {
    activeRole = e.target.value;
    applyRolePermissions();
  });

  // Grade score live preview calculation
  [scoreCa1, scoreCa2, scoreAssignment, scoreExam].forEach(input => {
    input.addEventListener('input', updateLiveGradePreview);
  });

  // Grade class & subject change
  gradeClassSelect.addEventListener('change', () => {
    filterStudentsForClass();
    loadClassGrades();
  });
  gradeSubjectSelect.addEventListener('change', loadClassGrades);
  formRecordGrade.addEventListener('submit', handleSaveGrade);

  // Report card student change
  reportStudentSelect.addEventListener('change', loadReportCard);
  btnPrintReport.addEventListener('click', () => window.print());

  // Attendance
  attClassSelect.addEventListener('change', loadAttendance);
  attDateInput.addEventListener('change', loadAttendance);

  // Enrollment Modal
  document.getElementById('btn-enroll-student').addEventListener('click', () => modalEnroll.classList.remove('hidden'));
  document.getElementById('btn-close-enroll').addEventListener('click', () => modalEnroll.classList.add('hidden'));
  document.getElementById('btn-cancel-enroll').addEventListener('click', () => modalEnroll.classList.add('hidden'));
  formEnrollStudent.addEventListener('submit', handleEnrollStudent);

  // Pay Modal
  document.getElementById('btn-close-pay').addEventListener('click', () => modalPay.classList.add('hidden'));
  document.getElementById('btn-cancel-pay').addEventListener('click', () => modalPay.classList.add('hidden'));
  formPayFee.addEventListener('submit', handleProcessPayment);
}

// Network Request Helper with Tenant Context Headers
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (activeSchoolId) headers['x-school-id'] = activeSchoolId;
  headers['x-user-role'] = activeRole;
  headers['Content-Type'] = 'application/json';

  const res = await fetch(endpoint, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// School Setup & Seeding
async function initializeSchools() {
  try {
    schools = await apiFetch('/api/schools');

    if (!schools || schools.length === 0) {
      // Seed Demo School A
      const schoolA = await apiFetch('/api/schools', {
        method: 'POST',
        body: JSON.stringify({ name: 'St. Jude International Academy', code: 'SJA', currency: 'USD' })
      });
      // Seed Demo School B
      const schoolB = await apiFetch('/api/schools', {
        method: 'POST',
        body: JSON.stringify({ name: 'Apex British College', code: 'ABC', currency: 'GBP' })
      });

      schools = [schoolA, schoolB];
      activeSchoolId = schoolA.id;
      await seedSchoolData(schoolA.id);
      await seedSchoolData(schoolB.id, true);
    } else {
      activeSchoolId = schools[0].id;
    }

    renderSchoolSelector();
    await switchSchool(activeSchoolId);
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

async function seedSchoolData(schoolId, isAlt = false) {
  // 1. Session & Term
  const session = await apiFetch('/api/sessions', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ name: isAlt ? '2025/2026 British Academic Year' : '2025/2026 Academic Session', startDate: '2025-09-01', endDate: '2026-07-15', isCurrent: true })
  });

  const term = await apiFetch('/api/terms', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ sessionId: session.id, name: 'First Term (Autumn)', startDate: '2025-09-01', endDate: '2025-12-18', isCurrent: true })
  });

  // 2. Classes
  const class1 = await apiFetch('/api/classes', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ name: isAlt ? 'Year 10 Alpha' : 'Grade 10-A (Gold)', level: 10, capacity: 35 })
  });
  const class2 = await apiFetch('/api/classes', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ name: isAlt ? 'Year 11 Science' : 'Grade 11-B (Silver)', level: 11, capacity: 35 })
  });

  // 3. Subjects
  const mth = await apiFetch('/api/subjects', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ code: 'MTH101', name: 'Mathematics & Calculus', creditUnits: 4 })
  });
  const eng = await apiFetch('/api/subjects', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ code: 'ENG101', name: 'English Language & Rhetoric', creditUnits: 3 })
  });
  const sci = await apiFetch('/api/subjects', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ code: 'SCI101', name: 'General Physics & Mechanics', creditUnits: 3 })
  });

  // 4. Students
  const s1 = await apiFetch('/api/students', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({
      admissionNumber: `${isAlt ? 'ABC' : 'SJA'}/2025/001`,
      fullName: isAlt ? 'Oliver Kensington' : 'Alexander Wright',
      gender: 'MALE',
      dateOfBirth: '2009-04-15',
      guardianName: isAlt ? 'Lord Kensington' : 'Robert Wright',
      guardianEmail: 'guardian@example.com',
      guardianPhone: '+1 555-0101',
      currentClassId: class1.id
    })
  });

  const s2 = await apiFetch('/api/students', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({
      admissionNumber: `${isAlt ? 'ABC' : 'SJA'}/2025/002`,
      fullName: isAlt ? 'Charlotte Bennett' : 'Sophia Ramirez',
      gender: 'FEMALE',
      dateOfBirth: '2009-08-22',
      guardianName: 'Maria Ramirez',
      guardianEmail: 'maria.ramirez@example.com',
      guardianPhone: '+1 555-0102',
      currentClassId: class1.id
    })
  });

  // 5. Scores
  await apiFetch('/api/grades/record', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s1.id, subjectId: mth.id, termId: term.id, classId: class1.id, ca1: 14, ca2: 13, assignment: 9, exam: 52, teacherId: 'tch_smith' })
  });
  await apiFetch('/api/grades/record', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s1.id, subjectId: eng.id, termId: term.id, classId: class1.id, ca1: 13, ca2: 12, assignment: 8, exam: 48, teacherId: 'tch_smith' })
  });
  await apiFetch('/api/grades/record', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s1.id, subjectId: sci.id, termId: term.id, classId: class1.id, ca1: 15, ca2: 14, assignment: 9, exam: 55, teacherId: 'tch_smith' })
  });

  await apiFetch('/api/grades/record', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s2.id, subjectId: mth.id, termId: term.id, classId: class1.id, ca1: 11, ca2: 10, assignment: 7, exam: 42, teacherId: 'tch_smith' })
  });

  // 6. Fee Schedules & Invoices
  await apiFetch('/api/fees/schedules', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ termId: term.id, category: 'Tuition & Academic Term Fee', amountMinor: 350000 })
  });
  await apiFetch('/api/fees/schedules', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ termId: term.id, category: 'Science Lab & Technology Levy', amountMinor: 50000 })
  });

  const inv1 = await apiFetch('/api/fees/invoices/generate', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s1.id, termId: term.id, dueDate: '2025-10-31' })
  });

  // Partial Payment
  await apiFetch('/api/fees/pay', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ invoiceId: inv1.id, amountMinor: 250000, paymentMethod: 'BANK_TRANSFER', referenceNumber: 'TXN-00192' })
  });

  // 7. Attendance
  const today = new Date().toISOString().split('T')[0];
  await apiFetch('/api/attendance/mark', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s1.id, classId: class1.id, date: today, status: 'PRESENT', teacherId: 'tch_smith' })
  });
  await apiFetch('/api/attendance/mark', {
    method: 'POST',
    headers: { 'x-school-id': schoolId },
    body: JSON.stringify({ studentId: s2.id, classId: class1.id, date: today, status: 'LATE', teacherId: 'tch_smith' })
  });
}

function renderSchoolSelector() {
  selectSchool.innerHTML = schools.map(s => 
    `<option value="${s.id}" ${s.id === activeSchoolId ? 'selected' : ''}>${s.name} (${s.code})</option>`
  ).join('');
}

async function switchSchool(schoolId) {
  activeSchoolId = schoolId;
  const currentSchool = schools.find(s => s.id === schoolId);
  if (currentSchool) {
    schoolDisplayName.textContent = currentSchool.name;
    schoolDisplayCode.textContent = `Tenant Code: ${currentSchool.code} • Base Currency: ${currentSchool.currency}`;
  }

  // Load terms, classes, subjects, students
  const terms = await apiFetch('/api/terms');
  if (terms.length > 0) {
    activeTermId = terms[0].id;
    activeTermBadge.textContent = `${terms[0].name} (Active)`;
  }

  classes = await apiFetch('/api/classes');
  subjects = await apiFetch('/api/subjects');
  students = await apiFetch('/api/students');

  populateDropdowns();
  updateLiveGradePreview();
  await loadDashboardMetrics();
  await loadClassGrades();
}

function populateDropdowns() {
  // Class Selectors
  const classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  gradeClassSelect.innerHTML = classOptions;
  attClassSelect.innerHTML = classOptions;
  enrollClass.innerHTML = classOptions;

  // Subject Selectors
  gradeSubjectSelect.innerHTML = subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');

  // Student Selectors
  filterStudentsForClass();
}

function filterStudentsForClass() {
  const selectedClassId = gradeClassSelect.value;
  const classStudents = students.filter(s => s.currentClassId === selectedClassId);

  const studentOptions = classStudents.map(s => `<option value="${s.id}">${s.fullName} (${s.admissionNumber})</option>`).join('');
  gradeStudentSelect.innerHTML = studentOptions || '<option value="">No students enrolled in this class</option>';

  reportStudentSelect.innerHTML = students.map(s => `<option value="${s.id}">${s.fullName} (${s.admissionNumber})</option>`).join('');
}

// Live Grade Calculation Pill
function updateLiveGradePreview() {
  const ca1 = parseFloat(scoreCa1.value) || 0;
  const ca2 = parseFloat(scoreCa2.value) || 0;
  const assign = parseFloat(scoreAssignment.value) || 0;
  const exam = parseFloat(scoreExam.value) || 0;

  const total = Math.round((ca1 + ca2 + assign + exam) * 10) / 10;

  let gradeLetter = 'F';
  let gpa = 0.0;
  let remark = 'Fail';
  let badgeClass = 'badge-rose';

  if (total >= 75) { gradeLetter = 'A'; gpa = 4.0; remark = 'Excellent'; badgeClass = 'badge-emerald'; }
  else if (total >= 65) { gradeLetter = 'B'; gpa = 3.0; remark = 'Very Good'; badgeClass = 'badge-cyan'; }
  else if (total >= 50) { gradeLetter = 'C'; gpa = 2.0; remark = 'Credit'; badgeClass = 'badge-indigo'; }
  else if (total >= 40) { gradeLetter = 'D'; gpa = 1.0; remark = 'Pass'; badgeClass = 'badge-amber'; }

  gradeLivePreview.innerHTML = `
    <span>Calculated Total: <strong>${total.toFixed(1)} / 100</strong></span>
    <span class="badge ${badgeClass}">Grade ${gradeLetter} (${gpa.toFixed(1)} GPA) — ${remark}</span>
  `;
}

// Dashboard Metrics
async function loadDashboardMetrics() {
  kpiTotalStudents.textContent = students.length;

  if (activeTermId && students.length > 0) {
    try {
      let gpaSum = 0;
      let count = 0;
      for (const st of students) {
        const rc = await apiFetch(`/api/grades/report-card/${st.id}/${activeTermId}`).catch(() => null);
        if (rc && rc.summary && rc.summary.gpa !== undefined) {
          gpaSum += rc.summary.gpa;
          count++;
        }
      }
      const avgGpa = count > 0 ? (gpaSum / count).toFixed(2) : '0.00';
      kpiAvgGpa.textContent = avgGpa;
    } catch (e) {
      console.error(e);
    }
  }

  // Fees KPI
  try {
    const invoices = await apiFetch('/api/fees/invoices');
    const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmountMinor, 0);
    const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmountMinor, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    kpiFeeCollection.textContent = `${collectionRate}%`;
    kpiTotalStudents.title = `${totalBilled} minor units invoiced`;
  } catch (e) {
    console.error(e);
  }

  // Attendance KPI
  kpiAttendanceRate.textContent = '94%';
}

// Gradebook Operations
async function loadClassGrades() {
  const classId = gradeClassSelect.value;
  const subjectId = gradeSubjectSelect.value;
  if (!classId || !activeTermId) return;

  try {
    const scores = await apiFetch(`/api/grades/class/${classId}?termId=${activeTermId}&subjectId=${subjectId || ''}`);
    const studentMap = new Map(students.map(s => [s.id, s]));

    if (scores.length === 0) {
      gradeTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No assessment scores recorded for this class and subject yet.</td></tr>';
      return;
    }

    gradeTableBody.innerHTML = scores.map(s => {
      const st = studentMap.get(s.studentId);
      const badge = s.gradeLetter === 'A' ? 'badge-emerald' : s.gradeLetter === 'B' ? 'badge-cyan' : 'badge-amber';
      return `
        <tr>
          <td><strong>${st ? escapeHtml(st.fullName) : s.studentId}</strong></td>
          <td class="mono text-muted">${st ? st.admissionNumber : '—'}</td>
          <td>${s.ca1Score}</td>
          <td>${s.ca2Score}</td>
          <td>${s.assignmentScore}</td>
          <td>${s.examScore}</td>
          <td><strong>${s.totalScore}</strong></td>
          <td><span class="badge ${badge}">${s.gradeLetter} (${s.gradePoint.toFixed(1)})</span></td>
          <td class="text-muted">${escapeHtml(s.remarks || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load class grades:', err);
  }
}

async function handleSaveGrade(e) {
  e.preventDefault();
  const studentId = gradeStudentSelect.value;
  const subjectId = gradeSubjectSelect.value;
  const classId = gradeClassSelect.value;

  if (!studentId || !subjectId || !classId || !activeTermId) {
    alert('Please select a student, class, and subject.');
    return;
  }

  try {
    await apiFetch('/api/grades/record', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        subjectId,
        termId: activeTermId,
        classId,
        ca1: parseFloat(scoreCa1.value),
        ca2: parseFloat(scoreCa2.value),
        assignment: parseFloat(scoreAssignment.value),
        exam: parseFloat(scoreExam.value),
        modificationReason: scoreReason.value.trim() || undefined
      })
    });

    scoreReason.value = '';
    await loadClassGrades();
    await loadDashboardMetrics();
    alert('Assessment score recorded successfully!');
  } catch (err) {
    alert('Error saving grade: ' + err.message);
  }
}

// Student Report Card
async function loadReportCard() {
  const studentId = reportStudentSelect.value;
  if (!studentId || !activeTermId) {
    reportCardContainer.innerHTML = '<div class="empty-state">Select an enrolled student to view report card.</div>';
    return;
  }

  try {
    const rc = await apiFetch(`/api/grades/report-card/${studentId}/${activeTermId}`);
    renderReportCard(rc);
  } catch (err) {
    reportCardContainer.innerHTML = `<div class="empty-state">No academic records or scores found for this student in active term.</div>`;
  }
}

function renderReportCard(rc) {
  const subjectsHtml = rc.subjectScores.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.subjectName)}</strong> (${s.subjectCode})</td>
      <td class="text-center">${s.creditUnits}</td>
      <td class="text-center">${s.ca1}</td>
      <td class="text-center">${s.ca2}</td>
      <td class="text-center">${s.assignment}</td>
      <td class="text-center">${s.exam}</td>
      <td class="text-center"><strong>${s.total}</strong></td>
      <td class="text-center"><span class="badge ${s.gradeLetter === 'A' ? 'badge-emerald' : 'badge-cyan'}">${s.gradeLetter}</span></td>
      <td>${escapeHtml(s.remarks)}</td>
    </tr>
  `).join('');

  reportCardContainer.innerHTML = `
    <div class="report-card-sheet">
      <div class="report-school-header">
        <div class="report-school-name">${escapeHtml(rc.school.name)}</div>
        <div class="report-term-title">${escapeHtml(rc.academicSession.name)} • ${escapeHtml(rc.academicTerm.name)}</div>
      </div>

      <div class="report-bio-grid">
        <div>
          <div class="bio-item-label">Student Name</div>
          <div class="bio-item-val">${escapeHtml(rc.student.fullName)}</div>
        </div>
        <div>
          <div class="bio-item-label">Admission Number</div>
          <div class="bio-item-val mono">${escapeHtml(rc.student.admissionNumber)}</div>
        </div>
        <div>
          <div class="bio-item-label">Class Form</div>
          <div class="bio-item-val">${escapeHtml(rc.className)}</div>
        </div>
        <div>
          <div class="bio-item-label">Gender</div>
          <div class="bio-item-val">${escapeHtml(rc.student.gender)}</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject Discipline</th>
              <th class="text-center">Credits</th>
              <th class="text-center">CA 1 (15)</th>
              <th class="text-center">CA 2 (15)</th>
              <th class="text-center">Assign (10)</th>
              <th class="text-center">Exam (60)</th>
              <th class="text-center">Total (100)</th>
              <th class="text-center">Grade</th>
              <th>Teacher Remark</th>
            </tr>
          </thead>
          <tbody>${subjectsHtml}</tbody>
        </table>
      </div>

      <div class="report-summary-box">
        <div>
          <div class="bio-item-label">Cumulative GPA</div>
          <div class="summary-item-val text-emerald">${rc.summary.gpa.toFixed(2)}</div>
        </div>
        <div>
          <div class="bio-item-label">Class Standing Rank</div>
          <div class="summary-item-val text-cyan">${rc.summary.classRank} / ${rc.summary.totalStudentsInClass}</div>
        </div>
        <div>
          <div class="bio-item-label">Average Score</div>
          <div class="summary-item-val">${rc.summary.averageScore.toFixed(1)}%</div>
        </div>
        <div>
          <div class="bio-item-label">Attendance Rate</div>
          <div class="summary-item-val text-amber">${rc.summary.attendanceRatePercentage}%</div>
        </div>
      </div>

      <div class="report-remark-box">
        <div class="bio-item-label" style="margin-bottom:0.25rem;">Principal / Headteacher Evaluation</div>
        <p style="font-size:0.9rem; color:var(--text-main); font-style:italic;">"${escapeHtml(rc.summary.principalRemarks)}"</p>
      </div>
    </div>
  `;
}

// Invoices & Payments
async function loadInvoices() {
  try {
    const invoices = await apiFetch('/api/fees/invoices');
    const studentMap = new Map(students.map(s => [s.id, s]));

    if (invoices.length === 0) {
      invoicesTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No fee invoices issued for this tenant.</td></tr>';
      return;
    }

    invoicesTableBody.innerHTML = invoices.map(inv => {
      const st = studentMap.get(inv.studentId);
      const totalMajor = (inv.totalAmountMinor / 100).toFixed(2);
      const paidMajor = (inv.paidAmountMinor / 100).toFixed(2);
      const balMajor = (inv.balanceMinor / 100).toFixed(2);
      const isPaid = inv.status === 'PAID';
      const badgeClass = isPaid ? 'badge-emerald' : inv.status === 'PARTIALLY_PAID' ? 'badge-amber' : 'badge-rose';

      return `
        <tr>
          <td><strong>${st ? escapeHtml(st.fullName) : inv.studentId}</strong></td>
          <td class="mono text-muted">${inv.id}</td>
          <td>Active Term</td>
          <td>$${totalMajor}</td>
          <td class="text-emerald">$${paidMajor}</td>
          <td class="${inv.balanceMinor > 0 ? 'text-amber' : 'text-muted'}"><strong>$${balMajor}</strong></td>
          <td><span class="badge ${badgeClass}">${inv.status}</span></td>
          <td>
            ${!isPaid ? `<button class="btn btn-secondary btn-sm" onclick="openPayModal('${inv.id}', ${inv.balanceMinor})">Pay Fee</button>` : '<span class="text-muted text-sm">Settled</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
}

window.openPayModal = function(invoiceId, remainingMinor) {
  payInvoiceId.value = invoiceId;
  payInvoiceDisplay.value = invoiceId;
  payAmount.value = (remainingMinor / 100).toFixed(2);
  payAmount.max = (remainingMinor / 100).toFixed(2);
  modalPay.classList.remove('hidden');
};

async function handleProcessPayment(e) {
  e.preventDefault();
  const invoiceId = payInvoiceId.value;
  const amount = parseFloat(payAmount.value);
  const method = payMethod.value;

  if (!invoiceId || isNaN(amount) || amount <= 0) return;

  try {
    await apiFetch('/api/fees/pay', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId,
        amountMinor: Math.round(amount * 100),
        paymentMethod: method,
        referenceNumber: `REC-${Date.now()}`
      })
    });

    modalPay.classList.add('hidden');
    await loadInvoices();
    await loadDashboardMetrics();
    alert('Payment receipt logged successfully!');
  } catch (err) {
    alert('Payment failed: ' + err.message);
  }
}

// Attendance
async function loadAttendance() {
  const classId = attClassSelect.value;
  const date = attDateInput.value;
  if (!classId || !date) return;

  try {
    const records = await apiFetch(`/api/attendance/class/${classId}?date=${date}`);
    const recordMap = new Map(records.map(r => [r.studentId, r.status]));
    const classStudents = students.filter(s => s.currentClassId === classId);

    if (classStudents.length === 0) {
      attendanceTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No students in selected class.</td></tr>';
      return;
    }

    attendanceTableBody.innerHTML = classStudents.map(st => {
      const status = recordMap.get(st.id) || 'PRESENT';
      return `
        <tr>
          <td><strong>${escapeHtml(st.fullName)}</strong></td>
          <td class="mono text-muted">${st.admissionNumber}</td>
          <td>
            <select class="custom-select-sm" id="att-select-${st.id}">
              <option value="PRESENT" ${status === 'PRESENT' ? 'selected' : ''}>Present</option>
              <option value="LATE" ${status === 'LATE' ? 'selected' : ''}>Late</option>
              <option value="ABSENT" ${status === 'ABSENT' ? 'selected' : ''}>Absent</option>
              <option value="EXCUSED" ${status === 'EXCUSED' ? 'selected' : ''}>Excused</option>
            </select>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="markStudentAttendance('${st.id}', '${classId}')">Update</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load attendance:', err);
  }
}

window.markStudentAttendance = async function(studentId, classId) {
  const selectEl = document.getElementById(`att-select-${studentId}`);
  const status = selectEl ? selectEl.value : 'PRESENT';
  const date = attDateInput.value;

  try {
    await apiFetch('/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ studentId, classId, date, status, teacherId: 'tch_smith' })
    });
    alert('Attendance marked.');
  } catch (err) {
    alert('Error marking attendance: ' + err.message);
  }
};

// Audit Logs
async function loadAuditLogs() {
  try {
    const logs = await apiFetch('/api/grades/audit-logs');
    if (logs.length === 0) {
      auditTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No score modifications recorded.</td></tr>';
      return;
    }

    auditTableBody.innerHTML = logs.map(l => `
      <tr>
        <td class="mono text-muted">${new Date(l.timestamp).toLocaleString()}</td>
        <td class="mono">${l.studentId}</td>
        <td>${l.subjectId}</td>
        <td>${l.previousTotal}</td>
        <td><strong>${l.newTotal}</strong></td>
        <td class="text-muted">${l.modifiedByTeacherId}</td>
        <td><em>${escapeHtml(l.reason)}</em></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  }
}

// Student Enrollment
async function handleEnrollStudent(e) {
  e.preventDefault();
  const admNo = document.getElementById('enroll-adm-no').value.trim();
  const fullName = document.getElementById('enroll-name').value.trim();
  const gender = document.getElementById('enroll-gender').value;
  const classId = enrollClass.value;
  const guardianName = document.getElementById('enroll-guardian-name').value.trim();
  const guardianEmail = document.getElementById('enroll-guardian-email').value.trim();
  const guardianPhone = document.getElementById('enroll-guardian-phone').value.trim();

  if (!admNo || !fullName || !classId) return;

  try {
    const newStudent = await apiFetch('/api/students', {
      method: 'POST',
      body: JSON.stringify({
        admissionNumber: admNo,
        fullName,
        gender,
        dateOfBirth: '2010-01-01',
        guardianName,
        guardianEmail,
        guardianPhone,
        currentClassId: classId
      })
    });

    students.push(newStudent);
    filterStudentsForClass();
    modalEnroll.classList.add('hidden');
    formEnrollStudent.reset();
    await loadDashboardMetrics();
    alert(`Student ${fullName} successfully enrolled!`);
  } catch (err) {
    alert('Enrollment failed: ' + err.message);
  }
}

function applyRolePermissions() {
  const btnEnroll = document.getElementById('btn-enroll-student');
  const btnSaveGrade = document.getElementById('btn-save-grade');

  if (activeRole === 'PARENT' || activeRole === 'STUDENT') {
    btnEnroll.style.display = 'none';
    btnSaveGrade.disabled = true;
  } else if (activeRole === 'TEACHER') {
    btnEnroll.style.display = 'none';
    btnSaveGrade.disabled = false;
  } else {
    btnEnroll.style.display = 'inline-flex';
    btnSaveGrade.disabled = false;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
