/* GET /api/engine/owner: the OWNER document, under the owner's phrase in X-Engine-Owner. */
import { sameSecret, readDoc } from '../route.js';
export const dynamic = 'force-dynamic';
export async function GET(req){
  if (!sameSecret(req.headers.get('x-engine-owner') || '', process.env.ENGINE_OWNER_PASS)) return Response.json({ error: "The owner's phrase is needed" }, { status: 401 });
  try { return Response.json(readDoc('owner.json')); } catch { return Response.json({ error: 'No document built yet' }, { status: 503 }); }
}
