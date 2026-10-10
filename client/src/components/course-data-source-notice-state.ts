import type { IAcademyCourseDataSourceStatus } from '@shared/api.interface';

export type CourseCatalogDataSourceStatus = Pick<
  IAcademyCourseDataSourceStatus,
  'courses'
>;

export function shouldShowCourseDataSourceNotice(
  dataSource: CourseCatalogDataSourceStatus | null,
  requestFailed = false,
): boolean {
  if (requestFailed) return true;
  if (!dataSource) return false;
  if (dataSource.courses.state === 'unavailable') return true;
  return false;
}
