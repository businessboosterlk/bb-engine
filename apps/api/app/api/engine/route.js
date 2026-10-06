/* GET /api/engine: the TEAM document, for the day the Engine has a Node host. The caller sends the team
   passcode in X-Engine-Pass; it is compared in constant time with ENGINE_PASS. Serves the document the
   last build wrote to engine/local; a hosted build runs build-engine-data.mjs on a timer. */
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
export const dynamic = 'force-dynamic';
export function sameSecret(got, want){ if (!want || !got || got.length !== want.length) return false; return timingSafeEqual(Buffer.from(got), Buffer.from(want)); }
export function readDoc(name){ return JSON.parse(readFileSync(path.join(process.cwd(), '..', '..', 'engine', 'local', name), 'utf8')); }
export async function GET(req){
  if (!sameSecret(req.headers.get('x-engine-pass') || '', process.env.ENGINE_PASS)) return Response.json({ error: 'The team passcode is needed' }, { status: 401 });
  try { return Response.json(readDoc('engine.json')); } catch { return Response.json({ error: 'No document built yet' }, { status: 503 }); }
}
