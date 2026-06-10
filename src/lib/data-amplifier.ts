import prisma from '@/lib/prisma';

export interface AmplifierConfig {
  enabled: boolean;
  amplifyMultiplier: number;
  generateFakeVisits: boolean;
  fakeVisitsPerHour: number;
  amplifyPageviews: boolean;
  amplifyEvents: boolean;
  amplifyActiveUsers: boolean;
}

export type AmplifierDataType = 'active' | 'events' | 'metrics' | 'pageviews' | 'stats';

const CACHE_TTL = 60 * 1000;
const configCache = new Map<string, { expiresAt: number; value: AmplifierConfig | null }>();

export const DEFAULT_AMPLIFIER_CONFIG: AmplifierConfig = {
  enabled: false,
  amplifyMultiplier: 10,
  generateFakeVisits: false,
  fakeVisitsPerHour: 50,
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
