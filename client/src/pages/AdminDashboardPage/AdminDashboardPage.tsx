import SubmissionReferencesDialog from './SubmissionReferencesDialog';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  History,
  LockKeyhole,
  RefreshCw,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { useManagementSession } from '@/components/AdminRoute';
import { UserDisplay } from '@/components/business-ui/user-display';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserSelect } from '@/components/business-ui/user-select';
import { listUsersByIds } from '@/components/business-ui/api/users/service';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  IAdminLearningMonitoringItem,
  IAdminLearningMonitoringSummary,
  ICourseSubmission,
  ICourseSyncPreview,
  IPlatformAdminOverview,
  ISubmissionQuizQuestion,
} from '@shared/api.interface';
import {
  getLearningDeadlineView,
  isLearningAssignmentCompleted,
  type LearningDeadlineFields,
} from '@/utils/learning-deadline';
import CatalogSyncCard from './CatalogSyncCard';
import LearningDeadlineExtensionDialog, {
  type LearningDeadlineExtensionTarget,
} from './LearningDeadlineExtensionDialog';
import SubmissionQuizPreview from './SubmissionQuizPreview';
import { isExternalSubmission } from '@shared/external-submission';

type ReviewAction = 'approve' | 'reject';
type AdminLearningMonitoringItem = IAdminLearningMonitoringItem &
  LearningDeadlineFields & {
    assignmentId?: string;
  };

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${remainingSeconds}秒`;
  return `${remainingSeconds}秒`;
}

function reminderLabel(item: IAdminLearningMonitoringItem): string {
  if (item.requirementType === 'elective') return '选修不提醒';
  if (item.reminderState === 'completed') return '已完成，停止提醒';
  if (item.deadlineStatus === 'overdue') return '已逾期，不再自动催学';
  if (item.reminderState === 'delivery_disabled') return '待提醒（发送关闭）';
  if (item.reminderState === 'pending_confirmation') return '发送结果待核验';
  if (item.reminderState === 'due') return '待提醒';
  if (item.reminderState === 'sent') return '本阶段已提醒';
  if (item.reminderState === 'not_due') return '当前无待发提醒';
  return '不提醒';
}

function canExtendLearningDeadline(item: AdminLearningMonitoringItem): boolean {
  return Boolean(
    item.requirementType === 'required' &&
    item.assignmentId &&
    item.deadlineAt &&
    !Number.isNaN(Date.parse(item.deadlineAt)) &&
    !isLearningAssignmentCompleted(item),
  );
}

export default function AdminDashboardPage() {
  const session = useManagementSession();
  const [overview, setOverview] = useState<IPlatformAdminOverview | null>(null);
  const [submissions, setSubmissions] = useState<ICourseSubmission[]>([]);
  const [learning, setLearning] = useState<AdminLearningMonitoringItem[]>([]);
  const [learningTotal, setLearningTotal] = useState(0);
  const [learningSummary, setLearningSummary] =
    useState<IAdminLearningMonitoringSummary | null>(null);
  const [learningPage, setLearningPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<ICourseSubmission | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewInstructorUserId, setReviewInstructorUserId] = useState<
    string | null
  >(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<
    ISubmissionQuizQuestion[]
  >([]);
  const [reviewQuestionsLoading, setReviewQuestionsLoading] = useState(false);
  const [referenceTarget, setReferenceTarget] =
    useState<ICourseSubmission | null>(null);
  const [syncTarget, setSyncTarget] = useState<ICourseSubmission | null>(null);
  const [syncPreview, setSyncPreview] = useState<ICourseSyncPreview | null>(
    null,
  );
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deadlineExtensionTarget, setDeadlineExtensionTarget] = useState<
    (LearningDeadlineExtensionTarget & { assignmentId: string }) | null
  >(null);

  const loadAdminData = async (): Promise<void> => {
    setLoading(true);
    try {
      const currentSession = session;
      if (currentSession?.isAdmin) {
        const [overviewData, submissionList, monitoring] = await Promise.all([
          platform.getAdminOverview(),
          platform.getAdminSubmissions(),
          platform.getAdminLearningMonitoring({
            page: learningPage,
            pageSize: 20,
          }),
        ]);
        setOverview(overviewData);
        setSubmissions(submissionList);
        setLearning(monitoring.items);
        setLearningTotal(monitoring.total);
        setLearningSummary(monitoring.summary);
      }
    } catch {
      toast.error('管理后台加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [learningPage]);

  const openReview = async (
    submission: ICourseSubmission,
    action: ReviewAction,
  ): Promise<void> => {
    setReviewTarget(submission);
    setReviewAction(action);
    setReviewNote(submission.reviewNote || '');
    setReviewInstructorUserId(
      submission.instructorUserId ||
        (submission.instructor === submission.submitterName
          ? submission.submitterUserId
          : null),
    );
    setReviewQuestions([]);
    if (!submission.requiresQuiz) return;
    setReviewQuestionsLoading(true);
    try {
      setReviewQuestions(
        await platform.getAdminSubmissionQuestions(submission.id),
      );
    } catch {
      toast.error('投稿题目加载失败');
    } finally {
      setReviewQuestionsLoading(false);
    }
  };

  const submitReview = async (): Promise<void> => {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      let instructor = '';
      if (reviewAction === 'approve') {
        if (!reviewInstructorUserId) throw new Error('请选择真实讲师账号');
        const result = await listUsersByIds([reviewInstructorUserId]);
        const name = result.data.userInfoMap[reviewInstructorUserId]?.name;
        instructor = name?.zh_cn || name?.en_us || '';
        if (!instructor) throw new Error('无法读取讲师姓名，请重新选择');
      }
      await platform.reviewSubmission(reviewTarget.id, {
        action: reviewAction,
        note: reviewNote,
        ...(reviewAction === 'approve'
          ? { instructor, instructorUserId: reviewInstructorUserId! }
          : {}),
      });
      toast.success(
        reviewAction === 'approve'
          ? '已通过审核，等待同步到正式课程库'
          : '已退回投稿人修改',
      );
      setReviewTarget(null);
      await loadAdminData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '审核操作失败');
    } finally {
      setReviewing(false);
    }
  };

  const openSyncPreview = async (
    submission: ICourseSubmission,
  ): Promise<void> => {
    setSyncTarget(submission);
    setSyncPreview(null);
    setSyncPreviewLoading(true);
    try {
      setSyncPreview(await platform.getSubmissionSyncPreview(submission.id));
    } catch {
      toast.error('同步预览加载失败');
      setSyncTarget(null);
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const confirmSync = async (): Promise<void> => {
    if (!syncTarget || !syncPreview?.canSync) return;
    setSyncing(true);
    try {
      const result = await platform.syncSubmission(syncTarget.id);
      const quizSummary =
        result.quizQuestionCount > 0
          ? `题目 ${result.quizQuestionCount} 道`
          : '无课后题（自主学习）';
      toast.success(
        result.alreadySynced
          ? `课程已存在，补同步已完成（${quizSummary}）`
          : result.recoveredExistingRecord
            ? `已识别现有课程，并完成同步（${quizSummary}）`
            : `已写入未上线课程草稿，并完成同步（${quizSummary}）`,
      );
      setSyncTarget(null);
      setSyncPreview(null);
      await loadAdminData();
    } catch {
      toast.error('同步失败，请重新打开预览后再试');
    } finally {
      setSyncing(false);
    }
  };

  const submitDeadlineExtension = async (
    nextDeadlineAt: string,
    reason: string,
  ): Promise<void> => {
    const target = deadlineExtensionTarget;
    if (!target) return;
    try {
      await platform.extendLearningDeadline(target.assignmentId, {
        deadlineAt: nextDeadlineAt,
        reason,
      });
      toast.success('课程截止时间已延期');
      setDeadlineExtensionTarget(null);
      await loadAdminData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '延期失败，请重试';
      toast.error(message);
      throw error;
    }
  };

  if (loading && !overview) {
    return (
      <div className="min-h-64 animate-pulse rounded-2xl bg-white/60 grid place-items-center">
        <div className="size-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session?.adminRoleConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-16">
        <div className="rounded-[30px] border border-white bg-white/75 backdrop-blur-xl p-8 md:p-12 text-center shadow-[0_24px_70px_rgba(30,64,175,0.1)]">
          <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="mt-6 text-2xl font-black text-slate-950">
            管理员身份尚未开通
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            管理后台的页面与权限门禁已经完成，但当前妙搭应用还没有平台管理员角色。为避免把所有员工都变成管理员，这里暂时保持锁定。
          </p>
          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-left text-sm leading-7 text-slate-600">
            下一步需要在妙搭中创建“平台管理员”角色，并把角色 ID
            配置给应用；完成后只有被加入该角色的人员才能审核投稿、查看学习概览。
          </div>
        </div>
      </div>
    );
  }

  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-20 text-center">
        <LockKeyhole className="size-10 text-slate-400 mx-auto" />
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          没有管理权限
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          请联系平台负责人将你加入“平台管理员”角色。
        </p>
      </div>
    );
  }

  const metrics = overview
    ? [
        [overview.courseCount, '正式课程', BookOpen],
        [overview.pendingSubmissionCount, '待审核投稿', Clock3],
        [overview.learnerCount, '有学习记录的员工', UsersRound],
        [overview.completedLearningCount, '已完成学习', GraduationCap],
      ]
    : [];
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">后台总览</h2>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void loadAdminData()}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? '更新中…' : '刷新总览'}
        </Button>
      </div>
      <section className="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(([value, label, Icon]) => {
          const MetricIcon = Icon as typeof BookOpen;
          return (
            <div
              key={String(label)}
              className="rounded-[22px] border border-white bg-white/74 backdrop-blur-xl p-5 shadow-[0_16px_45px_rgba(30,64,175,0.07)]"
            >
              <MetricIcon className="size-5 text-primary" />
              <p className="mt-4 text-3xl font-black text-slate-950">
                {String(value)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{String(label)}</p>
            </div>
          );
        })}
      </section>

      <CatalogSyncCard onSynced={loadAdminData} />

      <section className="mt-10 rounded-[28px] border border-white/90 bg-white/75 backdrop-blur-xl p-5 md:p-7 shadow-[0_22px_65px_rgba(30,64,175,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">课程投稿审核</h2>
            <p className="mt-1 text-sm text-slate-500">
              审核通过后仍需预览并二次确认，才会写入正式 Base 的未上线草稿。
            </p>
          </div>
          <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-bold">
            {overview?.pendingSubmissionCount ?? 0} 待处理
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {submissions.length > 0 ? (
            submissions.map((item) => (
              <article
                key={item.id}
                className="rounded-[20px] border border-slate-100 bg-white p-4 md:p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === 'pending_review' ? 'bg-amber-50 text-amber-700' : item.status === 'approved_pending_sync' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}
                      >
                        {item.status === 'pending_review'
                          ? '待审核'
                          : item.status === 'approved_pending_sync'
                            ? '已通过'
                            : '已退回'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.targetDepartments.length > 0 || isExternalSubmission(item) ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}
                      >
                        {item.targetDepartments.length > 0
                          ? `${item.targetDepartments.length} 个适用部门`
                          : isExternalSubmission(item)
                            ? '外部学员 · 不限部门'
                            : '缺少适用部门'}
                      </span>
                      {item.status === 'approved_pending_sync' && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700' : item.syncStatus === 'sync_failed' ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'}`}
                        >
                          {item.syncStatus === 'synced'
                            ? '已同步草稿'
                            : item.syncStatus === 'sync_failed'
                              ? '同步失败'
                              : '待同步'}
                        </span>
                      )}
                      {item.requiresQuiz && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.quizSyncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700' : item.quizSyncStatus === 'sync_failed' ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'}`}
                        >
                          {item.quizSyncStatus === 'synced'
                            ? '题目已同步待审核'
                            : item.quizSyncStatus === 'sync_failed'
                              ? '题目同步失败'
                              : '含课后题'}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2">
                      {item.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-400">
                      <span>
                        {item.department} · {item.instructor} · 投稿人
                      </span>
                      {item.submitterUserId ? (
                        <UserDisplay
                          value={[item.submitterUserId]}
                          size="small"
                        />
                      ) : (
                        <span>{item.submitterName || '未登记投稿人'}</span>
                      )}
                    </div>
                  </div>
                  {item.status === 'pending_review' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => void openReview(item, 'reject')}
                        className="rounded-full"
                      >
                        <XCircle className="size-4" />
                        退回修改
                      </Button>
                      <Button
                        onClick={() => void openReview(item, 'approve')}
                        className="rounded-full"
                      >
                        <CheckCircle2 className="size-4" />
                        通过审核
                      </Button>
                    </div>
                  )}
                  {item.status === 'approved_pending_sync' && (
                    <Button
                      variant="outline"
                      onClick={() => void openSyncPreview(item)}
                      className="rounded-full shrink-0"
                    >
                      <RefreshCw className="size-4" />
                      {item.syncStatus === 'sync_failed' ||
                      item.quizSyncStatus === 'sync_failed'
                        ? '重新预览并同步'
                        : item.syncStatus === 'synced'
                          ? '核对课程关联'
                          : '预览并同步'}
                    </Button>
                  )}
                  {item.status === 'approved_pending_sync' && (
                    <Button
                      variant="outline"
                      className="rounded-full shrink-0"
                      onClick={() => setReferenceTarget(item)}
                    >
                      修正讲师映射
                    </Button>
                  )}
                  {item.formalCourseRecordId && (
                    <div className="shrink-0 max-w-56 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                      <p className="font-bold">正式课程记录</p>
                      <p
                        className="mt-0.5 truncate"
                        title={item.formalCourseRecordId}
                      >
                        {item.formalCourseRecordId}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="py-14 text-center text-sm text-slate-500">
              暂无课程投稿
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 rounded-[28px] border border-white/90 bg-white/75 backdrop-blur-xl p-5 md:p-7 shadow-[0_22px_65px_rgba(30,64,175,0.08)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">员工学习明细</h2>
            <p className="mt-1 text-sm text-slate-500">
              公司员工首次登录 ATHENA
              时自动登记；有效时长只累计课程页可见且窗口获得焦点的时间。已有必修课程从首次登录起计算
              30 天，之后新增必修课程各自单独计算 30 天。
            </p>
            <p className="mt-1 text-xs text-slate-400">
              提醒时间与课程截止时间分开显示；期限只用于提醒，不罚款、不扣分。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold self-start">
              {learningTotal} 条课程任务
            </span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-bold self-start">
              登录自动登记
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            [learningSummary?.activeEmployeeCount ?? 0, '已登记员工'],
            [learningSummary?.requiredAssignmentCount ?? 0, '必修任务'],
            [learningSummary?.electiveEnrollmentCount ?? 0, '选修报名'],
            [learningSummary?.notStartedCount ?? 0, '尚未开始'],
            [learningSummary?.reminderDueCount ?? 0, '当前待提醒'],
          ].map(([value, label]) => (
            <div
              key={String(label)}
              className="rounded-2xl bg-slate-50 px-4 py-3"
            >
              <p className="text-xl font-black text-slate-950">
                {String(value)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{String(label)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          身份口径：公司租户内的员工登录账号；账号以妙搭数字用户 ID
          精确匹配，能读取到直属部门时同步部门归属。
          <br />
          时长口径：课程页在前台可见且有焦点的时间；外部视频的实际播放时长暂无法核验。
          <br />
          提醒发送：
          {learningSummary?.reminderDeliveryEnabled
            ? '已开启'
            : '关闭（当前只计算待提醒并保留启用前安全边界）'}
        </p>

        <div className="mt-6 overflow-x-auto">
          {learning.length > 0 ? (
            <table className="w-full min-w-[1520px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-3 pr-5 font-bold">员工</th>
                  <th className="pb-3 pr-5 font-bold">课程</th>
                  <th className="pb-3 pr-5 font-bold">任务</th>
                  <th className="pb-3 pr-5 font-bold">课程页有效时长</th>
                  <th className="pb-3 pr-5 font-bold">进度</th>
                  <th className="pb-3 pr-5 font-bold">课后习题</th>
                  <th className="pb-3 pr-5 font-bold">最近动作</th>
                  <th className="pb-3 pr-5 font-bold">提醒时间</th>
                  <th className="pb-3 pr-5 font-bold">课程截止</th>
                  <th className="pb-3 font-bold">最后学习</th>
                </tr>
              </thead>
              <tbody>
                {learning.map((item) => (
                  <tr
                    key={item.assignmentId ?? `${item.userId}:${item.courseId}`}
                    className="border-b border-slate-100/80 text-sm last:border-0"
                  >
                    <td className="py-4 pr-5">
                      {item.userId ? (
                        <UserDisplay value={[item.userId]} size="small" />
                      ) : (
                        <p className="font-bold text-slate-900">
                          {item.userName || '未登记员工'}
                        </p>
                      )}
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-medium text-slate-700">
                        {item.courseTitle}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.assignedAt
                          ? new Date(item.assignedAt).toLocaleDateString(
                              'zh-CN',
                            )
                          : '历史学习记录'}
                      </p>
                    </td>
                    <td className="py-4 pr-5 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-bold ${
                          item.requirementType === 'required'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {item.requirementType === 'required' ? '必修' : '选修'}
                      </span>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {item.assignmentSource === 'required_auto'
                          ? '系统分配'
                          : item.assignmentSource === 'elective_enrollment'
                            ? '员工报名'
                            : '历史行为补齐'}
                      </p>
                      {item.requirementType === 'required' ? (
                        <p className="mt-1 max-w-36 text-[11px] leading-4 text-slate-400">
                          {item.matchedDepartmentName
                            ? `部门：${item.matchedDepartmentName}`
                            : '官方课程 · 全员'}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-bold text-slate-800">
                        {formatDuration(item.activeDurationSeconds)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.sessionCount > 0
                          ? `${item.sessionCount} 次有效会话`
                          : '尚无有效会话'}
                      </p>
                    </td>
                    <td className="py-4 pr-5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {item.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-5 text-xs">
                      {item.quizAttemptCount > 0 ? (
                        <div>
                          <p className="font-bold text-slate-700">
                            累计答对 {item.quizCorrectCount} 题
                          </p>
                          <p className="mt-1 text-slate-400">
                            {item.quizAttemptCount} 次提交
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">尚未测验</span>
                      )}
                    </td>
                    <td className="py-4 pr-5 text-xs text-slate-500">
                      {!item.lastResource
                        ? '尚未开始'
                        : item.lastResource === 'open_video'
                          ? '打开视频'
                          : item.lastResource === 'open_doc'
                            ? '打开文档'
                            : item.lastResource === 'mark_complete'
                              ? '标记完成'
                              : '进入课程'}
                    </td>
                    <td className="py-4 pr-5 text-xs text-slate-500">
                      <p className="font-bold text-slate-700">
                        {reminderLabel(item)}
                      </p>
                      {item.reminderDueAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.reminderState === 'sent'
                            ? '下次提醒：'
                            : '提醒时间：'}
                          {new Date(item.reminderDueAt).toLocaleDateString(
                            'zh-CN',
                          )}
                        </p>
                      )}
                    </td>
                    <td className="py-4 pr-5 text-xs text-slate-500">
                      {(() => {
                        const deadline = getLearningDeadlineView(item);
                        if (!deadline) {
                          return item.requirementType === 'required'
                            ? '截止信息待同步'
                            : '—';
                        }
                        return (
                          <div
                            className={`rounded-xl px-3 py-2 ${
                              deadline.tone === 'danger'
                                ? 'bg-rose-50 text-rose-700'
                                : deadline.tone === 'warning'
                                  ? 'bg-amber-50 text-amber-700'
                                  : deadline.tone === 'positive'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            <p className="font-bold">{deadline.statusLabel}</p>
                            {deadline.deadlineLabel && (
                              <p className="mt-1 text-[11px]">
                                截止时间：{deadline.deadlineLabel}
                              </p>
                            )}
                            {deadline.startedLabel && (
                              <p className="mt-1 text-[11px] opacity-80">
                                起算时间：{deadline.startedLabel}
                              </p>
                            )}
                            {canExtendLearningDeadline(item) && (
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-2 h-7 rounded-full px-2.5 text-[11px]"
                                onClick={() => {
                                  if (!item.assignmentId || !item.deadlineAt)
                                    return;
                                  setDeadlineExtensionTarget({
                                    assignmentId: item.assignmentId,
                                    courseTitle: item.courseTitle,
                                    currentDeadlineAt: item.deadlineAt,
                                  });
                                }}
                              >
                                延期
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {item.lastActivityAt
                        ? new Date(item.lastActivityAt).toLocaleString('zh-CN')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-14 text-center">
              <History className="size-8 text-slate-300 mx-auto" />
              <p className="mt-3 text-sm text-slate-500">
                暂时还没有课程任务。员工首次登录 ATHENA
                后会自动登记并生成适用任务。
              </p>
            </div>
          )}
        </div>

        {learningTotal > 20 && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400">
              第 {learningPage} 页，共 {Math.ceil(learningTotal / 20)} 页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={learningPage <= 1}
                onClick={() => setLearningPage((page) => Math.max(1, page - 1))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={learningPage >= Math.ceil(learningTotal / 20)}
                onClick={() => setLearningPage((page) => page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setReviewQuestions([]);
          }
        }}
      >
        <DialogContent className="rounded-[24px] max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? '通过课程投稿' : '退回课程投稿'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? '通过后课程进入待同步状态，仍需受控同步到正式 Base 才会对员工可见。'
                : '请写明需要修改的内容，投稿人会在“我的投稿”中看到反馈。'}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && isExternalSubmission(reviewTarget) && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">课程适用范围</p>
              <p className="mt-1 font-black text-slate-950">
                外部学员投稿：不限部门
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                通过后这门课对所有人都是选修；需要全员必修时，可在课程设置里修改「管理员修读要求」。外部学员在公司飞书没有对应身份，同步时讲师人员字段留空，也可以在下方改选一位
                公司讲师。
              </p>
            </div>
          )}
          {reviewTarget && !isExternalSubmission(reviewTarget) && (
            <div
              className={`rounded-2xl border p-4 ${reviewTarget.targetDepartments.length > 0 ? 'border-slate-100 bg-slate-50' : 'border-rose-100 bg-rose-50'}`}
            >
              <p className="text-xs font-bold text-slate-400">课程适用部门</p>
              <p
                className={`mt-1 font-black ${reviewTarget.targetDepartments.length > 0 ? 'text-slate-950' : 'text-rose-700'}`}
              >
                {reviewTarget.targetDepartments.length > 0
                  ? reviewTarget.targetDepartments
                      .map((department) => department.name)
                      .join('、')
                  : '投稿人尚未选择，不能通过审核'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                所选部门及其下属部门员工自动必修；范围外员工仍可自主报名选修。
              </p>
            </div>
          )}
          {reviewAction === 'approve' && (
            <div className="space-y-2">
              <Label>讲师</Label>
              <UserSelect
                value={reviewInstructorUserId}
                onChange={setReviewInstructorUserId}
                disabled={reviewing}
                placeholder="请选择真实讲师账号"
              />
              <p className="text-sm text-muted-foreground">
                默认是投稿人；代传课程请选择实际讲师，系统会关联其飞书账号。
              </p>
            </div>
          )}
          {reviewTarget?.requiresQuiz && (
            <SubmissionQuizPreview
              questions={reviewQuestions}
              loading={reviewQuestionsLoading}
            />
          )}
          <Textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={
              reviewAction === 'approve' ? '审核备注（选填）' : '请填写退回原因'
            }
            className="min-h-28 rounded-xl"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewTarget(null)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={submitReview}
              disabled={
                reviewing ||
                reviewQuestionsLoading ||
                (reviewAction === 'approve' && !reviewInstructorUserId) ||
                (reviewAction === 'approve' &&
                  !reviewTarget?.targetDepartments.length &&
                  !(reviewTarget && isExternalSubmission(reviewTarget))) ||
                (reviewAction === 'approve' &&
                  Boolean(reviewTarget?.requiresQuiz) &&
                  reviewQuestions.length < 1) ||
                (reviewAction === 'reject' && !reviewNote.trim())
              }
              className="rounded-full"
            >
              {reviewing ? '处理中…' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(syncTarget)}
        onOpenChange={(open) => {
          if (!open && !syncing) {
            setSyncTarget(null);
            setSyncPreview(null);
          }
        }}
      >
        <DialogContent className="rounded-[24px] max-w-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>同步到正式课程 Base</DialogTitle>
            <DialogDescription>
              先核对本次实际写入的字段。课程只创建“未上线”草稿，课后题只进入“待审核”，都不会立刻向员工展示。
            </DialogDescription>
          </DialogHeader>

          {syncPreviewLoading ? (
            <div className="py-12 grid place-items-center">
              <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : syncPreview ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">课程投稿</p>
                <p className="mt-1 font-black text-slate-950">
                  {syncPreview.submission.title}
                </p>
              </div>

              {syncPreview.blockingReasons.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                  <p className="font-black">当前不能同步</p>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {syncPreview.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncPreview.targetFields.length > 0 && (
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {syncPreview.willRecoverExistingRecord
                      ? '将补记现有课程关联'
                      : '将写入这些字段'}
                  </p>
                  <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-4">
                    {syncPreview.targetFields.map((field) => (
                      <div
                        key={field.targetField}
                        className="grid sm:grid-cols-[120px_1fr] gap-1 sm:gap-4 py-3 text-sm"
                      >
                        <span className="font-bold text-slate-500">
                          {field.targetField}
                        </span>
                        <div className="min-w-0 text-slate-800">
                          <p className="break-words">
                            {Array.isArray(field.value)
                              ? field.value.join('、') || '—'
                              : String(field.value === '' ? '—' : field.value)}
                          </p>
                          {field.note && (
                            <p className="mt-1 text-xs text-amber-700">
                              {field.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncPreview.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-black">同步前请注意</p>
                  <ul className="mt-2 list-disc pl-5 space-y-1.5 leading-6">
                    {syncPreview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSyncTarget(null);
                setSyncPreview(null);
              }}
              disabled={syncing}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={() => void confirmSync()}
              disabled={syncPreviewLoading || syncing || !syncPreview?.canSync}
              className="rounded-full"
            >
              {syncing
                ? '同步中…'
                : syncPreview?.alreadySynced
                  ? '确认补同步'
                  : syncPreview?.willRecoverExistingRecord
                    ? '确认补记关联'
                    : '确认写入未上线草稿'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SubmissionReferencesDialog
        submission={referenceTarget}
        onClose={() => setReferenceTarget(null)}
        onSaved={async (submission: ICourseSubmission) => {
          await openSyncPreview(submission);
          await loadAdminData();
        }}
      />
      <LearningDeadlineExtensionDialog
        target={deadlineExtensionTarget}
        onClose={() => setDeadlineExtensionTarget(null)}
        onSubmit={submitDeadlineExtension}
      />
    </div>
  );
}
