// AudioX T2S API — 音效生成
import axios from 'axios';

const AUDIOX_TIMEOUT = 120000; // 2 minutes (GPU generation is slow)

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
      return Promise.reject(error.response.data || error);
    }
    if (error.request) {
      console.error('AudioX network error');
      return Promise.reject(new Error('Cannot connect to AudioX server'));
    }
    return Promise.reject(error);
  }
);

/**
 * Generate sound effect via AudioX T2S.
 * Returns a WAV audio Blob.
 */
export async function generateSoundEffect(params: {
  text: string;
  duration: number;
}): Promise<Blob> {
  const response = await audioXClient.post('/audiox/generate', params, {
    responseType: 'blob',
  });
  return response as unknown as Blob;
}

/**
 * Check AudioX server health.
 */
export async function checkAudioXHealth(): Promise<{ status: string; model_loaded: boolean }> {
  const response = await audioXClient.get('/audiox/health');
  return response as unknown as { status: string; model_loaded: boolean };
}
