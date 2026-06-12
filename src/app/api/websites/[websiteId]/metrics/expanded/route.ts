import { z } from 'zod';
import { EVENT_COLUMNS, EVENT_TYPE, SESSION_COLUMNS } from '@/lib/constants';
import { applyAmplifier } from '@/lib/data-amplifier';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { filterParams, searchParams, withDateRange } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import {
  getChannelExpandedMetrics,
  getEventExpandedMetrics,
  getPageviewExpandedMetrics,
  getSessionExpandedMetrics,
} from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = withDateRange({
    type: z.string(),
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
    ...searchParams,
    ...filterParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const { type, limit, offset, search } = query;
  const filters = await getQueryFilters(query, websiteId);

  if (search) {
    filters[type] = `c.${search}`;
  }

  if (SESSION_COLUMNS.includes(type)) {
    const data = await getSessionExpandedMetrics(websiteId, { type, limit, offset }, filters);
    const amplifiedData = await applyAmplifier(websiteId, data, 'metrics');

    return json(amplifiedData);
  }

  if (EVENT_COLUMNS.includes(type)) {
    if (type === 'event') {
      filters.eventType = EVENT_TYPE.customEvent;
      const data = await getEventExpandedMetrics(websiteId, { type, limit, offset }, filters);
      const amplifiedData = await applyAmplifier(websiteId, data, 'events');
      return json(amplifiedData);
    } else {
      const data = await getPageviewExpandedMetrics(websiteId, { type, limit, offset }, filters);
      const amplifiedData = await applyAmplifier(websiteId, data, 'pageviews');
      return json(amplifiedData);
    }
  }

  if (type === 'channel') {
    const data = await getChannelExpandedMetrics(websiteId, filters);
    const amplifiedData = await applyAmplifier(websiteId, data, 'metrics');
    return json(amplifiedData);
  }

  return badRequest();
}
