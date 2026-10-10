import type { ICourseQuizAdminStatus } from '@shared/api.interface';

export function managementErrorMessage(error: unknown): string {
  const requestError = error as {
    response?: { data?: { error?: { message?: unknown }; message?: unknown } };
    message?: unknown;
  } | null;
  const message: unknown =
    requestError?.response?.data?.error?.message ??
    requestError?.response?.data?.message ??
    requestError?.message;
  if (Array.isArray(message))
    return message.filter((item) => typeof item === 'string').join('；');
  return typeof message === 'string' && message.trim()
    ? message
    : '操作失败，请稍后重试';
}

export function courseStatusClasses(status: string): string {
  if (status === '已完结')
    return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === '更新中') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === '已下架') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (status === '归档') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-violet-100 bg-violet-50 text-violet-700';
}

export function quizStatusLabel(status?: ICourseQuizAdminStatus): string {
  if (!status) return '测试题状态待确认';
  if (status.preparationStatus === 'not_required')
    return '自主学习 · 无需测试题';
  if (status.preparationStatus === 'generating') return '测试题生成中';
  if (status.preparationStatus === 'draft') return '测试题草稿待审核';
  if (status.questionCount > 0) return `${status.questionCount} 道测试题已发布`;
  if (status.preparationStatus === 'failed') return '测试题生成失败';
  if (status.preparationStatus === 'unsupported_source')
    return '课程来源待确认';
  if (status.preparationStatus === 'awaiting_submission_questions')
    return '等待投稿题目同步';
  return '尚未准备测试题';
}
