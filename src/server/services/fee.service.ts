/**
 * Fee Invoicing & Payment Ledger Service
 * All monetary amounts are handled strictly in integer minor units (cents / kobo).
 */

import { getDatabase } from '../db/database';
import { FeeSchedule, FeeInvoice, PaymentReceipt } from '../../domain/types';
import * as crypto from 'node:crypto';

export class FeeService {
  // 1. Fee Schedules
  public static createFeeSchedule(
    schoolId: string,
    termId: string,
    category: string,
    amountMinor: number,
    classId?: string,
    isMandatory: boolean = true
  ): FeeSchedule {
    const db = getDatabase();
    const id = `sch_${crypto.randomBytes(6).toString('hex')}`;

    db.prepare(`
      INSERT INTO fee_schedules (id, school_id, class_id, term_id, category, amount_minor, is_mandatory)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, schoolId, classId || null, termId, category, amountMinor, isMandatory ? 1 : 0);

    return { id, schoolId, classId, termId, category, amountMinor, isMandatory };
  }

  public static listFeeSchedules(schoolId: string, termId?: string): FeeSchedule[] {
    const db = getDatabase();
    let query = `SELECT * FROM fee_schedules WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (termId) {
      query += ` AND term_id = ?`;
      params.push(termId);
    }
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      classId: r.class_id || undefined,
      termId: r.term_id,
      category: r.category,
      amountMinor: r.amount_minor,
      isMandatory: Boolean(r.is_mandatory)
    }));
  }

  // 2. Invoicing
  public static generateStudentInvoice(
    schoolId: string,
    studentId: string,
    termId: string,
    dueDate: string
  ): FeeInvoice {
    const db = getDatabase();

    // Check if invoice already exists
    const existing = db.prepare(`
      SELECT * FROM fee_invoices WHERE school_id = ? AND student_id = ? AND term_id = ?
    `).get(schoolId, studentId, termId) as any;

    if (existing) {
      return {
        id: existing.id,
        schoolId: existing.school_id,
        studentId: existing.student_id,
        termId: existing.term_id,
        totalAmountMinor: existing.total_amount_minor,
        paidAmountMinor: existing.paid_amount_minor,
        balanceMinor: existing.balance_minor,
        status: existing.status,
        dueDate: existing.due_date,
        createdAt: existing.created_at
      };
    }

    // Get student class
    const student = db.prepare(`SELECT current_class_id FROM students WHERE school_id = ? AND id = ?`).get(schoolId, studentId) as any;
    if (!student) throw new Error(`Student not found: ${studentId}`);

    // Compute fee schedules applicable to this student's class and term
    const schedules = db.prepare(`
      SELECT amount_minor FROM fee_schedules 
      WHERE school_id = ? AND term_id = ? AND (class_id IS NULL OR class_id = ?)
    `).all(schoolId, termId, student.current_class_id) as any[];

    const totalAmountMinor = schedules.reduce((acc, s) => acc + s.amount_minor, 0);
    const id = `inv_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO fee_invoices (
        id, school_id, student_id, term_id, total_amount_minor,
        paid_amount_minor, balance_minor, status, due_date, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 'UNPAID', ?, ?)
    `).run(id, schoolId, studentId, termId, totalAmountMinor, totalAmountMinor, dueDate, createdAt);

    return {
      id,
      schoolId,
      studentId,
      termId,
      totalAmountMinor,
      paidAmountMinor: 0,
      balanceMinor: totalAmountMinor,
      status: 'UNPAID',
      dueDate,
      createdAt
    };
  }

  public static listInvoices(schoolId: string, studentId?: string, termId?: string): FeeInvoice[] {
    const db = getDatabase();
    let query = `SELECT * FROM fee_invoices WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (studentId) {
      query += ` AND student_id = ?`;
      params.push(studentId);
    }
    if (termId) {
      query += ` AND term_id = ?`;
      params.push(termId);
    }
    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      studentId: r.student_id,
      termId: r.term_id,
      totalAmountMinor: r.total_amount_minor,
      paidAmountMinor: r.paid_amount_minor,
      balanceMinor: r.balance_minor,
      status: r.status,
      dueDate: r.due_date,
      createdAt: r.created_at
    }));
  }

  // 3. Payment Processing
  public static recordPayment(
    schoolId: string,
    invoiceId: string,
    amountMinor: number,
    paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE',
    referenceNumber: string,
    recordedByUserId: string
  ): PaymentReceipt {
    const db = getDatabase();
    const invoice = db.prepare(`SELECT * FROM fee_invoices WHERE school_id = ? AND id = ?`).get(schoolId, invoiceId) as any;
    if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

    if (amountMinor <= 0) throw new Error('Payment amount must be greater than zero');
    if (amountMinor > invoice.balance_minor) {
      throw new Error(`Payment amount (${amountMinor}) exceeds remaining balance (${invoice.balance_minor})`);
    }

    const newPaid = invoice.paid_amount_minor + amountMinor;
    const newBalance = invoice.total_amount_minor - newPaid;
    const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

    db.prepare(`
      UPDATE fee_invoices 
      SET paid_amount_minor = ?, balance_minor = ?, status = ?
      WHERE id = ?
    `).run(newPaid, newBalance, newStatus, invoiceId);

    const receiptId = `rcp_${crypto.randomBytes(6).toString('hex')}`;
    const paidAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO payment_receipts (
        id, school_id, invoice_id, student_id, amount_minor,
        payment_method, reference_number, recorded_by_user_id, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(receiptId, schoolId, invoiceId, invoice.student_id, amountMinor, paymentMethod, referenceNumber, recordedByUserId, paidAt);

    return {
      id: receiptId,
      schoolId,
      invoiceId,
      studentId: invoice.student_id,
      amountMinor,
      paymentMethod,
      referenceNumber,
      recordedByUserId,
      paidAt
    };
  }

  public static listPayments(schoolId: string, studentId?: string): PaymentReceipt[] {
    const db = getDatabase();
    let query = `SELECT * FROM payment_receipts WHERE school_id = ?`;
    const params: any[] = [schoolId];
    if (studentId) {
      query += ` AND student_id = ?`;
      params.push(studentId);
    }
    query += ` ORDER BY paid_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
      invoiceId: r.invoice_id,
      studentId: r.student_id,
      amountMinor: r.amount_minor,
      paymentMethod: r.payment_method,
      referenceNumber: r.reference_number,
      recordedByUserId: r.recorded_by_user_id,
      paidAt: r.paid_at
    }));
  }
}
