# School Management System — Technical & Product Specification

**Project**: `school-management`  
**Status**: `PLANNED (DISCOVERY)`  
**Governing Rules**: `master-prompt.md` Section 5  
**Last Updated**: 2026-10-03  

---

## 1. Product Overview & Vision

The School Management System is a multi-tenant, enterprise-grade administrative and academic platform designed for primary, secondary, and K-12 educational institutions. It unifies school administration, academic tracking, student grading, attendance, fee collection, and parent-teacher communication in a secure, role-based environment.

---

## 2. Core Domain Capabilities & Workflows

### 2.1 Multi-Tenant School Isolation
- Strict logical and data isolation per school organization (`tenant_id`).
- No data leak across school boundaries under any circumstances.

### 2.2 Role-Based Access Control (RBAC)
- **Super Administrator**: Platform-wide tenant management and billing.
- **School Administrator**: School configuration, staff provisioning, term management, fee structure.
- **Teacher**: Class rosters, daily attendance, subject score recording, continuous assessment.
- **Student**: View schedules, published results, assignment submissions, attendance records.
- **Parent / Guardian**: Linked student view, academic report cards, fee invoice payments.

### 2.3 Academic Lifecycle & Grading Engine
- **Academic Session & Term State Machine**: `Upcoming` -> `Active` -> `Grading/Review` -> `Published` -> `Archived`.
- **Continuous Assessment & Exams**: Configurable weightings (e.g., Test 1: 15%, Test 2: 15%, Assignment: 10%, Exam: 60%).
- **Automated Report Card Generation**: Class rank, cumulative GPA, teacher remarks, attendance summaries.

### 2.4 Fee Management & Announcements
- Fee schedule definition by class/term.
- Invoice generation, payment receipt logging, and outstanding balance tracking.
- Broadcast announcements to school, class, or parent groups.
