# Umami Data Amplifier

The data amplifier adds per-website controls for multiplying selected analytics API responses and, when explicitly enabled, generating synthetic pageview traffic.

## What It Does

- Multiplies dashboard stats, pageview series, metrics lists, event metrics, and active visitor counts.
- Stores settings per website in `data_amplifier_config`.
- Keeps synthetic visit generation disabled by default.
- Provides a worker that can generate synthetic visits every 5 minutes for websites where both `enabled` and `generateFakeVisits` are true.

## Database Setup

Generate the Prisma client and apply the migration:

```bash
npm run build-db-client
npx prisma migrate deploy
```

The migration file is:

```text
prisma/migrations/99_data_amplifier/migration.sql
```

## API

Get a website's amplifier config:

```http
GET /api/websites/{websiteId}/amplifier
```

Update the config:

```http
POST /api/websites/{websiteId}/amplifier
Content-Type: application/json

{
  "enabled": true,
  "amplifyMultiplier": 10,
  "generateFakeVisits": false,
  "fakeVisitsPerHour": 50,
  "amplifyPageviews": true,
  "amplifyEvents": true,
  "amplifyActiveUsers": true
}
```

Delete the config and return to defaults:

```http
DELETE /api/websites/{websiteId}/amplifier
```

## Scripts

Enable amplification for a website:

```bash
npm run enable-amplifier -- <websiteId> [multiplier] [visitsPerHour]
```

If `visitsPerHour` is greater than `0`, synthetic visit generation is enabled for that website.

Run a quick validation:

```bash
npm run test-amplifier -- <websiteId>
npm run test-amplifier -- <websiteId> --generate
```

Run the background worker:

```bash
npm run amplifier
```

For PM2:

```bash
pm2 start npm --name umami-amplifier -- run amplifier
```

## Defaults

| Field | Default |
| --- | --- |
| `enabled` | `false` |
| `amplifyMultiplier` | `10` |
| `generateFakeVisits` | `false` |
| `fakeVisitsPerHour` | `50` |
| `amplifyPageviews` | `true` |
| `amplifyEvents` | `true` |
| `amplifyActiveUsers` | `true` |

## Files

- `src/lib/data-amplifier.ts`
- `src/lib/fake-visit-generator.ts`
- `src/lib/data-amplifier-scheduler.ts`
- `src/app/api/websites/[websiteId]/amplifier/route.ts`
- `scripts/data-amplifier-worker.ts`
- `scripts/enable-amplifier.ts`
- `scripts/test-amplifier.ts`
