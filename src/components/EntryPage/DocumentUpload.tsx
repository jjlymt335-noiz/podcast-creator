import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseDocument, getSupportedFormats } from '@/lib/parsers';
import { useProjectStore } from '@/store';
import { cn } from '@/lib/utils';
import type { DocumentParseResult } from '@/types/project';

interface DocumentUploadProps {
  onUploadComplete?: (result: DocumentParseResult) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createProject = useProjectStore((state) => state.createProject);

  const handleFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);

      try {
        // 解析文档
        const result = await parseDocument(file);

        // 创建项目
        createProject(result);

        // 回调
        onUploadComplete?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse document';
        setError(message);
        console.error('Document parsing error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [createProject, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const supportedFormats = getSupportedFormats();

  return (
    <Card
      className={cn(
        'border-2 border-dashed rounded-xl transition-all',
        isDragging ? 'border-orange-400 bg-orange-50/80 shadow-md' : 'border-gray-200 bg-white/60',
        isProcessing && 'pointer-events-none opacity-60'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-5" />
            <p className="text-lg font-medium text-gray-900">Processing document...</p>
            <p className="text-base text-gray-400 mt-1">This may take a few moments</p>
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-orange-50 p-4 mb-5">
              {error ? (
                <FileText className="h-8 w-8 text-red-500" />
              ) : (
                <Upload className="h-8 w-8 text-orange-500" />
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? 'Upload Failed' : 'Upload a document'}
            </h3>

            {error ? (
              <div className="text-base text-red-600 mb-4">
                <p>{error}</p>
                <Button variant="outline" size="default" className="mt-4" onClick={() => setError(null)}>
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <p className="text-base text-gray-400 mb-6">
                  Drag and drop your file here, or click to browse
                </p>

                <input
                  id="file-upload"
                  type="file"
                  accept={supportedFormats.join(',')}
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isProcessing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button
                    variant="default"
                    size="lg"
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm text-base"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('file-upload')?.click();
                    }}
                  >
                    Choose File
                  </Button>
                </label>

                <p className="text-sm text-gray-400 mt-5">
                  Supported: {supportedFormats.join(', ')}
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
