import { create } from 'zustand';

interface UIState {
  // 当前页面
  currentPage: 'entry' | 'editor';

  // Editor状态
  currentSpeakerId: string | null;
  selectedSegmentId: string | null;
  isPlaying: boolean;
  currentTime: number;

  // Voice Library面板
  isVoiceLibraryOpen: boolean;
  voiceLibraryTab: 'used' | 'professional' | 'explore' | 'create';

  // Voice Design模态框
  isVoiceDesignOpen: boolean;

  // Auto-assign状态
  isAutoAssigning: boolean;
  autoAssignProgress: number;

  // 说话人间隔设置
  speakerGapSettings: {
    gap: number;
    preset: '0.3s' | '0.6s' | '1.2s' | 'custom';
  };

  // Segment多选
  isSelectionMode: boolean;
  checkedSegmentIds: string[];
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSegmentChecked: (segmentId: string) => void;
  setAllSegmentsChecked: (segmentIds: string[]) => void;
  clearCheckedSegments: () => void;

  // Toast通知
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>;

  // 操作方法
  setCurrentPage: (page: UIState['currentPage']) => void;

  setCurrentSpeaker: (speakerId: string | null) => void;
  setSelectedSegment: (segmentId: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;

  openVoiceLibrary: (tab?: UIState['voiceLibraryTab']) => void;
  closeVoiceLibrary: () => void;
  setVoiceLibraryTab: (tab: UIState['voiceLibraryTab']) => void;

  openVoiceDesign: () => void;
  closeVoiceDesign: () => void;

  setAutoAssigning: (isAssigning: boolean, progress?: number) => void;

  setSpeakerGap: (gap: number, preset: UIState['speakerGapSettings']['preset']) => void;

  showToast: (message: string, type: UIState['toasts'][0]['type']) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  currentPage: 'entry',

  currentSpeakerId: null,
  selectedSegmentId: null,
  isPlaying: false,
  currentTime: 0,

  isVoiceLibraryOpen: false,
  voiceLibraryTab: 'professional',

  isVoiceDesignOpen: false,

  isAutoAssigning: false,
  autoAssignProgress: 0,

  speakerGapSettings: {
    gap: 0.6,
    preset: '0.6s',
  },

  isSelectionMode: false,
  checkedSegmentIds: [],

  toasts: [],

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setCurrentSpeaker: (speakerId) => {
    set({ currentSpeakerId: speakerId });
  },

  setSelectedSegment: (segmentId) => {
    set({ selectedSegmentId: segmentId });
  },

  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  openVoiceLibrary: (tab) => {
    set({
      isVoiceLibraryOpen: true,
      voiceLibraryTab: tab || get().voiceLibraryTab,
    });
  },

  closeVoiceLibrary: () => {
    set({ isVoiceLibraryOpen: false });
  },

  setVoiceLibraryTab: (tab) => {
    set({ voiceLibraryTab: tab });
  },

  openVoiceDesign: () => {
    set({ isVoiceDesignOpen: true });
  },

  closeVoiceDesign: () => {
    set({ isVoiceDesignOpen: false });
  },

  setAutoAssigning: (isAssigning, progress = 0) => {
    set({
      isAutoAssigning: isAssigning,
      autoAssignProgress: progress,
    });
  },

  setSpeakerGap: (gap, preset) => {
    set({
      speakerGapSettings: { gap, preset },
    });
  },

  enterSelectionMode: () => {
    set({ isSelectionMode: true, checkedSegmentIds: [] });
  },

  exitSelectionMode: () => {
    set({ isSelectionMode: false, checkedSegmentIds: [] });
  },

  toggleSegmentChecked: (segmentId) => {
    set((state) => {
      const exists = state.checkedSegmentIds.includes(segmentId);
      return {
        checkedSegmentIds: exists
          ? state.checkedSegmentIds.filter((id) => id !== segmentId)
          : [...state.checkedSegmentIds, segmentId],
      };
    });
  },

  setAllSegmentsChecked: (segmentIds) => {
    set({ checkedSegmentIds: segmentIds });
  },

  clearCheckedSegments: () => {
    set({ checkedSegmentIds: [] });
  },

  showToast: (message, type) => {
    const id = `toast_${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // 3秒后自动关闭
    setTimeout(() => {
      get().dismissToast(id);
    }, 3000);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
