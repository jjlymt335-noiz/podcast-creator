// AudioX T2S API — 音效生成
// 两步流程: POST /generate → 获取 task_id → GET /download/{task_id} → 获取音频
import axios from 'axios';

const AUDIOX_TIMEOUT = 300000; // 5 minutes (diffusion generation can be slow)

export const audioXClient = axios.create({
  timeout: AUDIOX_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

audioXClient.interceptors.response.use(
  (response) => {
    if (response.data instanceof Blob) {
      return response.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response) {
      console.error('AudioX API error:', error.response.status, error.response.data);
      const data = error.response.data;
      const msg = data?.message || data?.detail || (typeof data === 'string' ? data : `AudioX error ${error.response.status}`);
      return Promise.reject(new Error(msg));
    }
    if (error.request) {
      console.error('AudioX network error');
      return Promise.reject(new Error('Cannot connect to AudioX server'));
    }
    return Promise.reject(error);
  }
);

interface AudioXGenerateResponse {
  task_id: string;
  status: string;
  message: string;
  audio_url: string | null;
  duration: number | null;
  generation_time: number | null;
}

/**
 * Generate sound effect via AudioX T2S.
 * Two-step: POST /generate → GET /download/{task_id}
 * Returns a WAV audio Blob.
 */
export async function generateSoundEffect(params: {
  text: string;
  duration: number;
}): Promise<Blob> {
  // Step 1: 请求生成
  console.log('[AudioX] Generating SFX:', { text: params.text, duration: params.duration });
  console.log('[AudioX] POST /audiox/generate');
  const genResponse = await audioXClient.post('/audiox/generate', {
    task: 'T2A',
    prompt: params.text,
    duration: Math.min(params.duration, 10), // API 上限 10s
  }) as unknown as AudioXGenerateResponse;
  console.log('[AudioX] Generate response:', genResponse);

  if (genResponse.status !== 'completed' || !genResponse.audio_url) {
    throw new Error(genResponse.message || 'Audio generation failed');
  }

  // Step 2: 下载音频文件
  const audioResponse = await audioXClient.get(`/audiox${genResponse.audio_url}`, {
    responseType: 'blob',
  });

  return audioResponse as unknown as Blob;
}

/**
 * Check AudioX server health.
 */
export async function checkAudioXHealth(): Promise<{
  status: string;
  model_loaded: boolean;
  model_name: string;
  device: string | null;
}> {
  const response = await audioXClient.get('/audiox/health');
  return response as unknown as {
    status: string;
    model_loaded: boolean;
    model_name: string;
    device: string | null;
  };
}
