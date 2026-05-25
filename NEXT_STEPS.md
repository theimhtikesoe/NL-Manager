# NL-Manager Production Stabilization - Next Steps

## Current Status: Phase 1 Completed (Audit)

### Completed Tasks:
- [x] Repository cloned and codebase structure audited.
- [x] Identified key files for Environment, Auth, tRPC, and Runtime compatibility.

## Remaining Phases:

### Phase 2: Environment Cleanup
- [x] Remove old/duplicate environment variables.
- [x] Remove MySQL/TiDB references.
- [x] Consolidate JWT and Cloudinary configurations.
- [x] Remove hardcoded fallback secrets.

### Phase 3: Authentication Stabilization
- [x] Audit login flow (server/routers/auth.ts).
- [x] Verify JWT sign/verify consistency.
- [x] Verify bcryptjs comparison logic.
- [x] Add production-safe auth logging.
- [x] Ensure mobile compatibility (Safari/Chrome on iPhone).

### Phase 4: Runtime and Vercel Compatibility
- [x] Set Node.js runtime to 20.x in package.json/vercel.json.
- [x] Ensure SSR safety for `localStorage` and `window` access.
- [x] Fix hydration mismatches and malformed URL issues.

### Phase 5: Database Verification
- [ ] Confirm Neon PostgreSQL connection stability.
- [ ] Verify admin user existence and password hash.
- [ ] Configure connection pooling for Vercel serverless environment.

### Phase 6: tRPC and Networking Fixes
- [ ] Verify tRPC v11 configuration.
- [ ] Ensure transformer is correctly placed (client-side only for v11 if required).
- [ ] Ensure absolute URLs for all fetch calls.
- [ ] Add transport error logging.

### Phase 7: Production Hardening and Security
- [ ] Remove debug code and console logs.
- [ ] Improve user-facing error messages.
- [ ] Implement graceful failure handling.
- [ ] Rotate exposed secrets and change default admin password.

### Phase 8: Final Verification and Deployment
- [ ] Final end-to-end testing.
- [ ] Push all changes to the repository.
- [ ] Deliver final verification report.
