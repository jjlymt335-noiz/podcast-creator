import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBody(req: VercelRequest): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as Readable) {
    chunks.push(Buffer.from(chunk));
  }
  const buf = Buffer.concat(chunks);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const pathSegments = req.query.path;
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '';
  const targetUrl = `https://noiz.ai/api/v2/${path}`;

  const headers: Record<string, string> = {
    'Cookie': `access_token=${process.env.VITE_ACCESS_TOKEN || ''}`,
  };

  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'] as string;
  }

  let body: Uint8Array | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readBody(req);
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers,
      body: body as any,
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuf = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(arrayBuf));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({ error: 'Proxy error' });
  }
}
