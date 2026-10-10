import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleDemoRequest } from '@demo/backend/router';

/** 所有 /api 请求在浏览器内由演示后端处理，不发出任何网络请求。 */
export async function axiosForBackend<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const method = (config.method ?? 'GET').toUpperCase();
  const url = config.url ?? '';
  const { status, data } = await handleDemoRequest(method, url, config.data, config.params);
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse<T>;
  if (status >= 400) {
    throw Object.assign(new Error((data as { message?: string })?.message ?? `请求失败（${status}）`), {
      isAxiosError: true,
      response,
      config,
    });
  }
  return response;
}

export function getAxiosForBackend() {
  return {
    get: <T = any>(url: string, config?: AxiosRequestConfig) => axiosForBackend<T>({ ...config, url, method: 'GET' }),
    post: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) => axiosForBackend<T>({ ...config, url, data, method: 'POST' }),
  };
}
