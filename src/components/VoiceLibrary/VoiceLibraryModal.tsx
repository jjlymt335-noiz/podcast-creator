import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Square, Loader2, Search, Star, Wand2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { Voice } from '@/types/api';
import { useUIStore } from '@/store';

interface VoiceLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelectVoice: (voiceId: string, voiceName: string) => void;
  onOpenVoiceDesign?: () => void;
  currentVoiceId?: string | null;
  language?: string;
}

export function VoiceLibraryModal({
  open,
  onClose,
  onSelectVoice,
  onOpenVoiceDesign,
  currentVoiceId,
  language = 'zh',
}: VoiceLibraryModalProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('public');
  const showToast = useUIStore((state) => state.showToast);

  // 加载voice列表
  const loadVoices = async (tab: string) => {
    setLoading(true);
    try {
      let result;
      if (tab === 'public') {
        result = await api.getPublicVoices({
          language_type: language,
          skip: 0,
          limit: 50,
        });
      } else if (tab === 'my') {
        result = await api.getMyVoices({
          page: 1,
          page_size: 50,
        });
      } else if (tab === 'favorited') {
        result = await api.getFavoritedVoices({
          page: 1,
          page_size: 50,
        });
      } else {
        result = { voices: [] };
      }

      setVoices(result.voices || []);
    } catch (error: any) {
      console.error('Failed to load voices:', error);
      const errorMsg = error?.response?.status === 401
        ? 'API authentication failed. Check your API Key in .env'
        : error?.message?.includes('Network')
        ? 'Cannot connect to API. Check VITE_API_BASE_URL in .env'
        : 'Failed to load voices. Check console for details.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 搜索voices
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadVoices(activeTab);
      return;
    }

    setLoading(true);
    try {
      const result = await api.searchVoices({
        query: searchQuery,
        filters: { language },
      });
      setVoices(result.voices || []);
    } catch (error) {
      console.error('Search failed:', error);
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 预览voice
  const handlePreview = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }

    setLoadingVoiceId(voiceId);

    try {
      const sampleText = language === 'zh'
        ? '你好，这是我的声音预览，听起来怎么样？'
        : 'Hello, this is a preview of my voice. How does it sound?';

      const audioBlob = await api.textToSpeech({
        text: sampleText,
        voice_id: voiceId,
        output_format: 'mp3',
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setPlayingVoiceId(voiceId);

      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        showToast('Failed to play preview', 'error');
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('Preview failed', 'error');
    } finally {
      setLoadingVoiceId(null);
    }
  };

  // Tab切换时重新加载
  useEffect(() => {
    if (open) {
      loadVoices(activeTab);
    }
  }, [open, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Voice Library</DialogTitle>
          <DialogDescription>
            Select a voice for your speaker
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar + Design Voice */}
        <div className="flex gap-2">
          <Input
            placeholder="Search voices by name, tags, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          {onOpenVoiceDesign && (
            <Button
              onClick={() => {
                onClose();
                onOpenVoiceDesign();
              }}
              variant="default"
              className="whitespace-nowrap"
            >
              <Wand2 className="h-4 w-4 mr-1" />
              Design Voice
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="public" className="flex-1">
              Public Library
            </TabsTrigger>
            <TabsTrigger value="my" className="flex-1">
              My Voices
            </TabsTrigger>
            <TabsTrigger value="favorited" className="flex-1">
              Favorited
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : voices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No voices found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-4">
                {voices.map((voice) => (
                  <Card
                    key={voice.voice_id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      currentVoiceId === voice.voice_id ? 'border-orange-500 border-2' : ''
                    }`}
                    onClick={() => {
                      onSelectVoice(voice.voice_id, voice.display_name);
                      onClose();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{voice.display_name}</h4>
                          {voice.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{voice.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(voice.voice_id);
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

                      {/* Tags */}
                      {voice.tags && voice.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {voice.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        {voice.gender && <span>{voice.gender}</span>}
                        {voice.age && <span>• {voice.age}</span>}
                        {voice.language && <span>• {voice.language}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
