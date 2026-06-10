#!/usr/bin/env node

import 'dotenv/config';
import { uuid } from '@/lib/crypto';
import { clearAmplifierCache, DEFAULT_AMPLIFIER_CONFIG } from '@/lib/data-amplifier';
import { generateBatchFakeVisits } from '@/lib/fake-visit-generator';
import prisma from '@/lib/prisma';

function printUsage() {
  console.log(`
Usage:
  npm run enable-amplifier -- <websiteId> [multiplier] [visitsPerHour]

Examples:
  npm run enable-amplifier -- 00000000-0000-0000-0000-000000000000
  npm run enable-amplifier -- 00000000-0000-0000-0000-000000000000 10 100
`);
}

async function main() {
  const [websiteId, multiplierArg, visitsPerHourArg] = process.argv.slice(2);

  if (!websiteId) {
    printUsage();
    process.exit(1);
  }

  const amplifyMultiplier = Number(multiplierArg ?? DEFAULT_AMPLIFIER_CONFIG.amplifyMultiplier);
  const fakeVisitsPerHour = Number(visitsPerHourArg ?? DEFAULT_AMPLIFIER_CONFIG.fakeVisitsPerHour);

  if (!Number.isFinite(amplifyMultiplier) || amplifyMultiplier < 1 || amplifyMultiplier > 100) {
    throw new Error('Multiplier must be a number between 1 and 100.');
  }

  if (!Number.isInteger(fakeVisitsPerHour) || fakeVisitsPerHour < 0 || fakeVisitsPerHour > 1000) {
    throw new Error('Visits per hour must be an integer between 0 and 1000.');
  }

  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new Error(`Website ${websiteId} was not found.`);
  }

  const config = await prisma.client.dataAmplifierConfig.upsert({
    where: { websiteId },
    create: {
      id: uuid(),
      websiteId,
      enabled: true,
      amplifyMultiplier,
      generateFakeVisits: fakeVisitsPerHour > 0,
      fakeVisitsPerHour,
      amplifyPageviews: true,
      amplifyEvents: true,
      amplifyActiveUsers: true,
    },
    update: {
      enabled: true,
      amplifyMultiplier,
      generateFakeVisits: fakeVisitsPerHour > 0,
      fakeVisitsPerHour,
      amplifyPageviews: true,
      amplifyEvents: true,
      amplifyActiveUsers: true,
    },
  });

  clearAmplifierCache(websiteId);

  console.log(`Enabled data amplifier for ${website.name} (${website.id}).`);
  console.log(`Multiplier: ${Number(config.amplifyMultiplier)}x`);
  console.log(
    `Fake visits: ${config.generateFakeVisits ? `${config.fakeVisitsPerHour}/hour` : 'off'}`,
  );

  if (config.generateFakeVisits) {
    const sample = await generateBatchFakeVisits(websiteId, Math.min(3, config.fakeVisitsPerHour));
    console.log(`Generated sample data: ${sample.visits} visits, ${sample.pageviews} pageviews.`);
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.client.$disconnect();
  });
