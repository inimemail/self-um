import { applyAmplifier } from '@/lib/data-amplifier';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getActiveVisitors } from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const visitors = await getActiveVisitors(websiteId);

  const amplifiedVisitors = await applyAmplifier(websiteId, visitors, 'active');

  return json(amplifiedVisitors);
}
