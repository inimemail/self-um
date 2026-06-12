import prisma from '@/lib/prisma';

export interface AmplifierConfig {
  enabled: boolean;
  amplifyMultiplier: number;
  generateFakeVisits: boolean;
  fakeVisitsPerHour: number;
  trafficTemplate: TrafficTemplate;
  amplifyPageviews: boolean;
  amplifyEvents: boolean;
  amplifyActiveUsers: boolean;
}

export type TrafficTemplate = 'blog' | 'forum' | 'general' | 'movie' | 'shop';

export type AmplifierDataType = 'active' | 'events' | 'metrics' | 'pageviews' | 'stats';

type NumericRecord = Record<string, number>;

const CACHE_TTL = 60 * 1000;
const configCache = new Map<string, { expiresAt: number; value: AmplifierConfig | null }>();

export const DEFAULT_AMPLIFIER_CONFIG: AmplifierConfig = {
  enabled: false,
  amplifyMultiplier: 10,
  generateFakeVisits: false,
  fakeVisitsPerHour: 50,
  trafficTemplate: 'general',
  amplifyPageviews: true,
  amplifyEvents: true,
  amplifyActiveUsers: true,
};

const DEFAULT_AMPLIFIED_FIELDS = new Set([
  'bounces',
  'count',
  'pageviews',
  'sessions',
  'total',
  'totaltime',
  'value',
  'views',
  'visitors',
  'visits',
  'x',
  'y',
]);

export async function getAmplifierConfig(websiteId: string): Promise<AmplifierConfig | null> {
  const cached = configCache.get(websiteId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const config = await prisma.client.dataAmplifierConfig.findUnique({
    where: { websiteId },
  });

  const value = config
    ? {
        enabled: config.enabled,
        amplifyMultiplier: Number(config.amplifyMultiplier),
        generateFakeVisits: config.generateFakeVisits,
        fakeVisitsPerHour: config.fakeVisitsPerHour,
        trafficTemplate: (config.trafficTemplate || 'general') as TrafficTemplate,
        amplifyPageviews: config.amplifyPageviews,
        amplifyEvents: config.amplifyEvents,
        amplifyActiveUsers: config.amplifyActiveUsers,
      }
    : null;

  configCache.set(websiteId, { value, expiresAt: Date.now() + CACHE_TTL });

  return value;
}

export function clearAmplifierCache(websiteId: string) {
  configCache.delete(websiteId);
}

export function amplifyValue(value: number, multiplier: number): number {
  if (!Number.isFinite(value) || value === 0) {
    return value;
  }

  return Math.max(0, Math.round(value * multiplier));
}

export function amplifyDataRecursive(
  data: any,
  multiplier: number,
  fieldsToAmplify: Set<string> = DEFAULT_AMPLIFIED_FIELDS,
): any {
  if (typeof data === 'number') {
    return amplifyValue(data, multiplier);
  }

  if (Array.isArray(data)) {
    return data.map(item => amplifyDataRecursive(item, multiplier, fieldsToAmplify));
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value === 'number' && fieldsToAmplify.has(key)) {
        return [key, amplifyValue(value, multiplier)];
      }

      if (value && typeof value === 'object') {
        return [key, amplifyDataRecursive(value, multiplier, fieldsToAmplify)];
      }

      return [key, value];
    }),
  );
}

function amplifyRecordValues(data: NumericRecord | null | undefined, multiplier: number) {
  if (!data) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'number' ? amplifyValue(value, multiplier) : value,
    ]),
  );
}

function canAmplify(config: AmplifierConfig, dataType: AmplifierDataType) {
  if (!config.enabled) {
    return false;
  }

  return (
    (dataType === 'active' && config.amplifyActiveUsers) ||
    (dataType === 'events' && config.amplifyEvents) ||
    (dataType === 'metrics' && config.amplifyPageviews) ||
    (dataType === 'pageviews' && config.amplifyPageviews) ||
    (dataType === 'stats' && config.amplifyPageviews)
  );
}

export async function applyAmplifier(
  websiteId: string,
  data: any,
  dataType: AmplifierDataType,
): Promise<any> {
  const config = await getAmplifierConfig(websiteId);

  if (!config || !canAmplify(config, dataType)) {
    return data;
  }

  return amplifyDataRecursive(data, config.amplifyMultiplier);
}

export async function applyRealtimeAmplifier(websiteId: string, data: any): Promise<any> {
  const config = await getAmplifierConfig(websiteId);

  if (!config || !config.enabled || !data) {
    return data;
  }

  const multiplier = config.amplifyMultiplier;

  return {
    ...data,
    countries: config.amplifyActiveUsers
      ? amplifyRecordValues(data.countries, multiplier)
      : data.countries,
    urls: config.amplifyPageviews ? amplifyRecordValues(data.urls, multiplier) : data.urls,
    referrers: config.amplifyPageviews
      ? amplifyRecordValues(data.referrers, multiplier)
      : data.referrers,
    series: {
      ...data.series,
      views: config.amplifyPageviews
        ? amplifyDataRecursive(data.series?.views, multiplier, new Set(['y']))
        : data.series?.views,
      visitors: config.amplifyActiveUsers
        ? amplifyDataRecursive(data.series?.visitors, multiplier, new Set(['y']))
        : data.series?.visitors,
    },
    totals: {
      ...data.totals,
      views: config.amplifyPageviews
        ? amplifyValue(data.totals?.views, multiplier)
        : data.totals?.views,
      visitors: config.amplifyActiveUsers
        ? amplifyValue(data.totals?.visitors, multiplier)
        : data.totals?.visitors,
      events: config.amplifyEvents
        ? amplifyValue(data.totals?.events, multiplier)
        : data.totals?.events,
    },
  };
}
