import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ISubmissionQuizQuestionInput } from '@shared/api.interface';
import {
  blankSubmissionQuestion,
  downloadSubmissionQuizTemplate,
  parseSubmissionQuizWorkbook,
} from './submission-quiz';

interface SubmissionQuizEditorProps {
  questions: ISubmissionQuizQuestionInput[];
  onChange: (questions: ISubmissionQuizQuestionInput[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

const SOURCE_LABEL: Record<
  ISubmissionQuizQuestionInput['authoringSource'],
  string
> = {
  manual: '人工录入',
  excel_import: 'Excel 导入',
  ai_generated_confirmed: 'AI 候选 · 待确认',
  ai_assisted: 'AI 辅助后人工修改',
};

export default function SubmissionQuizEditor({
  questions,
  onChange,
  onSave,
  saving,
}: SubmissionQuizEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<
    ISubmissionQuizQuestionInput[] | null
  >(null);

  const applyImportedQuestions = (
    imported: ISubmissionQuizQuestionInput[],
  ): void => {
    onChange(imported);
    toast.success(`已读取 ${imported.length} 道题，请逐题核对后保存`);
  };

  const replaceQuestion = (
    index: number,
    next: ISubmissionQuizQuestionInput,
  ): void => {
    onChange(
      questions.map((question, questionIndex) =>
        questionIndex === index ? next : question,
      ),
    );
  };

  const addQuestion = (): void => {
    const usedSequences = new Set(
      questions.map(
        (question: ISubmissionQuizQuestionInput) => question.sequence,
      ),
    );
    let sequence = 1;
    while (usedSequences.has(sequence)) sequence += 1;
    onChange(
      [...questions, blankSubmissionQuestion(sequence)].sort(
        (left, right) => left.sequence - right.sequence,
      ),
    );
  };

  const importWorkbook = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setImporting(true);
    try {
      const imported = await parseSubmissionQuizWorkbook(file);
      if (questions.length > 0) {
        setPendingImport(imported);
        return;
      }
      applyImportedQuestions(imported);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Excel 读取失败');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-blue-100 bg-blue-50/70 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-black text-slate-950">课后题（按需设置）</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              可人工录入或导入 Excel；开启课后题后提交前至少需要 1
              道题，未完成时也可先保存为空草稿。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white"
              onClick={() => {
                void downloadSubmissionQuizTemplate().catch(() => {
                  toast.error('模板生成失败，请稍后重试');
                });
              }}
            >
              <Download className="size-4" />
              下载模板
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => void importWorkbook(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="size-4" />
              {importing ? '读取中…' : '导入 Excel'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">
          当前 {questions.length} 道
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={addQuestion}
        >
          <Plus className="size-4" />
          添加题目
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 py-14 text-center">
          <FileSpreadsheet className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            可逐题添加，也可先下载模板批量填写
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <article
              key={`${question.sequence}:${index}`}
              className="rounded-[22px] border border-slate-100 bg-white p-4 md:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
                    {question.sequence}
                  </span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                    {SOURCE_LABEL[question.authoringSource]}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-slate-400 hover:text-rose-600"
                  onClick={() =>
                    onChange(
                      questions.filter(
                        (_, questionIndex) => questionIndex !== index,
                      ),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">删除第 {question.sequence} 题</span>
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block text-sm font-bold text-slate-700">
                  题目
                  <Textarea
                    value={question.question}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        question: event.target.value,
                      })
                    }
                    className="mt-2 min-h-20 rounded-xl bg-white"
                    placeholder="填写一个可由课程资料直接回答的问题"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <label
                      key={key}
                      className="text-sm font-bold text-slate-700"
                    >
                      选项 {key}
                      <Input
                        value={question.options[key]}
                        onChange={(event) =>
                          replaceQuestion(index, {
                            ...question,
                            options: {
                              ...question.options,
                              [key]: event.target.value,
                            },
                          })
                        }
                        className="mt-2 h-11 rounded-xl bg-white"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <label className="text-sm font-bold text-slate-700">
                    正确答案
                    <Select
                      value={question.correctAnswer}
                      onValueChange={(value: 'A' | 'B' | 'C' | 'D') =>
                        replaceQuestion(index, {
                          ...question,
                          correctAnswer: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 h-11 rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['A', 'B', 'C', 'D'] as const).map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    考查知识点
                    <Input
                      value={question.learningPoint}
                      onChange={(event) =>
                        replaceQuestion(index, {
                          ...question,
                          learningPoint: event.target.value,
                        })
                      }
                      className="mt-2 h-11 rounded-xl bg-white"
                      placeholder="每题填写一个不同的核心知识点"
                    />
                  </label>
                </div>

                <label className="block text-sm font-bold text-slate-700">
                  答案解析
                  <Textarea
                    value={question.explanation}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        explanation: event.target.value,
                      })
                    }
                    className="mt-2 min-h-20 rounded-xl bg-white"
                    placeholder="解释正确内容及其课程依据"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  <span className="flex items-center justify-between gap-3">
                    <span>原文依据</span>
                    <span className="text-xs font-medium text-slate-400">
                      {question.evidence.length}/150
                    </span>
                  </span>
                  <Textarea
                    value={question.evidence}
                    maxLength={150}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        evidence: event.target.value,
                      })
                    }
                    className="mt-2 min-h-20 rounded-xl bg-white"
                    placeholder="复制一段能直接支持正确答案的连续课程原文"
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-5">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-6"
          disabled={saving}
          onClick={() => void onSave()}
        >
          <Save className="size-4" />
          {saving ? '保存中…' : '保存题目草稿'}
        </Button>
      </div>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>用 Excel 替换当前页面题目？</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              将读取到的 {pendingImport?.length ?? 0}{' '}
              道题放入当前编辑页。操作不会自动保存，已保存的题目草稿也不会改变，除非你之后主动点击保存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (pendingImport) applyImportedQuestions(pendingImport);
                setPendingImport(null);
              }}
            >
              确认替换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
