import type {
  CourseRequirementOverride,
  CourseRequirementType,
} from './api.interface';

export interface CourseRequirementPolicy {
  courseSource: string;
  requirementOverride?: CourseRequirementOverride;
}

/** 唯一修读规则：管理员覆盖 > 自动来源/部门判断。所有下游功能须复用。 */
export function resolveCourseRequirement(
  course: CourseRequirementPolicy,
  matchesDepartment = false,
): CourseRequirementType {
  if (course.requirementOverride === 'required') return 'required';
  if (course.requirementOverride === 'elective') return 'elective';
  return course.courseSource.trim() === '官方' || matchesDepartment
    ? 'required'
    : 'elective';
}

export const REQUIREMENT_OVERRIDE_LABELS: Record<
  CourseRequirementOverride,
  string
> = {
  auto: '按规则自动判断',
  required: '全员必修',
  elective: '全员选修',
};

export const REQUIREMENT_OVERRIDE_BASE_VALUES: Record<
  CourseRequirementOverride,
  string
> = {
  auto: '自动',
  required: '必修',
  elective: '选修',
};

export function parseRequirementOverride(
  value: unknown,
): CourseRequirementOverride {
  if (value === undefined || value === null || value === '' || value === '自动')
    return 'auto';
  if (value === '必修') return 'required';
  if (value === '选修') return 'elective';
  throw new Error('管理员修读要求无效，请管理员检查课程设置');
}
