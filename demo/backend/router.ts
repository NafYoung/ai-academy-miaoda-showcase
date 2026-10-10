import type {
  AdminCourseStatus,
  IAcademyCourse,
  ICourseAdminSettingsUpdateInput,
  ICourseContentUpdateInput,
  ICourseQuiz,
  ICourseQuizAdminDraft,
  ICourseQuizAdminStatus,
  ICourseQuizAnswerInput,
  ICourseQuizDraftUpdateInput,
  ICourseSubmission,
  ICourseSubmissionDraftInput,
  ICourseSyncPreview,
  IAdminLearningMonitoringItem,
  ILearningAssignment,
  ILearningDeadlineExtensionInput,
  ILearningEventInput,
  ILearningProgress,
  ILearningTimeSessionUpdateInput,
  IManagedCourse,
  ISubmissionQuizQuestionsUpdateInput,
  ISubmissionReviewInput,
  LearningDeadlineStatus,
} from '@shared/api.interface';
import { resolveCourseRequirement } from '@shared/course-requirement';
import { getDemoUser, type DemoUser } from '@demo/identity';
import { DEPARTMENTS, PEOPLE, departmentName } from './directory';
import { AI_SOURCE_IDS, aiCandidatesFor } from './seed';
import {
  getState,
  hexDigest,
  nextId,
  nowIso,
  progressKey,
  quizVersion,
  saveState,
  type DemoState,
} from './store';

interface Ctx {
  params: string[];
  body: any;
  query: Record<string, string>;
  user: DemoUser;
  isAdmin: boolean;
  state: DemoState;
}

interface Result {
  status: number;
  data: unknown;
}

type Handler = (ctx: Ctx) => unknown;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

const LIVE_STATUSES = new Set(['已完结', '更新中']);
const DAY = 24 * 3600 * 1000;

// ---------- 通用规则 ----------

function findCourse(state: DemoState, id: string): IAcademyCourse {
  return state.courses.find((c) => c.id === id) ?? fail(404, '课程不存在或已删除');
}

function findSubmission(state: DemoState, id: string): ICourseSubmission {
  return state.submissions.find((s) => s.id === id) ?? fail(404, '投稿不存在');
}

function targetDepartmentIds(state: DemoState, courseId: string): string[] {
  return state.submissions
    .filter((s) => s.formalCourseRecordId === courseId)
    .flatMap((s) => s.targetDepartments.map((d) => d.openDepartmentId));
}

function requirementFor(state: DemoState, course: IAcademyCourse, departmentId: string) {
  return resolveCourseRequirement(course, targetDepartmentIds(state, course.id).includes(departmentId));
}

function withRequirement(state: DemoState, course: IAcademyCourse, departmentId: string): IAcademyCourse {
  return { ...course, requirementType: requirementFor(state, course, departmentId) };
}

function ownedCourseIds(state: DemoState, userId: string): Set<string> {
  return new Set(
    state.submissions
      .filter((s) => s.submitterUserId === userId && s.formalCourseRecordId)
      .map((s) => s.formalCourseRecordId),
  );
}

function managedCourses(ctx: Ctx): IManagedCourse[] {
  const owned = ownedCourseIds(ctx.state, ctx.user.userId);
  return ctx.state.courses
    .filter((c) => ctx.isAdmin || owned.has(c.id))
    .map((course) => ({
      course,
      permissions: {
        canEditContent: true,
        canManageQuiz: true,
        canManageLifecycle: ctx.isAdmin,
        canPublishQuiz: true,
      },
      revision: hexDigest(JSON.stringify(course)),
    }));
}

function managedCourse(ctx: Ctx, id: string): IManagedCourse {
  return managedCourses(ctx).find((m) => m.course.id === id) ?? fail(403, '没有当前课程的管理权限');
}

function requireAdmin(ctx: Ctx): void {
  if (!ctx.isAdmin) fail(403, '仅管理员可以进行此操作');
}

function personDepartment(userId: string): string {
  return PEOPLE.find((p) => p.userId === userId)?.departmentId ?? '';
}

function deadlineStatus(deadlineAt: string, completedAt: string | null): LearningDeadlineStatus {
  const deadline = Date.parse(deadlineAt);
  if (completedAt) return Date.parse(completedAt) > deadline ? 'completed_late' : 'completed';
  const left = deadline - Date.now();
  if (left < 0) return 'overdue';
  if (left < 3 * DAY) return 'due_soon';
  return 'on_track';
}

function assignmentsFor(state: DemoState, userId: string): ILearningAssignment[] {
  const departmentId = personDepartment(userId);
  const result: ILearningAssignment[] = [];
  for (const course of state.courses.filter((c) => LIVE_STATUSES.has(c.status))) {
    const requirementType = requirementFor(state, course, departmentId);
    const key = progressKey(userId, course.id);
    const enrolledAt = state.enrollments[key];
    if (requirementType !== 'required' && !enrolledAt) continue;
    const progress = state.progress[key];
    const id = `asg-${userId}-${course.id}`;
    const assignedAt = requirementType === 'required' ? '2026-09-20T01:00:00.000Z' : enrolledAt;
    const assignment: ILearningAssignment = {
      id,
      courseId: course.id,
      courseTitle: course.title,
      requirementType,
      assignmentSource: requirementType === 'required' ? 'required_auto' : 'elective_enrollment',
      status: progress?.status === 'completed' ? 'completed' : progress ? 'in_progress' : 'not_started',
      progressPercent: progress?.progressPercent ?? 0,
      assignedAt,
      lastActivityAt: progress?.lastActivityAt ?? '',
      matchedDepartmentId: targetDepartmentIds(state, course.id).includes(departmentId) ? departmentId : '',
      matchedDepartmentName: targetDepartmentIds(state, course.id).includes(departmentId) ? departmentName(departmentId) : '',
    };
    if (requirementType === 'required') {
      const deadlineAt = state.deadlineOverrides[id] ?? new Date(Date.parse(assignedAt) + 30 * DAY).toISOString();
      assignment.deadlineAt = deadlineAt;
      assignment.deadlineStartedAt = assignedAt;
      assignment.deadlineStatus = deadlineStatus(deadlineAt, progress?.status === 'completed' ? progress.lastActivityAt : null);
    } else {
      assignment.deadlineStatus = 'not_applicable';
    }
    result.push(assignment);
  }
  return result;
}

function touchProgress(ctx: Ctx, course: IAcademyCourse): ILearningProgress {
  const key = progressKey(ctx.user.userId, course.id);
  const existing = ctx.state.progress[key];
  if (existing) return existing;
  const created: ILearningProgress = {
    id: nextId('prog'),
    courseId: course.id,
    courseTitle: course.title,
    status: 'in_progress',
    progressPercent: 10,
    openedResources: [],
    lastResource: '',
    lastActivityAt: nowIso(),
    userId: ctx.user.userId,
    userName: ctx.user.name,
    quizVersion: '',
    correctQuestionNumbers: [],
    quizCorrectCount: 0,
    quizAttemptCount: 0,
    lastQuizAt: '',
  };
  ctx.state.progress[key] = created;
  return created;
}

function enrollmentStatus(ctx: Ctx, course: IAcademyCourse) {
  const requirementType = requirementFor(ctx.state, course, ctx.user.departmentId);
  const assignment = assignmentsFor(ctx.state, ctx.user.userId).find((a) => a.courseId === course.id) ?? null;
  return { courseId: course.id, requirementType, enrolled: Boolean(assignment), assignment };
}

function buildQuiz(ctx: Ctx, courseId: string): ICourseQuiz | null {
  const stored = ctx.state.quizzes[courseId];
  if (!stored) return null;
  const progress = ctx.state.progress[progressKey(ctx.user.userId, courseId)];
  const correct = new Set(progress?.quizVersion === stored.version ? progress.correctQuestionNumbers : []);
  const questions = stored.questions.map((q) => ({
    id: q.id,
    sequence: q.sequence,
    question: q.question,
    options: q.options,
    answeredCorrectly: correct.has(q.sequence),
    ...(correct.has(q.sequence) ? { review: { correctAnswer: q.correctAnswer, explanation: q.explanation } } : {}),
  }));
  const correctCount = questions.filter((q) => q.answeredCorrectly).length;
  return {
    courseId,
    version: stored.version,
    totalQuestions: questions.length,
    correctCount,
    remainingCount: questions.length - correctCount,
    completed: correctCount === questions.length,
    questions,
  };
}

function quizStatus(state: DemoState, course: IAcademyCourse): ICourseQuizAdminStatus {
  const draft = state.drafts[course.id];
  const quiz = state.quizzes[course.id];
  let preparationStatus: ICourseQuizAdminStatus['preparationStatus'];
  let lastError = '';
  if (draft) preparationStatus = 'draft';
  else if (quiz) preparationStatus = 'ready';
  else if (course.learningMode === 'self_study') preparationStatus = 'not_required';
  // 与原系统一致：官方课程可从课程资料由 AI 生成候选题；内部课程题目来自投稿。
  else if (course.courseSource === '官方') preparationStatus = 'missing';
  else if (course.courseSource === '内部') preparationStatus = 'awaiting_submission_questions';
  else preparationStatus = 'no_source';
  return {
    courseId: course.id,
    courseTitle: course.title,
    courseStatus: course.status,
    courseSource: course.courseSource,
    authoringSource: draft?.authoringSource ?? quiz?.authoringSource ?? 'manual',
    sourceUrl: course.docUrl,
    sourceType: course.docUrl ? 'document' : 'none',
    preparationStatus,
    questionCount: quiz?.questions.length ?? 0,
    version: quiz?.version ?? '',
    draftQuestionCount: draft?.questions.length ?? 0,
    draftVersion: draft?.version ?? '',
    lastError,
    lastGeneratedAt: draft?.generatedAt ?? '',
  };
}

function monitoringItems(state: DemoState): IAdminLearningMonitoringItem[] {
  const items: IAdminLearningMonitoringItem[] = [];
  for (const person of PEOPLE) {
    for (const a of assignmentsFor(state, person.userId)) {
      const key = progressKey(person.userId, a.courseId);
      const progress = state.progress[key];
      items.push({
        assignmentId: a.id,
        userId: person.userId,
        userName: person.name,
        courseId: a.courseId,
        courseTitle: a.courseTitle,
        requirementType: a.requirementType,
        assignmentSource: a.assignmentSource,
        matchedDepartmentId: a.matchedDepartmentId,
        matchedDepartmentName: a.matchedDepartmentName || departmentName(person.departmentId),
        assignedAt: a.assignedAt,
        activeDurationSeconds: state.activeSeconds[key] ?? 0,
        sessionCount: state.sessionCounts[key] ?? 0,
        progressPercent: a.progressPercent,
        status: a.status,
        quizCorrectCount: progress?.quizCorrectCount ?? 0,
        quizAttemptCount: progress?.quizAttemptCount ?? 0,
        lastResource: progress?.lastResource ?? '',
        lastActivityAt: a.lastActivityAt,
        reminderState: a.status === 'completed' ? 'completed' : a.deadlineStatus === 'due_soon' ? 'due' : 'delivery_disabled',
        reminderStage: a.deadlineStatus === 'due_soon' ? 'due_soon' : null,
        reminderDueAt: '',
        reminderLastSentAt: '',
        deadlineAt: a.deadlineAt,
        deadlineStartedAt: a.deadlineStartedAt,
        deadlineStatus: a.deadlineStatus,
      });
    }
  }
  return items;
}

// ---------- 路由表 ----------

const routes: Array<[string, RegExp, Handler]> = [];
const route = (method: string, pattern: string, handler: Handler): void => {
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, '([^/]+)')}$`);
  routes.push([method, regex, handler]);
};

// 身份与权限
route('GET', '/api/platform/session', ({ user, isAdmin }) => ({
  userId: user.userId,
  userName: user.name,
  roles: isAdmin ? ['admin'] : [],
  isAdmin,
  adminRoleConfigured: true,
}));
route('GET', '/api/platform/identity-probe', () => ({
  status: 'org_employee',
  organizationLabel: 'ATHENA 演示公司',
  tenantId: 'demo-tenant',
  userType: '_employee',
  userIdFormat: 'numeric',
  learningAccess: 'enabled',
  message: '演示账号已识别为公司员工。',
  privacyNote: '演示版不读取任何真实身份信息。',
}));
route('GET', '/api/platform/management-access', (ctx) => {
  const can = ctx.isAdmin || ownedCourseIds(ctx.state, ctx.user.userId).size > 0;
  return { canManageCourses: can, canManageCourseQuizzes: can };
});

// 课程目录
route('GET', '/api/academy/courses', ({ state, user, query }) => {
  const keyword = (query.search ?? '').trim();
  const courses = state.courses
    .filter((c) => LIVE_STATUSES.has(c.status))
    .filter((c) => !keyword || c.title.includes(keyword) || c.summary.includes(keyword) || c.tags.some((t) => t.includes(keyword)))
    .map((c) => withRequirement(state, c, user.departmentId));
  const fresh = { state: 'fresh', lastSuccessfulAt: state.catalogSyncedAt };
  return { courses, dataSource: { courses: fresh, series: fresh } };
});
route('GET', '/api/academy/courses/:id', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const manageable = managedCourses(ctx).some((m) => m.course.id === course.id);
  if (!LIVE_STATUSES.has(course.status) && !manageable) fail(404, '课程未上线');
  return withRequirement(ctx.state, course, ctx.user.departmentId);
});
route('GET', '/api/academy/courses/:id/lessons', () => []);
route('GET', '/api/academy/document-authorization/.*', () => fail(404, '演示版不提供飞书文档内嵌阅读，请从课程页打开公开链接。'));

// 学习
route('GET', '/api/platform/learning', ({ state, user }) =>
  Object.values(state.progress).filter((p) => p.userId === user.userId),
);
route('GET', '/api/platform/learning/assignments', ({ state, user }) => assignmentsFor(state, user.userId));
route('GET', '/api/platform/learning/:id/enrollment', (ctx) => enrollmentStatus(ctx, findCourse(ctx.state, ctx.params[0])));
route('POST', '/api/platform/learning/:id/enrollment', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const key = progressKey(ctx.user.userId, course.id);
  ctx.state.enrollments[key] ??= nowIso();
  return enrollmentStatus(ctx, course);
});
route('POST', '/api/platform/learning/:id/events', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const input = ctx.body as ILearningEventInput;
  const progress = touchProgress(ctx, course);
  if (!progress.openedResources.includes(input.eventType)) progress.openedResources.push(input.eventType);
  if (input.eventType !== 'view_course') progress.lastResource = input.eventType;
  if (progress.status !== 'completed') {
    progress.progressPercent = Math.max(progress.progressPercent, input.eventType === 'view_course' ? 10 : 50);
  }
  progress.lastActivityAt = nowIso();
  return progress;
});
route('POST', '/api/platform/learning/:id/complete', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const progress = touchProgress(ctx, course);
  progress.status = 'completed';
  progress.progressPercent = 100;
  if (!progress.openedResources.includes('mark_complete')) progress.openedResources.push('mark_complete');
  progress.lastActivityAt = nowIso();
  return progress;
});
route('POST', '/api/platform/learning/:id/time-sessions', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const key = progressKey(ctx.user.userId, course.id);
  const session = {
    sessionId: nextId('session'),
    userId: ctx.user.userId,
    courseId: course.id,
    state: 'active' as const,
    creditedSeconds: 0,
    lastSequence: 0,
    leaseToken: hexDigest(`${key}:${ctx.state.seq}`).slice(0, 32),
    serverStartedAt: nowIso(),
    lastCumulativeMs: 0,
  };
  ctx.state.sessions[session.sessionId] = session;
  ctx.state.sessionCounts[key] = (ctx.state.sessionCounts[key] ?? 0) + 1;
  const { userId: _u, lastCumulativeMs: _l, ...rest } = session;
  return { ...rest, heartbeatIntervalSeconds: 15 };
});
route('PATCH', '/api/platform/learning/:id/time-sessions/:sid', (ctx) => {
  const session = ctx.state.sessions[ctx.params[1]] ?? fail(404, '学习计时已结束，请刷新页面');
  const input = ctx.body as ILearningTimeSessionUpdateInput;
  const deltaMs = Math.max(0, Math.min(input.cumulativeActiveMs - session.lastCumulativeMs, 60_000));
  const deltaSeconds = Math.round(deltaMs / 1000);
  session.lastCumulativeMs = Math.max(session.lastCumulativeMs, input.cumulativeActiveMs);
  session.creditedSeconds += deltaSeconds;
  session.lastSequence = Math.max(session.lastSequence, input.sequence);
  session.state = input.action === 'pause' ? 'paused' : input.action === 'end' ? 'ended' : 'active';
  const key = progressKey(session.userId, session.courseId);
  ctx.state.activeSeconds[key] = (ctx.state.activeSeconds[key] ?? 0) + deltaSeconds;
  const { userId: _u, lastCumulativeMs: _l, ...rest } = session;
  return { ...rest, heartbeatIntervalSeconds: 15 };
});
route('GET', '/api/platform/learning/:id/quiz', (ctx) => buildQuiz(ctx, findCourse(ctx.state, ctx.params[0]).id));
route('POST', '/api/platform/learning/:id/quiz/answers', (ctx) => {
  const course = findCourse(ctx.state, ctx.params[0]);
  const stored = ctx.state.quizzes[course.id] ?? fail(404, '该课程暂未提供课后题');
  const input = ctx.body as ICourseQuizAnswerInput;
  const progress = touchProgress(ctx, course);
  if (progress.quizVersion !== stored.version) {
    progress.quizVersion = stored.version;
    progress.correctQuestionNumbers = [];
  }
  const results = input.answers.map((answer) => {
    const question = stored.questions.find((q) => q.id === answer.questionId) ?? fail(400, '题目已更新，请刷新页面');
    const correct = question.correctAnswer === answer.answer;
    if (correct && !progress.correctQuestionNumbers.includes(question.sequence)) {
      progress.correctQuestionNumbers.push(question.sequence);
    }
    return { questionId: question.id, correct };
  });
  progress.quizAttemptCount += 1;
  progress.quizCorrectCount = progress.correctQuestionNumbers.length;
  progress.lastQuizAt = nowIso();
  progress.lastActivityAt = progress.lastQuizAt;
  if (progress.correctQuestionNumbers.length === stored.questions.length) {
    progress.status = 'completed';
    progress.progressPercent = 100;
  } else if (progress.status !== 'completed') {
    progress.progressPercent = Math.max(progress.progressPercent, 50 + Math.round((40 * progress.quizCorrectCount) / stored.questions.length));
  }
  return { results, quiz: buildQuiz(ctx, course.id), progress };
});

// 投稿
route('GET', '/api/platform/submissions/mine', ({ state, user }) =>
  state.submissions.filter((s) => s.submitterUserId === user.userId),
);
route('POST', '/api/platform/submissions/drafts', (ctx) => {
  const input = (ctx.body ?? {}) as ICourseSubmissionDraftInput;
  const submission: ICourseSubmission = {
    title: '',
    summary: '',
    department: departmentName(ctx.user.departmentId),
    departmentId: ctx.user.departmentId,
    departmentOpenId: ctx.user.departmentId,
    targetDepartments: [],
    category: '',
    difficulty: '',
    docUrl: '',
    videoUrl: '',
    coverUrl: '',
    tags: [],
    ...input,
    instructor: ctx.user.name,
    id: nextId('sub'),
    instructorUserId: ctx.user.userId,
    status: 'draft',
    syncStatus: 'not_synced',
    quizSyncStatus: 'not_synced',
    quizSyncError: '',
    requiresQuiz: input.requiresQuiz ?? false,
    legacyAudience: '',
    formalCourseRecordId: '',
    submitterUserId: ctx.user.userId,
    submitterName: ctx.user.name,
    submittedAt: '',
    reviewNote: '',
  };
  ctx.state.submissions.unshift(submission);
  return submission;
});
route('PATCH', '/api/platform/submissions/:id/draft', (ctx) => {
  const submission = findSubmission(ctx.state, ctx.params[0]);
  if (submission.submitterUserId !== ctx.user.userId) fail(403, '只能修改自己的投稿');
  if (!['draft', 'rejected'].includes(submission.status)) fail(409, '已提交的投稿不能再修改');
  const { instructor: _ignored, ...changes } = (ctx.body ?? {}) as ICourseSubmissionDraftInput;
  Object.assign(submission, changes, { status: 'draft' });
  return submission;
});
route('POST', '/api/platform/submissions/cover-upload', (ctx) => {
  const file = ctx.body instanceof FormData ? ctx.body.get('file') : null;
  if (!(file instanceof File)) fail(400, '请选择图片文件');
  const url = URL.createObjectURL(file as File);
  return { coverUrl: url, previewUrl: url };
});
route('GET', '/api/platform/submissions/:id/questions', ({ state, params }) => state.submissionQuestions[params[0]] ?? []);
route('PUT', '/api/platform/submissions/:id/questions', (ctx) => {
  const submission = findSubmission(ctx.state, ctx.params[0]);
  if (submission.submitterUserId !== ctx.user.userId) fail(403, '只能修改自己的投稿');
  const input = ctx.body as ISubmissionQuizQuestionsUpdateInput;
  ctx.state.submissionQuestions[submission.id] = input.questions.map((q) => ({
    ...q,
    id: nextId('sq'),
    status: 'draft',
    formalQuestionRecordId: '',
    syncError: '',
  }));
  return ctx.state.submissionQuestions[submission.id];
});
route('POST', '/api/platform/submissions/:id/submit', (ctx) => {
  const submission = findSubmission(ctx.state, ctx.params[0]);
  if (submission.submitterUserId !== ctx.user.userId) fail(403, '只能提交自己的投稿');
  if (!submission.title.trim()) fail(400, '请先填写课程名称');
  submission.status = 'pending_review';
  submission.submittedAt = nowIso();
  submission.reviewNote = '';
  for (const q of ctx.state.submissionQuestions[submission.id] ?? []) q.status = 'pending_review';
  return submission;
});

// 管理后台：投稿审核与同步
route('GET', '/api/platform/admin/submissions', (ctx) => {
  requireAdmin(ctx);
  return ctx.state.submissions.filter((s) => s.status !== 'draft');
});
route('GET', '/api/platform/admin/submissions/:id/questions', (ctx) => {
  requireAdmin(ctx);
  return ctx.state.submissionQuestions[ctx.params[0]] ?? [];
});
route('PATCH', '/api/platform/admin/submissions/:id/references', (ctx) => {
  requireAdmin(ctx);
  const submission = findSubmission(ctx.state, ctx.params[0]);
  Object.assign(submission, { instructorUserId: ctx.body.instructorUserId, instructor: ctx.body.instructor });
  return submission;
});
route('PATCH', '/api/platform/admin/submissions/:id', (ctx) => {
  requireAdmin(ctx);
  const submission = findSubmission(ctx.state, ctx.params[0]);
  const input = ctx.body as ISubmissionReviewInput;
  if (submission.status !== 'pending_review') fail(409, '只有待审核的投稿可以审核');
  submission.status = input.action === 'approve' ? 'approved_pending_sync' : 'rejected';
  submission.reviewNote = input.note ?? '';
  if (input.instructor) submission.instructor = input.instructor;
  if (input.instructorUserId) submission.instructorUserId = input.instructorUserId;
  return submission;
});
route('GET', '/api/platform/admin/submissions/:id/sync-preview', (ctx): ICourseSyncPreview => {
  requireAdmin(ctx);
  const submission = findSubmission(ctx.state, ctx.params[0]);
  const alreadySynced = submission.syncStatus === 'synced';
  const questions = ctx.state.submissionQuestions[submission.id] ?? [];
  const blockingReasons: string[] = [];
  if (submission.status !== 'approved_pending_sync') blockingReasons.push('投稿尚未审核通过');
  if (submission.requiresQuiz && questions.length === 0) blockingReasons.push('投稿要求课后题，但还没有题目');
  return {
    submission,
    canSync: blockingReasons.length === 0 && !alreadySynced,
    alreadySynced,
    willRecoverExistingRecord: false,
    blockingReasons,
    warnings: ['同步后课程以「未上线」草稿进入课程库，需管理员确认后上线。'],
    targetFields: [
      { targetField: '课程名称', value: submission.title },
      { targetField: '简介', value: submission.summary },
      { targetField: '讲师', value: submission.instructor },
      { targetField: '来源', value: '内部' },
      { targetField: '状态', value: '未上线', note: '不会直接对员工可见' },
      { targetField: '适用部门', value: submission.targetDepartments.map((d) => d.name) },
      { targetField: '课后题', value: submission.requiresQuiz ? questions.length : 0 },
    ],
  };
});
route('POST', '/api/platform/admin/submissions/:id/sync', (ctx) => {
  requireAdmin(ctx);
  const submission = findSubmission(ctx.state, ctx.params[0]);
  if (submission.status !== 'approved_pending_sync') fail(409, '投稿尚未审核通过');
  if (submission.syncStatus === 'synced') {
    return {
      submissionId: submission.id,
      formalCourseRecordId: submission.formalCourseRecordId,
      courseTitle: submission.title,
      alreadySynced: true,
      recoveredExistingRecord: false,
      quizSyncStatus: submission.quizSyncStatus,
      quizQuestionCount: ctx.state.quizzes[submission.formalCourseRecordId]?.questions.length ?? 0,
    };
  }
  const courseId = nextId('demo-course');
  const course: IAcademyCourse = {
    id: courseId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    title: submission.title,
    categoryId: '',
    series: '',
    difficulty: submission.difficulty,
    summary: submission.summary,
    coverUrl: submission.coverUrl,
    status: '未上线',
    tags: submission.tags,
    topics: [],
    instructor: submission.instructor,
    instructorUserIds: submission.instructorUserId ? [submission.instructorUserId] : [],
    docUrl: submission.docUrl,
    videoUrl: submission.videoUrl,
    courseType: '单次课',
    sortOrder: ctx.state.courses.length,
    courseSource: '内部',
    requirementType: 'elective',
    requirementOverride: 'auto',
    learningMode: submission.requiresQuiz ? 'quiz' : 'self_study',
  };
  ctx.state.courses.push(course);
  const questions = ctx.state.submissionQuestions[submission.id] ?? [];
  // 与原系统一致：投稿题目同步后只进入待审核草稿，由上传人或管理员发布。
  if (submission.requiresQuiz && questions.length > 0) {
    ctx.state.drafts[courseId] = {
      courseId,
      courseTitle: course.title,
      courseSource: course.courseSource,
      authoringSource: 'manual',
      version: quizVersion('internal', questions.length),
      sourceUrl: course.docUrl,
      sourceType: course.docUrl ? 'document' : 'file',
      sourceLabel: course.title,
      courseGoal: course.summary,
      generatedAt: nowIso(),
      questions: questions.map((q, i) => ({
        id: `${courseId}-draft-q${i + 1}`,
        sequence: i + 1,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        evidence: q.evidence,
        learningPoint: q.learningPoint,
        relevanceLevel: 'core' as const,
        relevanceReason: '投稿人提供',
      })),
    };
    for (const q of questions) q.status = 'synced';
  }
  Object.assign(submission, {
    syncStatus: 'synced',
    formalCourseRecordId: courseId,
    quizSyncStatus: submission.requiresQuiz ? 'synced' : 'legacy',
  });
  return {
    submissionId: submission.id,
    formalCourseRecordId: courseId,
    courseTitle: course.title,
    alreadySynced: false,
    recoveredExistingRecord: false,
    quizSyncStatus: submission.quizSyncStatus,
    quizQuestionCount: ctx.state.drafts[courseId]?.questions.length ?? 0,
  };
});

// 管理后台：概览、课程治理
route('GET', '/api/platform/admin/overview', (ctx) => {
  requireAdmin(ctx);
  const subs = ctx.state.submissions.filter((s) => s.status !== 'draft');
  const progress = Object.values(ctx.state.progress);
  return {
    courseCount: ctx.state.courses.length,
    submissionCount: subs.length,
    pendingSubmissionCount: subs.filter((s) => s.status === 'pending_review').length,
    approvedSubmissionCount: subs.filter((s) => s.status === 'approved_pending_sync').length,
    rejectedSubmissionCount: subs.filter((s) => s.status === 'rejected').length,
    learnerCount: new Set(progress.map((p) => p.userId)).size,
    completedLearningCount: progress.filter((p) => p.status === 'completed').length,
    activeLearningCount: progress.filter((p) => p.status === 'in_progress').length,
  };
});
const catalogStatus = (state: DemoState) => ({
  state: 'ready',
  categoryCount: 0,
  courseCount: state.courses.length,
  lastSyncSource: 'manual',
  lastAttemptAt: state.catalogSyncedAt,
  lastSuccessfulAt: state.catalogSyncedAt,
  lastFailureReason: '',
  staleAfterHours: 24,
  aiUsed: false,
});
route('GET', '/api/platform/admin/course-catalog-sync', (ctx) => {
  requireAdmin(ctx);
  return catalogStatus(ctx.state);
});
route('POST', '/api/platform/admin/course-catalog-sync', (ctx) => {
  requireAdmin(ctx);
  ctx.state.catalogSyncedAt = nowIso();
  return { ...catalogStatus(ctx.state), changed: false };
});
route('GET', '/api/platform/admin/courses', (ctx) => {
  requireAdmin(ctx);
  return { courses: ctx.state.courses };
});
route('PATCH', '/api/platform/admin/courses/:id/status', (ctx) => {
  requireAdmin(ctx);
  const course = findCourse(ctx.state, ctx.params[0]);
  course.status = (ctx.body as { status: AdminCourseStatus }).status;
  course.updatedAt = nowIso();
  return course;
});
function deletionCounts(state: DemoState, courseId: string) {
  const progress = Object.values(state.progress).filter((p) => p.courseId === courseId);
  return {
    lessonRecords: 0,
    quizRecords: state.quizzes[courseId]?.questions.length ?? 0,
    learningAssignments: progress.length,
    learningDeadlines: progress.length,
    deadlineExtensions: 0,
    learningTimeSessions: Object.values(state.sessions).filter((s) => s.courseId === courseId).length,
    reminderLogs: 0,
    targetDepartments: targetDepartmentIds(state, courseId).length,
  };
}
route('GET', '/api/platform/admin/courses/:id/deletion-preview', (ctx) => {
  requireAdmin(ctx);
  const course = findCourse(ctx.state, ctx.params[0]);
  const blockingReasons = LIVE_STATUSES.has(course.status) ? ['课程仍在上线中，请先下架或归档，再删除。'] : [];
  const linked = ctx.state.submissions.filter((s) => s.formalCourseRecordId === course.id).length;
  return {
    course,
    counts: { ...deletionCounts(ctx.state, course.id), linkedSubmissions: linked },
    canDelete: blockingReasons.length === 0,
    blockingReasons,
    preservedSubmissionCount: linked,
    previewToken: hexDigest(`delete:${course.id}:${course.updatedAt}`),
  };
});
route('DELETE', '/api/platform/admin/courses/:id', (ctx) => {
  requireAdmin(ctx);
  const course = findCourse(ctx.state, ctx.params[0]);
  if (ctx.body?.confirmationText !== course.title) fail(400, '确认文字与课程名称不一致');
  if (ctx.body?.previewToken !== hexDigest(`delete:${course.id}:${course.updatedAt}`)) fail(409, '课程已变化，请重新预览删除影响');
  if (LIVE_STATUSES.has(course.status)) fail(409, '课程仍在上线中，请先下架或归档');
  const deletedCounts = deletionCounts(ctx.state, course.id);
  const preserved = ctx.state.submissions.filter((s) => s.formalCourseRecordId === course.id).length;
  ctx.state.courses = ctx.state.courses.filter((c) => c.id !== course.id);
  for (const key of Object.keys(ctx.state.progress)) if (key.endsWith(`:${course.id}`)) delete ctx.state.progress[key];
  delete ctx.state.quizzes[course.id];
  delete ctx.state.drafts[course.id];
  return { courseId: course.id, courseTitle: course.title, deletedAt: nowIso(), deletedCounts, preservedSubmissionCount: preserved };
});

// 课程内容管理（上传人与管理员）
route('GET', '/api/platform/management/courses', (ctx) => ({ isAdmin: ctx.isAdmin, courses: managedCourses(ctx) }));
route('GET', '/api/platform/management/courses/:id', (ctx) => managedCourse(ctx, ctx.params[0]));
route('PATCH', '/api/platform/management/courses/:id', (ctx) => {
  const current = managedCourse(ctx, ctx.params[0]);
  const input = ctx.body as ICourseContentUpdateInput;
  if (input.revision !== current.revision) fail(409, '课程已被其他人修改，请刷新后重试');
  const course = findCourse(ctx.state, current.course.id);
  Object.assign(course, input.changes, { updatedAt: nowIso() });
  return { ...managedCourse(ctx, course.id), catalogSynced: true };
});
route('PATCH', '/api/platform/admin/courses/:id/settings', (ctx) => {
  requireAdmin(ctx);
  const current = managedCourse(ctx, ctx.params[0]);
  const input = ctx.body as ICourseAdminSettingsUpdateInput;
  if (input.revision !== current.revision) fail(409, '课程已被其他人修改，请刷新后重试');
  const course = findCourse(ctx.state, current.course.id);
  const change = input.change;
  if (change.kind === 'cover') course.coverUrl = change.coverUrl;
  if (change.kind === 'instructors') {
    course.instructorUserIds = change.userIds;
    course.instructor = change.userIds.map((id) => PEOPLE.find((p) => p.userId === id)?.name ?? '').filter(Boolean).join('、');
  }
  if (change.kind === 'source') course.courseSource = change.resourceSource === 'internal' ? '内部' : '官方';
  if (change.kind === 'requirement') course.requirementOverride = change.requirementOverride;
  course.updatedAt = nowIso();
  return { ...managedCourse(ctx, course.id), catalogSynced: true, assignmentsSynced: true };
});

// 题库：AI 候选题 → 人工审核 → 发布
route('GET', '/api/platform/admin/course-quizzes', (ctx) =>
  managedCourses(ctx).map((m) => quizStatus(ctx.state, m.course)),
);
route('GET', '/api/platform/admin/course-quiz-sources', (ctx) =>
  managedCourses(ctx)
    .filter((m) => m.course.docUrl)
    .map((m) => ({
      courseId: m.course.id,
      courseTitle: m.course.title,
      courseStatus: m.course.status,
      courseSource: m.course.courseSource,
      sourceType: 'document',
      sourceCount: 1,
    })),
);
route('POST', '/api/platform/admin/course-quizzes/:id/prepare', (ctx) => {
  const { course } = managedCourse(ctx, ctx.params[0]);
  const sourceIds: string[] = ctx.body?.sourceCourseIds?.length ? ctx.body.sourceCourseIds : [course.id];
  const candidates = aiCandidatesFor(sourceIds);
  if (!candidates) {
    const names = AI_SOURCE_IDS.map((id) => ctx.state.courses.find((c) => c.id === id)?.title).filter(Boolean).join('、');
    fail(422, `演示版不调用模型，只为「${names}」这份资料预置了 AI 候选题；请在出题资料里选择它。真实系统会读取所选资料生成。`);
  }
  const source = findCourse(ctx.state, sourceIds.find((id) => aiCandidatesFor([id]))!);
  const draft: ICourseQuizAdminDraft = {
    courseId: course.id,
    courseTitle: course.title,
    courseSource: course.courseSource,
    authoringSource: 'ai',
    version: quizVersion('ai', candidates!.length),
    sourceUrl: source.docUrl,
    sourceType: sourceIds.length > 1 ? 'collection' : 'document',
    sourceLabel: source.title,
    courseGoal: course.summary,
    generatedAt: nowIso(),
    questions: candidates!.map((q) => ({ ...q })),
  };
  ctx.state.drafts[course.id] = draft;
  return quizStatus(ctx.state, course);
});
route('GET', '/api/platform/admin/course-quizzes/:id/draft', (ctx) => {
  const { course } = managedCourse(ctx, ctx.params[0]);
  return ctx.state.drafts[course.id] ?? fail(404, '暂无待审核的题库草稿');
});
route('POST', '/api/platform/admin/course-quizzes/:id/revision', (ctx) => {
  const { course } = managedCourse(ctx, ctx.params[0]);
  const quiz = ctx.state.quizzes[course.id] ?? fail(404, '该课程还没有已发布的题库');
  const draft: ICourseQuizAdminDraft = {
    courseId: course.id,
    courseTitle: course.title,
    courseSource: course.courseSource,
    authoringSource: quiz.authoringSource,
    version: quizVersion('revision', quiz.questions.length),
    sourceUrl: course.docUrl,
    sourceType: course.docUrl ? 'document' : 'file',
    sourceLabel: course.title,
    courseGoal: course.summary,
    generatedAt: nowIso(),
    questions: quiz.questions.map((q) => ({ ...q, relevanceLevel: 'core', relevanceReason: '已发布题目' })),
  };
  ctx.state.drafts[course.id] = draft;
  return draft;
});
route('PATCH', '/api/platform/admin/course-quizzes/:id/draft', (ctx) => {
  const { course } = managedCourse(ctx, ctx.params[0]);
  const draft = ctx.state.drafts[course.id] ?? fail(404, '暂无待审核的题库草稿');
  const input = ctx.body as ICourseQuizDraftUpdateInput;
  if (input.version !== draft.version) fail(409, '草稿已更新，请刷新后重试');
  const byId = new Map(draft.questions.map((q) => [q.id, q]));
  draft.questions = input.questions.map((update, i) => ({ ...byId.get(update.id)!, ...update, sequence: i + 1 }));
  draft.version = quizVersion(draft.authoringSource === 'ai' || draft.authoringSource === 'ai_assisted' ? 'ai' : 'revision', draft.questions.length);
  if (draft.authoringSource === 'ai') draft.authoringSource = 'ai_assisted';
  return draft;
});
route('POST', '/api/platform/admin/course-quizzes/:id/publish', (ctx) => {
  const { course } = managedCourse(ctx, ctx.params[0]);
  const draft = ctx.state.drafts[course.id] ?? fail(404, '暂无待发布的题库草稿');
  if (ctx.body?.version !== draft.version) fail(409, '草稿已更新，请刷新后重试');
  ctx.state.quizzes[course.id] = {
    version: draft.version,
    authoringSource: draft.authoringSource === 'ai' ? 'ai_generated_confirmed' : draft.authoringSource === 'ai_assisted' ? 'ai_assisted' : 'manual',
    publishedAt: nowIso(),
    questions: draft.questions.map((q, i) => ({
      id: `${course.id}-${draft.version}-q${i + 1}`,
      sequence: i + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      evidence: q.evidence,
      learningPoint: q.learningPoint,
    })),
  };
  delete ctx.state.drafts[course.id];
  if (course.learningMode !== 'quiz') findCourse(ctx.state, course.id).learningMode = 'quiz';
  return quizStatus(ctx.state, course);
});

// 学习监控与组织同步
route('GET', '/api/platform/admin/learning', (ctx) => {
  requireAdmin(ctx);
  return Object.values(ctx.state.progress);
});
route('GET', '/api/platform/admin/learning-monitoring', (ctx) => {
  requireAdmin(ctx);
  const q = ctx.query;
  let items = monitoringItems(ctx.state);
  if (q.courseId) items = items.filter((i) => i.courseId === q.courseId);
  if (q.userId) items = items.filter((i) => i.userId === q.userId);
  if (q.status) items = items.filter((i) => i.status === q.status);
  if (q.requirementType) items = items.filter((i) => i.requirementType === q.requirementType);
  if (q.keyword) items = items.filter((i) => i.userName.includes(q.keyword) || i.courseTitle.includes(q.keyword));
  const page = Number(q.page ?? 1);
  const pageSize = Number(q.pageSize ?? 20);
  const all = monitoringItems(ctx.state);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
    summary: {
      activeEmployeeCount: PEOPLE.length,
      inactiveEmployeeCount: 0,
      requiredAssignmentCount: all.filter((i) => i.requirementType === 'required').length,
      electiveEnrollmentCount: all.filter((i) => i.requirementType === 'elective').length,
      notStartedCount: all.filter((i) => i.status === 'not_started').length,
      reminderDueCount: all.filter((i) => i.reminderState === 'due').length,
      reminderDeliveryEnabled: false,
      rosterLastSyncedAt: ctx.state.rosterSyncedAt,
    },
  };
});
route('PATCH', '/api/platform/admin/learning/assignments/:id/deadline', (ctx) => {
  requireAdmin(ctx);
  const input = ctx.body as ILearningDeadlineExtensionInput;
  if (!input.reason?.trim()) fail(400, '请填写延期原因');
  ctx.state.deadlineOverrides[decodeURIComponent(ctx.params[0])] = input.deadlineAt;
  return null;
});
route('GET', '/api/platform/admin/organization/status', (ctx) => {
  requireAdmin(ctx);
  return { activeDepartmentCount: DEPARTMENTS.length - 1, lastSyncedAt: ctx.state.orgSyncedAt, ready: true };
});
route('POST', '/api/platform/admin/organization/sync', (ctx) => {
  requireAdmin(ctx);
  ctx.state.orgSyncedAt = nowIso();
  return { activeDepartmentCount: ctx.body?.departments?.length ?? DEPARTMENTS.length - 1, inactiveDepartmentCount: 0, syncedAt: ctx.state.orgSyncedAt };
});
const rosterNumbers = (state: DemoState, incoming: number) => {
  const required = state.courses.filter((c) => LIVE_STATUSES.has(c.status) && resolveCourseRequirement(c) === 'required').length;
  return { incoming, required };
};
route('POST', '/api/platform/admin/employee-roster/preview', (ctx) => {
  requireAdmin(ctx);
  const { incoming, required } = rosterNumbers(ctx.state, ctx.body?.employees?.length ?? PEOPLE.length);
  return {
    previewToken: hexDigest(`roster:${incoming}`),
    incomingEmployeeCount: incoming,
    currentActiveEmployeeCount: PEOPLE.length,
    addEmployeeCount: Math.max(0, incoming - PEOPLE.length),
    updateEmployeeCount: 0,
    reactivateEmployeeCount: 0,
    unchangedEmployeeCount: Math.min(incoming, PEOPLE.length),
    inactivateEmployeeCount: Math.max(0, PEOPLE.length - incoming),
    incomingMembershipCount: incoming,
    activateMembershipCount: 0,
    inactivateMembershipCount: 0,
    employeeWithoutDepartmentCount: 0,
    requiredCourseCount: required,
    officialRequiredCourseCount: required,
    departmentRequiredCourseCount: 0,
  };
});
route('POST', '/api/platform/admin/employee-roster/sync', (ctx) => {
  requireAdmin(ctx);
  const { incoming, required } = rosterNumbers(ctx.state, ctx.body?.employees?.length ?? PEOPLE.length);
  ctx.state.rosterSyncedAt = nowIso();
  return {
    activeEmployeeCount: incoming,
    inactiveEmployeeCount: 0,
    requiredCourseCount: required,
    officialRequiredCourseCount: required,
    departmentRequiredCourseCount: 0,
    createdAssignmentCount: 0,
    updatedAssignmentCount: 0,
    syncedAt: ctx.state.rosterSyncedAt,
  };
});

// ---------- 入口 ----------

export async function handleDemoRequest(
  method: string,
  rawUrl: string,
  body: unknown,
  params?: Record<string, unknown>,
): Promise<Result> {
  // 模拟一点网络延迟，让加载态与真实系统一致。
  await new Promise((resolve) => setTimeout(resolve, 120));
  const url = new URL(rawUrl, 'https://athena.demo');
  const query: Record<string, string> = Object.fromEntries(url.searchParams.entries());
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) query[k] = String(v);
  const path = url.pathname.replace(/^\/app\/[^/]+/, '');
  const parsedBody = typeof body === 'string' ? safeJson(body) : body;
  const user = getDemoUser();
  for (const [m, regex, handler] of routes) {
    if (m !== method) continue;
    const match = regex.exec(path);
    if (!match) continue;
    try {
      const data = handler({
        params: match.slice(1).map(decodeURIComponent),
        body: parsedBody,
        query,
        user,
        isAdmin: user.role === 'admin',
        state: getState(),
      });
      saveState();
      return { status: 200, data: structuredClone(data ?? null) };
    } catch (error) {
      if (error instanceof HttpError) return { status: error.status, data: { message: error.message } };
      console.error('[athena-demo] handler failed', method, path, error);
      return { status: 500, data: { message: '演示后端出错了，可以点击左下角「重置演示」' } };
    }
  }
  return { status: 404, data: { message: `演示后端未实现：${method} ${path}` } };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
