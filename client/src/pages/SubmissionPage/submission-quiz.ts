import type { ISubmissionQuizQuestionInput } from '@shared/api.interface';

const HEADERS = [
  '题号',
  '题目',
  '选项A',
  '选项B',
  '选项C',
  '选项D',
  '正确答案',
  '答案解析',
  '原文依据',
  '考查知识点',
] as const;

const cellText = (value: unknown): string => String(value ?? '').trim();

export async function downloadSubmissionQuizTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const questionSheet = XLSX.utils.aoa_to_sheet([[...HEADERS]]);
  questionSheet['!cols'] = [
    { wch: 8 },
    { wch: 42 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 12 },
    { wch: 42 },
    { wch: 48 },
    { wch: 28 },
  ];
  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ['填写要求'],
    ['按课程需要填写单选题，题号使用正整数且不能重复。'],
    ['每题必须填写四个不重复选项；正确答案只填 A、B、C 或 D。'],
    ['原文依据必须是课程资料中可直接支持答案的连续原文，不超过 150 字。'],
    ['每题填写一个不同的考查知识点。导入后仍需在页面逐题确认。'],
  ]);
  instructionSheet['!cols'] = [{ wch: 86 }];
  XLSX.utils.book_append_sheet(workbook, questionSheet, '题目');
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');
  XLSX.writeFileXLSX(workbook, '内部课程课后题模板.xlsx');
}

export async function parseSubmissionQuizWorkbook(
  file: File,
): Promise<ISubmissionQuizQuestionInput[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('请上传 .xlsx 格式的题目文件');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('题目文件不能超过 2MB');
  }
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) throw new Error('Excel 中没有可读取的题目工作表');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  if (rows.length === 0) throw new Error('Excel 中没有题目');

  const questions = rows.map((row, index): ISubmissionQuizQuestionInput => {
    const rowNumber = index + 2;
    const sequence = Number(cellText(row['题号']));
    const correctAnswer = cellText(row['正确答案']).toUpperCase();
    if (!Number.isSafeInteger(sequence) || sequence < 1) {
      throw new Error(`第 ${rowNumber} 行的题号必须是正整数`);
    }
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      throw new Error(`第 ${rowNumber} 行的正确答案只能填写 A、B、C 或 D`);
    }
    const question: ISubmissionQuizQuestionInput = {
      sequence,
      question: cellText(row['题目']),
      options: {
        A: cellText(row['选项A']),
        B: cellText(row['选项B']),
        C: cellText(row['选项C']),
        D: cellText(row['选项D']),
      },
      correctAnswer: correctAnswer as 'A' | 'B' | 'C' | 'D',
      explanation: cellText(row['答案解析']),
      evidence: cellText(row['原文依据']),
      learningPoint: cellText(row['考查知识点']),
      authoringSource: 'excel_import',
    };
    const missing = [
      question.question,
      ...Object.values(question.options),
      question.explanation,
      question.evidence,
      question.learningPoint,
    ].some((value) => !value);
    if (missing) throw new Error(`第 ${rowNumber} 行存在空白必填项`);
    if (question.evidence.length > 150) {
      throw new Error(`第 ${rowNumber} 行的原文依据超过 150 字`);
    }
    return question;
  });
  if (
    new Set(questions.map((question) => question.sequence)).size !==
    questions.length
  ) {
    throw new Error('题号不能重复');
  }
  return questions.sort((left, right) => left.sequence - right.sequence);
}

export function blankSubmissionQuestion(
  sequence: number,
): ISubmissionQuizQuestionInput {
  return {
    sequence,
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A',
    explanation: '',
    evidence: '',
    learningPoint: '',
    authoringSource: 'manual',
  };
}
