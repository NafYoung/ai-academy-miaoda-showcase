import {
  BookOpenCheck,
  CheckCircle2,
  Edit3,
  FileStack,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ICourseQuizAdminStatus } from '@shared/api.interface';

interface CourseQuizStatusCardProps {
  status: ICourseQuizAdminStatus;
  canPublish: boolean;
  /** 内部课程用课程云文档生成题目仅限管理员；上传人可发布但不能用它出题。 */
  canGenerateFromCourseDocument: boolean;
  draftLoading: boolean;
  saving: boolean;
  publishing: boolean;
  startingGeneration: boolean;
  onOpenDraft: () => void;
  onOpenRevision: () => void;
  onOpenGeneration: () => void;
}

const AUTHORING_SOURCE_LABEL: Record<
  ICourseQuizAdminStatus['authoringSource'],
  string
> = {
  ai: 'AI 生成',
  manual: '人工录入',
  excel_import: 'Excel 导入',
  ai_generated_confirmed: 'AI 生成后人工确认',
  ai_assisted: 'AI 辅助后人工修改',
  legacy: '历史题库',
};

function statusLabel(item: ICourseQuizAdminStatus): string {
  if (item.preparationStatus === 'not_required') return '自主学习 · 无需题库';
  if (item.preparationStatus === 'generating') return 'AI 后台生成中';
  if (item.preparationStatus === 'draft') return '草稿待审核';
  if (item.questionCount > 0) return '已有线上题库';
  if (item.preparationStatus === 'failed') return '上次生成失败';
  if (item.preparationStatus === 'unsupported_source') return '课程来源待确认';
  if (item.preparationStatus === 'awaiting_submission_questions') {
    return '等待投稿题目同步';
  }
  return '尚未生成';
}

function statusClass(item: ICourseQuizAdminStatus): string {
  if (item.preparationStatus === 'not_required') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (item.preparationStatus === 'generating') {
    return 'bg-violet-50 text-violet-700';
  }
  if (item.preparationStatus === 'draft') return 'bg-blue-50 text-blue-700';
  if (item.questionCount > 0) return 'bg-emerald-50 text-emerald-700';
  if (
    item.preparationStatus === 'failed' ||
    item.preparationStatus === 'unsupported_source'
  ) {
    return 'bg-rose-50 text-rose-700';
  }
  if (item.preparationStatus === 'awaiting_submission_questions') {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-slate-100 text-slate-600';
}

export default function CourseQuizStatusCard({
  status,
  canPublish,
  canGenerateFromCourseDocument,
  draftLoading,
  saving,
  publishing,
  startingGeneration,
  onOpenDraft,
  onOpenRevision,
  onOpenGeneration,
}: CourseQuizStatusCardProps) {
  const generating = status.preparationStatus === 'generating';
  const hasDraft = status.preparationStatus === 'draft';
  const hasReadyQuiz = status.questionCount > 0;
  const notRequired = status.preparationStatus === 'not_required';
  const isOfficial = status.courseSource === '官方';
  const isInternal = status.courseSource === '内部';
  const canGenerateInternalFromDocument =
    isInternal &&
    canGenerateFromCourseDocument &&
    status.sourceType === 'document' &&
    /\/docx\//u.test(status.sourceUrl);
  const showRevision =
    (isOfficial || isInternal || status.courseSource === '合作方') &&
    !notRequired &&
    !hasDraft &&
    hasReadyQuiz &&
    !generating;
  const showGeneration =
    (isOfficial || canGenerateInternalFromDocument) && !hasDraft;
  const editDisabled = draftLoading || saving || publishing;

  return (
    <section className="rounded-[24px] border border-white bg-white/75 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl md:p-7">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
          {notRequired ? (
            <BookOpenCheck className="size-5" />
          ) : status.sourceType === 'image' ? (
            <ImageIcon className="size-5" />
          ) : status.sourceType === 'collection' ? (
            <FileStack className="size-5" />
          ) : (
            <Sparkles className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-black text-slate-950">
              {status.courseTitle}
            </h2>
            {generating && (
              <RefreshCw className="size-4 animate-spin text-violet-600" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
            <span className={`rounded-full px-2 py-1 ${statusClass(status)}`}>
              {statusLabel(status)}
            </span>
            <span
              className={`rounded-full px-2 py-1 ${
                isOfficial
                  ? 'bg-blue-50 text-blue-700'
                  : isInternal
                    ? 'bg-violet-50 text-violet-700'
                    : 'bg-rose-50 text-rose-700'
              }`}
            >
              {status.courseSource || '来源未知'}
            </span>
            {(hasDraft || hasReadyQuiz) && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                {AUTHORING_SOURCE_LABEL[status.authoringSource] || '来源未知'}
              </span>
            )}
            {!notRequired && (
              <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-500">
                线上 {status.questionCount} 道
              </span>
            )}
          </div>
        </div>
      </div>

      {status.lastError && (
        <p className="mt-3 break-words rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
          {status.lastError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {notRequired ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="rounded-full"
          >
            当前课程不设题目
          </Button>
        ) : hasDraft ? (
          <Button
            type="button"
            onClick={onOpenDraft}
            className="rounded-full"
            disabled={editDisabled}
          >
            <Edit3 className="size-4" />
            {canPublish ? '审核和编辑' : '编辑测试题草稿'}
          </Button>
        ) : (
          <>
            {showRevision && (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenRevision}
                className="rounded-full"
                disabled={editDisabled}
              >
                <Edit3 className="size-4" />
                编辑已发布题目
              </Button>
            )}
            {showGeneration ? (
              <Button
                type="button"
                variant="outline"
                disabled={generating || startingGeneration}
                onClick={onOpenGeneration}
                className="rounded-full"
              >
                {generating ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : hasReadyQuiz ? (
                  <RefreshCw className="size-4" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {generating
                  ? '正在生成…'
                  : hasReadyQuiz
                    ? '生成新草稿'
                    : '生成题目'}
              </Button>
            ) : !showRevision ? (
              <Button
                type="button"
                variant="outline"
                disabled
                className="rounded-full"
              >
                {isInternal ? '请从课程投稿维护题目' : '课程来源待确认'}
              </Button>
            ) : null}
          </>
        )}
      </div>

      {canPublish && (
        <div className="mt-5 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="size-4" />
          当前身份可以最终发布题库
        </div>
      )}
      {!canPublish && !notRequired && (
        <p className="mt-5 text-xs leading-6 text-slate-500">
          你可以保存题目修改；草稿审核和最终发布由平台管理员完成。
        </p>
      )}
    </section>
  );
}
