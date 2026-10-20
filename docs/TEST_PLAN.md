# Demo Test Plan

| ID | Test | Expected result |
|---|---|---|
| H01 | API health | `GET /api/health` returns `status: ok`, `mode: mock-ledger` |
| H02 | Register dummy record | Record reference and SHA-256 digest returned; raw content omitted from list |
| H03 | Grant access | Grant returns active true and audit event is added |
| H04 | Check access after grant | `allowed: true` |
| H05 | Revoke access | Grant becomes inactive |
| H06 | Check access after revoke | `allowed: false` |
| H07 | Verify integrity | `integrity_ok: true` if demo content has not changed |
| H08 | Audit trail | Audit list shows register/grant/check/revoke events |

These are expected outcomes. Capture actual outputs before describing them as completed tests.
