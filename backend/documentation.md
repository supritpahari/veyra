# Veyra backend and frontend integration

## Status and safety

This API supports email/password and Google sign-in with JWT access tokens and revocable refresh sessions, as well as seeded synthetic reports; authenticated, non-persistent PDF text/OCR extraction into reviewable structured measurements; deterministic comparisons against the reference limits stored with each measurement; report-integrity warnings; and a non-persistent, one-value simulation.

All seeded names, values, units, and intervals are artificial demo data, not clinical reference guidance. PDF extraction is heuristic and every returned measurement is marked `needs_review`; it does not diagnose, predict clinical outcomes, extract image files, infer medical relationships, or train a model. It returns an empty `relationships` list and `inferenceStatus: "not_configured"` instead of inventing graph edges or model results. Test only with synthetic or de-identified reports; do not send real patient data to this prototype.

## Start the API

Requirements: Node.js 20.16+ and MySQL 8+.

1. Start MySQL and create the `veyra` database once by running `database/bootstrap.sql` (the configured local connection uses MySQL username `root`, no password, host `127.0.0.1`, and port `3306`).
2. Check `DATABASE_URL` in `.env`; its default is `mysql://root@127.0.0.1:3306/veyra`. If your MySQL connection differs, edit the URL.
3. Run `npm install`, then `npm run dev` from `backend`.
4. Startup automatically runs `prisma migrate deploy`, seeds the synthetic examples idempotently, and then starts the API. Subsequent starts apply only pending migrations.
5. Set `AUTH_JWT_SECRET` to a unique random value with at least 32 characters; generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Do not use the example placeholder or commit the secret.
6. Create a Google OAuth 2.0 **Web application** client in Google Cloud Console. Add `http://localhost:3000/api/v1/auth/google/callback` to **Authorized redirect URIs** (the redirect must exactly match `GOOGLE_REDIRECT_URI`). Since the browser is redirected through Veyra and never loads Google's JavaScript SDK, **Authorized JavaScript origins are not required** for this flow. Put the client ID and client secret in the backend `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; neither credential belongs in frontend code.
7. Set `AUTH_SUCCESS_REDIRECT_URL` to the frontend page to show after authentication (for Veyra production, `https://veyra.teamobliq.in/dashboard/analyzerso`). The API listens on `http://localhost:3000` by default. Set `CORS_ORIGIN` in `.env` to the frontend origin; multiple allowed origins can be comma-separated. For example, VS Code Live Server at `http://127.0.0.1:5500` must be explicitly added as an allowed origin. Keep the frontend and API hostnames consistent (`localhost` for both, or `127.0.0.1` for both): `SameSite=Lax` session cookies are not sent by cross-site browser fetches between those different hostnames. Restart the backend after changing `.env`. Frontend requests that use sessions must set `credentials: "include"`. If the deployed frontend and API are on different sites, set `AUTH_COOKIE_SAME_SITE=none` in the production backend environment; this also marks the cookie `Secure`, so cross-site auth requires HTTPS. Do not use `SameSite=None` for a local HTTP API.

For production, configure these values in the backend host's runtime environment as well as any local `.env`: include `https://veyra.teamobliq.in` in `CORS_ORIGIN`, set `AUTH_SUCCESS_REDIRECT_URL=https://veyra.teamobliq.in/dashboard/analyzerso`, and set `GOOGLE_REDIRECT_URI` to the backend's public HTTPS callback URL (`<backend-origin>/api/v1/auth/google/callback`). Register that exact callback URL as an Authorized redirect URI in Google Cloud Console. The public backend origin must be known before Google OAuth can be configured for production; do not point the redirect URI at the frontend unless it actually serves the backend callback route.

Prisma schema: `prisma/schema.prisma`. Committed migrations: `prisma/migrations/`. Create a migration during development with `npx prisma migrate dev --name <migration_name>`; do not edit an already-deployed migration. `npm run db:migrate` applies pending migrations, and `npm run db:seed` reruns the idempotent demo seed. `npm run build` generates the Prisma client, type-checks, and emits `dist/`. `npm test` runs deterministic analysis unit tests. Keep `.env` local and do not commit it.

## API conventions

- Base URL: `http://localhost:3000/api`
- JSON is used for request and response bodies.
- Successful resources are wrapped in `{ "data": ... }`.
- Errors are wrapped in `{ "error": { "code": "...", ... } }`.
- Timestamps are returned as strings. Decimal MySQL columns are converted to JSON numbers by the API.
- Report, measurement, user, and session identifiers are UUID strings.
- Analysis status is `low`, `in_range`, `high`, or `needs_verification`. Out-of-range is a comparison with the supplied interval only, not a diagnosis.
- Missing units, missing intervals, invalid intervals, duplicate normalized names, and extraction confidence below `0.8` are surfaced as quality issues. No unit conversion or missing-range inference is performed.

## Endpoints

### `GET /api/health`

Returns `200` when MySQL is reachable and `503` otherwise.

```json
{ "data": { "status": "ok", "database": "connected" } }
```

### Authentication

Authentication endpoints are under `/api/v1/auth`. Registration and login accept JSON email/password credentials; the backend owns credential verification, token creation, and sessions. Emails are trimmed and lowercased; passwords must contain 8-128 characters. Passwords are stored as salted scrypt hashes. Login failures use the same `401 invalid_credentials` response whether the email or password is incorrect.

Successful registration returns `201`; successful login returns `200`. Both set a 15-minute access JWT and a 30-day opaque refresh token in separate HttpOnly cookies. In production the cookies are also `Secure`; their `SameSite` mode is configured with `AUTH_COOKIE_SAME_SITE`. The refresh secret is stored only as a SHA-256 hash in the database, and each refresh rotates it. The frontend does not receive or store bearer tokens; send session requests with `credentials: "include"` and check the signed-in user through `/me`.

```json
{
  "data": {
    "user": { "id": "<uuid>", "email": "person@example.com" },
    "session": { "id": "<uuid>", "expiresAt": "<ISO-8601 timestamp>" }
  }
}
```

#### `POST /api/v1/auth/register`

Creates an account and starts a session. Request:

```json
{ "email": "person@example.com", "password": "at-least-8-characters" }
```

Returns `409 email_already_registered` if the email is already in use and `400 invalid_request` for invalid fields.

#### `POST /api/v1/auth/login`

Uses the same request body and response as registration. Returns `401 invalid_credentials` when credentials do not match.

#### `GET /api/v1/auth/google`

Start Google sign-in by navigating the browser to this backend URL. The backend creates and stores short-lived OAuth state, nonce, and PKCE verifier cookies, then redirects the browser to Google. The frontend does not call Google Identity Services or receive OAuth tokens.

```ts
window.location.assign('http://localhost:3000/api/v1/auth/google')
```

Google returns to:

`GET /api/v1/auth/google/callback`

The backend validates state, exchanges the authorization code using the client secret and PKCE verifier, verifies Google's signed ID token (issuer, audience, expiry, nonce, and verified email), associates the Google subject with the account, creates the Veyra session cookies, and redirects to `AUTH_SUCCESS_REDIRECT_URL?auth=success`. The frontend can then call `/api/v1/auth/me` with `credentials: "include"`. Failures redirect to the configured frontend with an `authError` query parameter such as `google_access_denied`, `invalid_oauth_state`, `google_auth_failed`, or `google_account_conflict`. When Google client credentials are absent, starting sign-in returns `503 google_oauth_not_configured`; email/password login remains available.

#### `POST /api/v1/auth/refresh`

Send cookies with `credentials: "include"`; no request body is required. Rotates the refresh session and both session cookies. A missing, expired, revoked, invalid, or reused refresh token returns `401 invalid_refresh_session`; session cookies are cleared.

#### `POST /api/v1/auth/logout`

Send cookies with `credentials: "include"`. Revokes the current refresh session, clears both session cookies, and returns `204`. Repeating logout is safe.

#### `GET /api/v1/auth/me`

Uses the HttpOnly session cookies automatically. Returns the current user and session metadata. Returns `401` for an invalid/expired token or a revoked/expired session.

#### `POST /api/v1/auth/logout-all`

Uses the HttpOnly session cookies automatically. Revokes all active sessions for the user (including the current session), clears both session cookies, and returns `204`.

Registration, login, Google sign-in, and refresh are rate-limited to 10 attempts per client IP in a 15-minute window (in-memory per API process; use a shared store when deploying multiple instances). State-changing auth requests validate browser `Origin` when present; configure `CORS_ORIGIN` for the exact frontend origin(s). CORS credentials are enabled; do not configure wildcard origins for a production deployment.

### `POST /api/v1/reports/extract`

Extracts laboratory measurements from a PDF and returns a structured JSON draft. This endpoint requires a valid Veyra session cookie; sign in first and send the request with `credentials: "include"`. It does not save the PDF or extracted data. The request body must be the raw PDF bytes with `Content-Type: application/pdf`; PDFs are limited to 15 MiB and 25 pages. Extraction is limited to 5 requests per IP in 15 minutes.

PDF text is extracted directly where available. Pages without a usable text layer are rendered locally and OCR'd in English with Tesseract. The first OCR request downloads Tesseract's English language data from jsDelivr and caches it under the operating system's temporary directory; the backend host needs internet access for that initial download. OCR and text parsing happen in the API process, not in the browser.

```js
const response = await fetch(`${API_BASE_URL}/v1/reports/extract`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/pdf' },
  body: pdfFile, // A File/Blob selected by the user
})
const result = await response.json()
```

Successful response shape:

```json
{
  "data": {
    "document": { "pageCount": 1, "ocrPages": [] },
    "measurements": [
      {
        "testName": "Hemoglobin",
        "normalizedName": "hemoglobin",
        "value": 13.5,
        "unit": "g/dL",
        "referenceLow": 12,
        "referenceHigh": 16,
        "referenceRangeText": "12.0 - 16.0",
        "collectedAt": null,
        "sourceText": "Hemoglobin 13.5 g/dL 12.0 - 16.0",
        "page": 1,
        "confidence": 0.9,
        "reviewStatus": "needs_review"
      }
    ],
    "qualityIssues": []
  }
}
```

`ocrPages` lists page numbers that needed OCR. `confidence` is a source-type heuristic (0.9 for embedded PDF text, 0.65 for OCR), not calibrated accuracy. `referenceLow` and `referenceHigh` remain `null` when an interval cannot safely be read; `referenceRangeText` preserves a one-sided limit such as `< 5.7`. Quality issues identify missing units/ranges or an empty extraction. The parser does not convert units, infer reference ranges, or decide whether a result is clinically abnormal. Always show source evidence and require a person to review/edit extracted results before using them.

Errors include `401 authentication_required`, `415 unsupported_media_type`, `400 invalid_pdf`, `413 pdf_too_large` / `pdf_page_limit_exceeded`, `429 too_many_pdf_extractions`, and `503 ocr_unavailable`. `ocr_unavailable` usually means that the language data could not be downloaded; retry after restoring backend internet access.

### `GET /api/v1/reports`

Lists reports. Use `sourceType === "synthetic"` to label demo data in the UI.

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "Synthetic sample - within supplied ranges",
      "sourceType": "synthetic",
      "createdAt": "2026-..."
    }
  ]
}
```

### `GET /api/v1/reports/:reportId`

Returns one report, including its extracted measurement records. A missing report returns `404` with `error.code: "report_not_found"`.

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Synthetic sample - within supplied ranges",
    "sourceType": "synthetic",
    "createdAt": "2026-...",
    "measurements": [
      {
        "id": "11111111-aaaa-4111-8111-111111111111",
        "reportId": "11111111-1111-4111-8111-111111111111",
        "testName": "Synthetic Marker A",
        "normalizedName": "synthetic_marker_a",
        "value": 5.2,
        "unit": "units",
        "referenceLow": 2,
        "referenceHigh": 8,
        "sourceText": "Synthetic Marker A: 5.2 units (reference: 2.0-8.0)",
        "extractionConfidence": 1,
        "collectedAt": "2026-01-15"
      }
    ]
  }
}
```

### `GET /api/v1/reports/:reportId/analysis`

Returns data for the measurement list, evidence panel, quality panel, and graph. Each measurement includes its original fields plus `status` and `evidence`. `evidence` is `null` when the range cannot be used safely.

```json
{
  "data": {
    "reportId": "11111111-1111-4111-8111-111111111111",
    "sourceType": "synthetic",
    "disclaimer": "Veyra is a prototype for inspecting laboratory data, not a diagnostic system. Review results with a qualified healthcare professional.",
    "measurements": [
      {
        "id": "11111111-aaaa-4111-8111-111111111111",
        "reportId": "11111111-1111-4111-8111-111111111111",
        "testName": "Synthetic Marker A",
        "normalizedName": "synthetic_marker_a",
        "value": 5.2,
        "unit": "units",
        "referenceLow": 2,
        "referenceHigh": 8,
        "sourceText": "Synthetic Marker A: 5.2 units (reference: 2.0-8.0)",
        "extractionConfidence": 1,
        "collectedAt": "2026-01-15",
        "status": "in_range",
        "evidence": {
          "kind": "reference_range",
          "description": "Compared 5.2 units with the supplied lower limit 2 and upper limit 8.",
          "method": "deterministic"
        }
      }
    ],
    "qualityIssues": [
      {
        "code": "missing_unit",
        "severity": "warning",
        "message": "Synthetic Marker C has no unit and needs verification.",
        "measurementIds": ["22222222-aaaa-4222-8222-111111111111"]
      }
    ],
    "relationships": [],
    "inferenceStatus": "not_configured"
  }
}
```

`qualityIssues[].code` can be `missing_unit`, `missing_reference_range`, `invalid_reference_range`, `low_extraction_confidence`, `duplicate_measurement`, or `conflicting_measurements`. Use `measurementIds` to link an issue back to the measurement row. Status and quality severity must also be shown as text; do not rely on color alone.

### `POST /api/v1/reports/:reportId/simulations`

Compares the stored analysis with an analysis using one substituted value. It never writes the simulated value to MySQL.

Request:

```json
{
  "measurementId": "11111111-aaaa-4111-8111-111111111111",
  "value": 9
}
```

Response:

```json
{
  "data": {
    "persisted": false,
    "disclaimer": "This synthetic, one-value comparison is not a prediction of a clinical outcome.",
    "changedMeasurement": {
      "measurementId": "11111111-aaaa-4111-8111-111111111111",
      "originalValue": 5.2,
      "simulatedValue": 9,
      "originalStatus": "in_range",
      "simulatedStatus": "high",
      "statusChanged": true
    },
    "originalAnalysis": {},
    "simulatedAnalysis": {}
  }
}
```

Invalid input returns `400` (`invalid_request`); a missing report or measurement returns `404`.

## Frontend wiring

Use `VITE_API_BASE_URL=http://localhost:3000/api` in the frontend's local environment and construct requests relative to it. Load the report list for the sample selector, then request its analysis when a report is selected. Populate measurement rows from `data.measurements`; open the evidence/source panel using the same measurement's `sourceText`, limits, unit, and `evidence`; map quality issues by `measurementIds`; and render graph edges only from `relationships` (currently none). For the simulator, POST the changed measurement ID and numeric value and present the returned original and simulated analyses side by side, visibly noting that the result is not persisted.

Display loading, empty, network-error, and API error states. Keep the supplied disclaimer visible near analysis and simulation results. Do not present `extractionConfidence` as a calibrated probability; it is only a source quality field in this prototype.

## Not implemented yet

PDF extraction is available but results are not persisted; report ownership/access control, image-file extraction, persistent simulation history, configurable evidence-backed graph rules, Adaption Labs integration, model evaluation, email verification, password reset, and production deployment hardening are not implemented. Existing demo report endpoints remain public; authentication does not imply ownership of those demo reports. Never place private service credentials in the Vite frontend.
