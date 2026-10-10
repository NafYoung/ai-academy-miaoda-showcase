import type {
  IAcademyCourse,
  ICourseQuizAdminDraft,
  ICourseSubmission,
  ILearningProgress,
  ISubmissionQuizQuestion,
} from '@shared/api.interface';
import { PEOPLE } from './directory';
import {
  PUBLISHED_QUIZZES,
  seedCourses,
  seedSubmissionQuestions,
  seedSubmissions,
  type SeedQuizQuestion,
} from './seed';

export interface StoredQuiz {
  version: string;
  authoringSource: 'manual' | 'ai_generated_confirmed' | 'ai_assisted' | 'legacy';
  publishedAt: string;
  questions: Array<SeedQuizQuestion & { id: string; sequence: number }>;
}

export interface StoredSession {
  sessionId: string;
  userId: string;
  courseId: string;
  state: 'active' | 'paused' | 'ended';
  creditedSeconds: number;
  lastSequence: number;
  leaseToken: string;
  serverStartedAt: string;
  lastCumulativeMs: number;
}

export interface DemoState {
  version: 4;
  courses: IAcademyCourse[];
  submissions: ICourseSubmission[];
  submissionQuestions: Record<string, ISubmissionQuizQuestion[]>;
  quizzes: Record<string, StoredQuiz>;
  drafts: Record<string, ICourseQuizAdminDraft>;
  /** key = `${userId}:${courseId}` */
  progress: Record<string, ILearningProgress>;
  enrollments: Record<string, string>;
  activeSeconds: Record<string, number>;
  sessionCounts: Record<string, number>;
  sessions: Record<string, StoredSession>;
  deadlineOverrides: Record<string, string>;
  catalogSyncedAt: string;
  orgSyncedAt: string;
  rosterSyncedAt: string;
  seq: number;
}

const STORAGE_KEY = 'athena-demo:state';

export const nowIso = (): string => new Date().toISOString();

export function progressKey(userId: string, courseId: string): string {
  return `${userId}:${courseId}`;
}

function toStoredQuiz(courseId: string, questions: SeedQuizQuestion[]): StoredQuiz {
  return {
    version: `q_internal_n${questions.length}_seed-${courseId}`,
    authoringSource: 'manual',
    publishedAt: '2026-09-28T02:00:00.000Z',
    questions: questions.map((q, i) => ({ ...q, id: `${courseId}-q${i + 1}`, sequence: i + 1 })),
  };
}

/** 其他同事的学习记录，让管理员的学习监控有内容可看。 */
function seedColleagueProgress(courses: IAcademyCourse[]): {
  progress: DemoState['progress'];
  activeSeconds: DemoState['activeSeconds'];
  sessionCounts: DemoState['sessionCounts'];
} {
  const progress: DemoState['progress'] = {};
  const activeSeconds: DemoState['activeSeconds'] = {};
  const sessionCounts: DemoState['sessionCounts'] = {};
  // 已下架课程也保留历史学习记录，删除影响预览才有内容可看。
  const live = courses.filter((c) => c.status === '已完结' || c.status === '更新中' || c.status === '已下架');
  PEOPLE.forEach((person, pi) => {
    if (person.userId === '10001') return; // 当前演示员工从零开始
    live.forEach((course, ci) => {
      const roll = (pi * 7 + ci * 3) % 10;
      if (roll < 4) return;
      const completed = roll >= 7;
      const key = progressKey(person.userId, course.id);
      const at = new Date(Date.UTC(2026, 8, 20 + ((pi + ci) % 18), 3 + (ci % 6))).toISOString();
      progress[key] = {
        id: `prog-${person.userId}-${course.id}`,
        courseId: course.id,
        courseTitle: course.title,
        status: completed ? 'completed' : 'in_progress',
        progressPercent: completed ? 100 : 40 + ((pi + ci) % 4) * 10,
        openedResources: completed ? ['view_course', 'open_doc', 'mark_complete'] : ['view_course', 'open_doc'],
        lastResource: course.docUrl ? 'open_doc' : 'open_video',
        lastActivityAt: at,
        userId: person.userId,
        userName: person.name,
        quizVersion: '',
        correctQuestionNumbers: [],
        quizCorrectCount: completed ? 2 : 0,
        quizAttemptCount: completed ? 1 + (roll % 2) : 0,
        lastQuizAt: completed ? at : '',
      };
      activeSeconds[key] = 300 + ((pi * 13 + ci * 29) % 40) * 60;
      sessionCounts[key] = 1 + ((pi + ci) % 4);
    });
  });
  return { progress, activeSeconds, sessionCounts };
}

function createInitialState(): DemoState {
  const courses = seedCourses();
  const quizzes: DemoState['quizzes'] = {};
  for (const [courseId, questions] of Object.entries(PUBLISHED_QUIZZES)) {
    quizzes[courseId] = toStoredQuiz(courseId, questions);
  }
  const colleague = seedColleagueProgress(courses);
  return {
    version: 4,
    courses,
    submissions: seedSubmissions(),
    submissionQuestions: seedSubmissionQuestions(),
    quizzes,
    drafts: {},
    progress: colleague.progress,
    enrollments: {},
    activeSeconds: colleague.activeSeconds,
    sessionCounts: colleague.sessionCounts,
    sessions: {},
    deadlineOverrides: {},
    catalogSyncedAt: '2026-10-09T23:00:00.000Z',
    orgSyncedAt: '2026-10-09T23:05:00.000Z',
    rosterSyncedAt: '2026-10-09T23:06:00.000Z',
    seq: 100,
  };
}

let cached: DemoState | null = null;

export function getState(): DemoState {
  if (cached) return cached;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoState) : null;
    cached = parsed?.version === 4 ? parsed : createInitialState();
  } catch {
    cached = createInitialState();
  }
  return cached;
}

export function saveState(): void {
  if (!cached) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // 存储已满时只保留内存态，刷新后回到初始数据。
  }
}

export function resetDemoState(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
  cached = null;
}

export function nextId(prefix: string): string {
  const state = getState();
  state.seq += 1;
  return `${prefix}-${state.seq}`;
}

/** 64 位十六进制版本号：满足原系统对 revision 的格式校验。 */
/** 题库版本号格式与原系统一致：q_<类型>_n<题数>_<序号>，前端据此核对题目数量。 */
export function quizVersion(kind: 'internal' | 'revision' | 'ai', count: number): string {
  return `q_${kind}_n${count}_${nextId('v')}`;
}

export function hexDigest(input: string): string {
  let out = '';
  for (let salt = 0; salt < 8; salt += 1) {
    let h = 0x811c9dc5 ^ salt;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}
