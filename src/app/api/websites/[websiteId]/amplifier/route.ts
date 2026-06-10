import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { clearAmplifierCache, DEFAULT_AMPLIFIER_CONFIG } from '@/lib/data-amplifier';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canUpdateWebsite } from '@/permissions';

const amplifierSchema = z.object({
  enabled: z.boolean().optional(),
  amplifyMultiplier: z.number().min(1).max(100).optional(),
  generateFakeVisits: z.boolean().optional(),
  fakeVisitsPerHour: z.number().int().min(0).max(1000).optional(),
  amplifyPageviews: z.boolean().optional(),
  amplifyEvents: z.boolean().optional(),
  amplifyActiveUsers: z.boolean().optional(),
});

function serializeConfig(config: any) {
  if (!config) {
    return DEFAULT_AMPLIFIER_CONFIG;
  }

  return {
    enabled: config.enabled,
    amplifyMultiplier: Number(config.amplifyMultiplier),
    generateFakeVisits: config.generateFakeVisits,
    fakeVisitsPerHour: config.fakeVisitsPerHour,
    amplifyPageviews: config.amplifyPageviews,
    amplifyEvents: config.amplifyEvents,
    amplifyActiveUsers: config.amplifyActiveUsers,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const config = await prisma.client.dataAmplifierConfig.findUnique({
    where: { websiteId },
  });

  return json(serializeConfig(config));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, amplifierSchema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const config = await prisma.client.dataAmplifierConfig.upsert({
    where: { websiteId },
    create: {
      id: uuid(),
      websiteId,
      enabled: body.enabled ?? DEFAULT_AMPLIFIER_CONFIG.enabled,
      amplifyMultiplier: body.amplifyMultiplier ?? DEFAULT_AMPLIFIER_CONFIG.amplifyMultiplier,
      generateFakeVisits: body.generateFakeVisits ?? DEFAULT_AMPLIFIER_CONFIG.generateFakeVisits,
      fakeVisitsPerHour: body.fakeVisitsPerHour ?? DEFAULT_AMPLIFIER_CONFIG.fakeVisitsPerHour,
      amplifyPageviews: body.amplifyPageviews ?? DEFAULT_AMPLIFIER_CONFIG.amplifyPageviews,
      amplifyEvents: body.amplifyEvents ?? DEFAULT_AMPLIFIER_CONFIG.amplifyEvents,
      amplifyActiveUsers: body.amplifyActiveUsers ?? DEFAULT_AMPLIFIER_CONFIG.amplifyActiveUsers,
    },
    update: {
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.amplifyMultiplier !== undefined && {
        amplifyMultiplier: body.amplifyMultiplier,
      }),
      ...(body.generateFakeVisits !== undefined && {
        generateFakeVisits: body.generateFakeVisits,
      }),
      ...(body.fakeVisitsPerHour !== undefined && {
        fakeVisitsPerHour: body.fakeVisitsPerHour,
      }),
      ...(body.amplifyPageviews !== undefined && {
        amplifyPageviews: body.amplifyPageviews,
      }),
      ...(body.amplifyEvents !== undefined && { amplifyEvents: body.amplifyEvents }),
      ...(body.amplifyActiveUsers !== undefined && {
        amplifyActiveUsers: body.amplifyActiveUsers,
      }),
    },
  });

  clearAmplifierCache(websiteId);

  return json(serializeConfig(config));
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  await prisma.client.dataAmplifierConfig.deleteMany({
    where: { websiteId },
  });

  clearAmplifierCache(websiteId);

  return json(DEFAULT_AMPLIFIER_CONFIG);
}
