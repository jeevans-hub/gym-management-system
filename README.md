# GymPro Management System

GymPro is a production-oriented gym operations application for administrators and staff. It covers members, memberships, attendance, payments, trainers, reporting, settings, administration, and authenticated notifications.

## Features

- HTTP-only JWT authentication with first-admin setup
- Member and trainer records with search, pagination, and status management
- Membership plans, assignments, renewals, cancellation, and history
- Attendance check-in/check-out and payment/refund tracking
- Operational dashboard, business analytics, reports, and outstanding balances
- Admin-only user and gym-settings administration
- Authenticated notifications with filtering, read state, and pagination
- Responsive desktop, tablet, and mobile layouts

## Technology stack

Next.js App Router, React, TypeScript, Tailwind CSS, MongoDB Atlas, and Mongoose.

## Project structure

```text
app/       Pages, dashboard UI, and API route handlers
lib/       Authentication, database, validation, and reporting helpers
models/    Mongoose schemas and indexes
public/    Static assets
docs/      API and deployment documentation
```

## Installation

```bash
npm install
```

Create `.env.local` locally (never commit it):

```text
MONGODB_URI=<MongoDB connection string>
JWT_SECRET=<long random production secret>
```

## Running locally

```bash
npm run dev
```

Open `http://localhost:3000`. Complete first-admin setup through `/setup`, then sign in through `/login`.

## Production build

```bash
npm run lint
npm run build
npm start
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel and MongoDB Atlas deployment steps.

## Default workflow

1. Complete first-admin setup.
2. Configure gym profile and staff accounts as an administrator.
3. Create membership plans.
4. Add members and assign memberships.
5. Record attendance and payments.
6. Use reports and the dashboard for operations review.
7. Monitor the notifications center for system events.

## API overview

All operational APIs require the HTTP-only authentication cookie. See [docs/API.md](docs/API.md) for the endpoint reference.

## Screenshots

Screenshots can be added here for the dashboard, member management, reports, and notifications center.

## Future roadmap

Automated notification generation and delivery integrations may be considered in a future release. They are outside the current release scope.

## License

Proprietary commercial software. Add the organization’s approved license text before external distribution.

## Troubleshooting

- Confirm both environment variables are present and valid.
- Confirm MongoDB Atlas network access allows the production runtime.
- If authentication expires, sign in again; cookies are intentionally HTTP-only.
- Run `npm run lint` and `npm run build` before reporting a release issue.
