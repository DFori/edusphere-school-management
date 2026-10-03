/**
 * Domain Types for Multi-Tenant School Management System (EduSphere)
 */

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'ACCOUNTANT';

export type SessionStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TermStatus = 'UPCOMING' | 'ACTIVE' | 'GRADING' | 'PUBLISHED' | 'ARCHIVED';
export type EnrollmentStatus = 'ENROLLED' | 'PROMOTED' | 'REPEATED' | 'TRANSFERRED' | 'GRADUATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface School {
  id: string;
  name: string;
  code: string;
  currency: string;
  address?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface User {
  id: string;
  schoolId: string;
  role: UserRole;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  linkedStudentId?: string; // For parents/guardians
  createdAt: string;
}

export interface AcademicSession {
  id: string;
  schoolId: string;
  name: string; // e.g., "2025/2026 Academic Year"
  startDate: string;
  endDate: string;
  status: SessionStatus;
  isCurrent: boolean;
}

export interface AcademicTerm {
  id: string;
  schoolId: string;
  sessionId: string;
  name: string; // e.g., "First Term", "Second Term"
  startDate: string;
  endDate: string;
  status: TermStatus;
  isCurrent: boolean;
}

export interface ClassArm {
  id: string;
  schoolId: string;
  name: string; // e.g., "Grade 10 Gold", "SS1 Science"
  level: number; // Grade level: 1 through 12
  capacity: number;
}

export interface Subject {
  id: string;
  schoolId: string;
  code: string; // e.g., "MTH101"
  name: string; // "Mathematics"
  creditUnits: number;
}

export interface StaffAssignment {
  id: string;
  schoolId: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

export interface StudentProfile {
  id: string;
  schoolId: string;
  admissionNumber: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  currentClassId: string;
  enrollmentStatus: EnrollmentStatus;
  createdAt: string;
}

export interface AssessmentRubric {
  id: string;
  name: string;
  maxScore: number;
  weightPercentage: number;
}

export interface SubjectScore {
  id: string;
  schoolId: string;
  studentId: string;
  subjectId: string;
  termId: string;
  classId: string;
  ca1Score: number; // Continuous Assessment 1 (e.g. max 15)
  ca2Score: number; // Continuous Assessment 2 (e.g. max 15)
  assignmentScore: number; // Assignment / Project (e.g. max 10)
  examScore: number; // Final Exam (e.g. max 60)
  totalScore: number; // Computed total (0-100)
  gradeLetter: string; // 'A', 'B', 'C', 'D', 'F'
  gradePoint: number; // 4.0, 3.0, 2.0, 1.0, 0.0
  remarks?: string;
  recordedByTeacherId: string;
  updatedAt: string;
}

export interface GradeAuditLog {
  id: string;
  schoolId: string;
  scoreId: string;
  studentId: string;
  subjectId: string;
  termId: string;
  previousTotal: number;
  newTotal: number;
  modifiedByTeacherId: string;
  reason: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  markedByTeacherId: string;
  notes?: string;
}

export interface FeeSchedule {
  id: string;
  schoolId: string;
  classId?: string; // If undefined, applies to all classes in school
  termId: string;
  category: string; // e.g. "Tuition", "Science Lab", "ICT & Library", "Development Levy"
  amountMinor: number; // In integer minor units (e.g. 500000 = $5,000.00)
  isMandatory: boolean;
}

export interface FeeInvoice {
  id: string;
  schoolId: string;
  studentId: string;
  termId: string;
  totalAmountMinor: number;
  paidAmountMinor: number;
  balanceMinor: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  referenceNumber: string;
  recordedByUserId: string;
  paidAt: string;
}

export interface ReportCard {
  school: School;
  student: StudentProfile;
  academicSession: AcademicSession;
  academicTerm: AcademicTerm;
  className: string;
  subjectScores: {
    subjectCode: string;
    subjectName: string;
    creditUnits: number;
    ca1: number;
    ca2: number;
    assignment: number;
    exam: number;
    total: number;
    gradeLetter: string;
    gradePoint: number;
    remarks: string;
  }[];
  summary: {
    totalCredits: number;
    totalScore: number;
    averageScore: number;
    gpa: number;
    classRank: number;
    totalStudentsInClass: number;
    attendanceRatePercentage: number;
    daysPresent: number;
    totalSchoolDays: number;
    principalRemarks: string;
  };
}
