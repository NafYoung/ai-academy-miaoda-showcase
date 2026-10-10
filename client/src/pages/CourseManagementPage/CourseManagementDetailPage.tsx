import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CircleAlert,
  FileQuestion,
  RefreshCw,
  ShieldCheck,
  Settings2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseManagement } from '@/api';
import { useManagementSession } from '@/components/AdminRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ICourseContentUpdateResult,
  IManagedCourse,
} from '@shared/api.interface';
import CourseQuizPanel from '../QuizManagementPage/CourseQuizPanel';
import CourseContentEditor from './CourseContentEditor';
import CourseAdminSettings from './CourseAdminSettings';
import CourseLifecyclePanel from './CourseLifecyclePanel';
import {
  courseStatusClasses,
  managementErrorMessage,
} from './course-management-utils';

function CourseManagementDetail({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const isAdmin = useManagementSession()?.isAdmin === true;
  const [managed, setManaged] = useState<IManagedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('content');
  const [contentDirty, setContentDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [catalogWarning, setCatalogWarning] = useState(false);
  const [pending, setPending] = useState<'back' | 'refresh' | null>(null);
  const requestRef = useRef(0);
  const initialTabSet = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await courseManagement.getCourse(courseId);
      if (request !== requestRef.current) return;
      setManaged(result);
      setContentDirty(false);
      setSettingsDirty(false);
      setContentSaving(false);
      setSettingsSaving(false);
      if (!initialTabSet.current) {
        setTab(result.permissions.canEditContent ? 'content' : 'quiz');
        initialTabSet.current = true;
      }
    } catch (caught: unknown) {
      if (request !== requestRef.current) return;
      setManaged(null);
      setError(managementErrorMessage(caught));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [courseId]);
  const dirty = contentDirty || settingsDirty;
  const saving = contentSaving || settingsSaving;

  useEffect(() => {
    void load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (!dirty && !saving) return undefined;
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, saving]);

  const perform = (action: 'back' | 'refresh'): void => {
    if (action === 'back') navigate('/admin/course-management');
    else void load();
  };
  const requestAction = (action: 'back' | 'refresh'): void => {
    if (saving) return;
    if (dirty) setPending(action);
    else perform(action);
  };
  const onSaved = (result: ICourseContentUpdateResult): void => {
    setManaged(result);
    setContentDirty(false);
    setSettingsDirty(false);
    setCatalogWarning(!result.catalogSynced);
  };

  const changeTab = (nextTab: string): void => {
    if (saving || nextTab === tab) return;
    if (contentDirty && nextTab === 'admin-settings') return;
    if (settingsDirty && nextTab !== 'admin-settings') return;
    setTab(nextTab);
  };

  if (loading)
    return (
      <div role="status" className="grid min-h-[60vh] place-items-center">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <span className="sr-only">正在读取课程与管理权限</span>
      </div>
    );
  if (error || !managed)
    return (
      <div role="alert" className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CircleAlert className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          无法打开这门课程
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {error || '课程已删除，或当前账号没有管理权限。'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate('/admin/course-management')}
          >
            返回课程管理
          </Button>
          <Button className="rounded-full" onClick={() => void load()}>
            重新加载
          </Button>
        </div>
      </div>
    );
  const { course, permissions } = managed;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={saving}
          className="-ml-3 rounded-full text-slate-500"
          onClick={() => requestAction('back')}
        >
          <ArrowLeft />
          返回课程管理
        </Button>
        <Button
          variant="outline"
          disabled={saving}
          className="rounded-full bg-white/80"
          onClick={() => requestAction('refresh')}
        >
          <RefreshCw />
          刷新课程
        </Button>
      </div>
      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={courseStatusClasses(course.status)}
          >
            {course.status || '状态未知'}
          </Badge>
          <span className="text-xs font-medium text-primary">
            {permissions.canManageLifecycle
              ? '管理员 · 完整课程权限'
              : permissions.canEditContent
                ? '上传者 · 课程信息与测试题权限'
                : '讲师 · 测试题权限'}
          </span>
        </div>
        <h1 className="mt-4 break-words text-3xl font-black leading-tight text-slate-950 md:text-4xl">
          {course.title || '未命名课程'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          课程信息、测试题和课程状态集中管理；每一项操作都单独校验当前账号权限。
        </p>
      </header>
      {catalogWarning && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800"
        >
          正式课程已保存，但员工课程目录尚未确认同步。请联系管理员执行课程目录同步；刷新本页仅回读正式课程，不代表目录同步成功。
        </p>
      )}
      <Tabs value={tab} onValueChange={changeTab} className="mt-7 gap-5">
        <TabsList className="h-auto w-full max-w-full justify-start overflow-x-auto rounded-2xl bg-white/70 p-1.5 sm:w-fit">
          <TabsTrigger
            value="content"
            disabled={saving || settingsDirty}
            className="gap-2 rounded-xl px-4 py-3"
            title={settingsDirty ? '请先保存或取消管理员设置' : undefined}
          >
            <BookOpen />
            课程信息
          </TabsTrigger>
          {permissions.canManageQuiz && (
            <TabsTrigger
              value="quiz"
              disabled={saving || settingsDirty}
              className="gap-2 rounded-xl px-4 py-3"
              title={settingsDirty ? '请先保存或取消管理员设置' : undefined}
            >
              <FileQuestion />
              测试题
            </TabsTrigger>
          )}
          {permissions.canManageLifecycle && (
            <TabsTrigger
              value="lifecycle"
              disabled={saving || dirty}
              className="gap-2 rounded-xl px-4 py-3"
              title={
                dirty ? '请先保存或取消未保存的内容，再调整状态' : undefined
              }
            >
              <ShieldCheck />
              课程状态
            </TabsTrigger>
          )}
          {permissions.canManageLifecycle && (
            <TabsTrigger
              value="admin-settings"
              disabled={saving || contentDirty}
              className="gap-2 rounded-xl px-4 py-3"
              title={
                contentDirty ? '请先保存或取消课程信息' : undefined
              }
            >
              <Settings2 />
              管理员设置
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent
          value="content"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <CourseContentEditor
            managed={managed}
            onSaved={onSaved}
            onDirtyChange={setContentDirty}
            onSavingChange={setContentSaving}
          />
        </TabsContent>
        {permissions.canManageQuiz && (
          <TabsContent value="quiz">
            <CourseQuizPanel
              courseId={course.id}
              canPublish={permissions.canPublishQuiz}
              canGenerateFromCourseDocument={isAdmin}
            />
          </TabsContent>
        )}
        {permissions.canManageLifecycle && (
          <TabsContent value="lifecycle">
            <CourseLifecyclePanel
              key={course.id}
              course={course}
              onUpdated={() => void load()}
              onDeleted={() => navigate('/admin/course-management')}
            />
          </TabsContent>
        )}
        {permissions.canManageLifecycle && (
          <TabsContent
            value="admin-settings"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <CourseAdminSettings
              managed={managed}
              onSaved={onSaved}
              onDirtyChange={setSettingsDirty}
              onSavingChange={setSettingsSaving}
            />
          </TabsContent>
        )}
      </Tabs>
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>有尚未保存的课程设置</DialogTitle>
            <DialogDescription>
              继续将丢弃这次尚未保存的课程信息或管理员设置。你可以取消，先完成保存。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              继续编辑
            </Button>
            <Button
              onClick={() => {
                const action = pending;
                setPending(null);
                if (action) perform(action);
              }}
            >
              丢弃修改并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CourseManagementDetailPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  return <CourseManagementDetail key={courseId} courseId={courseId} />;
}
