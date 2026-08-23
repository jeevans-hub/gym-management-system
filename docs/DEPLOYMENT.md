# Deployment Guide

## MongoDB Atlas

1. Create a production MongoDB Atlas project and database user.
2. Configure network access for the production runtime using a secure, least-privilege policy.
3. Create a least-privilege application database user.
4. Copy the Atlas connection string into the deployment environment as `MONGODB_URI`.
5. Never place credentials in source code, screenshots, logs, or support tickets.

## Vercel deployment

1. Import the repository into Vercel.
2. Select the Next.js framework preset.
3. Set `MONGODB_URI` and a long random `JWT_SECRET` under the production environment variables.
4. Deploy a preview first and verify setup, login, protected APIs, and the dashboard.
5. Promote the verified build to production.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret used to sign session tokens |

Production cookies are HTTP-only, `SameSite=Lax`, and marked `Secure` when `NODE_ENV=production`.

## Production build

```bash
npm install
npm run lint
npm run build
npm start
```

## Custom domain

Add the domain in Vercel, update DNS records as instructed by Vercel, wait for TLS issuance, then validate login and cookie behavior over HTTPS.

## Troubleshooting

- Database failures usually indicate an invalid URI, blocked Atlas network access, or an unavailable cluster.
- A `401` means the session cookie is absent, expired, or invalid; sign in again.
- A `403` means the authenticated user lacks the required administrator role.
- Check deployment logs only for generic error names/messages; never add secrets or request bodies to logs.
- Reproduce build failures with the same Node/npm versions and run the lint/build commands locally.
