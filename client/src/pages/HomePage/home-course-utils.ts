import type { IAcademyCourse } from '@shared/api.interface';

export const HOME_FEATURED_COURSE_LIMIT = 6;

const PUBLISHED_COURSE_STATUSES = new Set(['更新中', '已完结']);

function timestampFromCourse(course: IAcademyCourse): number | null {
  for (const source of [course.updatedAt, course.createdAt]) {
    if (!source) continue;
    const timestamp = Date.parse(source);
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return null;
}

export function isPublishedAcademyCourse(course: IAcademyCourse): boolean {
  return PUBLISHED_COURSE_STATUSES.has(course.status.trim());
}

/**
 * 首页只显示已上线课程，并按最近业务更新时间倒序排列。
 * 旧记录没有时间字段时保持 API 返回顺序，避免每次刷新发生漂移。
 */
export function selectHomeFeaturedCourses(
  courses: readonly IAcademyCourse[],
): IAcademyCourse[] {
  return courses
    .map((course: IAcademyCourse, index: number) => ({ course, index }))
    .filter(({ course }: { course: IAcademyCourse; index: number }) =>
      isPublishedAcademyCourse(course),
    )
    .sort(
      (
        left: { course: IAcademyCourse; index: number },
        right: { course: IAcademyCourse; index: number },
      ) => {
        const leftTimestamp = timestampFromCourse(left.course);
        const rightTimestamp = timestampFromCourse(right.course);

        if (leftTimestamp === null && rightTimestamp === null) {
          return left.index - right.index;
        }
        if (leftTimestamp === null) return 1;
        if (rightTimestamp === null) return -1;
        if (leftTimestamp !== rightTimestamp) {
          return rightTimestamp - leftTimestamp;
        }
        return left.index - right.index;
      },
    )
    .slice(0, HOME_FEATURED_COURSE_LIMIT)
    .map(({ course }: { course: IAcademyCourse; index: number }) => course);
}
