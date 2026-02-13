import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Use Jina Reader API for clean text extraction
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      text,
      url,
      title: extractTitle(text),
    });
  } catch (error: any) {
    console.error('URL fetch error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message || 'Failed to fetch URL' });
  }
}

function extractTitle(text: string): string {
  // Jina Reader typically puts the title on the first line
  const firstLine = text.split('\n').find(line => line.trim().length > 0);
  if (firstLine && firstLine.length < 200) {
    return firstLine.replace(/^#+\s*/, '').trim();
  }
  return '';
}
