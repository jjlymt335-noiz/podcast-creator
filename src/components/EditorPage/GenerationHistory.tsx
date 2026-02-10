import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/store';
import type { GenerationRecord } from '@/types/project';

interface GenerationHistoryProps {
  open: boolean;
  onClose: () => void;
}

export function GenerationHistory({ open, onClose }: GenerationHistoryProps) {
  const currentProject = useProjectStore((state) => state.currentProject);
  const exportAudio = useProjectStore((state) => state.exportAudio);
  const showToast = useUIStore((state) => state.showToast);

  if (!open || !currentProject) return null;

  const history = currentProject.generation_history || [];

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = async (record: GenerationRecord) => {
    try {
      const audioUrl = await exportAudio();
      if (audioUrl) {
        showToast('Download started', 'success');
      } else {
        showToast('No audio available for this record', 'warning');
      }
    } catch {
      showToast('Download failed', 'error');
    }
  };

  const handleShare = (record: GenerationRecord) => {
    // Copy share link or show share dialog
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}?project=${currentProject.id}&gen=${record.id}`);
      showToast('Share link copied to clipboard', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-800">Generation History</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No generation records yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Generate All" to create your first podcast</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((record, idx) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-gray-200 p-4 hover:border-orange-200 hover:shadow-sm transition-all"
                >
                  {/* Top row: status + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {record.status === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        record.status === 'completed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {record.status === 'completed' ? 'Completed' : 'Failed'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                  </div>

                  {/* Info */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {record.title || 'Untitled Podcast'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {record.segment_count} segments
                    </p>
                  </div>

                  {/* Action buttons */}
                  {record.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleDownload(record)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleShare(record)}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
