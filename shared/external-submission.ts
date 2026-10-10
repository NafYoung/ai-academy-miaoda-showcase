import type { ICourseSubmission } from './api.interface';

/**
 * 外部学员没有 公司部门：投稿部门固定记为此值、部门 ID 留空。
 * 只由服务端在识别出外部学员时写入；员工投稿不能使用该部门名。
 */
export const EXTERNAL_SUBMISSION_DEPARTMENT = '外部学员';

/** 提交审核、审核通过与同步正式课程据此识别外部学员投稿。 */
export function isExternalSubmission(
  submission: Pick<
    ICourseSubmission,
    'department' | 'departmentId' | 'departmentOpenId'
  >,
): boolean {
  return (
    submission.department.trim() === EXTERNAL_SUBMISSION_DEPARTMENT &&
    !submission.departmentId.trim() &&
    !submission.departmentOpenId.trim()
  );
}
