import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Loader2, Globe } from 'lucide-react';
import { useProjectStore } from '@/store';
import { cn } from '@/lib/utils';
import type { DocumentParseResult } from '@/types/project';

interface UrlImportProps {
  onImportComplete?: (result: DocumentParseResult) => void;
}

function detectLanguage(text: string): string {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const ratio = chineseChars.length / Math.max(text.length, 1);
  return ratio > 0.1 ? 'zh' : 'en';
}

export function UrlImport({ onImportComplete }: UrlImportProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createProject = useProjectStore((state) => state.createProject);

  const handleImport = async () => {
    if (!url.trim()) return;

    // Basic URL validation
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try serverless function first (production)
      let text: string;
      let title: string = '';

      try {
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        text = data.text;
        title = data.title || '';
      } catch {
        // Fallback: try Jina Reader directly (may work with CORS)
        const jinaResponse = await fetch(`https://r.jina.ai/${finalUrl}`, {
          headers: { 'Accept': 'text/plain' },
        });

        if (!jinaResponse.ok) {
          throw new Error('Failed to fetch URL content');
        }

        text = await jinaResponse.text();
        const firstLine = text.split('\n').find(l => l.trim().length > 0);
        if (firstLine && firstLine.length < 200) {
          title = firstLine.replace(/^#+\s*/, '').trim();
        }
      }

      if (!text || text.trim().length < 10) {
        throw new Error('No readable content found at this URL');
      }

      const language = detectLanguage(text);

      const result: DocumentParseResult = {
        text: text.trim(),
        language,
        format: 'html',
        title: title || new URL(finalUrl).hostname,
      };

      createProject(result);
      onImportComplete?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import URL';
      setError(message);
      console.error('URL import error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed rounded-xl border-gray-200 bg-white/60">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-2xl bg-orange-50 p-4 mb-5">
          <Globe className="h-8 w-8 text-orange-500" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">Import from URL</h3>
        <p className="text-base text-gray-400 mb-6">
          Paste a webpage URL to extract its content
        </p>

        <div className="w-full max-w-lg space-y-4">
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleImport()}
              placeholder="https://example.com/article"
              className={cn(
                'w-full pl-11 pr-4 py-3 border rounded-lg text-base',
                'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                'placeholder-gray-400 bg-gray-50/50',
                error ? 'border-red-300' : 'border-gray-200'
              )}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            onClick={handleImport}
            disabled={isLoading || !url.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Extracting content...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-5 w-5" />
                Import
              </>
            )}
          </Button>

          <p className="text-sm text-gray-400">
            Supports articles, blog posts, news pages, and more
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
