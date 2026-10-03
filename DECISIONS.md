# School Management System — Architectural Decision Records (ADRs)

---

## ADR-SCH-001: Row-Level Multi-Tenancy with Server-Enforced Context

- **Status**: `APPROVED`
- **Date**: 2026-10-03
- **Context**: A school management system stores confidential minor student records, exam questions, and fee information across multiple independent schools. Cross-school leakage would be catastrophic.
- **Decision**: Adopt row-level multi-tenancy where every entity carries a `school_id` foreign key. The application middleware extracts and validates `school_id` from the authenticated session context, injecting it into all ORM/SQL query filters.
- **Consequences**:
  - *Positive*: Cost-effective single database cluster deployment with bulletproof isolation guarantees.
  - *Negative*: Every query must explicitly join or filter on `school_id`.

---

## ADR-SCH-002: Immutable Audit Logging for Academic Scores & Grade Modifications

- **Status**: `APPROVED`
- **Date**: 2026-10-03
- **Context**: Exam grades and report cards are high-stakes records susceptible to tampering or disputes.
- **Decision**: All score updates generate an append-only `grade_audit_logs` record capturing previous score, new score, modifying teacher ID, timestamp, and modification reason.
- **Consequences**: Complete auditability and regulatory compliance for academic accreditation.
