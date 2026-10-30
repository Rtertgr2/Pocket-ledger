/**
 * Pocket Ledger update feed.
 *
 * Serves two things from one R2 bucket:
 *   GET /latest.json              → the release manifest the app reads
 *   GET /pocket-ledger-<v>.apk    → the signed APK
 *
 * and accepts uploads behind a bearer token so a release can be published from a laptop:
 *   curl -X PUT --data-binary @pocket-ledger-1.9.0.apk \
 *        -H "Authorization: Bearer $UPLOAD_TOKEN" \
 *        https://<site>/admin/pocket-ledger-1.9.0.apk
 *
 * The upload route is the only writable surface. It requires the UPLOAD_TOKEN secret, which is
 * never in this file, and it is the reason downloads can stay fully public without any account.
 */

const MAX_UPLOAD_BYTES = 60 * 1024 * 1024; // headroom under the 100MB Worker request limit

function contentTypeFor(key) {
  if (key.endsWith('.json')) return 'application/json; charset=utf-8';
  if (key.endsWith('.apk')) return 'application/vnd.android.package-archive';
  if (key.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function notFound() {
  return new Response(JSON.stringify({ status: 'error', message: 'not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    if (request.method === 'PUT') {
      // Only the /admin/ namespace is writable, and the key never contains a slash.
      const key = path.startsWith('admin/') ? path.slice('admin/'.length) : '';
      if (!env.UPLOAD_TOKEN) {
        return new Response(JSON.stringify({ status: 'error', message: 'upload disabled' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (request.headers.get('authorization') !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response(JSON.stringify({ status: 'error', message: 'forbidden' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (!key || !/^[A-Za-z0-9._-]+$/.test(key)) {
        return new Response(JSON.stringify({ status: 'error', message: 'bad key' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      const declared = Number(request.headers.get('content-length') ?? '0');
      if (declared > MAX_UPLOAD_BYTES) {
        return new Response(JSON.stringify({ status: 'error', message: 'file too large' }), {
          status: 413,
          headers: { 'content-type': 'application/json' },
        });
      }

      await env.FILES.put(key, request.body, {
        httpMetadata: { contentType: contentTypeFor(key) },
      });
      const stored = await env.FILES.head(key);
      return Response.json({ status: 'success', key, bytes: stored?.size ?? null });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(JSON.stringify({ status: 'error', message: 'method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json', allow: 'GET, HEAD, PUT' },
      });
    }

    const key = path === '' ? 'latest.json' : path;
    const object = await env.FILES.get(key);
    if (!object) return notFound();

    const headers = new Headers();
    headers.set('content-type', object.httpMetadata?.contentType ?? contentTypeFor(key));
    headers.set('etag', object.httpEtag);
    headers.set('content-length', String(object.size));
    // The manifest must never be cached: a stale manifest is a missed update.
    headers.set(
      'cache-control',
      key === 'latest.json' ? 'no-store' : 'public, max-age=60, must-revalidate'
    );
    headers.set('access-control-allow-origin', '*');

    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
