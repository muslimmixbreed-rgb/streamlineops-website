// Shared wrapper: parse JSON, call a handler with the Blobs store, return JSON.
import { getStore } from '@netlify/blobs';

export function jsonEndpoint(handler) {
  return async (req, context) => {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
    const store = getStore('analyser');
    const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
    const { status, body: out } = await handler({ body, store, ip });
    return Response.json(out, { status, headers: { 'Cache-Control': 'no-store' } });
  };
}
