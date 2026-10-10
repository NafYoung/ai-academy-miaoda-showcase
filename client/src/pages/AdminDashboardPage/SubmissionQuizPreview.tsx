import type { ISubmissionQuizQuestion } from '@shared/api.interface';

interface SubmissionQuizPreviewProps {
  questions: ISubmissionQuizQuestion[];
  loading: boolean;
}

const SOURCE_LABEL: Record<ISubmissionQuizQuestion['authoringSource'], string> =
  {
    manual: '人工录入',
    excel_import: 'Excel 导入',
    ai_generated_confirmed: 'AI 生成后人工确认',
    ai_assisted: 'AI 辅助后人工修改',
  };

export default function SubmissionQuizPreview({
  questions,
  loading,
}: SubmissionQuizPreviewProps) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  }
  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        尚未读取到投稿题目，不能通过审核。
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">投稿课后题</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          {questions.length} 道
        </span>
      </div>
      <div className="space-y-2">
        {questions.map((question) => (
          <details
            key={question.id}
            className="group rounded-2xl border border-slate-100 bg-white p-3.5"
          >
            <summary className="cursor-pointer list-none pr-4 text-sm font-bold leading-6 text-slate-800">
              {question.sequence}. {question.question}
            </summary>
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">
              <div className="grid gap-2 sm:grid-cols-2">
                {(['A', 'B', 'C', 'D'] as const).map((key) => (
                  <p
                    key={key}
                    className={
                      key === question.correctAnswer
                        ? 'font-bold text-emerald-700'
                        : ''
                    }
                  >
                    {key}. {question.options[key]}
                  </p>
                ))}
              </div>
              <p>
                <span className="font-bold text-slate-800">解析：</span>
                {question.explanation}
              </p>
              <p>
                <span className="font-bold text-slate-800">原文依据：</span>
                {question.evidence}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                  {question.learningPoint}
                </span>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700">
                  {SOURCE_LABEL[question.authoringSource]}
                </span>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
