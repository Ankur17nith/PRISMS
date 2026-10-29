# PRISMS Authority Routing & Permission Matrix

This document defines the authority routing logic, role scopes, recipient resolution rules, and permission matrix governing the PhD thesis submission and approval system at NIT Hamirpur.

---

## 1. Supported Roles and Scopes

| Role Code | Role Name | Scope Type | Description |
|:---|:---|:---|:---|
| `STUDENT` | Doctoral Scholar | `DEPARTMENT` | Authors research, uploads PDF, and tracks submission feedback. |
| `SUPERVISOR` | Thesis Supervisor | `DEPARTMENT` | Faculty member actively supervising scholar. Initial review authority. |
| `HOD` | Head of Department | `DEPARTMENT` | Departmental authority. Reviews and forwards to SDPC/Dean. **No download permission.** |
| `DDPC` | Convenor DDPC | `DEPARTMENT` | Departmental Doctoral Committee. Observer visibility at initial stage. |
| `CHAIRPERSON_SDPC` | Chairperson SDPC | `DEPARTMENT` / `INSTITUTE` | Senate Doctoral Programme Committee. Institutional review authority. |
| `DEAN_ACADEMICS` | Dean Academics | `INSTITUTE` | Dean of Academic Affairs. Parallel institutional evaluator. |
| `CHAIRPERSON_SENATE` | Chairperson Senate | `INSTITUTE` | Director & Chairman Senate. Final approval authority. |
| `ADMIN` | System Administrator | `INSTITUTE` | Technical administration and audit oversight. |

---

## 2. Document Permission Matrix

| Role | View Inline in Portal | Download Original PDF | Forward to Next Stage | Return for Revision | Final Reject | Final Approve |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Scholar (Author)** | Yes | Yes | N/A (Submit) | N/A | N/A | N/A |
| **Assigned Supervisor** | Yes | Yes | Yes (to HOD) | Yes | Yes | No |
| **HOD (Head of Dept)** | Yes | **NO (STRICT DENIAL)** | Yes (to SDPC/Dean) | Yes | Yes | No |
| **DDPC (Observer)** | Yes | Yes | No (Observer) | No | No | No |
| **Chairperson SDPC** | Yes | Yes | Yes (to Senate) | Yes | Yes | No |
| **Dean Academics** | Yes | Yes | Yes (to Senate/Endorse)| Yes | Yes | No |
| **Chairperson Senate** | Yes | Yes | N/A | Yes | Yes | **YES** |
| **Admin** | Yes | Yes | Override only | Override only | Override only| Override only|

> [!CAUTION]
> **Mandatory Policy Rule — HOD Download Denial:**
> Under no circumstances is an HOD permitted to download thesis documents. This restriction is enforced on the server for all requests to `/theses/:submissionId/file/download`. Attempted downloads by HOD are denied with HTTP `403 Forbidden` (`DOWNLOAD_FORBIDDEN_FOR_ROLE`) and logged to `audit_events`.

---

## 3. Dynamic Forwarding Recipient Resolution

To prevent unauthorized routing or arbitrary recipient injection by clients, recipient sets are dynamically computed by the backend:

### 3.1 Supervisor Review Stage
- **Eligibility:** Active HOD of the scholar's department.
- **Query Resolution:**
  ```sql
  SELECT u.* FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code = 'HOD' 
    AND ur.department_id = $scholarDepartmentId
    AND ur.valid_from <= NOW() 
    AND (ur.valid_until IS NULL OR ur.valid_until > NOW());
  ```
- **Forwarding Limit:** Exactly 1 recipient.

### 3.2 HOD Review Stage
- **Eligibility:** Active Chairperson SDPC and active Dean Academics.
- **Forwarding Limit:** 1 or 2 recipients (supports parallel review routing to both SDPC and Dean).

### 3.3 SDPC Review Stage
- **Eligibility:** Active Chairperson Senate / Director.
- **Forwarding Limit:** Exactly 1 recipient.

---

## 4. Multi-Role Faculty Handling

A single faculty user account can hold multiple roles simultaneously (e.g. Dr. Rajesh Kumar may hold `SUPERVISOR`, `HOD`, and `DDPC`).

### Operational Rules:
1. **Context-Specific Permissions:** When a user with multiple roles accesses a thesis, permissions are evaluated for that specific submission context.
2. **HOD Download Restriction Inviolability:** If a faculty member is accessing the thesis as HOD (i.e. they are not the scholar's assigned supervisor and not an institute authority), they **cannot download** the thesis, even if they hold the `SUPERVISOR` role for other scholars.
3. **Queue Aggregation:** The `/theses/queue` endpoint aggregates all pending review tasks assigned to that user across all their active roles, clearly identifying the role required for each task.

---

## 5. Stale Assignments & Role Revocation

- All role checks verify `validFrom <= now` and `(validUntil IS NULL OR validUntil > now)`.
- If a user's role assignment in `user_roles` is expired or revoked:
  - Active review assignments can no longer be advanced by that user.
  - Recipient lists will immediately exclude that user from future forwarding options.
  - Access to unauthorized thesis files is revoked instantly.
