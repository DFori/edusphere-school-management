# School Management System — System Architecture

**Project**: `school-management`  
**Status**: `PROPOSED ARCHITECTURAL BASELINE`  
**Last Updated**: 2026-10-03  

---

## 1. Multi-Tenant Architectural Topology

```text
┌─────────────────────────────────────────────────────────────┐
│ Client Applications (Web / Mobile)                          │
│ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐ │
│ │ Admin Portal  │ │ Teacher Portal│ │ Student/Parent View │ │
│ └───────────────┘ └───────────────┘ └─────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
                               ↓
┌─────────────────────────────────────────────────────────────┐
│ API Gateway & Tenant Context Middleware                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. JWT Authentication & Role Extraction                 │ │
│ │ 2. Organization / School Tenant Resolution (tenant_id)  │ │
│ │ 3. Granular RBAC Permission Matrix Enforcement          │ │
│ └────────────────────────────┬────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│ Core Domain Modules                                         │
│ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐ │
│ │ Academic &    │ │ Attendance &  │ │ Fees, Invoicing &   │ │
│ │ Assessment    │ │ Gradebook     │ │ Notifications       │ │
│ └───────────────┘ └───────────────┘ └─────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tenant-Scoped Queries
                               ↓
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Relational Database (Row-Level Security / RLS)   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Multi-Tenant Tables: schools, users, sessions, terms,   │ │
│ │ classes, subjects, enrollments, grades, fee_invoices    │ │
│ │ (All scoped by school_id foreign key with RLS policies) │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Security & Data Isolation Guarantees

1. **Server-Enforced Authorization**:
   - Every database query and API operation filters strictly by `school_id`.
   - Never rely on frontend role filtering for data segregation.
2. **Student Privacy & Sensitive Records**:
   - Medical notes, disciplinary records, and financial status are strictly accessible only to authorized administrators and assigned staff.
3. **Audit Logging**:
   - Score modifications and grade edits produce an immutable audit log (`grade_audit_logs`) recording previous score, new score, modifying teacher ID, and timestamp.
