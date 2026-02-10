import { internalClient } from './client';
import type { VoiceDesignResponse, CreateVoiceRequest } from '@/types/api';

// Voice Design API封装（通过 Vite Proxy 转发，cookie 认证）
// POST /api/v1/voice-design
// POST /api/v1/voices  (保存音色)

/**
 * 生成AI音色（返回最多3个预览）
 * POST /api/v1/voice-design  (Form-Data)
 */
export async function generateVoiceDesign(params: {
  voice_description?: string;
  picture?: File;
  guidance_scale?: number;
  loudness?: number;
}): Promise<VoiceDesignResponse> {
  const formData = new FormData();

  if (params.voice_description) {
    formData.append('voice_description', params.voice_description);
  }

  if (params.picture) {
    formData.append('picture', params.picture);
  }

  if (params.guidance_scale !== undefined) {
    formData.append('guidance_scale', params.guidance_scale.toString());
  }

  if (params.loudness !== undefined) {
    formData.append('loudness', params.loudness.toString());
  }

  const response = await internalClient.post<VoiceDesignResponse>('/api/v1/voice-design', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response as unknown as VoiceDesignResponse;
}

/**
 * 保存Voice Design生成的音色到音色库
 * POST /api/v1/voices  (Form-Data, creation_mode=voice_design)
 *
 * 复用 Voice Clone 的创建接口，通过 creation_mode 区分
 */
export async function saveVoiceDesign(params: {
  generated_voice_id: string;
  display_name: string;
  voice_description?: string;
  gender?: string;
  age?: string;
  language_type?: string;
}): Promise<{ voice_id: string }> {
  const formData = new FormData();

  // audio_id 用于关联 Voice Design 生成的音频
  formData.append('audio_id', params.generated_voice_id);
  formData.append('display_name', params.display_name);
  formData.append('creation_mode', 'voice_design');

  if (params.voice_description) {
    formData.append('voice_description', params.voice_description);
  }
  if (params.gender) {
    formData.append('gender', params.gender);
  }
  if (params.age) {
    formData.append('age', params.age);
  }
  if (params.language_type) {
    formData.append('language_type', params.language_type);
  }

  const response = await internalClient.post('/api/v1/voices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response as any;
}
