import { create } from 'zustand';
import type { Voice } from '@/types/api';
import * as api from '@/lib/api';

interface VoiceState {
  // 音色列表
  pinnedVoices: Voice[];
  publicVoices: Voice[];
  myVoices: Voice[];
  favoritedVoices: Voice[];
  recentVoices: Voice[];

  // 当前选中的音色
  selectedVoice: Voice | null;

  // 搜索和筛选
  searchQuery: string;
  filters: {
    language?: string;
    gender?: string;
    age?: string;
    scene?: string[];
    emotion?: string[];
  };

  // 加载状态
  isLoading: boolean;

  // 操作方法
  loadPinnedVoices: () => Promise<void>;
  loadPublicVoices: (page?: number) => Promise<void>;
  loadMyVoices: () => Promise<void>;
  loadFavoritedVoices: () => Promise<void>;
  loadRecentVoices: () => Promise<void>;

  selectVoice: (voice: Voice) => void;
  clearSelectedVoice: () => void;

  toggleFavorite: (voiceId: string) => Promise<void>;
  deleteVoice: (voiceId: string) => Promise<void>;

  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<VoiceState['filters']>) => void;
  clearFilters: () => void;

  searchVoices: () => Promise<void>;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  pinnedVoices: [],
  publicVoices: [],
  myVoices: [],
  favoritedVoices: [],
  recentVoices: [],

  selectedVoice: null,

  searchQuery: '',
  filters: {},

  isLoading: false,

  loadPinnedVoices: async () => {
    set({ isLoading: true });
    try {
      const voices = await api.getPinnedVoices();
      set({ pinnedVoices: voices });
    } catch (error) {
      console.error('Failed to load pinned voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadPublicVoices: async (page = 1) => {
    set({ isLoading: true });
    try {
      const response = await api.getPublicVoices({
        page,
        page_size: 20,
      });
      set({ publicVoices: response.voices });
    } catch (error) {
      console.error('Failed to load public voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMyVoices: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getMyVoices();
      set({ myVoices: response.voices });
    } catch (error) {
      console.error('Failed to load my voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadFavoritedVoices: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getFavoritedVoices();
      set({ favoritedVoices: response.voices });
    } catch (error) {
      console.error('Failed to load favorited voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadRecentVoices: async () => {
    set({ isLoading: true });
    try {
      const voices = await api.getRecentVoices(10);
      set({ recentVoices: voices });
    } catch (error) {
      console.error('Failed to load recent voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  selectVoice: (voice: Voice) => {
    set({ selectedVoice: voice });
  },

  clearSelectedVoice: () => {
    set({ selectedVoice: null });
  },

  toggleFavorite: async (voiceId: string) => {
    try {
      // 查找音色
      const { publicVoices, myVoices, favoritedVoices } = get();
      const allVoices = [...publicVoices, ...myVoices, ...favoritedVoices];
      const voice = allVoices.find((v) => v.voice_id === voiceId);

      if (!voice) return;

      const newFavoritedState = !voice.is_favorited;

      // 调用API
      await api.toggleFavoriteVoice(voiceId, newFavoritedState);

      // 更新状态
      const updateVoice = (v: Voice) =>
        v.voice_id === voiceId ? { ...v, is_favorited: newFavoritedState } : v;

      set({
        publicVoices: publicVoices.map(updateVoice),
        myVoices: myVoices.map(updateVoice),
        favoritedVoices: favoritedVoices.map(updateVoice),
      });

      // 刷新收藏列表
      get().loadFavoritedVoices();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  },

  deleteVoice: async (voiceId: string) => {
    try {
      await api.deleteVoice(voiceId);

      // 从列表中移除
      const { myVoices } = get();
      set({
        myVoices: myVoices.filter((v) => v.voice_id !== voiceId),
      });
    } catch (error) {
      console.error('Failed to delete voice:', error);
      throw error;
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setFilters: (filters: Partial<VoiceState['filters']>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {}, searchQuery: '' });
  },

  searchVoices: async () => {
    const { searchQuery, filters } = get();

    if (!searchQuery && Object.keys(filters).length === 0) {
      // 如果没有搜索条件，加载默认列表
      get().loadPublicVoices();
      return;
    }

    set({ isLoading: true });
    try {
      const response = await api.searchVoices({
        query: searchQuery,
        filters,
      });
      set({ publicVoices: response.voices });
    } catch (error) {
      console.error('Failed to search voices:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
