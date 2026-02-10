import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Square, Loader2, Sparkles } from 'lucide-react';
import * as api from '@/lib/api';
import { useUIStore } from '@/store';

interface GeneratedVoice {
  voice_id: string;
  display_name: string;
  audio_url?: string;       // data URI from audio_base_64
  generated_voice_id: string; // for saving to voice library
}

interface VoiceDesignModalProps {
  open: boolean;
  onClose: () => void;
  onSaveVoice: (voiceId: string, voiceName: string) => void;
  language?: string;
}

export function VoiceDesignModal({
  open,
  onClose,
  onSaveVoice,
  language = 'zh',
}: VoiceDesignModalProps) {
  const [description, setDescription] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [generatedVoices, setGeneratedVoices] = useState<GeneratedVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const showToast = useUIStore((state) => state.showToast);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 生成3个voice选项
  const handleGenerate = async () => {
    if (!description.trim()) {
      showToast('Please enter a voice description', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      // 调用Voice Design API生成预览（返回最多3个）
      const result = await api.generateVoiceDesign({
        voice_description: description,
      });

      // 将 previews 映射为组件使用的 GeneratedVoice 格式
      const voices: GeneratedVoice[] = result.previews.map((p, i) => ({
        voice_id: p.generated_voice_id,
        display_name: result.features?.display_name || `Voice ${i + 1}`,
        audio_url: p.audio_base_64
          ? `data:audio/wav;base64,${p.audio_base_64}`
          : undefined,
        generated_voice_id: p.generated_voice_id,
      }));

      setGeneratedVoices(voices);
      showToast('Voices generated successfully!', 'success');
    } catch (error: any) {
      console.error('Voice generation failed:', error);
      const errorMsg = error?.response?.status === 404
        ? 'Voice Design API not available'
        : error?.message?.includes('Network')
        ? 'Cannot connect to API'
        : 'Failed to generate voices';
      showToast(errorMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 预览voice（使用 Voice Design 返回的 audio_base_64）
  const handlePreview = async (voice: GeneratedVoice, _index: number) => {
    // 点击正在播放的 → 暂停
    if (playingVoiceId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (!voice.audio_url) {
      showToast('No audio available for preview', 'warning');
      return;
    }

    // 停止之前播放的
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setLoadingVoiceId(voice.voice_id);

    try {
      const audio = new Audio(voice.audio_url);
      audioRef.current = audio;
      setPlayingVoiceId(voice.voice_id);

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        showToast('Failed to play preview', 'error');
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('Preview failed', 'error');
      audioRef.current = null;
    } finally {
      setLoadingVoiceId(null);
    }
  };

  // 保存并使用
  const handleSaveAndUse = async () => {
    if (selectedVoiceIndex === null) {
      showToast('Please select a voice first', 'warning');
      return;
    }

    if (!voiceName.trim()) {
      showToast('Please enter a voice name', 'warning');
      return;
    }

    const selectedVoice = generatedVoices[selectedVoiceIndex];

    try {
      // 调用 saveVoiceDesign 保存到音色库
      const saved = await api.saveVoiceDesign({
        generated_voice_id: selectedVoice.generated_voice_id,
        display_name: voiceName,
        voice_description: description,
      });

      onSaveVoice(saved.voice_id, voiceName);
      onClose();

      // Reset state
      setDescription('');
      setVoiceName('');
      setGeneratedVoices([]);
      setSelectedVoiceIndex(null);
    } catch (error: any) {
      console.error('Save voice failed:', error);
      showToast(error?.message || 'Failed to save voice', 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Voice Design
          </DialogTitle>
          <DialogDescription>
            Describe the voice you want, and we'll generate 3 options for you to choose from
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description Input */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Voice Description
            </label>
            <Textarea
              placeholder="e.g., A young male with a clear, warm voice..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating voices...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Voices
              </>
            )}
          </Button>

          {/* Generated Voices */}
          {generatedVoices.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Generated Voices (Select one)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {generatedVoices.map((voice, index) => (
                  <Card
                    key={voice.voice_id}
                    className={`cursor-pointer transition-all ${
                      selectedVoiceIndex === index
                        ? 'border-orange-500 border-2 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelectedVoiceIndex(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium">
                          {index + 1}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(voice, index);
                          }}
                        >
                          {loadingVoiceId === voice.voice_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : playingVoiceId === voice.voice_id ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs font-medium text-center">
                        Voice {index + 1}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Voice Name Input */}
          {selectedVoiceIndex !== null && (
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Voice Name
              </label>
              <Input
                placeholder="Enter a name for this voice..."
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              />
            </div>
          )}

          {/* Save & Use Button */}
          {selectedVoiceIndex !== null && (
            <Button
              onClick={handleSaveAndUse}
              disabled={!voiceName.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Save & Use
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
