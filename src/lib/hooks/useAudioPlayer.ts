import { useState, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (audioUrl: string) => {
    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 创建新的音频对象
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setCurrentAudioUrl(audioUrl);
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudioUrl(null);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentAudioUrl(null);
      console.error('Failed to load audio');
    };

    try {
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      setCurrentAudioUrl(null);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentAudioUrl(null);
  }, []);

  const toggle = useCallback(
    async (audioUrl: string) => {
      if (isPlaying && currentAudioUrl === audioUrl) {
        stop();
      } else {
        await play(audioUrl);
      }
    },
    [isPlaying, currentAudioUrl, play, stop]
  );

  return {
    isPlaying,
    currentAudioUrl,
    play,
    stop,
    toggle,
  };
}
