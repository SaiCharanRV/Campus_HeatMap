# API reference

All endpoints are under `/api`. Authenticated endpoints need `Authorization: Bearer <token>`. Errors come back as `{ "message": "...", "details"?: [...] }`.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register/send-otp` | `{ email }` | Any email, unless `STUDENT_EMAIL_DOMAIN` is set. Rate-limited to 5 per 15 min. In dev without SMTP, the response includes `devOtp`. |
| POST | `/auth/register/verify` | `{ email, otp, name, password, enrollmentNo?, phone?, hostel? }` | Creates a verified student and returns `{ token, user }`. Allows at most 5 wrong OTP attempts. |
| POST | `/auth/login` | `{ email, password, role: "student" \| "staff" }` | Returns `{ token, user }`. |
| POST | `/auth/forgot-password` | `{ email }` | Always gives the same response, so emails can't be probed. |
| POST | `/auth/reset-password` | `{ email, otp, password }` | |
| GET | `/auth/me` | | |

## Complaints (students; reads open to any logged-in user)

| Method | Path | Notes |
|---|---|---|
| GET | `/complaints` | Public summaries. Query: `location, category, status (open\|closed\|STATUS), priority, q, from, to, page, limit` |
| POST | `/complaints` | multipart: `category, locationId, title, description, priority?, exactSpot?, isAnonymous?, lat?, lng?, images[] (≤5, ≤5 MB, jpeg/png/webp)` |
| GET | `/complaints/mine` | The student's own complaints |
| GET | `/complaints/:id` | `{ complaint, timeline, comments, access: owner\|staff\|public }` |
| POST | `/complaints/:id/upvote` | Toggles "me too". Returns `{ upvoteCount, hasUpvoted, priority }` |
| POST | `/complaints/:id/reopen` | `{ reason }`, owner only, within `SLA_REOPEN_DAYS` |
| POST | `/complaints/:id/rate` | `{ rating 1-5, feedback? }`. Changes RESOLVED to CLOSED |
| POST | `/complaints/:id/comments` | `{ text }`. Only the owner and the staff handling it can comment |

## Staff (supervisor / worker / admin)

A supervisor sees their own zone and category, a worker sees the complaints assigned to them, and an admin sees everything.

| Method | Path | Notes |
|---|---|---|
| GET | `/staff/complaints` | Same filters as above plus `escalated=true`, `sort=recent\|deadline` |
| GET | `/staff/stats` | `{ byStatus, open, overdue, escalated }` |
| GET | `/staff/complaints/:id` | Same response as `/complaints/:id` |
| PATCH | `/staff/complaints/:id/assign` | `{ workerId, note? }`, supervisor or admin |
| PATCH | `/staff/complaints/:id/status` | multipart or JSON: `{ status: IN_PROGRESS\|RESOLVED, note?, images[]? }`. A worker must attach a photo to resolve |
| PATCH | `/staff/complaints/:id/reject` | `{ reason }`, supervisor or admin |
| GET | `/staff/workers` | Workers in the supervisor's zone and category, with `openJobs`. Admins can pass `?zone=&category=` |

## Campus alerts

| Method | Path | Notes |
|---|---|---|
| GET | `/alerts` | Current and upcoming alerts (not ended, not resolved). Staff can pass `?scope=all` for the latest 100 including past ones |
| POST | `/alerts` | Supervisor or admin. `{ title, description?, type, severity, shape: pin\|line\|area, points: [{lat,lng}], radius? (m, area only), locationId?, startsAt?, endsAt }`. A line needs at least 2 points |
| PATCH | `/alerts/:id` | Poster or admin. `{ title?, description?, severity?, endsAt? }`, e.g. to extend it |
| POST | `/alerts/:id/resolve` | Poster or admin. Ends it now |
| DELETE | `/alerts/:id` | Admin only |

## Recurring problems (staff)

| Method | Path | Notes |
|---|---|---|
| GET | `/staff/recurring` | `?status=open\|acknowledged`. A supervisor sees their own zone and category. Returns `{ items, threshold, windowDays }` |
| PATCH | `/staff/recurring/:id/acknowledge` | `{ note? }` |

`GET /complaints/:id` also returns `recurring: { count, firstSeenAt, lastSeenAt, windowDays }` to staff when that complaint's building and category has an open recurring problem.

## Map

| Method | Path | Notes |
|---|---|---|
| GET | `/locations` | All locations, each with `lat` and `lng` |
| GET | `/map/heatmap` | Query: `category, status (open\|all), from, to`. Returns `[{ locationId, name, lat, lng, count, upvotes, emergency, intensity, byCategory }]` |

## Admin

| Method | Path |
|---|---|
| GET/POST | `/admin/users` · PATCH/DELETE `/admin/users/:id` (DELETE deactivates) |
| GET/POST | `/admin/zones` · PATCH/DELETE `/admin/zones/:id` |
| GET/POST | `/admin/locations` · PATCH/DELETE `/admin/locations/:id` |
| GET/PUT | `/admin/mappings` (`PUT { zone, category, supervisor }` upserts and re-routes open complaints) · DELETE `/admin/mappings/:id` |
| GET | `/admin/analytics` |

## Notifications

| Method | Path |
|---|---|
| GET | `/notifications` → `{ items, unread }` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |

## Socket.IO events

Connect with `io(url, { auth: { token } })`.

- `notification`: a new in-app notification for this user.
- `complaint:changed`: `{ id, status, location }`, broadcast whenever any complaint changes. Clients use it to refresh the heatmap, lists and detail pages.
- `alert:new`: the full alert, broadcast when one is posted (shown as a pop-up).
- `alert:changed`: `{ id, action: created\|updated\|resolved\|deleted }`. Clients refresh the map and banner.
- `recurring:changed`: `{ id }`. Staff refresh their recurring-problems list.
