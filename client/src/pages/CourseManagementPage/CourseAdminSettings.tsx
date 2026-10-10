import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { courseManagement } from '@/api';
import { AcademyCoverImage } from '@/components/AcademyCoverImage';
import { UserDisplay } from '@/components/business-ui/user-display';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type {
  CourseAdminSettingChange,
  CourseRequirementOverride,
  ICourseAdminSettingsUpdateResult,
  IManagedCourse,
} from '@shared/api.interface';
import { courseAdminSettingsUpdateSchema } from '@shared/course-admin-settings';
import { managementErrorMessage } from './course-management-utils';
import CourseAdminSettingsDialog from './CourseAdminSettingsDialog';
import {
  draftFromCourse,
  requirementOverrideLabel,
  sameIds,
  sourceSummary,
  type AdminSettingDraft,
  type ResourceSource,
  type SettingKind,
} from './course-admin-settings-utils';

type SyncRetryKind = 'source' | 'requirement';

interface CourseAdminSettingsProps {
  managed: IManagedCourse;
  onSaved: (result: ICourseAdminSettingsUpdateResult) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export default function CourseAdminSettings({
  managed,
  onSaved,
  onDirtyChange,
  onSavingChange,
}: CourseAdminSettingsProps) {
  const { course } = managed;
  const original = useMemo(() => draftFromCourse(course), [course]);
  const [draft, setDraft] = useState<AdminSettingDraft>(original);
  const [editKind, setEditKind] = useState<SettingKind | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [syncRetry, setSyncRetry] = useState<SyncRetryKind | null>(null);
  const inFlight = useRef(false);

  const dirty =
    draft.coverUrl !== original.coverUrl ||
    !sameIds(draft.instructorUserIds, original.instructorUserIds) ||
    draft.resourceSource !== original.resourceSource ||
    draft.requirementOverride !== original.requirementOverride;

  useEffect(() => {
    setDraft(original);
    setEditKind(null);
    setDialogError('');
    setError('');
  }, [original, managed.revision]);

  useEffect(() => {
    setSyncRetry(null);
  }, [course.id]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange(saving || coverUploading);
  }, [coverUploading, onSavingChange, saving]);

  const closeEditor = (): void => {
    if (saving || coverUploading) return;
    setDraft(original);
    setEditKind(null);
    setDialogError('');
  };

  const openEditor = (kind: SettingKind): void => {
    if (saving || coverUploading) return;
    setError('');
    setDialogError('');
    setEditKind(kind);
  };

  const updateCover = (coverUrl: string): void => {
    setDraft((current) => ({ ...current, coverUrl }));
    setDialogError('');
  };

  const updateInstructors = (userIds: string[]): void => {
    if (userIds.length > 20) {
      setDialogError('最多选择 20 位讲师。');
      return;
    }
    setDraft((current) => ({
      ...current,
      instructorUserIds: [...userIds],
    }));
    setDialogError('');
  };

  const getChange = (): CourseAdminSettingChange | null => {
    if (editKind === 'cover') {
      return { kind: 'cover', coverUrl: draft.coverUrl.trim() };
    }
    if (editKind === 'instructors') {
      return { kind: 'instructors', userIds: draft.instructorUserIds };
    }
    if (editKind === 'source') {
      return { kind: 'source', resourceSource: draft.resourceSource };
    }
    if (editKind === 'requirement') {
      return {
        kind: 'requirement',
        requirementOverride: draft.requirementOverride,
      };
    }
    return null;
  };

  const saveChange = async (
    change: CourseAdminSettingChange,
    closeAfterSave: boolean,
  ): Promise<void> => {
    if (inFlight.current) return;
    setError('');
    setDialogError('');
    const parsed = courseAdminSettingsUpdateSchema.safeParse({
      revision: managed.revision,
      confirmed: true,
      change,
    });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '请检查设置内容';
      setDialogError(message);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const result = await courseManagement.updateAdminSettings(course.id, {
        revision: managed.revision,
        confirmed: true,
        change,
      });
      const nextDraft = draftFromCourse(result.course);
      setDraft(nextDraft);
      if (change.kind === 'source' || change.kind === 'requirement') {
        setSyncRetry(result.assignmentsSynced ? null : change.kind);
      }
      if (closeAfterSave) setEditKind(null);
      onSaved(result);
      if (!result.catalogSynced) {
        toast.warning('设置已保存，但课程目录同步失败，请联系管理员处理。');
      } else if (
        (change.kind === 'source' || change.kind === 'requirement') &&
        !result.assignmentsSynced
      ) {
        toast.warning('设置已保存，但学习任务同步失败，可在对应摘要区重试。');
      } else {
        toast.success('管理员设置已保存，课程状态保持不变。');
      }
    } catch (caught: unknown) {
      const message = managementErrorMessage(caught);
      setDialogError(message);
      setError(message);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const confirmSave = (): void => {
    const change = getChange();
    if (!change) return;
    void saveChange(change, true);
  };

  const retrySync = (): void => {
    if (!syncRetry) return;
    const change: CourseAdminSettingChange =
      syncRetry === 'source'
        ? { kind: 'source', resourceSource: draft.resourceSource }
        : {
            kind: 'requirement',
            requirementOverride: draft.requirementOverride,
          };
    void saveChange(change, false);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-white/90 bg-white/75 p-5 shadow-[0_22px_65px_rgba(30,64,175,0.08)] backdrop-blur-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-primary">
              ADMIN SETTINGS
            </p>
            <h2 className="mt-3 text-xl font-black text-slate-950 md:text-2xl">
              管理员设置
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              封面、讲师、资源归属和修读要求分开确认保存。已上架课程保存后立即生效，未上线课程不会自动上架。
            </p>
          </div>
          <Settings2 className="size-7 shrink-0 text-primary/70" />
        </div>
        {dirty && (
          <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            有一项管理员设置尚未保存。保存或取消当前编辑前，不能切换到其他课程
            Tab。
          </p>
        )}
      </div>

      {error && !editKind && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>管理员设置未完成</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-4">
        <article className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-slate-400">
                COVER
              </p>
              <h3 className="mt-2 font-black text-slate-950">课程封面</h3>
            </div>
            <ImageIcon className="size-5 text-primary/70" />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            {draft.coverUrl ? (
              <AcademyCoverImage
                src={draft.coverUrl}
                alt="当前课程封面"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="grid aspect-video place-items-center text-sm text-slate-400">
                暂无封面
              </div>
            )}
          </div>
          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
            {draft.coverUrl
              ? '当前课程使用已保存的封面。'
              : '课程尚未设置封面。'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-full bg-white"
            disabled={saving || coverUploading}
            onClick={() => openEditor('cover')}
          >
            编辑封面
          </Button>
        </article>

        <article className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-slate-400">
                INSTRUCTORS
              </p>
              <h3 className="mt-2 font-black text-slate-950">课程讲师</h3>
            </div>
            <Users className="size-5 text-primary/70" />
          </div>
          <div className="mt-5 min-h-16">
            {draft.instructorUserIds.length > 0 ? (
              <UserDisplay value={draft.instructorUserIds} size="small" />
            ) : (
              <p className="text-sm text-slate-400">尚未设置讲师</p>
            )}
          </div>
          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
            讲师只用于课程展示，不授予管理权限；课程内容和测试题由上传人或管理员维护。
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-full bg-white"
            disabled={saving || coverUploading}
            onClick={() => openEditor('instructors')}
          >
            编辑讲师
          </Button>
        </article>

        <article className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-slate-400">
                RESOURCE SOURCE
              </p>
              <h3 className="mt-2 font-black text-slate-950">资源归属</h3>
            </div>
            <Link2 className="size-5 text-primary/70" />
          </div>
          <p className="mt-5 text-2xl font-black text-slate-950">
            {sourceSummary(course.courseSource, draft.resourceSource)}
          </p>
          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
            {draft.requirementOverride === 'required'
              ? '当前手动设为全员必修，资源来源变化不会改变修读要求。'
              : draft.requirementOverride === 'elective'
                ? '当前手动设为全员选修，资源来源变化不会恢复必修提醒。'
                : course.courseSource === '官方'
                  ? '按规则自动判断；官方课程为全员必修，切换来源时会明确提示。'
                  : '按规则自动判断；命中部门规则的课程为部门必修。'}
          </p>
          {syncRetry === 'source' && (
            <Alert variant="warning" className="mt-4">
              <RefreshCw className="size-4" />
              <AlertTitle>学习任务同步未完成</AlertTitle>
              <AlertDescription>
                来源已保存。可以重存当前来源，重试学习任务同步。
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 pl-1 align-baseline text-amber-800"
                  disabled={saving}
                  onClick={retrySync}
                >
                  重试同步
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-full bg-white"
            disabled={saving || coverUploading}
            onClick={() => openEditor('source')}
          >
            编辑资源归属
          </Button>
        </article>

        <article className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-slate-400">
                REQUIREMENT
              </p>
              <h3 className="mt-2 font-black text-slate-950">修读要求</h3>
            </div>
            <ShieldCheck className="size-5 text-primary/70" />
          </div>
          <p className="mt-5 text-2xl font-black text-slate-950">
            {requirementOverrideLabel(draft.requirementOverride)}
          </p>
          <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
            {draft.requirementOverride === 'auto'
              ? '按官方来源和部门规则自动判断修读要求。'
              : draft.requirementOverride === 'required'
                ? '手动覆盖来源与部门规则，所有员工按必修学习。'
                : '手动覆盖来源与部门规则，所有员工按选修学习。'}
          </p>
          {syncRetry === 'requirement' && (
            <Alert variant="warning" className="mt-4">
              <RefreshCw className="size-4" />
              <AlertTitle>学习任务同步未完成</AlertTitle>
              <AlertDescription>
                修读要求已保存。可以重存当前修读要求，重试任务同步。
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 pl-1 align-baseline text-amber-800"
                  disabled={saving}
                  onClick={retrySync}
                >
                  重试同步
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-full bg-white"
            disabled={saving || coverUploading}
            onClick={() => openEditor('requirement')}
          >
            编辑修读要求
          </Button>
        </article>
      </div>

      <CourseAdminSettingsDialog
        editKind={editKind}
        draft={draft}
        courseSource={course.courseSource}
        courseRequirementOverride={original.requirementOverride}
        revision={managed.revision}
        dirty={dirty}
        saving={saving}
        coverUploading={coverUploading}
        dialogError={dialogError}
        onClose={closeEditor}
        onCoverChange={updateCover}
        onCoverUploadingChange={setCoverUploading}
        onInstructorsChange={updateInstructors}
        onResourceSourceChange={(resourceSource: ResourceSource) => {
          setDraft((current) => ({ ...current, resourceSource }));
          setDialogError('');
        }}
        onRequirementChange={(
          requirementOverride: CourseRequirementOverride,
        ) => {
          setDraft((current) => ({ ...current, requirementOverride }));
          setDialogError('');
        }}
        onConfirm={confirmSave}
      />

      {!dirty && !syncRetry && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <CheckCircle2 className="size-4" />
          设置变更需逐项确认保存。
        </p>
      )}
    </section>
  );
}
