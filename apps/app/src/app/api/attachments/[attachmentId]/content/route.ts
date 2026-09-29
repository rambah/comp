import { serverApi } from '@/lib/api-server';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** Proxy only an attachment authorized by the API, never a caller-supplied URL. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await context.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(attachmentId)) {
    return Response.json({ error: 'Invalid attachment' }, { status: 400, headers: privateHeaders });
  }
  const result = await serverApi.get<{ downloadUrl: string }>(
    `/v1/attachments/${attachmentId}/download`,
  );
  if (result.error || !result.data?.downloadUrl) {
    const status = [400, 401, 403, 404].includes(result.status) ? result.status : 502;
    return Response.json({ error: 'Attachment unavailable' }, { status, headers: privateHeaders });
  }

  try {
    // Cookies stay with our API. They must never be forwarded to object storage.
    const upstream = await fetch(result.data.downloadUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: request.signal,
    });
    if (!upstream.ok || !upstream.body) throw new Error('Storage request failed');
    const download = request.nextUrl.searchParams.get('download') === '1';
    const name = (request.nextUrl.searchParams.get('name') || 'attachment')
      .replace(/[\u0000-\u001f\u007f/\\]/g, '_')
      .slice(0, 200);
    const headers = {
      ...privateHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, '%27')}`,
      'Content-Security-Policy': "default-src 'none'; sandbox",
    };
    if (download) return new Response(upstream.body, { headers });

    if (Number(upstream.headers.get('content-length')) > MAX_PREVIEW_BYTES) {
      await upstream.body.cancel();
      return Response.json(
        { error: 'This file is too large to preview. Please download it.' },
        { status: 413, headers: privateHeaders },
      );
    }
    // Enforce the bound even when storage does not send Content-Length.
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PREVIEW_BYTES) {
        await reader.cancel();
        return Response.json(
          { error: 'This file is too large to preview. Please download it.' },
          { status: 413, headers: privateHeaders },
        );
      }
      chunks.push(value);
    }
    return new Response(Buffer.concat(chunks), { headers });
  } catch {
    return Response.json(
      { error: 'Unable to load this attachment. Please try again.' },
      { status: 502, headers: privateHeaders },
    );
  }
}
