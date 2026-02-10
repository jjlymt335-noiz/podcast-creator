import { apiClient } from './client';
import type { Voice, VoiceListResponse } from '@/types/api';

// Voice Library API封装
// 文档第四节：所有 Voice Library 端点以 /api/v1/voice-library/ 开头
// 响应格式统一为 { code, message, data } — 由 client 拦截器自动解包

// ============================================================
// 查询参数类型（与文档对齐）
// ============================================================

export interface VoiceLibraryQueryParams {
  keyword?: string;
  voice_ids?: string;       // 逗号分隔
  language?: string;        // 用户偏好语种（排序优先级）
  language_type?: string;   // 语种筛选
  age?: string;
  gender?: string;
  scene?: string;           // 逗号分隔
  emotion?: string;         // 逗号分隔
  sort?: 'latest' | 'mostUsers' | 'most_users';
  skip?: number;
  limit?: number;
}

/** 前端兼容: 保留旧的 VoiceListParams 别名 */
export type VoiceListParams = VoiceLibraryQueryParams;

// ============================================================
// 标准化工具
// ============================================================

function normalizeVoice(raw: any): Voice {
  const labels = raw.labels || '';
  const tags = typeof labels === 'string'
    ? labels.split(',').map((l: string) => l.trim()).filter(Boolean)
    : Array.isArray(labels) ? labels : [];
  const meta = raw.meta || {};

  return {
    ...raw,
    labels,
    file_path: raw.file_path || '',
    is_public: raw.is_public ?? false,
    fallbackurl: raw.fallbackurl || '',
    language: raw.language || meta.language || '',
    gender: raw.gender || meta.gender || '',
    age: raw.age || meta.age || '',
    scene: raw.scene || meta.scene || [],
    emotion: raw.emotion || meta.emotion || [],
    voice_description: raw.voice_description || meta.voice_description || '',
    creation_mode: raw.creation_mode || meta.creation_mode || '',
    tags,
    description: raw.voice_description || meta.voice_description || (meta.text ? meta.text.slice(0, 100) : ''),
  };
}

function normalizeVoiceList(data: any): VoiceListResponse {
  if (!data) return { total_count: 0, voices: [] };
  return {
    total_count: data.total_count || 0,
    voices: (data.voices || []).map(normalizeVoice),
  };
}

// ============================================================
// 公共音色库（Built-in voices）
// GET /v1/voices?voice_type=built-in
// ============================================================

export async function getPinnedVoices(language = 'en'): Promise<Voice[]> {
  const response = await apiClient.get('/v1/voices', {
    params: { voice_type: 'built-in', limit: 10 },
  });
  const data = normalizeVoiceList(response);
  return data.voices;
}

export async function getPublicVoices(params?: VoiceLibraryQueryParams): Promise<VoiceListResponse> {
  const response = await apiClient.get('/v1/voices', {
    params: {
      voice_type: 'built-in',
      keyword: params?.keyword,
      language_type: params?.language_type,
      gender: params?.gender,
      age: params?.age,
      scene: params?.scene,
      emotion: params?.emotion,
      sort: params?.sort,
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 20,
    },
  });
  return normalizeVoiceList(response);
}

// ============================================================
// 我的音色（Custom voices）
// GET /v1/voices?voice_type=custom
// ============================================================

export async function getMyVoices(params?: VoiceLibraryQueryParams): Promise<VoiceListResponse> {
  const response = await apiClient.get('/v1/voices', {
    params: {
      voice_type: 'custom',
      keyword: params?.keyword,
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 20,
    },
  });
  return normalizeVoiceList(response);
}

// ============================================================
// 收藏的音色（目前API不支持，复用 built-in 列表）
// ============================================================

export async function getFavoritedVoices(params?: VoiceLibraryQueryParams): Promise<VoiceListResponse> {
  // 文档API暂无 favorites 端点，复用 built-in 列表
  return getPublicVoices(params);
}

// ============================================================
// 收藏操作占位（API暂不支持）
// ============================================================

export async function toggleFavoriteVoice(
  voiceId: string,
  isFavorited: boolean
): Promise<{ success_count: number; failed_count: number }> {
  console.warn('toggleFavoriteVoice: favorites API not available yet');
  return { success_count: 0, failed_count: 0 };
}

export async function batchToggleFavorite(
  voiceIds: string[],
  isFavorite: boolean
): Promise<{ success_count: number; failed_count: number; failed_voice_ids?: string[] }> {
  console.warn('batchToggleFavorite: favorites API not available yet');
  return { success_count: 0, failed_count: 0 };
}

// ============================================================
// 最近使用占位（API暂不支持）
// ============================================================

export async function getRecentVoices(limit = 10): Promise<Voice[]> {
  console.warn('getRecentVoices: recent-used API not available yet');
  return [];
}

// ============================================================
// 根据 ID 获取音色
// GET /v1/voices/{voice_id}
// ============================================================

export async function getVoicesByIds(voiceIds: string[]): Promise<Voice[]> {
  if (voiceIds.length === 0) return [];
  const promises = voiceIds.map(async (id) => {
    try {
      const response = await apiClient.get(`/v1/voices/${id}`);
      return normalizeVoice(response);
    } catch {
      return null;
    }
  });
  const results = await Promise.all(promises);
  return results.filter((v): v is Voice => v !== null);
}

// ============================================================
// 便捷方法（兼容旧代码）
// ============================================================

/** 获取单个音色详情（通过批量接口） */
export async function getVoiceDetail(voiceId: string): Promise<Voice> {
  const voices = await getVoicesByIds([voiceId]);
  if (voices.length === 0) throw new Error(`Voice ${voiceId} not found`);
  return voices[0];
}

/** 搜索音色（通过 explore 接口的 keyword） */
export async function searchVoices(params: {
  query: string;
  filters?: {
    language?: string;
    gender?: string;
    age?: string;
  };
}): Promise<VoiceListResponse> {
  return getPublicVoices({
    keyword: params.query,
    language_type: params.filters?.language,
    gender: params.filters?.gender,
    age: params.filters?.age,
    limit: 50,
  });
}

/** 删除自定义音色 DELETE /v1/voices/{voice_id} */
export async function deleteVoice(voiceId: string): Promise<{ voice_id: string; display_name: string }> {
  const response = await apiClient.delete(`/v1/voices/${voiceId}`);
  return response as any;
}
