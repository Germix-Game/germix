## Overview
Implement the three authentication endpoints that power the two-step login and self-registration flow. Hard dependency for every other authenticated route.

## Scope
- `POST /api/auth/signup` — validate username against `ApprovedUsername` whitelist, check no existing `Player`, create Supabase Auth user, create `Player` row, return `201 { id, username }`
- `POST /api/auth/login` — verify username/password through Supabase Auth, return `200 { id, username }`
- `POST /api/auth/logout` — clear the Supabase session, return `204`
- Session handled by Supabase Auth cookies, not a custom JWT
- Zod request validation for signup and login bodies
- Error codes: `username_not_whitelisted`, `account_already_exists`, `username_not_found`, `incorrect_password`

## Files
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/lib/auth.ts` — `requireAuth()` reads the Supabase session and loads `Player`
- `src/lib/supabase.ts` — Supabase server/admin client helpers
- `src/lib/schemas/auth.ts` — zod schemas

## Definition of Done
- [ ] Signup rejects usernames not in whitelist with correct error code
- [ ] Signup rejects already-registered usernames with correct error code
- [ ] Signup creates `Player` row and starts a Supabase session on success
- [ ] Login verifies correctly through Supabase Auth and starts a Supabase session on success
- [ ] Logout clears the session and returns `204`
- [ ] All error responses match Section 11.3 envelope shape
- [ ] No stack traces or SQL errors leaked in responses
- [ ] No TypeScript errors; PR reviewed and merged to `dev`

## References
- Requirements Section 4 (Login & Account Creation)
- Requirements Section 3 ADR-1 (Supabase Auth with approved-username whitelist)
- Requirements Section 11.3 (Error format)
- Requirements Section 12.4 (Route table)