import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  IAcademyCourse,
  IAcademyCourseListResponse,
  ILesson,
  IAcademyCoverResponse,
} from '@shared/api.interface';
import { academyCoverResolutionPath } from '../utils/academy-cover';
import { academyCoverCache } from '../utils/academy-cover-cache';
import { ACADEMY_COVER_REFERENCE_MODE } from '../../../shared/api.interface';

export async function resolveAcademyCover(
  src: string,
  signal?: AbortSignal,
  cacheScope = '',
): Promise<string> {
  const path = academyCoverResolutionPath(src);
  if (!path) throw new Error('无效的课程封面引用');
  return academyCoverCache.resolve(src, cacheScope, async () => {
    // 有身份的并发调用共享请求；单个组件卸载只停止自己的展示，不取消其他消费者。
    const response = await axiosForBackend({
      url: path,
      method: 'GET',
      ...(cacheScope ? {} : { signal }),
    });
    const data: IAcademyCoverResponse = response.data;
    if (
      !data ||
      typeof data.url !== 'string' ||
      new URL(data.url).protocol !== 'https:'
    ) {
      throw new Error('无效的课程封面地址');
    }
    return data.url;
  });
}

export async function getCoursesWithStatus(params?: {
  search?: string;
}): Promise<IAcademyCourseListResponse> {
  try {
    const query = new URLSearchParams();
    query.set('coverMode', ACADEMY_COVER_REFERENCE_MODE);
    if (params?.search) query.set('search', params.search);
    const url = `/api/academy/courses${query.toString() ? `?${query}` : ''}`;
    const response = await axiosForBackend({ url, method: 'GET' });
    return response.data;
  } catch (error) {
    logger.error('获取课程列表及数据源状态失败', error);
    throw error;
  }
}

export async function getCourses(params?: {
  search?: string;
}): Promise<IAcademyCourse[]> {
  const result = await getCoursesWithStatus(params);
  if (result.dataSource.courses.state === 'unavailable') {
    throw new Error('ACADEMY_COURSE_DATA_SOURCE_UNAVAILABLE');
  }
  return result.courses;
}

export async function getCourseById(
  id: string,
): Promise<IAcademyCourse | null> {
  try {
    const response = await axiosForBackend({
      url: `/api/academy/courses/${id}`,
      method: 'GET',
      params: { coverMode: ACADEMY_COVER_REFERENCE_MODE },
    });
    return response.data;
  } catch (error) {
    logger.error('获取课程详情失败', error);
    throw error;
  }
}

export async function getLessons(courseId: string): Promise<ILesson[]> {
  try {
    const response = await axiosForBackend({
      url: `/api/academy/courses/${courseId}/lessons`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取课时列表失败', error);
    throw error;
  }
}
