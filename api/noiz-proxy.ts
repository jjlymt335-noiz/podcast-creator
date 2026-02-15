import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as Readable) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function proxyRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
  timeout = 30000,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = transport.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
        }
        resolve({
          status: res.statusCode || 500,
          headers: responseHeaders,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (body && body.length > 0) {
      req.write(body);
    }
    req.end();
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const prefix = (req.query.prefix as string) || '';
  const apiPath = (req.query.apiPath as string) || '';

  // Build query string, excluding proxy-internal params
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'prefix' || key === 'apiPath') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => queryParams.append(key, v));
    } else if (value !== undefined) {
      queryParams.append(key, value);
    }
  }
  const qs = queryParams.toString();
  const queryString = qs ? '?' + qs : '';

  let targetUrl: string;
  let timeout = 30000;
  const headers: Record<string, string> = {};

  if (prefix === 'v2' || prefix === 'v1') {
    // Proxy to noiz.ai with cookie auth (using https module to preserve Cookie header)
    targetUrl = `https://noiz.ai/api/${prefix}/${apiPath}${queryString}`;
    const token = (process.env.VITE_ACCESS_TOKEN || '').trim();
    headers['Cookie'] = `access_token=${token}`;
  } else if (prefix === 'audiox') {
    // Proxy to AudioX server
    const audioXServerUrl = (process.env.AUDIOX_SERVER_URL || 'http://localhost:8000').trim();
    targetUrl = `${audioXServerUrl}/${apiPath}${queryString}`;
    timeout = 120000;
  } else {
    return res.status(404).json({ error: 'Unknown proxy prefix' });
  }

  // Forward content-type
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'] as string;
  }

  // Read body for non-GET requests
  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readBody(req);
    headers['Content-Length'] = String(body.length);
  }

  try {
    const response = await proxyRequest(targetUrl, req.method || 'GET', headers, body, timeout);

    const contentType = response.headers['content-type'] || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(response.body);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(502).json({ error: 'Proxy error', message: error?.message });
  }
}
