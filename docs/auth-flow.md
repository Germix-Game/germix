# Auth Flow Handoff

This project uses Supabase Auth for sessions and the PostgreSQL `ApprovedUsername` table as the whitelist gate for self-registration.

## What the frontend should send

### Signup
`POST /api/auth/signup`

```json
{
  "username": "player01",
  "password": "secret123"
}
```

### Login
`POST /api/auth/login`

```json
{
  "username": "player01",
  "password": "secret123"
}
```

### Logout
`POST /api/auth/logout`

No request body.

## Success responses

- `201` from signup: `{ "id": "...", "username": "player01" }`
- `200` from login: `{ "id": "...", "username": "player01" }`
- `204` from logout: empty body

## Error responses

All errors use the shared envelope:

```json
{
  "error": {
    "code": "username_not_whitelisted",
    "message": "Your username is not registered. Please complete the pre-test form first.",
    "details": []
  }
}
```

Common auth codes:

- `username_not_whitelisted`
- `account_already_exists`
- `username_not_found`
- `incorrect_password`
- `validation_error`

## Frontend rules

- Username matching is case sensitive.
- Show the server `error.message` inline on the form.
- After signup or login succeeds, the Supabase session cookie is already set on the browser.
- Protected pages and API routes read the Supabase session server-side; the frontend should not try to manage its own auth cookie.

## Environment variables

The app expects these values at runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Notes for future work

- The internal auth email used by the server is derived from the username, so the frontend never needs to collect or display an email address.
- `ApprovedUsername` is the source of truth for who can sign up. The frontend should not attempt to bypass that check client-side.
