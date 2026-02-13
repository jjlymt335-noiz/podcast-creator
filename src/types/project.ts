// 项目相关类型

export interface ProjectSegment {
  id: string;
  type?: 'speech' | 'sfx'; // 段落类型，默认 'speech'（向后兼容旧数据）
  speaker_id: string; // SFX 时用 '__sfx__' 哨兵值
  text: string; // SFX 时为音效描述文字
  voice_id: string | null; // SFX 时为 null
  start_index: number;
  end_index: number;
  audio_url?: string;
  duration?: number;
  pause_before?: number; // 暂停时长（秒），用于在此segment前添加静音
  speaker_gap?: number; // 说话人切换间隔（秒），默认0.6s
  sfx_duration?: number; // SFX 生成时长（秒），默认5s
}

export interface ProjectSpeaker {
  speaker_id: string;
  speaker_name: string;
  character_description?: string;
  voice_id: string | null;
  voice_name?: string;
  segments: ProjectSegment[];
}

export interface GenerationRecord {
  id: string;
  timestamp: number;
  status: 'completed' | 'failed';
  segment_count: number;
  audio_url?: string;
  audio_blob?: Blob;
  duration?: number;
  title?: string;
}

export interface Project {
  id: string;
  title: string;
  source_text: string;
  language: string;
  speakers: ProjectSpeaker[];
  segments: ProjectSegment[];
  created_at: number;
  updated_at: number;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  // TTS相关
  gen_product_id?: string;
  audio_url?: string;
  audio_blobs?: Blob[]; // 多个说话人的音频片段
  duration?: number;
  generation_progress?: number; // 生成进度 0-100
  generation_history?: GenerationRecord[];
}

export interface DocumentParseResult {
  text: string;
  language: string;
  format: 'pdf' | 'epub' | 'docx' | 'txt' | 'html';
  title?: string;
  author?: string;
}

// UI状态相关
export interface EditorState {
  currentSpeakerId: string | null;
  selectedSegmentId: string | null;
  isPlaying: boolean;
  currentTime: number;
}

export interface SpeakerGapSettings {
  gap: number; // 秒数
  preset: '0.3s' | '0.6s' | '1.2s' | 'custom';
}
