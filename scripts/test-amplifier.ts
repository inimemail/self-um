#!/usr/bin/env node

import 'dotenv/config';
import { amplifyDataRecursive, amplifyValue, getAmplifierConfig } from '@/lib/data-amplifier';
import { generateFakeVisit } from '@/lib/fake-visit-generator';
import prisma from '@/lib/prisma';

function printUsage() {
  console.log(`
Usage:
  npm run test-amplifier -- <websiteId> [--generate]

Options:
  --generate   Generate one fake visit after validating the configuration.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const websiteId = args.find(arg => !arg.startsWith('--'));
  const shouldGenerate = args.includes('--generate');

  if (!websiteId) {
    printUsage();
    process.exit(1);
  }

  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new Error(`Website ${websiteId} was not found.`);
  }

  console.log(`Website: ${website.name} (${website.id})`);

  const config = await getAmplifierConfig(websiteId);
  console.log('Config:', config ?? 'not configured');

  console.log('Value test:', amplifyValue(100, 10));
  console.log(
    'Object test:',
    amplifyDataRecursive(
      {
        pageviews: 50,
        visitors: 20,
        series: [{ x: '2026-06-09', y: 10 }],
      },
      10,
    ),
  );

  if (shouldGenerate) {
    const pageviews = await generateFakeVisit(websiteId, website);
    console.log(`Generated one fake visit with ${pageviews} pageviews.`);
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
