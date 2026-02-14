import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Play,
  Square,
  Sparkles,
  Loader2,
  ChevronUp,
  Undo,
  Redo,
  Smile,
  Download,
  Trash2,
  Music,
  Volume2,
  GripVertical,
} from 'lucide-react';
import { useProjectStore, useUIStore } from '@/store';
import * as api from '@/lib/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { VoiceDesignModal } from '@/components/VoiceLibrary/VoiceDesignModal';
import { VoiceLibraryModal } from '@/components/VoiceLibrary/VoiceLibraryModal';

// Undo/Redo history per segment
interface HistoryEntry {
  past: string[];
  future: string[];
}

// 情绪标签定义（与Noiz一致）
const EMOTION_TAGS = [
  { emoji: '😃', label: '快乐', value: 'happy' },
  { emoji: '😡', label: '愤怒', value: 'angry' },
  { emoji: '😔', label: '悲伤', value: 'sad' },
  { emoji: '😨', label: '恐惧', value: 'fearful' },
  { emoji: '😲', label: '惊讶', value: 'surprised' },
  { emoji: '😑', label: '平静', value: 'calm' },
  { label: '愉悦的', value: 'pleasant' },
  { label: '兴奋的', value: 'excited' },
  { label: '得意的', value: 'proud' },
  { label: '感激的', value: 'grateful' },
  { label: '有同理心的', value: 'empathetic' },
  { label: '夸张的', value: 'exaggerated' },
];

// Speaker color palette - vivid Noiz-style
const SPEAKER_COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const SPEAKER_BG_COLORS = ['#EEF2FF', '#ECFEFF', '#FFFBEB', '#FEF2F2', '#F5F3FF', '#FDF2F8'];

export function TextEditor() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateSourceText = useProjectStore((state) => state.updateSourceText);
  const updateSegment = useProjectStore((state) => state.updateSegment);
  const splitSegment = useProjectStore((state) => state.splitSegment);
  const addSegment = useProjectStore((state) => state.addSegment);
  const addSpeaker = useProjectStore((state) => state.addSpeaker);
  const assignVoiceToSpeaker = useProjectStore((state) => state.assignVoiceToSpeaker);
  const addEmotionTag = useProjectStore((state) => state.addEmotionTag);
  const deleteSegments = useProjectStore((state) => state.deleteSegments);
  const showToast = useUIStore((state) => state.showToast);
  const insertSfxSegment = useProjectStore((state) => state.insertSfxSegment);
  const removeSfxSegment = useProjectStore((state) => state.removeSfxSegment);
  const updateSfxSegment = useProjectStore((state) => state.updateSfxSegment);
  const generateSfxAudio = useProjectStore((state) => state.generateSfxAudio);
  const sfxAudioBlobs = useProjectStore((state) => state.sfxAudioBlobs);
  const reorderSegments = useProjectStore((state) => state.reorderSegments);
  const reorderZoneSfx = useProjectStore((state) => state.reorderZoneSfx);
  const isSelectionMode = useUIStore((state) => state.isSelectionMode);
  const checkedSegmentIds = useUIStore((state) => state.checkedSegmentIds);
  const toggleSegmentChecked = useUIStore((state) => state.toggleSegmentChecked);

  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [loadingSegmentId, setLoadingSegmentId] = useState<string | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState<{ [key: string]: boolean }>({});
  const [emotionPopoverOpen, setEmotionPopoverOpen] = useState<string | null>(null);
  const [voiceDesignOpen, setVoiceDesignOpen] = useState(false);
  const [voiceLibraryOpen, setVoiceLibraryOpen] = useState(false);
  const [selectedSegmentForVoice, setSelectedSegmentForVoice] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ [key: string]: number }>({});
  const [smartEmotionLoading, setSmartEmotionLoading] = useState<string | null>(null);
  const [gapPopoverOpen, setGapPopoverOpen] = useState<string | null>(null);
  const [customGapInput, setCustomGapInput] = useState('');
  const [downloadingSegmentId, setDownloadingSegmentId] = useState<string | null>(null);
  const [focusSegmentId, setFocusSegmentId] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Zone ordering: tracks item order (gap + SFX) within transition zones between speeches
  const [zoneOrders, setZoneOrders] = useState<Record<string, string[]>>({});
  const [zoneDragState, setZoneDragState] = useState<{
    zoneId: string;
    dragItemId: string;
    overItemId: string | null;
  } | null>(null);
  const [newLineSegmentId, setNewLineSegmentId] = useState<string | null>(null);

  // Auto-initialize: when segments are empty, create a default speaker + first segment
  // so the user can directly write in the line-by-line editor
  useEffect(() => {
    if (!currentProject) return;
    if (currentProject.segments.length > 0) return;

    // Create a default speaker if none exists
    let speakerId: string;
    if (currentProject.speakers.length === 0) {
      speakerId = addSpeaker('Speaker 1');
    } else {
      speakerId = currentProject.speakers[0].speaker_id;
    }

    // Create the first segment from source_text or empty
    const text = currentProject.source_text || '';
    const newId = addSegment(speakerId);
    if (text && newId) {
      updateSegment(newId, { text });
    }
    if (newId) {
      setFocusSegmentId(newId);
    }
  }, [currentProject?.id]); // only run when project changes

  const speakerIndex = (speakerId: string) =>
    currentProject?.speakers.findIndex((s) => s.speaker_id === speakerId) ?? 0;
  const speakerColor = (speakerId: string) =>
    SPEAKER_COLORS[speakerIndex(speakerId) % SPEAKER_COLORS.length];
  const speakerBgColor = (speakerId: string) =>
    SPEAKER_BG_COLORS[speakerIndex(speakerId) % SPEAKER_BG_COLORS.length];

  // 当前播放的 Audio 对象引用（用于停止播放）
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Undo/Redo history tracking
  const historyRef = useRef<{ [segmentId: string]: HistoryEntry }>({});

  const getHistory = (segmentId: string): HistoryEntry => {
    if (!historyRef.current[segmentId]) {
      historyRef.current[segmentId] = { past: [], future: [] };
    }
    return historyRef.current[segmentId];
  };

  const pushHistory = (segmentId: string, text: string) => {
    const history = getHistory(segmentId);
    history.past.push(text);
    // 新编辑时清空redo栈
    history.future = [];
    // 限制历史记录大小
    if (history.past.length > 50) {
      history.past.shift();
    }
  };

  const handleUndo = (segmentId: string) => {
    const segment = currentProject?.segments.find((s) => s.id === segmentId);
    if (!segment) return;

    const history = getHistory(segmentId);
    if (history.past.length === 0) {
      showToast('Nothing to undo', 'info');
      return;
    }

    // 当前文本推入future
    history.future.push(segment.text);
    // 从past弹出上一个版本
    const previousText = history.past.pop()!;
    updateSegment(segmentId, { text: previousText });
  };

  const handleRedo = (segmentId: string) => {
    const segment = currentProject?.segments.find((s) => s.id === segmentId);
    if (!segment) return;

    const history = getHistory(segmentId);
    if (history.future.length === 0) {
      showToast('Nothing to redo', 'info');
      return;
    }

    // 当前文本推入past
    history.past.push(segment.text);
    // 从future弹出
    const nextText = history.future.pop()!;
    updateSegment(segmentId, { text: nextText });
  };

  const handleChangeSpeaker = (segmentId: string, newSpeakerId: string) => {
    const newSpeaker = currentProject?.speakers.find((s) => s.speaker_id === newSpeakerId);
    if (!newSpeaker) return;

    updateSegment(segmentId, {
      speaker_id: newSpeakerId,
      voice_id: newSpeaker.voice_id,
    });

    showToast(`Changed speaker to ${newSpeaker.speaker_name}`, 'success');
  };

  const handlePreview = async (segmentId: string, text: string, voiceId: string | null) => {
    if (!text) {
      showToast('No text to preview', 'warning');
      return;
    }

    if (!voiceId) {
      showToast('Please assign a voice first', 'warning');
      return;
    }

    // 停止当前播放
    if (playingSegmentId === segmentId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingSegmentId(null);
      return;
    }

    // 如果有其他音频在播放，先停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setLoadingSegmentId(segmentId);

    try {
      const audioBlob = await api.textToSpeech({
        text,
        voice_id: voiceId,
        output_format: 'mp3',
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayingSegmentId(segmentId);

      audio.onended = () => {
        setPlayingSegmentId(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        showToast('Failed to play audio', 'error');
        setPlayingSegmentId(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error: any) {
      console.error('Preview failed:', error);
      const errorMsg = error?.response?.status === 404
        ? 'API endpoint not found. Please configure VITE_API_BASE_URL in .env file'
        : error?.message?.includes('Network')
        ? 'Cannot connect to API server. Please check your API configuration in .env file'
        : 'Preview failed. Check console for details.';
      showToast(errorMsg, 'error');
    } finally {
      setLoadingSegmentId(null);
    }
  };

  const handleAddPause = (segmentId: string) => {
    const segment = currentProject?.segments.find((s) => s.id === segmentId);
    if (!segment) return;

    const position = cursorPosition[segmentId] || 0;
    const pauseTag = '[pause:0.35]';

    // 保存历史以支持撤回
    pushHistory(segmentId, segment.text);

    // 在光标位置插入停顿标签（不分割段落）
    const newText =
      segment.text.slice(0, position) + pauseTag + segment.text.slice(position);
    updateSegment(segmentId, { text: newText });
    showToast('Added 0.35s pause', 'success');
  };

  const handleAddEmotion = (segmentId: string, emotionValue: string, emotionLabel: string) => {
    const position = cursorPosition[segmentId] || 0;
    if (addEmotionTag) {
      addEmotionTag(segmentId, position, emotionValue);
      showToast(`Added emotion: ${emotionLabel}`, 'success');
      setEmotionPopoverOpen(null);
    }
  };

  const handleSmartEmotion = async (segmentId: string, text: string, voiceId: string | null) => {
    if (!text.trim()) {
      showToast('No text to analyze', 'warning');
      return;
    }

    setSmartEmotionLoading(segmentId);

    try {
      showToast('Analyzing emotion...', 'info');

      // 调用 POST /api/v2/emotion-enhance
      const enhancedText = await api.emotionEnhance(text);

      console.log('Emotion enhance response:', enhancedText);

      if (enhancedText && enhancedText !== text) {
        // 保存历史以支持撤回
        pushHistory(segmentId, text);
        // 更新segment文本为带情绪标签的版本
        updateSegment(segmentId, { text: enhancedText });
        showToast('Smart emotion applied', 'success');
      } else {
        showToast('No emotion enhancement needed', 'info');
      }
    } catch (error: any) {
      console.error('Smart emotion failed:', error);
      // client.ts 拦截器 reject 的是 response.data 而非原始 AxiosError
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      showToast(`Emotion analysis failed: ${msg}`, 'error');
    } finally {
      setSmartEmotionLoading(null);
    }
  };

  const handleDownloadSegment = async (segmentId: string, text: string, voiceId: string | null, speakerName: string, idx: number) => {
    if (!text) {
      showToast('No text to download', 'warning');
      return;
    }
    if (!voiceId) {
      showToast('Please assign a voice first', 'warning');
      return;
    }

    setDownloadingSegmentId(segmentId);
    try {
      const audioBlob = await api.textToSpeech({
        text,
        voice_id: voiceId,
        output_format: 'mp3',
      });

      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `segment-${idx + 1}-${speakerName}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started', 'success');
    } catch (error: any) {
      console.error('Download failed:', error);
      showToast('Download failed. Check console for details.', 'error');
    } finally {
      setDownloadingSegmentId(null);
    }
  };

  // 设置说话人切换间隔
  const handleSetSpeakerGap = (segmentId: string, gap: number) => {
    updateSegment(segmentId, { speaker_gap: gap });
    setGapPopoverOpen(null);
    setCustomGapInput('');
    showToast(`Speaker gap set to ${gap}s`, 'success');
  };

  // 打开 Voice Library modal（从 segment 的音色名点击触发）
  const handleOpenVoiceSelector = (segmentId: string) => {
    setSelectedSegmentForVoice(segmentId);
    setVoiceLibraryOpen(true);
  };

  // 从 Voice Library 选择了音色
  const handleSelectVoice = (voiceId: string, voiceName: string) => {
    if (!selectedSegmentForVoice) return;

    const segment = currentProject?.segments.find((s) => s.id === selectedSegmentForVoice);
    if (!segment) return;

    // 为该speaker的所有segments分配voice
    assignVoiceToSpeaker(segment.speaker_id, voiceId, voiceName);
    showToast(`Voice "${voiceName}" assigned to ${currentProject?.speakers.find(s => s.speaker_id === segment.speaker_id)?.speaker_name}`, 'success');
  };

  // 打开 Voice Design modal
  const handleOpenVoiceDesign = (segmentId: string) => {
    setSelectedSegmentForVoice(segmentId);
    setVoiceDesignOpen(true);
  };

  // 从 Voice Design 保存了音色
  const handleSaveVoiceDesign = (voiceId: string, voiceName: string) => {
    if (!selectedSegmentForVoice) return;

    const segment = currentProject?.segments.find((s) => s.id === selectedSegmentForVoice);
    if (!segment) return;

    assignVoiceToSpeaker(segment.speaker_id, voiceId, voiceName);
    showToast(`Voice "${voiceName}" created and assigned successfully!`, 'success');
  };

  // ── SFX handlers ──────────────────────────────────────────

  const handlePreviewSfx = async (segmentId: string) => {
    // 停止当前播放
    if (playingSegmentId === segmentId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingSegmentId(null);
      return;
    }

    const blob = sfxAudioBlobs[segmentId];
    if (!blob) {
      showToast('Please generate the sound first', 'warning');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingSegmentId(segmentId);

    audio.onended = () => {
      setPlayingSegmentId(null);
      audioRef.current = null;
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      showToast('Failed to play audio', 'error');
      setPlayingSegmentId(null);
      audioRef.current = null;
      URL.revokeObjectURL(audioUrl);
    };
    await audio.play();
  };

  const handleGenerateSfx = async (segmentId: string) => {
    setLoadingSegmentId(segmentId);
    try {
      await generateSfxAudio(segmentId);
      showToast('Sound effect generated!', 'success');
    } catch (error: any) {
      const errMsg = String(error?.message || error || '');
      const isNetwork = errMsg.includes('connect') || errMsg.includes('Network') || errMsg.includes('502') || errMsg.includes('unavailable');
      const msg = isNetwork
        ? 'AudioX 服务未连接，请先启动 api_server.py（需要 GPU 环境）'
        : `音效生成失败: ${errMsg}`;
      showToast(msg, 'error');
    } finally {
      setLoadingSegmentId(null);
    }
  };

  // ── Drag & drop handlers ─────────────────────────────────

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragFromIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIdx) && fromIdx !== toIdx) {
      reorderSegments(fromIdx, toIdx);
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  // ── Zone drag & drop (transition zone items: gap + SFX) ──

  const getZoneItems = (speechId: string, sfxSegments: { id: string }[]): string[] => {
    const sfxIds = sfxSegments.map(s => s.id);
    const stored = zoneOrders[speechId];
    if (stored) {
      const currentIds = new Set(sfxIds);
      const valid = stored.filter(id => id === 'gap' || currentIds.has(id));
      const inValid = new Set(valid);
      for (const id of sfxIds) {
        if (!inValid.has(id)) valid.push(id);
      }
      if (!inValid.has('gap')) valid.unshift('gap');
      return valid;
    }
    return ['gap', ...sfxIds];
  };

  const handleZoneDragStart = (e: React.DragEvent, zoneId: string, itemId: string) => {
    e.stopPropagation();
    setZoneDragState({ zoneId, dragItemId: itemId, overItemId: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/zone-item', itemId);
  };

  const handleZoneDragOver = (e: React.DragEvent, zoneId: string, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (zoneDragState?.zoneId === zoneId && zoneDragState.dragItemId !== itemId) {
      setZoneDragState(prev => prev ? { ...prev, overItemId: itemId } : null);
    }
  };

  const handleZoneDrop = (e: React.DragEvent, zoneId: string, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!zoneDragState || zoneDragState.zoneId !== zoneId) return;
    const { dragItemId } = zoneDragState;
    if (dragItemId === targetItemId) { setZoneDragState(null); return; }

    const speechIdx = currentProject!.segments.findIndex(s => s.id === zoneId);
    if (speechIdx === -1) { setZoneDragState(null); return; }
    const sfxSegs: { id: string }[] = [];
    for (let i = speechIdx - 1; i >= 0; i--) {
      if ((currentProject!.segments[i].type || 'speech') === 'sfx') {
        sfxSegs.unshift(currentProject!.segments[i]);
      } else break;
    }

    const currentOrder = getZoneItems(zoneId, sfxSegs);
    const fromIdx = currentOrder.indexOf(dragItemId);
    const toIdx = currentOrder.indexOf(targetItemId);
    if (fromIdx === -1 || toIdx === -1) { setZoneDragState(null); return; }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItemId);

    setZoneOrders(prev => ({ ...prev, [zoneId]: newOrder }));
    const newSfxOrder = newOrder.filter(id => id !== 'gap');
    if (newSfxOrder.length > 0) {
      reorderZoneSfx(zoneId, newSfxOrder);
    }
    setZoneDragState(null);
  };

  const handleZoneDragEnd = () => {
    setZoneDragState(null);
  };

  if (!currentProject) return null;

  return (
    <div className="flex-1 bg-gray-50/60 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentProject.segments.length > 0 ? (
          <div className="space-y-0">
            {currentProject.segments.map((segment, idx) => {
              const segType = segment.type || 'speech';

              // SFX segments are rendered inside transition zones, skip in main loop
              if (segType === 'sfx') return null;

              const speaker = currentProject.speakers.find(
                (s) => s.speaker_id === segment.speaker_id
              );
              const showToolbar = toolbarVisible[segment.id];
              const gapValue = segment.speaker_gap ?? 0.6;

              // Collect SFX segments between previous speech and this speech
              const sfxSegments = currentProject.segments.slice(0, 0); // typed empty array
              for (let i = idx - 1; i >= 0; i--) {
                const s = currentProject.segments[i];
                if ((s.type || 'speech') === 'sfx') {
                  sfxSegments.unshift(s);
                } else break;
              }
              const hasPrevSpeech = idx - sfxSegments.length > 0;
              const zoneItems = hasPrevSpeech ? getZoneItems(segment.id, sfxSegments) : [];

              return (
                <React.Fragment key={segment.id}>

                  {/* ===== 过渡区域：可拖拽的 gap + SFX 卡片 ===== */}
                  {hasPrevSpeech && (
                    <div className="flex flex-col items-center py-1.5 gap-1">
                      {zoneItems.map((itemId) => {
                        const isDragging = zoneDragState?.zoneId === segment.id && zoneDragState?.dragItemId === itemId;
                        const isDragOver = zoneDragState?.zoneId === segment.id && zoneDragState?.overItemId === itemId;

                        if (itemId === 'gap') {
                          return (
                            <div
                              key="gap"
                              draggable
                              onDragStart={(e) => handleZoneDragStart(e, segment.id, 'gap')}
                              onDragOver={(e) => handleZoneDragOver(e, segment.id, 'gap')}
                              onDrop={(e) => handleZoneDrop(e, segment.id, 'gap')}
                              onDragEnd={handleZoneDragEnd}
                              className={`flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all ${
                                isDragging ? 'opacity-40' : ''
                              } ${isDragOver ? 'ring-2 ring-orange-300 rounded-full ring-offset-1' : ''}`}
                            >
                              <GripVertical className="h-3 w-3 text-gray-300" />
                              <Popover
                                open={gapPopoverOpen === segment.id}
                                onOpenChange={(open) => setGapPopoverOpen(open ? segment.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-gray-200 bg-white text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all shadow-sm"
                                    title={`Speaker gap: ${gapValue}s (click to change)`}
                                  >
                                    <span className="font-mono font-bold">||</span>
                                    <span>gap {gapValue}s</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="center">
                                  <div className="text-xs font-medium text-gray-700 mb-2">Gap between segments</div>
                                  <div className="flex items-center gap-2">
                                    {[0.3, 0.6, 1.2].map((g) => (
                                      <Button
                                        key={g}
                                        variant={gapValue === g ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs px-3"
                                        onClick={() => handleSetSpeakerGap(segment.id, g)}
                                      >
                                        {g}s
                                      </Button>
                                    ))}
                                    <span className="text-xs text-gray-500">custom:</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="10"
                                      value={customGapInput}
                                      onChange={(e) => setCustomGapInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const val = parseFloat(customGapInput);
                                          if (!isNaN(val) && val >= 0 && val <= 10) {
                                            handleSetSpeakerGap(segment.id, val);
                                          }
                                        }
                                      }}
                                      className="h-8 w-16 text-xs"
                                      placeholder="s"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        }

                        // SFX item
                        const sfxSeg = sfxSegments.find(s => s.id === itemId);
                        if (!sfxSeg) return null;
                        return (
                          <div
                            key={itemId}
                            draggable
                            onDragStart={(e) => handleZoneDragStart(e, segment.id, itemId)}
                            onDragOver={(e) => handleZoneDragOver(e, segment.id, itemId)}
                            onDrop={(e) => handleZoneDrop(e, segment.id, itemId)}
                            onDragEnd={handleZoneDragEnd}
                            className={`w-full max-w-2xl transition-all ${
                              isDragging ? 'opacity-40' : ''
                            } ${isDragOver ? 'ring-2 ring-amber-400 ring-offset-1 rounded-lg' : ''}`}
                          >
                            <div className="relative border-l-4 border-amber-400 bg-amber-50/80 rounded-lg">
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="cursor-grab active:cursor-grabbing text-amber-300 hover:text-amber-500 -ml-1">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center">
                                      <Music className="h-3.5 w-3.5 text-amber-600" />
                                    </div>
                                    <span className="text-sm font-medium text-amber-700">Sound Effect</span>
                                    <select
                                      value={sfxSeg.sfx_duration || 5}
                                      onChange={(e) => updateSfxSegment(sfxSeg.id, { sfx_duration: Number(e.target.value) })}
                                      className="text-xs border border-amber-200 rounded px-2 py-0.5 bg-white text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    >
                                      {[1, 3, 5, 8, 10].map((d) => (
                                        <option key={d} value={d}>{d}s</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-100" onClick={() => handleGenerateSfx(sfxSeg.id)} disabled={loadingSegmentId === sfxSeg.id || !sfxSeg.text.trim()} title="Generate sound">
                                      {loadingSegmentId === sfxSeg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Volume2 className="h-3.5 w-3.5 mr-1" />}
                                      Generate
                                    </Button>
                                    {sfxAudioBlobs[sfxSeg.id] && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-100" onClick={() => handlePreviewSfx(sfxSeg.id)} title={playingSegmentId === sfxSeg.id ? 'Stop' : 'Preview'}>
                                        {playingSegmentId === sfxSeg.id ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => removeSfxSegment(sfxSeg.id)} title="Remove sound effect">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <textarea
                                  value={sfxSeg.text}
                                  onChange={(e) => updateSfxSegment(sfxSeg.id, { text: e.target.value })}
                                  className="w-full bg-white border border-amber-200 rounded px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  rows={2}
                                  placeholder='Describe the sound (e.g., "coffee shop ambience", "thunder and rain")'
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Add SFX button */}
                      <button
                        onClick={() => {
                          const prevId = idx > 0 ? currentProject.segments[idx - 1].id : null;
                          insertSfxSegment(prevId);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-amber-200 bg-white text-amber-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm"
                        title="Insert sound effect"
                      >
                        <Music className="h-3 w-3" />
                        <span>Add SFX</span>
                      </button>
                    </div>
                  )}

                  {/* ===== Speech Segment 渲染 ===== */}
                <div
                  className={`group relative flex transition-all ${
                    dragOverIndex === idx && dragFromIndex !== idx ? 'ring-2 ring-orange-400 ring-offset-2 rounded-lg' : ''
                  } ${dragFromIndex === idx ? 'opacity-40' : ''}`}
                  onMouseEnter={() => setToolbarVisible({ ...toolbarVisible, [segment.id]: true })}
                  onMouseLeave={() => setToolbarVisible({ ...toolbarVisible, [segment.id]: false })}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  {/* ===== Drag handle ===== */}
                  <div className="w-5 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* ===== Checkbox (selection mode only) ===== */}
                  {isSelectionMode && (
                    <div className="w-7 flex-shrink-0 flex items-start pt-3 justify-center">
                      <input
                        type="checkbox"
                        checked={checkedSegmentIds.includes(segment.id)}
                        onChange={() => toggleSegmentChecked(segment.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* ===== LEFT: Speaker column ===== */}
                  <div className="w-44 flex-shrink-0 flex flex-col gap-1.5 pt-2 pr-3">
                    {/* Speaker selector - plain label style */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: speakerColor(segment.speaker_id) }}
                      />
                      <select
                        value={segment.speaker_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__new_speaker__') {
                            const name = prompt('Enter new speaker name:');
                            if (name?.trim()) {
                              const newId = addSpeaker(name.trim());
                              handleChangeSpeaker(segment.id, newId);
                            }
                          } else {
                            handleChangeSpeaker(segment.id, val);
                          }
                          setNewLineSegmentId(null);
                        }}
                        className="text-sm font-medium bg-transparent border-0 focus:outline-none focus:ring-0 p-0 flex-1 min-w-0 cursor-pointer text-gray-600"
                      >
                        {currentProject.speakers.map((spk) => (
                          <option key={spk.speaker_id} value={spk.speaker_id}>
                            {spk.speaker_name}
                          </option>
                        ))}
                        <option value="__new_speaker__">+ New Speaker</option>
                      </select>
                    </div>

                    {/* Inline speaker picker - shown briefly on new line creation */}
                    {newLineSegmentId === segment.id && currentProject.speakers.length > 1 && (
                      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-lg p-2 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Switch speaker?</span>
                        {currentProject.speakers
                          .filter((spk) => spk.speaker_id !== segment.speaker_id)
                          .map((spk) => (
                            <button
                              key={spk.speaker_id}
                              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-100 transition-colors text-left"
                              onClick={() => {
                                handleChangeSpeaker(segment.id, spk.speaker_id);
                                setNewLineSegmentId(null);
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: SPEAKER_COLORS[speakerIndex(spk.speaker_id) % SPEAKER_COLORS.length] }}
                              />
                              <span className="truncate">{spk.speaker_name}</span>
                            </button>
                          ))}
                        <button
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-100 transition-colors text-left text-orange-600"
                          onClick={() => {
                            const name = prompt('Enter new speaker name:');
                            if (name?.trim()) {
                              const newId = addSpeaker(name.trim());
                              handleChangeSpeaker(segment.id, newId);
                            }
                            setNewLineSegmentId(null);
                          }}
                        >
                          + New Speaker
                        </button>
                      </div>
                    )}

                    {/* Voice badge - prominent colored style */}
                    <button
                      className={`text-[13px] font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-all w-full text-left truncate ${
                        !segment.voice_id
                          ? 'text-gray-400 bg-gray-100 hover:bg-gray-200 border border-dashed border-gray-300 italic text-xs'
                          : 'shadow-sm hover:shadow-md'
                      }`}
                      style={
                        segment.voice_id
                          ? {
                              color: '#fff',
                              backgroundColor: speakerColor(segment.speaker_id),
                            }
                          : undefined
                      }
                      title="Click to change voice"
                      onClick={() => handleOpenVoiceSelector(segment.id)}
                    >
                      {speaker?.voice_name || 'Assign voice'}
                    </button>
                  </div>

                  {/* ===== RIGHT: Text + Toolbar column ===== */}
                  <div className="flex-1 min-w-0 border-l border-gray-100 pl-5 py-2.5 hover:bg-white/80 rounded-r-lg transition-colors relative">
                    {/* Toolbar (悬停时出现在文本上方) */}
                    {showToolbar && (
                      <div className="absolute -top-10 left-0 bg-white rounded-lg shadow-lg border border-gray-200 px-2.5 py-1.5 flex items-center gap-0.5 z-10">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Collapse" onClick={() => setToolbarVisible({ ...toolbarVisible, [segment.id]: false })}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-gray-200" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Undo" onClick={() => handleUndo(segment.id)}>
                          <Undo className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Redo" onClick={() => handleRedo(segment.id)}>
                          <Redo className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-gray-200" />
                        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" title="Add Pause" onClick={() => handleAddPause(segment.id)}>
                          <span className="font-mono font-bold text-xs">||</span>
                        </Button>
                        <Popover
                          open={emotionPopoverOpen === segment.id}
                          onOpenChange={(open) => setEmotionPopoverOpen(open ? segment.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Emotion Tag">
                              <Smile className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start">
                            <div className="mb-2">
                              <h4 className="font-medium text-sm text-gray-900">添加情绪标签</h4>
                              <p className="text-xs text-gray-500 mt-1">在句子前添加情绪标签，使声音更具表现力。</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              {EMOTION_TAGS.map((emotion) => (
                                <Button key={emotion.value} variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleAddEmotion(segment.id, emotion.value, emotion.label)}>
                                  {emotion.emoji && <span className="mr-1">{emotion.emoji}</span>}
                                  {emotion.label}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-sm bg-orange-50 hover:bg-orange-100 text-orange-600"
                          title="Auto-detect emotion"
                          disabled={smartEmotionLoading === segment.id}
                          onClick={() => handleSmartEmotion(segment.id, segment.text, segment.voice_id)}
                        >
                          {smartEmotionLoading === segment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          Smart Emotions
                        </Button>
                      </div>
                    )}

                    {/* Preview & Download buttons (hover) */}
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title={playingSegmentId === segment.id ? 'Stop' : 'Preview'} onClick={() => handlePreview(segment.id, segment.text, segment.voice_id)} disabled={loadingSegmentId === segment.id}>
                        {loadingSegmentId === segment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : playingSegmentId === segment.id ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Download MP3" onClick={() => handleDownloadSegment(segment.id, segment.text, segment.voice_id, speaker?.speaker_name || 'unknown', idx)} disabled={downloadingSegmentId === segment.id}>
                        {downloadingSegmentId === segment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                        title="Delete line"
                        onClick={() => {
                          deleteSegments([segment.id]);
                          showToast('Line deleted', 'success');
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Text content */}
                    <textarea
                      ref={(el) => {
                        if (el && focusSegmentId === segment.id) {
                          el.focus();
                          el.setSelectionRange(0, 0);
                          setFocusSegmentId(null);
                        }
                      }}
                      value={segment.text}
                      onChange={(e) => {
                        pushHistory(segment.id, segment.text);
                        updateSegment(segment.id, { text: e.target.value });
                        // Dismiss speaker picker when user starts typing
                        if (newLineSegmentId === segment.id) {
                          setNewLineSegmentId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        // Ctrl+Z → Undo
                        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                          e.preventDefault();
                          handleUndo(segment.id);
                          return;
                        }
                        // Ctrl+Y or Ctrl+Shift+Z → Redo
                        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                          e.preventDefault();
                          handleRedo(segment.id);
                          return;
                        }
                        // Enter → Split segment + show speaker picker on new line
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const pos = target.selectionStart;
                          pushHistory(segment.id, segment.text);
                          splitSegment(segment.id, pos);
                          requestAnimationFrame(() => {
                            const updated = useProjectStore.getState().currentProject;
                            if (!updated) return;
                            const myIdx = updated.segments.findIndex((s) => s.id === segment.id);
                            const next = updated.segments[myIdx + 1];
                            if (next) {
                              setFocusSegmentId(next.id);
                              setNewLineSegmentId(next.id);
                            }
                          });
                        }
                      }}
                      onSelect={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        setCursorPosition({ ...cursorPosition, [segment.id]: target.selectionStart });
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        setCursorPosition({ ...cursorPosition, [segment.id]: target.selectionStart });
                      }}
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 text-[15px] leading-7 resize-none pr-16"
                      rows={Math.max(2, segment.text.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 50)), 0))}
                      placeholder="Enter text..."
                    />
                  </div>
                </div>
                </React.Fragment>
              );
            })}

          </div>
        ) : null}

        {/* Voice Library Modal (from clicking voice name) */}
        <VoiceLibraryModal
          open={voiceLibraryOpen}
          onClose={() => setVoiceLibraryOpen(false)}
          onSelectVoice={handleSelectVoice}
          onOpenVoiceDesign={() => setVoiceDesignOpen(true)}
          currentVoiceId={
            selectedSegmentForVoice
              ? currentProject?.segments.find((s) => s.id === selectedSegmentForVoice)?.voice_id
              : null
          }
          language={currentProject?.language || 'zh'}
        />

        {/* Voice Design Modal */}
        <VoiceDesignModal
          open={voiceDesignOpen}
          onClose={() => setVoiceDesignOpen(false)}
          onSaveVoice={handleSaveVoiceDesign}
          language={currentProject?.language || 'zh'}
        />
      </div>
    </div>
  );
}
