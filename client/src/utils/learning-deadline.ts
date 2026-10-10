const DAY_MS = 24 * 60 * 60 * 1000;

export type LearningDeadlineStatus =
  | 'unavailable'
  | 'not_activated'
  | 'on_track'
  | 'due_soon'
  | 'overdue'
  | 'completed'
  | 'completed_late'
  | 'not_applicable';

export interface LearningDeadlineFields {
  deadlineAt?: string;
  deadlineStatus?: LearningDeadlineStatus;
  deadlineStartedAt?: string;
}

export interface LearningDeadlineView {
  deadlineLabel: string | null;
  startedLabel: string | null;
  statusLabel: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
}

export interface LearningDeadlineSortItem extends LearningDeadlineFields {
  status: string;
  assignedAt?: string;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format a server ISO date in the user's local timezone without locale drift. */
export function formatLearningDeadline(
  value: string | undefined,
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(' ');
}

export function getLearningDeadlineRemainingDays(
  deadlineAt: string | undefined,
  now: Date = new Date(),
): number | null {
  const deadline = parseDate(deadlineAt);
  if (!deadline || Number.isNaN(now.getTime())) return null;
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS));
}

export function validateLearningDeadlineExtension(
  currentDeadlineAt: string,
  nextDeadlineAt: string,
  now: Date = new Date(),
): string | null {
  const currentDeadline = parseDate(currentDeadlineAt);
  const nextDeadline = parseDate(nextDeadlineAt);
  if (!currentDeadline) return '当前截止时间无效，请刷新后重试';
  if (!nextDeadline) return '请输入有效的截止时间';
  if (Number.isNaN(now.getTime()) || nextDeadline.getTime() <= now.getTime()) {
    return '延期后的截止时间必须晚于当前时间';
  }
  if (nextDeadline.getTime() <= currentDeadline.getTime()) {
    return '延期后的截止时间必须晚于当前截止时间';
  }
  return null;
}

function statusLabel(
  status: LearningDeadlineStatus | undefined,
  remainingDays: number | null,
  hasDeadline: boolean,
): Pick<LearningDeadlineView, 'statusLabel' | 'tone'> {
  if (status === 'unavailable') {
    return { statusLabel: '截止时间暂不可用，请稍后刷新', tone: 'warning' };
  }
  if (status === 'not_activated') {
    return { statusLabel: '首次登录后开始计时', tone: 'neutral' };
  }
  if (status === 'completed_late') {
    return { statusLabel: '逾期完成', tone: 'warning' };
  }
  if (status === 'completed') {
    return { statusLabel: '已完成', tone: 'positive' };
  }
  if (status === 'due_soon' && hasDeadline) {
    return { statusLabel: '48小时内到期', tone: 'warning' };
  }
  if (status === 'overdue' && hasDeadline) {
    return { statusLabel: '已逾期', tone: 'danger' };
  }
  if (status === 'on_track' && hasDeadline) {
    return {
      statusLabel:
        remainingDays === 0 ? '今日到期' : `剩余 ${remainingDays} 天`,
      tone: 'positive',
    };
  }
  return { statusLabel: '截止信息待同步', tone: 'neutral' };
}

export function getLearningDeadlineView(
  fields: LearningDeadlineFields,
  now: Date = new Date(),
): LearningDeadlineView | null {
  if (fields.deadlineStatus === 'not_applicable') return null;

  const deadlineLabel = formatLearningDeadline(fields.deadlineAt);
  const startedLabel = formatLearningDeadline(fields.deadlineStartedAt);
  const hasDeadline = deadlineLabel !== null;
  const remainingDays = getLearningDeadlineRemainingDays(
    fields.deadlineAt,
    now,
  );
  const hasAnyDeadlineData = Boolean(
    deadlineLabel || startedLabel || fields.deadlineStatus,
  );
  if (!hasAnyDeadlineData) return null;

  const label = statusLabel(fields.deadlineStatus, remainingDays, hasDeadline);
  return {
    deadlineLabel,
    startedLabel,
    ...label,
  };
}

export function isLearningAssignmentCompleted(
  item: Pick<LearningDeadlineSortItem, 'status' | 'deadlineStatus'>,
): boolean {
  return (
    item.status === 'completed' ||
    item.deadlineStatus === 'completed' ||
    item.deadlineStatus === 'completed_late'
  );
}

/** Required work is shown first when unfinished, then by the earliest known deadline. */
export function sortRequiredLearningAssignments<
  T extends LearningDeadlineSortItem,
>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const completionOrder =
      Number(isLearningAssignmentCompleted(left)) -
      Number(isLearningAssignmentCompleted(right));
    if (completionOrder !== 0) return completionOrder;

    const leftDeadline = parseDate(left.deadlineAt)?.getTime() ?? null;
    const rightDeadline = parseDate(right.deadlineAt)?.getTime() ?? null;
    if (leftDeadline !== null && rightDeadline === null) return -1;
    if (leftDeadline === null && rightDeadline !== null) return 1;
    if (leftDeadline !== null && rightDeadline !== null) {
      const deadlineOrder = leftDeadline - rightDeadline;
      if (deadlineOrder !== 0) return deadlineOrder;
    }

    const leftAssigned = parseDate(left.assignedAt)?.getTime() ?? null;
    const rightAssigned = parseDate(right.assignedAt)?.getTime() ?? null;
    if (leftAssigned !== null && rightAssigned !== null) {
      return leftAssigned - rightAssigned;
    }
    return 0;
  });
}
