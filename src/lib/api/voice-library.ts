import { apiClient } from './client';
import type { Voice, VoiceListResponse } from '@/types/api';

// Voice Library API封装
// 端点: GET /api/v1/voices  (API Key 认证)
// 注意: skip 参数为页码(0=第一页)，非偏移量; API 不支持服务端语言筛选，需客户端过滤
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
// 语言标签映射（API 的 labels 第一字段为语言）
// ============================================================

const LANGUAGE_LABEL_MAP: Record<string, string> = {
  zh: '中文', cn: '中文', chinese: '中文', '中文': '中文',
  ja: '日本語', jp: '日本語', japanese: '日本語', '日本語': '日本語',
  en: 'English', english: 'English',
  ko: '한국어', korean: '한국어',
};

/** 判断音色 labels 是否包含目标语言 */
function matchesLanguage(voice: Voice, language: string): boolean {
  const target = LANGUAGE_LABEL_MAP[language.toLowerCase()] || language;
  const labels = typeof voice.labels === 'string' ? voice.labels : '';
  return labels.includes(target);
}

// ============================================================
// 内部缓存：一次性拉取全部 built-in 音色（避免多次请求）
// ============================================================

let _builtInCache: Voice[] | null = null;
let _builtInCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function getAllBuiltInVoices(): Promise<Voice[]> {
  if (_builtInCache && Date.now() - _builtInCacheTime < CACHE_TTL) {
    return _builtInCache;
  }

  const allVoices: Voice[] = [];
  const PAGE_SIZE = 100;

  for (let page = 0; page < 10; page++) {
    try {
      const response = await apiClient.get('/api/v1/voices', {
        params: { voice_type: 'built-in', skip: page, limit: PAGE_SIZE },
      });
      const data = normalizeVoiceList(response);
      allVoices.push(...data.voices);
      if (data.voices.length < PAGE_SIZE) break;
    } catch {
      break;
    }
  }

  _builtInCache = allVoices;
  _builtInCacheTime = Date.now();
  console.log(`Voice Library: cached ${allVoices.length} built-in voices`);
  return allVoices;
}

// ============================================================
// 公共音色库（Built-in voices）
// GET /api/v1/voices?voice_type=built-in
// ============================================================

export async function getPinnedVoices(language = 'en'): Promise<Voice[]> {
  const all = await getAllBuiltInVoices();
  const filtered = language ? all.filter(v => matchesLanguage(v, language)) : all;
  return filtered.slice(0, 10);
}

export async function getPublicVoices(params?: VoiceLibraryQueryParams): Promise<VoiceListResponse> {
  const all = await getAllBuiltInVoices();

  let filtered = all;

  // 客户端语言过滤（API 不支持服务端过滤）
  if (params?.language_type) {
    filtered = filtered.filter(v => matchesLanguage(v, params.language_type!));
  }

  // 客户端性别过滤
  if (params?.gender) {
    const genderMap: Record<string, string[]> = {
      male: ['男', '男性'], female: ['女', '女性'], neutral: ['中性'],
    };
    const targets = genderMap[params.gender.toLowerCase()] || [params.gender];
    filtered = filtered.filter(v => {
      const labels = typeof v.labels === 'string' ? v.labels : '';
      return targets.some(t => labels.includes(t));
    });
  }

  // 客户端年龄过滤
  if (params?.age) {
    const ageMap: Record<string, string[]> = {
      child: ['儿童', '子供', '少年', '少女'],
      young_adult: ['青年', '若者'],
      adult: ['中年', '成人'],
      elderly: ['老年', '高齢'],
    };
    const targets = ageMap[params.age.toLowerCase()] || [params.age];
    filtered = filtered.filter(v => {
      const labels = typeof v.labels === 'string' ? v.labels : '';
      return targets.some(t => labels.includes(t));
    });
  }

  // 客户端场景过滤
  if (params?.scene) {
    const scenes = params.scene.split(',').map(s => s.trim().toLowerCase());
    filtered = filtered.filter(v => {
      const labels = typeof v.labels === 'string' ? v.labels.toLowerCase() : '';
      return scenes.some(s => labels.includes(s));
    });
  }

  // 客户端关键词过滤
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(v => {
      const labels = typeof v.labels === 'string' ? v.labels.toLowerCase() : '';
      const name = v.display_name?.toLowerCase() || '';
      return labels.includes(kw) || name.includes(kw);
    });
  }

  const skip = params?.skip ?? 0;
  const limit = params?.limit ?? 20;
  const paged = filtered.slice(skip * limit, skip * limit + limit);

  return { total_count: filtered.length, voices: paged };
}

// ============================================================
// 我的音色（Custom voices）
// GET /api/v1/voices?voice_type=custom
// ============================================================

export async function getMyVoices(params?: VoiceLibraryQueryParams): Promise<VoiceListResponse> {
  const response = await apiClient.get('/api/v1/voices', {
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
// GET /api/v1/voices/{voice_id}
// ============================================================

export async function getVoicesByIds(voiceIds: string[]): Promise<Voice[]> {
  if (voiceIds.length === 0) return [];
  const promises = voiceIds.map(async (id) => {
    try {
      const response = await apiClient.get(`/api/v1/voices/${id}`);
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

/** 删除自定义音色 DELETE /api/v1/voices/{voice_id} */
export async function deleteVoice(voiceId: string): Promise<{ voice_id: string; display_name: string }> {
  const response = await apiClient.delete(`/api/v1/voices/${voiceId}`);
  return response as any;
}
