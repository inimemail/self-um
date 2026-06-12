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
const FUNCTION_NAME = 'getAmplifierConfig';

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
  'uniqueEvents',
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

  const rows = await prisma.rawQuery(
    `
    select
      enabled,
      amplify_multiplier as "amplifyMultiplier",
      generate_fake_visits as "generateFakeVisits",
      fake_visits_per_hour as "fakeVisitsPerHour",
      amplify_pageviews as "amplifyPageviews",
      amplify_events as "amplifyEvents",
      amplify_active_users as "amplifyActiveUsers"
    from data_amplifier_config
    where website_id = {{websiteId::uuid}}
    limit 1
    `,
    { websiteId },
    FUNCTION_NAME,
  );

  const config = rows?.[0];

  const value = config ? normalizeAmplifierConfig(config) : null;

  configCache.set(websiteId, { value, expiresAt: Date.now() + CACHE_TTL });

  return value;
}

function normalizeAmplifierConfig(config: any): AmplifierConfig {
  return {
    enabled: config.enabled === true,
    amplifyMultiplier: Number(config.amplifyMultiplier) || DEFAULT_AMPLIFIER_CONFIG.amplifyMultiplier,
    generateFakeVisits: config.generateFakeVisits === true,
    fakeVisitsPerHour: Number(config.fakeVisitsPerHour) || DEFAULT_AMPLIFIER_CONFIG.fakeVisitsPerHour,
    trafficTemplate: 'general',
    amplifyPageviews: config.amplifyPageviews !== false,
    amplifyEvents: config.amplifyEvents !== false,
    amplifyActiveUsers: config.amplifyActiveUsers !== false,
  };
}

export function clearAmplifierCache(websiteId: string) {
  configCache.delete(websiteId);
}

function toFiniteNumber(value: any): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value && typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      const numberValue = value.toNumber();
      return Number.isFinite(numberValue) ? numberValue : null;
    }

    if (typeof value.toString === 'function') {
      const numberValue = Number(value.toString());
      return Number.isFinite(numberValue) ? numberValue : null;
    }
  }

  return null;
}

export function amplifyValue(value: any, multiplier: number): any {
  const numberValue = toFiniteNumber(value);

  if (numberValue === null || numberValue === 0) {
    return value;
  }

  return Math.max(0, Math.round(numberValue * multiplier));
}

export function amplifyDataRecursive(
  data: any,
  multiplier: number,
  fieldsToAmplify: Set<string> = DEFAULT_AMPLIFIED_FIELDS,
): any {
  if (typeof data === 'number' || typeof data === 'bigint') {
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
      if (fieldsToAmplify.has(key) && toFiniteNumber(value) !== null) {
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
      toFiniteNumber(value) !== null ? amplifyValue(value, multiplier) : value,
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
