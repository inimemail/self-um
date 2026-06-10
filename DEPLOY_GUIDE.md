# Data Amplifier Deployment Guide

## 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

This project currently uses React 19 while one dependency declares a React 18 peer range, so `--legacy-peer-deps` is needed with npm.

## 2. Configure the Database

Set `DATABASE_URL` to your PostgreSQL connection string, then run:

```bash
npm run build-db-client
npx prisma migrate deploy
```

The new table is `data_amplifier_config`.

## 3. Build and Restart Umami

```bash
npm run build
npm start
```

`npm run build` runs a database connectivity check, so it needs a real reachable `DATABASE_URL`.

## 4. Enable the Amplifier

Enable API response amplification only:

```bash
npm run enable-amplifier -- <websiteId> 10 0
```

Enable API response amplification and synthetic visits:

```bash
npm run enable-amplifier -- <websiteId> 10 100
```

The third argument is synthetic visits per hour. A value of `0` keeps synthetic visit generation off.

## 5. Start the Worker

Synthetic visits are generated only when the worker is running and the website config has both `enabled` and `generateFakeVisits` set to `true`.

```bash
npm run amplifier
```

For PM2:

```bash
pm2 start npm --name umami-amplifier -- run amplifier
```

## 6. Verify

```bash
npm run test-amplifier -- <websiteId>
npm run test-amplifier -- <websiteId> --generate
```

You can also inspect the API directly:

```bash
curl http://localhost:3000/api/websites/<websiteId>/amplifier
```

Use the same authentication method you use for other Umami website API routes.
