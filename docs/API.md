# API Reference

The API uses JSON and an HTTP-only `token` cookie issued by login or first-admin setup. Protected endpoints return `401` when the session is absent or invalid. Admin-only endpoints return `403` for staff users.

## Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/setup/status` | Check whether first-admin setup is required |
| POST | `/api/setup/admin` | Create the first administrator (one-time) |
| POST | `/api/auth/login` | Authenticate and issue the cookie |
| POST | `/api/auth/logout` | Expire the cookie |
| GET | `/api/auth/me` | Return the current safe user profile |

Login body: `{ "email": "admin@example.com", "password": "…" }`.

## Members

`GET /api/members` supports `page`, `limit`, `search`, and `status`. `POST /api/members` creates a member. `/api/members/[id]` supports `GET`, `PUT`, and `DELETE`. Member subresources expose memberships and attendance history.

## Memberships

`/api/membership-plans` supports authenticated CRUD with pagination and status/search filters. `/api/memberships` creates assignments and lists membership history. Membership detail supports cancellation and history-preserving renewal behavior.

## Attendance

`/api/attendance` lists and creates attendance records. `/api/attendance/check-in` starts a record, and `/api/attendance/[id]/check-out` closes it. Filters include date ranges, member, status, search, page, and limit.

## Payments

`/api/payments` lists and records payments. `/api/payments/[id]` retrieves payment details and supports refunds through the existing update flow. Payment reports expose paid, refunded, and outstanding summaries.

## Trainers

`/api/trainers` supports paginated listing and creation. `/api/trainers/[id]` supports retrieval, update, and deletion. Search, status, and specialization filters are supported.

## Reports

Report endpoints include `/api/reports/overview`, `/members`, `/memberships`, `/attendance`, `/payments`, `/trainers`, `/outstanding-balances`, and `/trends`. They accept validated date ranges and pagination/search parameters appropriate to each report.

## Settings and administration

`GET /api/settings/gym` is available to authenticated administrators and staff. `PUT /api/settings/gym` is administrator-only. `/api/admin/users` and its detail endpoint are administrator-only.

## Notifications

`GET /api/notifications` supports `page`, `limit`, `search`, `type`, `priority`, and `isRead`. `POST /api/notifications` creates an allowlisted notification. `/api/notifications/[id]` supports `GET` and `DELETE`; `/read` marks one read; `/read-all` marks visible unread records read.

## Status codes

- `200` successful read or update
- `201` successful creation
- `400` invalid JSON, validation, or query parameters
- `401` unauthenticated or expired session
- `403` authenticated but not authorized
- `404` resource not found
- `409` duplicate or protected relationship conflict
- `500` generic server failure without stack traces or secrets

Responses use `{ "error": "…" }` for failures and resource-specific envelopes for successful requests.
