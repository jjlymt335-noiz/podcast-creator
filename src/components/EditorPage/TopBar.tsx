import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Download, Share2, Loader2, Wand2, Sparkles, History, Plus, Trash2, CheckSquare, X, AlertTriangle } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/store';
import * as api from '@/lib/api';
import { GenerationHistory } from './GenerationHistory';

export function TopBar() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProjectTitle = useProjectStore((state) => state.updateProjectTitle);
  const updateSegment = useProjectStore((state) => state.updateSegment);
  const generateAudio = useProjectStore((state) => state.generateAudio);
  const exportAudio = useProjectStore((state) => state.exportAudio);
  const deleteSegments = useProjectStore((state) => state.deleteSegments);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);
  const showToast = useUIStore((state) => state.showToast);
  const isSelectionMode = useUIStore((state) => state.isSelectionMode);
  const checkedSegmentIds = useUIStore((state) => state.checkedSegmentIds);
  const enterSelectionMode = useUIStore((state) => state.enterSelectionMode);
  const exitSelectionMode = useUIStore((state) => state.exitSelectionMode);
  const setAllSegmentsChecked = useUIStore((state) => state.setAllSegmentsChecked);
  const [isEmotionProcessing, setIsEmotionProcessing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Ctrl+H shortcut for history
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setHistoryOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleGenerate = async () => {
    try {
      showToast('Generating audio...', 'info');
      await generateAudio();
      showToast('Audio generated successfully! Click Export to download.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to generate audio', 'error');
    }
  };

  const handleBatchEmotion = async () => {
    if (!currentProject || currentProject.segments.length === 0) {
      showToast('No segments to process', 'warning');
      return;
    }

    setIsEmotionProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      showToast('Batch emotion recognition started...', 'info');

      for (const segment of currentProject.segments) {
        if (!segment.text.trim()) continue;
        if (/^\[.+[#:].+\]/.test(segment.text)) continue;

        try {
          const enhancedText = await api.emotionEnhance(segment.text);
          if (enhancedText && enhancedText !== segment.text) {
            updateSegment(segment.id, { text: enhancedText });
            successCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Emotion applied to ${successCount} segments${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
      } else if (failCount > 0) {
        showToast(`Emotion recognition failed for ${failCount} segments`, 'error');
      } else {
        showToast('All segments already have emotion tags', 'info');
      }
    } catch (error: any) {
      showToast(error?.message || 'Batch emotion failed', 'error');
    } finally {
      setIsEmotionProcessing(false);
    }
  };

  const handleExport = async () => {
    try {
      const audioUrl = await exportAudio();
      if (audioUrl) {
        showToast('Audio downloaded successfully', 'success');
      } else {
        showToast('Please generate audio first', 'info');
      }
    } catch (error) {
      showToast('Failed to export audio', 'error');
    }
  };

  const handleBack = () => {
    if (currentProject && (currentProject.segments.length > 0 || currentProject.source_text)) {
      setShowExitDialog(true);
      return;
    }
    setCurrentPage('entry');
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    setCurrentPage('entry');
  };

  const handleAddLine = () => {
    if (!currentProject || currentProject.speakers.length === 0) return;
    const lastSegment = currentProject.segments[currentProject.segments.length - 1];
    const speakerId = lastSegment?.speaker_id || currentProject.speakers[0].speaker_id;
    const addSegment = useProjectStore.getState().addSegment;
    addSegment(speakerId, lastSegment?.id);
  };

  if (!currentProject) return null;

  const isGenerating = currentProject.status === 'processing';
  const progress = currentProject.generation_progress || 0;
  const canGenerate = currentProject.segments.length > 0 && !isGenerating;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Generating progress bar - prominent centered banner */}
      {isGenerating && (
        <div className="bg-orange-50 border-b border-orange-100 py-2 flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-sm font-medium text-orange-700">Generating audio...</span>
          <div className="w-48 h-2 bg-orange-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-orange-700">{Math.round(progress)}%</span>
        </div>
      )}

      {/* Main toolbar */}
      <div className="relative py-2.5 px-4">
        {/* Back button - pinned left */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={handleBack}
          title="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Content aligned with editor */}
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-0 min-w-0">
            {/* Title area - same width as speaker column (w-44) in editor */}
            <div className="w-44 flex-shrink-0 pr-3">
              <Input
                value={currentProject.title}
                onChange={(e) => updateProjectTitle(e.target.value)}
                className="text-lg font-semibold border-0 focus-visible:ring-0 px-1 h-auto w-full"
                placeholder="Untitled Project"
              />
            </div>

            {isSelectionMode ? (
              /* Selection mode toolbar */
              <div className="flex items-center gap-1 ml-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm whitespace-nowrap text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    if (checkedSegmentIds.length === currentProject.segments.length) {
                      setAllSegmentsChecked([]);
                    } else {
                      setAllSegmentsChecked(currentProject.segments.map((s) => s.id));
                    }
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  {checkedSegmentIds.length === currentProject.segments.length ? 'Deselect All' : 'Select All'}
                </Button>

                {checkedSegmentIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-sm whitespace-nowrap text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const count = checkedSegmentIds.length;
                      deleteSegments(checkedSegmentIds);
                      exitSelectionMode();
                      showToast(`Deleted ${count} line${count > 1 ? 's' : ''}`, 'success');
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete {checkedSegmentIds.length}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm whitespace-nowrap text-gray-500 hover:text-gray-700"
                  onClick={exitSelectionMode}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              /* Normal mode toolbar */
              <div className="flex items-center gap-0.5 ml-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm whitespace-nowrap text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={handleBatchEmotion}
                  disabled={isEmotionProcessing || currentProject.segments.length === 0}
                  title="Auto-detect emotions for all segments"
                >
                  {isEmotionProcessing ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1.5" />
                  )}
                  {isEmotionProcessing ? 'Processing...' : 'Smart Emotions'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm whitespace-nowrap text-gray-500 hover:text-gray-700"
                  onClick={handleAddLine}
                  disabled={currentProject.speakers.length === 0}
                  title="Add a new line at the end"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Line
                </Button>

                {currentProject.segments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-sm whitespace-nowrap text-gray-500 hover:text-gray-700"
                    onClick={enterSelectionMode}
                    title="Select lines to delete"
                  >
                    <CheckSquare className="h-4 w-4 mr-1.5" />
                    Select
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm whitespace-nowrap text-gray-500 hover:text-orange-600 relative"
              onClick={() => setHistoryOpen(true)}
              title="Generation History (Ctrl+H)"
            >
              <History className="h-4 w-4 mr-1.5" />
              History
              {(currentProject.generation_history?.length || 0) > 0 && (
                <span className="ml-1 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {currentProject.generation_history!.length}
                </span>
              )}
            </Button>

            <div className="w-px h-5 bg-gray-200" />

            <Button
              size="sm"
              className="h-9 text-sm whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleGenerate}
              disabled={!canGenerate}
              title="Generate audio for all segments"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1.5" />
              )}
              Generate All
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm whitespace-nowrap"
              onClick={handleExport}
              disabled={currentProject.status !== 'completed'}
              title="Export the complete podcast audio"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>

            <Button variant="ghost" size="sm" className="h-9 text-sm whitespace-nowrap" title="Share this podcast">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Generation History Panel */}
      <GenerationHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Leave Editor?
            </DialogTitle>
            <DialogDescription>
              All content will be permanently lost once you leave. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowExitDialog(false)}>
              Stay
            </Button>
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleConfirmExit}
            >
              Leave & Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
