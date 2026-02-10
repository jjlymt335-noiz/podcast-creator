import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Plus, Play, Square, Loader2, ChevronRight } from 'lucide-react';
import { useProjectStore, useUIStore } from '@/store';
import { VoiceLibraryModal } from '@/components/VoiceLibrary/VoiceLibraryModal';
import { VoiceDesignModal } from '@/components/VoiceLibrary/VoiceDesignModal';
import * as api from '@/lib/api';

const SPEAKER_COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function VoicePanel() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const addSpeaker = useProjectStore((state) => state.addSpeaker);
  const assignVoiceToSpeaker = useProjectStore((state) => state.assignVoiceToSpeaker);
  const showToast = useUIStore((state) => state.showToast);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [voiceLibraryOpen, setVoiceLibraryOpen] = useState(false);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [voiceDesignOpen, setVoiceDesignOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 打开Voice Library modal
  const handleOpenVoiceLibrary = (speakerId: string) => {
    setSelectedSpeakerId(speakerId);
    setVoiceLibraryOpen(true);
  };

  // 选择voice
  const handleSelectVoice = (voiceId: string, voiceName: string) => {
    if (selectedSpeakerId) {
      assignVoiceToSpeaker(selectedSpeakerId, voiceId, voiceName);
      showToast(`Voice "${voiceName}" assigned successfully`, 'success');
    }
  };

  // 从 Voice Design 保存了音色
  const handleSaveVoiceDesign = (voiceId: string, voiceName: string) => {
    if (selectedSpeakerId) {
      assignVoiceToSpeaker(selectedSpeakerId, voiceId, voiceName);
      showToast(`Voice "${voiceName}" created and assigned!`, 'success');
    }
  };

  const handlePreviewVoice = async (voiceId: string, voiceName: string) => {
    // 如果正在播放同一个音色，停止播放
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // 停止之前的播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setLoadingVoiceId(voiceId);

    try {
      // 使用示例文本生成音频（根据语言选择）
      const sampleText = currentProject?.language === 'zh'
        ? '你好，这是我的声音预览，听起来怎么样？'
        : 'Hello, this is a preview of my voice. How does it sound?';
      const audioBlob = await api.textToSpeech({
        text: sampleText,
        voice_id: voiceId,
        output_format: 'mp3',
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayingVoiceId(voiceId);

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        showToast('Failed to play voice preview', 'error');
        setPlayingVoiceId(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error: any) {
      console.error('Voice preview failed:', error);
      const errorMsg = error?.response?.status === 404
        ? 'API endpoint not found. Configure VITE_API_BASE_URL in .env'
        : error?.message?.includes('Network') || error?.code === 'ERR_NETWORK'
        ? 'Cannot connect to API. Check VITE_API_BASE_URL in .env file'
        : 'Voice preview failed. Check console for details.';
      showToast(errorMsg, 'error');
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const speakerColor = (speakerId: string) => {
    if (!currentProject) return SPEAKER_COLORS[0];
    const index = currentProject.speakers.findIndex((s) => s.speaker_id === speakerId);
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  };

  if (!currentProject || currentProject.speakers.length === 0) {
    return (
      <div className="w-72 bg-white border-r border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-4 text-gray-700">Speakers</h3>
        <div className="text-center text-gray-500 py-12">
          <Music className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No speakers yet</p>
          <p className="text-xs text-gray-400 mt-1">Add speakers to assign voices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Speakers</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowAddSpeaker(!showAddSpeaker)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showAddSpeaker && (
          <div className="mb-3 flex items-center gap-2">
            <Input
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              placeholder="Speaker name..."
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSpeakerName.trim()) {
                  addSpeaker(newSpeakerName.trim());
                  setNewSpeakerName('');
                  setShowAddSpeaker(false);
                  showToast(`Speaker "${newSpeakerName.trim()}" added`, 'success');
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!newSpeakerName.trim()}
              onClick={() => {
                if (newSpeakerName.trim()) {
                  addSpeaker(newSpeakerName.trim());
                  setNewSpeakerName('');
                  setShowAddSpeaker(false);
                  showToast(`Speaker "${newSpeakerName.trim()}" added`, 'success');
                }
              }}
            >
              Add
            </Button>
          </div>
        )}

        <div className="space-y-1">
          {currentProject.speakers.map((speaker) => (
            <div
              key={speaker.speaker_id}
              className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleOpenVoiceLibrary(speaker.speaker_id)}
            >
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: speakerColor(speaker.speaker_id) }}
              />

              {/* Name + voice info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {speaker.speaker_name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {speaker.segments.length}
                  </span>
                </div>
                {speaker.voice_id ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Music className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 truncate">
                      {speaker.voice_name || 'Voice assigned'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-orange-400 italic">No voice</span>
                )}
              </div>

              {/* Preview button (hover only) */}
              {speaker.voice_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Preview Voice"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewVoice(speaker.voice_id!, speaker.voice_name || 'Voice');
                  }}
                  disabled={loadingVoiceId === speaker.voice_id}
                >
                  {loadingVoiceId === speaker.voice_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : playingVoiceId === speaker.voice_id ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              )}

              <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Voice Library Modal */}
        <VoiceLibraryModal
          open={voiceLibraryOpen}
          onClose={() => setVoiceLibraryOpen(false)}
          onSelectVoice={handleSelectVoice}
          onOpenVoiceDesign={() => setVoiceDesignOpen(true)}
          currentVoiceId={
            selectedSpeakerId
              ? currentProject.speakers.find((s) => s.speaker_id === selectedSpeakerId)?.voice_id
              : null
          }
          language={currentProject.language}
        />

        {/* Voice Design Modal */}
        <VoiceDesignModal
          open={voiceDesignOpen}
          onClose={() => setVoiceDesignOpen(false)}
          onSaveVoice={handleSaveVoiceDesign}
          language={currentProject.language}
        />
      </div>
    </div>
  );
}
