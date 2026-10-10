import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CourseQuizGenerationDialog from './CourseQuizGenerationDialog';
import CourseQuizDraftDialog from './CourseQuizDraftDialog';
import CourseQuizStatusCard from './CourseQuizStatusCard';
import type {
  ICourseQuizAdminDraft,
  ICourseQuizAdminStatus,
  ICourseQuizDraftUpdateInput,
  ICourseQuizSourceOption,
} from '@shared/api.interface';

const POLL_INTERVAL_MS = 8_000;

interface RequestError {
  message?: unknown;
  response?: {
    data?: { message?: unknown; error?: { message?: unknown } };
  };
}

import type { CourseQuizDraftMode as DraftMode } from './CourseQuizDraftDialog';

function errorMessage(error: unknown): string {
  const requestError = error as RequestError;
  const message =
    requestError.response?.data?.error?.message ??
    requestError.response?.data?.message ??
    requestError.message;
  return typeof message === 'string' && message.trim()
    ? message
    : '操作失败，请稍后重试';
}

export interface CourseQuizPanelProps {
  courseId: string;
  canPublish: boolean;
  /** 内部课程用课程云文档生成题目仅限管理员；上传人可发布但不能用它出题。 */
  canGenerateFromCourseDocument: boolean;
  onStatusChange?: (status: ICourseQuizAdminStatus) => void;
}

export default function CourseQuizPanel({
  courseId,
  canPublish,
  canGenerateFromCourseDocument,
  onStatusChange,
}: CourseQuizPanelProps) {
  const [status, setStatus] = useState<ICourseQuizAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [generationOpen, setGenerationOpen] = useState(false);
  const [sources, setSources] = useState<ICourseQuizSourceOption[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(
    new Set(),
  );
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<DraftMode>('review');
  const [draft, setDraft] = useState<ICourseQuizAdminDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const loadRequestRef = useRef(0);
  const sourcesRequestRef = useRef(0);
  const draftRequestRef = useRef(0);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const applyStatus = useCallback((nextStatus: ICourseQuizAdminStatus) => {
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  const loadStatus = useCallback(async (): Promise<void> => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    setLoadError('');
    setStatus(null);
    try {
      const statuses = await platform.getAdminCourseQuizzes();
      if (loadRequestRef.current !== requestId) return;
      const nextStatus = statuses.find(
        (item: ICourseQuizAdminStatus) => item.courseId === courseId,
      );
      if (!nextStatus) {
        throw new Error('当前课程暂无题库管理记录');
      }
      applyStatus(nextStatus);
    } catch (error: unknown) {
      if (loadRequestRef.current !== requestId) return;
      setLoadError(errorMessage(error));
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [applyStatus, courseId]);

  useEffect(() => {
    // A course switch must not show the previous course's status, draft or
    // source error while the new, server-scoped record is loading.
    sourcesRequestRef.current += 1;
    draftRequestRef.current += 1;
    setGenerationOpen(false);
    setSources([]);
    setSourcesError('');
    setSourcesLoading(false);
    setSelectedSourceIds(new Set());
    setDraftOpen(false);
    setDraftDirty(false);
    setDiscardOpen(false);
    setDraft(null);
    setDraftError('');
    setDraftLoading(false);
    void loadStatus();
    return () => {
      loadRequestRef.current += 1;
      sourcesRequestRef.current += 1;
      draftRequestRef.current += 1;
    };
  }, [courseId, loadStatus]);

  useEffect(() => {
    if (!draftDirty && !saving && !publishing) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [draftDirty, saving, publishing]);

  useEffect(() => {
    if (status?.preparationStatus !== 'generating') return undefined;
    let active = true;
    const poll = async (): Promise<void> => {
      try {
        const statuses = await platform.getAdminCourseQuizzes();
        if (!active) return;
        const nextStatus = statuses.find(
          (item: ICourseQuizAdminStatus) => item.courseId === courseId,
        );
        if (nextStatus) applyStatus(nextStatus);
      } catch (error: unknown) {
        if (active) toast.error(`题库状态刷新失败：${errorMessage(error)}`);
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [applyStatus, courseId, status?.preparationStatus]);

  const loadSources = async (): Promise<void> => {
    const requestId = sourcesRequestRef.current + 1;
    sourcesRequestRef.current = requestId;
    setSourcesLoading(true);
    setSourcesError('');
    setSources([]);
    try {
      const nextSources = await platform.getCourseQuizSources();
      if (sourcesRequestRef.current !== requestId) return;
      setSources(nextSources);
      setSelectedSourceIds(
        nextSources.some(
          (source: ICourseQuizSourceOption) => source.courseId === courseId,
        )
          ? new Set([courseId])
          : new Set(),
      );
    } catch (error: unknown) {
      if (sourcesRequestRef.current !== requestId) return;
      setSourcesError(errorMessage(error));
    } finally {
      if (sourcesRequestRef.current === requestId) setSourcesLoading(false);
    }
  };

  const openGeneration = (): void => {
    const canGenerate =
      status?.courseSource === '官方' ||
      (status?.courseSource === '内部' &&
        canGenerateFromCourseDocument &&
        status.sourceType === 'document' &&
        /\/docx\//u.test(status.sourceUrl));
    if (!status || !canGenerate) {
      toast.error(
        status?.courseSource === '内部'
          ? '内部课程仅管理员可使用本课程云文档生成题目；其他情况请从课程投稿维护题目'
          : '只有官方课程可以从题库后台使用 AI 生成题目',
      );
      return;
    }
    if (status.preparationStatus === 'generating' || startingGeneration) return;
    setGenerationOpen(true);
    void loadSources();
  };

  const closeGeneration = (force = false): void => {
    if (startingGeneration && !force) return;
    sourcesRequestRef.current += 1;
    setGenerationOpen(false);
    setSources([]);
    setSourcesError('');
    setSelectedSourceIds(new Set());
  };

  const startGeneration = async (): Promise<void> => {
    const canGenerate =
      status?.courseSource === '官方' ||
      (status?.courseSource === '内部' &&
        canGenerateFromCourseDocument &&
        status.sourceType === 'document' &&
        /\/docx\//u.test(status.sourceUrl));
    if (
      !status ||
      !canGenerate ||
      selectedSourceIds.size === 0 ||
      startingGeneration
    ) {
      return;
    }
    setStartingGeneration(true);
    try {
      const nextStatus = await platform.prepareCourseQuiz(courseId, {
        force: false,
        sourceCourseIds: [...selectedSourceIds],
      });
      applyStatus(nextStatus);
      closeGeneration(true);
      toast.success(
        nextStatus.preparationStatus === 'draft'
          ? '已有待审核草稿，可以打开审核和编辑'
          : '已开始后台生成，可以继续浏览或处理其他课程',
      );
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setStartingGeneration(false);
    }
  };

  const loadDraft = async (mode: DraftMode): Promise<void> => {
    const requestId = draftRequestRef.current + 1;
    draftRequestRef.current = requestId;
    setDraftMode(mode);
    setDraftOpen(true);
    setDraft(null);
    setDraftError('');
    setDraftLoading(true);
    try {
      const nextDraft =
        mode === 'revision'
          ? await platform.createCourseQuizRevision(courseId)
          : await platform.getAdminCourseQuizDraft(courseId);
      if (draftRequestRef.current !== requestId) return;
      setDraft(nextDraft);
      if (mode === 'revision' && status) {
        applyStatus({
          ...status,
          preparationStatus: 'draft',
          draftQuestionCount: nextDraft.questions.length,
          draftVersion: nextDraft.version,
        });
      }
    } catch (error: unknown) {
      if (draftRequestRef.current !== requestId) return;
      setDraftError(errorMessage(error));
    } finally {
      if (draftRequestRef.current === requestId) setDraftLoading(false);
    }
  };

  const discardDraft = (): void => {
    draftRequestRef.current += 1;
    setDraftDirty(false);
    setDiscardOpen(false);
    setDraftOpen(false);
    setDraft(null);
    setDraftError('');
  };

  const closeDraft = (): void => {
    if (saving || publishing || draftLoading) return;
    if (draftDirty) setDiscardOpen(true);
    else discardDraft();
  };

  const persistDraft = async (
    input: ICourseQuizDraftUpdateInput,
  ): Promise<ICourseQuizAdminDraft | null> => {
    setSaving(true);
    try {
      const savedDraft = await platform.updateAdminCourseQuizDraft(
        courseId,
        input,
      );
      setDraft(savedDraft);
      toast.success('题目、选项和正确答案已保存；系统会保持答案位置均衡');
      return savedDraft;
    } catch (error: unknown) {
      toast.error(errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async (
    input: ICourseQuizDraftUpdateInput,
  ): Promise<boolean> => {
    if (!draft || saving || publishing) return false;
    return Boolean(await persistDraft(input));
  };

  const publishDraft = async (
    input: ICourseQuizDraftUpdateInput,
  ): Promise<void> => {
    if (!draft || !canPublish || saving || publishing) return;
    setPublishing(true);
    try {
      const savedDraft = await persistDraft(input);
      if (!savedDraft) return;
      const nextStatus = await platform.publishCourseQuiz(courseId, {
        version: savedDraft.version,
      });
      applyStatus(nextStatus);
      setDraftOpen(false);
      setDraft(null);
      toast.success('新题库已发布，旧题库已完成切换');
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[24px] border border-white bg-white/75 p-6 backdrop-blur-xl md:p-8">
        <div className="flex items-center gap-3" aria-live="polite">
          <RefreshCw className="size-7 animate-spin text-primary" />
          <div>
            <h2 className="font-black text-slate-950">正在加载课程题库</h2>
            <p className="mt-1 text-sm text-slate-500">
              正在读取当前课程的题库状态。
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loadError || !status) {
    return (
      <section className="rounded-[24px] border border-white bg-white/75 p-6 backdrop-blur-xl md:p-8">
        <div className="flex flex-col items-center py-4 text-center">
          <CircleAlert className="size-9 text-amber-500" />
          <h2 className="mt-4 font-black text-slate-950">题库状态加载失败</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            {loadError || '当前课程暂无题库管理记录。'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 rounded-full"
            onClick={() => void loadStatus()}
          >
            <RefreshCw className="size-4" />
            重新加载
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <CourseQuizStatusCard
        status={status}
        canPublish={canPublish}
        canGenerateFromCourseDocument={canGenerateFromCourseDocument}
        draftLoading={draftLoading}
        saving={saving}
        publishing={publishing}
        startingGeneration={startingGeneration}
        onOpenDraft={() => void loadDraft('review')}
        onOpenRevision={() => void loadDraft('revision')}
        onOpenGeneration={openGeneration}
      />

      <CourseQuizGenerationDialog
        open={generationOpen}
        courseId={courseId}
        courseTitle={status.courseTitle}
        courseSource={status.courseSource}
        sources={
          status.courseSource === '内部'
            ? sources.filter(
                (source: ICourseQuizSourceOption) =>
                  source.courseId === courseId,
              )
            : sources
        }
        selectedSourceIds={selectedSourceIds}
        sourcesLoading={sourcesLoading}
        sourcesError={sourcesError}
        startingGeneration={startingGeneration}
        allowMultipleSources={status.courseSource === '官方'}
        onOpenChange={(open) => {
          if (open) setGenerationOpen(true);
          else closeGeneration();
        }}
        onRetrySources={() => void loadSources()}
        onToggleSource={(sourceId, checked) => {
          setSelectedSourceIds((current: Set<string>) => {
            if (status.courseSource === '内部') {
              return checked ? new Set([sourceId]) : new Set();
            }
            const next = new Set(current);
            if (checked) next.add(sourceId);
            else next.delete(sourceId);
            return next;
          });
        }}
        onStart={() => void startGeneration()}
      />

      <CourseQuizDraftDialog
        open={draftOpen}
        mode={draftMode}
        draft={draft}
        loading={draftLoading}
        error={draftError}
        canPublish={canPublish}
        saving={saving}
        publishing={publishing}
        onDirtyChange={setDraftDirty}
        onOpenChange={(open) => {
          if (!open) closeDraft();
          else setDraftOpen(true);
        }}
        onRetry={() => void loadDraft(draftMode)}
        onSave={saveDraft}
        onPublish={publishDraft}
      />
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>测试题修改尚未保存</DialogTitle>
            <DialogDescription>
              关闭会丢弃本次未保存的题目修改，已保存的草稿和线上题库不受影响。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              继续编辑
            </Button>
            <Button onClick={discardDraft}>丢弃修改并关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
