import axios, { type AxiosResponse, type AxiosError } from 'axios';

// API配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_KEY = import.meta.env.VITE_API_KEY || '';
export const API_TIMEOUT = 30000; // 30秒

// ====== 共享响应拦截器 ======
function handleResponse(response: AxiosResponse) {
  const data = response.data;

  // Blob 响应（音频流等）直接返回
  if (data instanceof Blob) {
    return data;
  }

  // 标准 JSON 包装格式: { code, message, data }
  if (data && typeof data === 'object' && 'code' in data) {
    if (data.code !== 0) {
      const err = new Error(data.message || 'API error');
      (err as any).code = data.code;
      return Promise.reject(err);
    }
    // 解包返回 data 字段（可能为 undefined，例如纯 success 响应）
    return data.data !== undefined ? data.data : data;
  }

  // 其他格式直接返回
  return data;
}

function handleError(error: AxiosError) {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 401:
        console.error('API认证失败，请检查API Key或Access Token');
        break;
      case 403:
        console.error('无权限访问');
        break;
      case 429:
        console.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        console.error('服务器错误：', (data as any)?.message);
        break;
      default:
        console.error('API错误：', (data as any)?.message || error.message);
    }

    return Promise.reject(data || error);
  }

  if (error.request) {
    console.error('网络错误，请检查网络连接');
    return Promise.reject(new Error('网络错误'));
  }

  return Promise.reject(error);
}

// ====== apiClient: 开发者 API（API Key 认证，直连 noiz.ai）======
// 用于 /v2/text-to-speech 等公开接口
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (API_KEY) {
      config.headers.Authorization = API_KEY;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(handleResponse, handleError);

// ====== internalClient: 内部 API（Vite Proxy + cookie 认证）======
// 用于 /api/v2/ 端点（emotion-enhance, voice-design 等）
// 请求发到本地 Vite dev server，由 proxy 转发到 noiz.ai 并注入 cookie
export const internalClient = axios.create({
  timeout: 180000, // 3分钟（voice-design 生成较慢）
  headers: {
    'Content-Type': 'application/json',
  },
});

internalClient.interceptors.response.use(handleResponse, handleError);
