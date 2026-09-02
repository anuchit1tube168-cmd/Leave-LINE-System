# Leave / Hospital — Phase 2A Cloudflare migration

**Status:** STAGING ONLY / CURRENT LIFF PRODUCTION UNCHANGED / PRODUCTION WRITE = FALSE

## Target

LINE OA / LIFF → Cloudflare Pages → RTAFNC ONE Worker → `/api/leave/*` and `/api/hospital/*` → authenticated server adapters.

The existing student-facing LINE entry remains unchanged until end-to-end testing and explicit owner approval.

## Security conditions

- Student identity is established only after server-side LINE ID token verification and Student Master binding.
- Health/medical details are sensitive and must never be written to browser persistence, GitHub, query strings, analytics payloads or notification text beyond an approved minimum.
- Teacher/Admin authorization is server-side RBAC; role switching in the UI is never a security boundary.
- Evidence and medical attachments stay private.
- No LINE/Telegram tokens or service credentials in frontend code.
- Phase 2A routes fail closed; operational writes remain disabled.
- Preserve current Apps Script/Sheets data during migration; use read-only adapters first.

## Acceptance gates

1. Worker health passes with `writesEnabled:false`.
2. `leave` and `hospital` routes are allowlisted but fail closed.
3. Synthetic student/teacher/admin RBAC cases pass.
4. Health-data logging/exfiltration tests pass.
5. Current Production LIFF remains available as rollback.
6. Owner explicitly approves any endpoint cutover.
