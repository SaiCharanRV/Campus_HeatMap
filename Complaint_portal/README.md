# IIT Roorkee Complaint Portal

Students report campus problems (water, WiFi, infrastructure, cleaning) on a live campus heatmap. Each complaint is routed to the supervisor for that **zone × category**, who assigns a worker. Every step is shown to the student.

- **Frontend:** React (Vite), Tailwind CSS v4, React Router, Leaflet + `leaflet.heat`, Recharts, Socket.IO client
- **Backend:** Node.js, Express 5, MongoDB (Mongoose), JWT, bcrypt, Nodemailer, Multer + Cloudinary, Socket.IO, node-cron, zod

## Quick start

You need Node.js 18 or newer. No database or email account is required for local testing.

```bash
cd server
npm install
cp .env.example .env      # defaults: built-in local MongoDB, emails printed to the console
npm run dev               # API on http://localhost:5000
```

In a second terminal:

```bash
cd client
npm install
npm run dev               # app on http://localhost:5173
```

With `MONGO_URI=memory` the server runs a built-in MongoDB that saves its data in `server/.mongo-data/`, so complaints are kept between restarts. On the very first start it creates the zones, the campus locations, the routing table and the staff/demo accounts. **No complaints are pre-loaded**: the map and heatmap show only what students actually post, and update live.

- **Start over with an empty database:** stop the server, delete `server/.mongo-data/`, and start it again.
- **Add ~45 fake complaints to try the heatmap:** stop the server, run `npm run seed -- --reset --demo`, and start it again.

Campus locations (49 buildings: departments, library, LHC, all Bhawans, hospital, SAC, stadium…) use real coordinates from [OpenStreetMap](https://www.openstreetmap.org/copyright). For the few Bhawans that OpenStreetMap doesn't outline (e.g. Azad, Sarojini, Radhakrishnan), the position of their canteen or mess was used. Add or move buildings in **Admin → Locations**.

### Demo accounts (development only)

| Role | Email | Password |
|---|---|---|
| Student | `student@iitr.ac.in` (also `student2@…`) | `Student@123` |
| Supervisor | `sup.<zone>.<dept>@iitr.ac.in`, e.g. `sup.a.water@iitr.ac.in`, `sup.b.wifi@…`, `sup.a.infra@…`, `sup.b.cleaning@…` | `Staff@123` |
| Worker | `worker.<zone>.<dept><1-2>@iitr.ac.in`, e.g. `worker.a.water1@iitr.ac.in` | `Staff@123` |
| Admin | `admin@iitr.ac.in` | `Admin@123` |

When SMTP isn't configured, OTPs are printed in the server console and also shown in the UI as a "Dev mode" toast, so you can register a new student with any email address without needing a real inbox.

## Using a real database, email and image storage

Edit `server/.env`:

| Setting | What to put |
|---|---|
| `MONGO_URI` | A MongoDB Atlas or local URI. Then run `npm run seed` once to create zones, locations, supervisors and demo users. Use `npm run seed -- --reset` to wipe and reseed, and add `--demo` for fake test complaints. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | For Gmail: `smtp.gmail.com`, your address, and an [App Password](https://myaccount.google.com/apppasswords). |
| `CLOUDINARY_*` | Your Cloudinary credentials. If empty, images are saved to `server/uploads/`. |
| `STUDENT_EMAIL_DOMAIN` | Empty (the default) lets any email register. Set it to `iitr.ac.in` to allow only institute emails. |
| `JWT_SECRET` | A long random string. This is required when `NODE_ENV=production`. |
| `SLA_*` | Hours to assign, days before auto-close, and days a student can reopen. |

To move a building, open **Admin → Locations**, click its *Edit*, then click the right spot on the map.

## How it works

### Roles

- **Student** registers with an email OTP. Any email is accepted; set `STUDENT_EMAIL_DOMAIN=iitr.ac.in` in `server/.env` to allow only institute emails. They file complaints with optional photos, add "me too" votes on existing ones, comment, rate the fix, and can reopen within 7 days.
- **Supervisor** (one per zone × category, 8 by default) is emailed when a complaint arrives. They assign or reassign workers, update the status, or reject with a reason.
- **Worker** sees their jobs, marks them in progress, and resolves them with an "after" photo, which is required.
- **Admin** manages users, zones, locations and the routing matrix, sees all complaints, and has the analytics dashboard.

The login page has two tabs, *Student* and *Staff*. Staff accounts are created by the admin; there's no self-signup for staff.

### Complaint lifecycle

```
SUBMITTED → ROUTED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                ↑                                 │         │
                └──────────── REOPENED ←──────────┴─────────┘
(any open status) → REJECTED
```

- Transitions and who may make them are enforced in [`server/src/services/workflow.service.js`](server/src/services/workflow.service.js). Every change writes a timeline entry, notifies the people involved in-app and over Socket.IO, and emails at the key steps.
- **SLA**: a complaint must be assigned within 24 h. Once assigned, it must be resolved within 12 h (emergency), 48 h (high), 96 h (medium) or 7 days (low). A cron job runs every 15 minutes and escalates overdue complaints to the supervisor and admins. It also auto-closes complaints that have been resolved for 3 days without a response from the student.
- **"Me too"**: when 5 students upvote a low or medium complaint, it's raised to high priority. Upvotes also add weight to the heatmap.
- **Anonymous** complaints hide the student's identity from supervisors and workers, but not from admins.

### Map

The map is centred on IIT Roorkee with a heat layer of open complaints, plus one marker per location, coloured green under 3, orange for 3–10, and red over 10. Leaflet's double-click zoom is turned off, so **double-clicking a building opens a side drawer** with its complaints. On touch screens, tap the marker and then *View complaints*. You can filter by category and switch between open complaints and all time.

### Campus alerts

Supervisors and admins post temporary notices from **Alerts** in the navbar, for example *"Road closed: bee hive removal"* on the road between the Library and the Chemical Dept.

- **Drawing:** a notice can be a 📍 pin, a 〰️ road (click points along it) or a ⭕ area (a centre and a size). The nearest building is linked automatically.
- **Details:** each notice has a type (road closed, hazard/bees, water shutdown, network outage, power cut, tree fallen, maintenance, cleaning drive), a severity (info, warning, danger) and a start and end time.
- **What everyone sees:** dashed lines, shaded areas and emoji pins on the map; a dismissible banner on every page; and a pop-up the moment it's posted.
- **On the complaint form:** students choosing a building within ~150 m of an active notice are told about it, so they don't report something that's already known.
- **Ending:** notices disappear at their end time. The poster or an admin can extend one by a day or end it early.

### Recurring problems

When the same building gets **3 or more complaints of the same category within 30 days** (configurable with `RECURRING_THRESHOLD` and `RECURRING_WINDOW_DAYS`), the portal raises a *recurring problem*:

- The zone's supervisor and the admins get an in-app notification and an email.
- It appears under **🔁 Recurring problems** on the supervisor dashboard (their zone and department only) and on the admin Analytics page.
- Each of that spot's complaints shows a "recurring problem" warning to staff.

Staff **Acknowledge** it with a note on the root-cause fix, e.g. "main pipe to be replaced". It's only raised again if new complaints keep coming after that.

### QR codes

**Admin → QR codes** shows one QR code per building on the map, to print (3 per row) or download as PNG and stick at entrances, washrooms and corridors. Scanning one opens `/report?location=<id>`:

- A student goes straight to the complaint form with that building filled in. If they're logged out, they log in first and are brought back.
- Staff are taken to that building's complaint list.

Set **"Website address used in the codes"** before printing. `localhost` only works on your own computer, so use the deployed address, or your laptop's Wi-Fi IP to test with a phone on the same network. For the Wi-Fi option, start the client with `npm run dev -- --host`.

## Tests

```bash
cd server
npm test
```

This runs 78 end-to-end API tests: auth and OTP, filing and uploads, privacy and anonymity, "me too", the full staff workflow, SLA escalation, alerts, recurring problems, the heatmap, admin and notifications. Each run uses its own temporary database, so your saved data in `server/.mongo-data/` is never touched. You don't need to stop the dev server first.

## Project structure

```
client/src/
  api/            axios instance + one module per API area
  components/
    common/       Navbar, NotificationBell, Modal, Button, StatusBadge, Field, Loader, …
    map/          CampusMap, HeatLayer, LocationDrawer, MapPanel
    complaint/    ComplaintForm, ComplaintCard, ComplaintView, ComplaintTimeline, CommentThread, ImageUploader, RatingForm
    staff/        AssignWorkerModal, StatusUpdateForm, RejectModal
  pages/
    auth/         Login, Register, VerifyOtp, ForgotPassword
    student/      Dashboard (map + my complaints), NewComplaint, ComplaintDetail
    staff/        SupervisorDashboard, WorkerDashboard, ComplaintManage
    admin/        Analytics, Users, Locations, Mappings (routing matrix + zones)
    LocationComplaints.jsx
  context/        AuthContext, SocketContext
  hooks/          useAuth, useFetch, useComplaints (socket subscriptions)
  routes/         ProtectedRoute (role-based)
  utils/          constants, formatters

server/src/
  config/         env, db (incl. in-memory mode), mailer, cloudinary
  models/         User, Otp, Zone, Location, SupervisorMapping, Complaint, ComplaintUpdate, Comment, Notification, Counter
  controllers/    auth, complaint, staff, map, admin, notification
  routes/         one router per controller
  middleware/     auth (JWT), role, upload (multer), rateLimit, validate (zod), errorHandler
  services/       otp, email, routing, workflow, notification, storage, ticket, access
  jobs/           sla.job.js (escalation + auto-close)
  sockets/        Socket.IO auth + rooms
  seed/           locations.json + seed.js
```

See [docs/API.md](docs/API.md) for the endpoint reference.

## Deploying

- **Backend** on Render or Railway: set the root directory to `server`, use `npm start` as the start command, and set the environment variables above with `NODE_ENV=production`, `CLIENT_URL=<frontend URL>` and `SERVER_URL=<backend URL>`. Use MongoDB Atlas and Cloudinary, because the local `uploads/` folder doesn't survive redeploys on most hosts.
- **Frontend** on Vercel or Netlify: set the root directory to `client`, use `npm run build` as the build command and `dist` as the output folder. Set `VITE_API_URL` and `VITE_SOCKET_URL` to the backend URL, and add an SPA rewrite so every path serves `index.html`.
