import { internalClient } from './client';

// Smart Emotion API封装
// POST /api/v1/emotion-enhance（通过 Vite Proxy 转发，cookie 认证）

/**
 * 简易语言检测
 */
function detectLanguage(text: string): string {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const kana = (text.match(/[\u3040-\u30ff]/g) || []).length;
  const hangul = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;

  if (kana > 0) return 'ja';
  if (hangul > 0) return 'ko';
  if (cjk > 0 && cjk >= latin) return 'zh';
  return 'en';
}

/**
 * 情绪增强 - 分析文本并生成情绪标记
 * 返回格式: "[Joy#Joy:7;Surprise:3]:今天天气真好，我们去公园玩吧"
 */
export async function enhanceEmotion(text: string, language?: string): Promise<string> {
  const lang = language || detectLanguage(text);
  const response = await internalClient.post<{ emotion_enhance: string }>(
    '/api/v1/emotion-enhance',
    { text, language: lang }
  );
  return (response as any).emotion_enhance;
}

/**
 * 批量情绪增强 - 处理多段文本
 */
export async function batchEnhanceEmotion(texts: string[]): Promise<string[]> {
  const promises = texts.map((text) => enhanceEmotion(text));
  return Promise.all(promises);
}
