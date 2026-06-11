import { subMinutes } from 'date-fns';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

type WebsiteRecord = {
  id: string;
  domain?: string | null;
};

const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const OS_LIST = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const COUNTRIES = ['US', 'CN', 'GB', 'DE', 'FR', 'JP', 'KR', 'CA', 'AU', 'IN'];
const LANGUAGES = ['en-US', 'zh-CN', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR'];

const PAGES = [
  { path: '/', title: 'Home' },
  { path: '/about', title: 'About Us' },
  { path: '/contact', title: 'Contact' },
  { path: '/products', title: 'Products' },
  { path: '/blog', title: 'Blog' },
  { path: '/services', title: 'Services' },
  { path: '/pricing', title: 'Pricing' },
  { path: '/features', title: 'Features' },
  { path: '/docs', title: 'Documentation' },
  { path: '/support', title: 'Support' },
];

const REFERRER_DOMAINS = [
  'google.com',
  'bing.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'reddit.com',
  'youtube.com',
  null,
  null,
  null,
];

export const GENERATOR_TICKS_PER_HOUR = 12;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRecentDate() {
  return subMinutes(new Date(), Math.random() * 4);
}

export function getVisitsForTick(visitsPerHour: number) {
  if (!Number.isFinite(visitsPerHour) || visitsPerHour <= 0) {
    return 0;
  }

  const expectedVisits = visitsPerHour / GENERATOR_TICKS_PER_HOUR;
  const baseVisits = Math.floor(expectedVisits);
  const fractionalVisitChance = expectedVisits - baseVisits;
  const jitter = baseVisits > 0 && Math.random() < 0.3 ? Math.floor(Math.random() * 3) - 1 : 0;

  return Math.max(0, baseVisits + (Math.random() < fractionalVisitChance ? 1 : 0) + jitter);
}

export async function generateFakeVisit(websiteId: string, website?: WebsiteRecord) {
  const sessionId = uuid();
  const visitId = uuid();
  const createdAt = randomRecentDate();
  const pageviewCount = Math.floor(Math.random() * 5) + 1;

  await prisma.client.session.create({
    data: {
      id: sessionId,
      websiteId,
      browser: randomChoice(BROWSERS),
      os: randomChoice(OS_LIST),
      device: randomChoice(DEVICES),
      screen: '1920x1080',
      language: randomChoice(LANGUAGES),
      country: randomChoice(COUNTRIES),
      createdAt,
    },
  });

  for (let index = 0; index < pageviewCount; index++) {
    const page = randomChoice(PAGES);
    const referrerDomain = index === 0 ? randomChoice(REFERRER_DOMAINS) : null;

    await prisma.client.websiteEvent.create({
      data: {
        id: uuid(),
        websiteId,
        sessionId,
        visitId,
        urlPath: page.path,
        pageTitle: page.title,
        referrerDomain: referrerDomain || undefined,
        eventType: 1,
        createdAt: new Date(createdAt.getTime() + index * 30_000),
        hostname: website?.domain || 'example.com',
      },
    });
  }

  return pageviewCount;
}

export async function generateBatchFakeVisits(websiteId: string, count: number) {
  if (count <= 0) {
    return { visits: 0, pageviews: 0 };
  }

  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new Error(`Website ${websiteId} not found`);
  }

  let pageviews = 0;

  for (let index = 0; index < count; index++) {
    pageviews += await generateFakeVisit(websiteId, website);
  }

  return { visits: count, pageviews };
}

export async function runFakeVisitGenerator() {
  const configs = await prisma.client.dataAmplifierConfig.findMany({
    where: {
      enabled: true,
      generateFakeVisits: true,
    },
  });

  if (configs.length === 0) {
    console.log('[Data Amplifier] No websites enabled for fake visits.');
    return;
  }

  for (const config of configs) {
    const visitsToGenerate = getVisitsForTick(config.fakeVisitsPerHour);

    if (visitsToGenerate <= 0) {
      console.log(
        `[Data Amplifier] Skipped ${config.websiteId}; fake visits per hour is ${config.fakeVisitsPerHour}.`,
      );
      continue;
    }

    const result = await generateBatchFakeVisits(config.websiteId, visitsToGenerate);

    console.log(
      `[Data Amplifier] Generated ${result.visits} visits and ${result.pageviews} pageviews for ${config.websiteId}`,
    );
  }
}
