import { requestForManagement } from './management-request';
import type {
  ICourseContentUpdateInput,
  ICourseContentUpdateResult,
  ICourseAdminSettingsUpdateInput,
  ICourseAdminSettingsUpdateResult,
  IManagedCourse,
  IManagedCourseListResponse,
} from '@shared/api.interface';

export function getCourses(): Promise<IManagedCourseListResponse> {
  return requestForManagement({
    url: '/api/platform/management/courses',
    method: 'GET',
  });
}

export function getCourse(courseId: string): Promise<IManagedCourse> {
  return requestForManagement({
    url: `/api/platform/management/courses/${encodeURIComponent(courseId)}`,
    method: 'GET',
  });
}

export function updateCourse(
  courseId: string,
  input: ICourseContentUpdateInput,
): Promise<ICourseContentUpdateResult> {
  return requestForManagement({
    url: `/api/platform/management/courses/${encodeURIComponent(courseId)}`,
    method: 'PATCH',
    data: input,
  });
}

export function updateAdminSettings(
  courseId: string,
  input: ICourseAdminSettingsUpdateInput,
): Promise<ICourseAdminSettingsUpdateResult> {
  return requestForManagement({
    url: `/api/platform/admin/courses/${encodeURIComponent(courseId)}/settings`,
    method: 'PATCH',
    data: input,
  });
}
