import type {
  CourseRequirementOverride,
  CourseRequirementType,
  IAcademyCourse,
  IManagedCourse,
} from '@shared/api.interface';
import {
  REQUIREMENT_OVERRIDE_LABELS,
  resolveCourseRequirement,
} from '@shared/course-requirement';

export type SettingKind = 'cover' | 'instructors' | 'source' | 'requirement';
export type ResourceSource = 'internal' | 'external';

export interface AdminSettingDraft {
  coverUrl: string;
  instructorUserIds: string[];
  resourceSource: ResourceSource;
  requirementOverride: CourseRequirementOverride;
}

export function resourceSourceFromCourse(courseSource: string): ResourceSource {
  return courseSource === '内部' ? 'internal' : 'external';
}

export function sourceSummary(
  courseSource: string,
  resourceSource: ResourceSource,
): string {
  if (courseSource === '官方' && resourceSource === 'external') {
    return '外部资源（官方课程）';
  }
  if (courseSource === '合作方' && resourceSource === 'external') {
    return '外部资源（合作方）';
  }
  return resourceSource === 'internal' ? '内部资源' : '外部资源';
}

export function sourceOptionDescription(
  courseSource: string,
  resourceSource: ResourceSource,
  requirementOverride: CourseRequirementOverride = 'auto',
): string {
  if (requirementOverride === 'required') {
    return '管理员已设为全员必修；资源来源变化不会改变全员必修要求。';
  }
  if (requirementOverride === 'elective') {
    return '管理员已设为全员选修；资源来源变化不会恢复全员或部门必修要求。';
  }
  if (resourceSource === 'internal') {
    return '公司内部课程，保留部门必修要求；其他员工自主选学。';
  }
  return courseSource === '官方'
    ? '外部资源；已有官方课程继续保留全员必修。'
    : '外部资源，不自动成为全员必修。';
}

export function draftFromCourse(
  course: IManagedCourse['course'],
): AdminSettingDraft {
  return {
    coverUrl: course.coverUrl.trim(),
    instructorUserIds: [...(course.instructorUserIds ?? [])],
    resourceSource: resourceSourceFromCourse(course.courseSource),
    requirementOverride: course.requirementOverride ?? 'auto',
  };
}

export function sameIds(left: string[], right: string[]): boolean {
  return [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

export function describeSourceChange(
  courseSource: string,
  resourceSource: ResourceSource,
  requirementOverride: CourseRequirementOverride = 'auto',
): string {
  if (requirementOverride === 'required') {
    return '当前为全员必修。来源归属可以变化，但不会取消全员必修或停止必修提醒；已有学习进度保留。';
  }
  if (requirementOverride === 'elective') {
    return '当前为全员选修。来源归属可以变化，但不会重新启用全员或部门必修提醒；已有学习进度保留。';
  }
  if (resourceSource === 'internal' && courseSource === '官方') {
    return '改为内部资源会取消全员必修，保留部门要求和已有学习进度；未开始且不再需要必修的任务将结束。';
  }
  if (resourceSource === 'external' && courseSource === '内部') {
    return '改为外部资源后，现有部门必修要求会保留，不会增加全员必修。';
  }
  if (courseSource === '官方') {
    return '已有官方课程会继续保留官方归属和全员必修规则。';
  }
  return '资源归属保存后立即生效；未上线课程不会因此自动上架。';
}

export function requirementOverrideLabel(
  requirementOverride: CourseRequirementOverride,
): string {
  return REQUIREMENT_OVERRIDE_LABELS[requirementOverride];
}

export function describeRequirementChange(
  currentOverride: CourseRequirementOverride,
  nextOverride: CourseRequirementOverride,
): string {
  if (currentOverride === nextOverride) {
    return '规则没有变化；重新保存会重试学习任务同步，已有学习进度保留。';
  }
  if (nextOverride === 'required') {
    return '切换为全员必修后，平台会为员工创建或恢复必修学习任务；提醒功能启用后按必修规则处理；已有学习进度保留。';
  }
  if (nextOverride === 'elective') {
    return '切换为全员选修后，平台会停止必修提醒并保留已有学习进度；员工仍可自主报名学习。';
  }
  return '切换为按规则自动判断后，恢复官方来源与部门规则：官方课程全员必修，命中部门规则的课程部门必修；不再需要必修的未开始任务会结束，已有学习进度保留。';
}

/** 卡片和详情页共用：管理员手动覆盖优先于旧的个人任务类型。 */
export function displayedRequirementType(
  course: Pick<
    IAcademyCourse,
    'courseSource' | 'requirementType' | 'requirementOverride'
  >,
  personalRequirementType?: CourseRequirementType,
): CourseRequirementType {
  if (course.requirementOverride === 'required') return 'required';
  if (course.requirementOverride === 'elective') return 'elective';
  return personalRequirementType ?? resolveCourseRequirement(course);
}

export function displayedRequirementLabel(
  course: Pick<
    IAcademyCourse,
    'courseSource' | 'requirementType' | 'requirementOverride'
  >,
  personalRequirementType?: CourseRequirementType,
): string {
  const displayType = displayedRequirementType(course, personalRequirementType);
  if (course.requirementOverride === 'required') return '全员必修';
  if (course.requirementOverride === 'elective') return '全员选修';
  if (personalRequirementType === 'required') {
    return course.courseSource === '官方' ? '全员必修' : '部门必修';
  }
  if (personalRequirementType === 'elective') return '选修课';
  if (displayType === 'required') {
    return course.courseSource === '官方' ? '全员必修' : '部门必修';
  }
  return course.courseSource === '内部' ? '部门范围制' : '选修课程';
}
