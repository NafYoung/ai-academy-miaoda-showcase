import type { AxiosRequestConfig } from 'axios';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export class CourseManagementAccessError extends Error {
  constructor() {
    super('没有当前操作的管理权限，请确认登录账号或联系管理员');
    this.name = 'CourseManagementAccessError';
  }
}

/** The platform SDK can resolve a 403 response after showing its own notice. */
export async function requestForManagement<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await axiosForBackend<T>(config);
    if (response.status === 403) throw new CourseManagementAccessError();
    if (response.status >= 400) {
      throw Object.assign(new Error('管理操作未完成，请稍后重试'), {
        response,
      });
    }
    return response.data;
  } catch (error: unknown) {
    const rejected = error as { response?: { status?: number } } | null;
    if (rejected?.response?.status === 403)
      throw new CourseManagementAccessError();
    throw error;
  }
}
