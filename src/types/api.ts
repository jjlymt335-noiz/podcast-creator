// API响应基础类型
export interface APIResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// ============================================================
// TTS 相关类型
// ============================================================

/** 短文本 TTS 入参 (POST /api/v1/text-to-speech, Form-Data) */
export interface TTSRequest {
  text: string;
  voice_id?: string;
  file?: File;
  save_voice?: boolean;
  quality_preset?: number;
  duration?: number;
  output_format?: 'wav' | 'mp3';
  target_lang?: string;
  speed?: number;
  preview_only?: boolean;
  similarity_enh?: boolean;
  emo?: string; // 情感参数 JSON, e.g. '{"Sadness":0.2}'
}

/** 长文本 TTS 入参 (POST /api/v2/text-to-speech-long, Form-Data) */
export interface TTSLongRequest extends TTSRequest {
  emotion_enh?: string;
  model_id?: 'v1' | 'v2';
}

/** 超长文本异步 TTS 入参 (POST /api/v2/text-to-speech-large, Form-Data) */
export interface TTSLargeRequest {
  text: string;
  voice_id?: string;
  quality_preset?: number;
  output_format?: 'wav' | 'mp3';
  target_lang?: string;
  speed?: number;
  emotion_enh?: string;
  model_id?: 'v1' | 'v2';
}

/** 批量 TTS 入参 (POST /api/v2/text-to-speech-batch, Form-Data) */
export interface TTSBatchRequest extends TTSRequest {
  repeat_num?: number;
  emotion_enh?: string;
}

/** 批量 TTS 候选项 */
export interface TTSBatchCandidate {
  gen_product_id: string;
  signed_url: string;
  fallbackurl: string;
}

/** 历史记录中的一条 gen_product */
export interface GenProduct {
  gen_product_id: string;
  voice_id: string;
  file_path: string;
  fallbackurl: string;
  target_text: string;
  duration: number;
  gen_type: 'tts';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  create_time: number;
  url?: string;
}

export interface TTSHistoryResponse {
  gen_products: GenProduct[];
}

export interface TTSProgressItem {
  gen_product_id: string;
  status: string;
  progress: number;
  file_path: string;
  fallbackurl: string;
  message: string;
}

/** 兼容旧的 TTSProgressResponse（单任务） */
export type TTSProgressResponse = TTSProgressItem;

export interface TTSLargeSection {
  section_id: string;
  section_text: string;
  file_path: string;
  url: string;
  fallbackurl: string;
  duration: number;
  section_status: 'pending' | 'completed' | 'failed';
  section_candidate_id: string;
  section_candidate_text: string;
}

export interface TTSLargeResult {
  file_path: string;
  url: string;
  fallbackurl: string;
  gen_product_id: string;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  target_text: string;
  sections: TTSLargeSection[];
  message: string;
}

export interface TTSSectionCandidate {
  section_candidate_id: string;
  file_path: string;
  fallbackurl: string;
  target_text: string;
  create_time: number;
  selected: boolean;
}

// ============================================================
// Voice Library 相关类型
// ============================================================

export interface Voice {
  id: number;
  voice_id: string;
  display_name: string;
  voice_type: 'custom' | 'built-in';
  labels: string | string[];
  file_path: string;
  sample: string | null;
  meta: {
    text?: string;
    language?: string;
    gender?: string;
    age?: string;
    scene?: string[];
    emotion?: string[];
    voice_description?: string;
    creation_mode?: 'voice_clone' | 'voice_design' | 'public';
  };
  is_public: boolean;
  url: string;
  fallbackurl: string;
  is_favorited?: boolean;
  language?: string;
  age?: string;
  gender?: string;
  scene?: string[];
  emotion?: string[];
  voice_description?: string;
  creation_mode?: string;
  can_delete?: boolean;
  create_time: number;
  // 前端便捷字段（从 labels/meta 解析）
  tags?: string[];
  description?: string;
}

export interface VoiceListResponse {
  total_count: number;
  voices: Voice[];
}

// ============================================================
// Voice Design 相关类型
// ============================================================

export interface VoiceDesignRequest {
  voice_description: string;
  picture?: File;
  guidance_scale?: number;
  loudness?: number;
}

export interface VoiceDesignPreview {
  audio_base_64: string;
  generated_voice_id: string;
  media_type: string;
  duration_secs: number;
  language: string;
}

export interface VoiceDesignResponse {
  previews: VoiceDesignPreview[];
  text: string;
  from_cache: boolean;
  features: {
    gender: string;
    age: string;
    language: string;
    voice_prompt: string;
    display_name: string;
  };
}

// ============================================================
// Voice Clone 相关类型
// ============================================================

export interface CreateVoiceRequest {
  file?: File;
  denoise?: boolean;
  display_name?: string;
  text?: string;
  labels?: string;
  is_public?: boolean;
  audio_id?: string;
  meta?: string;
  language_type?: string;
  gender?: string;
  age?: string;
  scene?: string;
  emotion?: string;
  voice_description?: string;
  creation_mode?: 'public' | 'voice_design' | 'voice_clone';
}

// ============================================================
// Auto-assign Voices 相关类型
// ============================================================

export interface AutoAssignVoicesRequest {
  text: string;
  language: string;
  user_id: string;
}

export interface SegmentInfo {
  text: string;
  start_index: number;
  end_index: number;
}

export interface MatchedVoice {
  voice_id: string;
  display_name: string;
  match_score: number;
  match_reason: string;
  source: 'public_library' | 'user_library';
  tags: string[];
  language: string;
  gender: string;
  age: string;
}

export interface VoiceDesignFallback {
  description: string;
  suggested_tags: string[];
}

export interface Speaker {
  speaker_id: string;
  speaker_name: string;
  character_description: string;
  segments: SegmentInfo[];
  matched_voice: MatchedVoice | null;
  voice_design_fallback: VoiceDesignFallback | null;
}

export interface AutoAssignVoicesResponse {
  speakers: Speaker[];
  processing_time_ms: number;
  total_speakers: number;
  total_segments: number;
}

// ============================================================
// 情绪增强相关
// ============================================================

export interface EmotionEnhanceRequest {
  text: string;
}

export interface EmotionEnhanceResponse {
  emotion_enhance: string;
}
