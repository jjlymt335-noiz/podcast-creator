import { apiClient, internalClient } from './client';
import type {
  TTSRequest,
  TTSLongRequest,
  TTSLargeRequest,
  TTSBatchRequest,
  TTSBatchCandidate,
  GenProduct,
  TTSHistoryResponse,
  TTSProgressItem,
  TTSProgressResponse,
  TTSLargeResult,
  TTSSectionCandidate,
} from '@/types/api';

// ============================================================
// 工具函数：将对象转换为 FormData
// ============================================================
function toFormData(params: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (value instanceof File) {
      fd.append(key, value);
    } else if (typeof value === 'boolean') {
      fd.append(key, value.toString());
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}

// ============================================================
// 1.1 短文本 TTS（≤150字符）
// POST /v1/text-to-speech  (Form-Data → audio binary)
// 开发者 API，API Key 认证
// ============================================================
export async function textToSpeech(params: TTSRequest): Promise<Blob> {
  const fd = toFormData(params);
  const response = await apiClient.post<Blob>('/v1/text-to-speech', fd, {
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response as unknown as Blob;
}

// ============================================================
// 1.2 长文本 TTS（≤1000字符）
// POST /api/v1/text-to-speech-long  (Form-Data → audio binary)
// 内部 API，cookie 认证（通过 Vite Proxy）
// ============================================================
export async function textToSpeechLong(params: TTSLongRequest): Promise<Blob> {
  const fd = toFormData(params);
  const response = await internalClient.post<Blob>('/api/v1/text-to-speech-long', fd, {
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response as unknown as Blob;
}

// ============================================================
// 1.3 批量 TTS（多候选，≤150字符）
// POST /api/v1/text-to-speech-batch  (Form-Data → JSON)
// 内部 API，cookie 认证（通过 Vite Proxy）
// ============================================================
export async function textToSpeechBatch(params: TTSBatchRequest): Promise<TTSBatchCandidate[]> {
  const fd = toFormData(params);
  const response = await internalClient.post<TTSBatchCandidate[]>('/api/v1/text-to-speech-batch', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response as unknown as TTSBatchCandidate[];
}

// ============================================================
// 1.4 超长文本 TTS（异步任务）
// POST /api/v2/text-to-speech-large  (Form-Data → JSON)
// 内部 API v2，cookie 认证（通过 Vite Proxy）
// ============================================================
export async function textToSpeechLarge(params: TTSLargeRequest): Promise<{
  gen_product_id: string;
  status: string;
  sections: any[];
}> {
  const fd = toFormData(params);
  const response = await internalClient.post('/api/v2/text-to-speech-large', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response as any;
}

// ============================================================
// 1.5 获取超长文本 TTS 结果
// GET /api/v2/text-to-speech-large/gen_products/{gen_product_id}
// ============================================================
export async function getLargeResult(genProductId: string): Promise<TTSLargeResult> {
  const response = await internalClient.get<TTSLargeResult>(
    `/api/v2/text-to-speech-large/gen_products/${genProductId}`
  );
  return response as unknown as TTSLargeResult;
}

// ============================================================
// 1.6 获取超长文本 TTS 任务进度（批量）
// POST /api/v2/text-to-speech-large-progress  (JSON body)
// ============================================================
export async function getTTSLargeProgress(genProductIds: string[]): Promise<TTSProgressItem[]> {
  const response = await internalClient.post<TTSProgressItem[]>(
    '/api/v2/text-to-speech-large-progress',
    { gen_product_ids: genProductIds }
  );
  return response as unknown as TTSProgressItem[];
}

/** 单任务进度查询（封装批量接口） */
export async function getTTSProgress(genProductId: string): Promise<TTSProgressResponse> {
  const items = await getTTSLargeProgress([genProductId]);
  if (items.length === 0) {
    return {
      gen_product_id: genProductId,
      status: 'pending',
      progress: 0,
      file_path: '',
      fallbackurl: '',
      message: '',
    };
  }
  return items[0];
}

// ============================================================
// 1.7 停止超长文本 TTS 任务
// PUT /api/v2/text-to-speech-large-stop  (JSON body)
// ============================================================
export async function stopTTSLargeTask(genProductId: string): Promise<void> {
  await internalClient.put('/api/v2/text-to-speech-large-stop', {
    gen_product_id: genProductId,
  });
}

// ============================================================
// 1.8 单片段重新生成
// POST /api/v2/text-to-speech-large-regen  (Form-Data)
// ============================================================
export async function regenSection(params: {
  gen_product_id: string;
  section_id: string;
  text: string;
  quality_preset?: number;
  duration?: number;
  emotion_enh?: string;
  target_lang?: string;
  speed?: number;
  voice_id?: string;
  similarity_enh?: boolean;
  emo?: string;
  model_id?: string;
}): Promise<void> {
  const fd = toFormData(params);
  await internalClient.post('/api/v2/text-to-speech-large-regen', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ============================================================
// 1.9 获取片段候选集
// GET /api/v2/text-to-speech-large-candidates?section_id=xxx
// ============================================================
export async function getSectionCandidates(sectionId: string): Promise<{
  gen_products: TTSSectionCandidate[];
}> {
  const response = await internalClient.get('/api/v2/text-to-speech-large-candidates', {
    params: { section_id: sectionId },
  });
  return response as any;
}

// ============================================================
// 1.10 选择片段候选
// PUT /api/v2/text-to-speech-large-candidates  (JSON body)
// ============================================================
export async function selectSectionCandidate(sectionId: string, candidateId: string): Promise<void> {
  await internalClient.put('/api/v2/text-to-speech-large-candidates', {
    section_id: sectionId,
    section_candidate_id: candidateId,
  });
}

// ============================================================
// 1.11 合并所有片段
// PUT /api/v2/text-to-speech-large-concat  (JSON body)
// ============================================================
export async function concatAllSections(genProductId: string): Promise<void> {
  await internalClient.put('/api/v2/text-to-speech-large-concat', {
    gen_product_id: genProductId,
  });
}

// ============================================================
// 1.12 获取 TTS 历史记录
// GET /api/v1/text-to-speech-history?skip=0&limit=10
// ============================================================
export async function getTTSHistory(params?: {
  skip?: number;
  limit?: number;
}): Promise<TTSHistoryResponse> {
  const response = await internalClient.get<TTSHistoryResponse>('/api/v1/text-to-speech-history', {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 10,
    },
  });
  return response as unknown as TTSHistoryResponse;
}

// ============================================================
// 1.13 删除 TTS 历史记录
// DELETE /api/v1/text-to-speech/{gen_product_id}
// ============================================================
export async function deleteTTSHistory(genProductId: string): Promise<{ gen_product_id: string }> {
  const response = await internalClient.delete(`/api/v1/text-to-speech/${genProductId}`);
  return response as any;
}

// ============================================================
// 1.14 记录下载历史
// POST /api/v1/text-to-speech/download  (JSON body)
// ============================================================
export async function recordDownload(genProductId: string): Promise<void> {
  await internalClient.post('/api/v1/text-to-speech/download', {
    gen_product_id: genProductId,
  });
}

// ============================================================
// 1.15 点赞/取消点赞
// PUT /api/v1/text-to-speech/{gen_product_id}/like  (JSON body)
// ============================================================
export async function likeTTS(
  genProductId: string,
  type: 0 | 1,
  tags?: string[]
): Promise<void> {
  await internalClient.put(`/api/v1/text-to-speech/${genProductId}/like`, {
    type,
    tags,
  });
}

// ============================================================
// 1.16 情绪增强
// POST /api/v1/emotion-enhance（通过 Vite Proxy，cookie 认证）
// ============================================================
export async function emotionEnhance(text: string, language?: string): Promise<string> {
  const { enhanceEmotion } = await import('./emotion');
  return enhanceEmotion(text, language);
}

// ============================================================
// 轮询工具
// ============================================================
export async function pollTTSProgress(
  genProductId: string,
  onProgress?: (progress: TTSProgressResponse) => void,
  maxAttempts = 120,
  interval = 2000
): Promise<TTSProgressResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const progress = await getTTSProgress(genProductId);

    if (onProgress) {
      onProgress(progress);
    }

    if (progress.status === 'completed') {
      return progress;
    }

    if (progress.status === 'failed') {
      throw new Error(progress.message || 'TTS任务失败');
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('TTS任务超时');
}
