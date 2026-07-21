import { createInitialState } from "./seed";
import type {
  AppState,
  DailySession,
  Genre,
  MasterItem,
  MoneyLog,
  PenaltyItem,
  Question,
  Settings,
} from "./types";
import { GENRES, STORAGE_KEY } from "./types";

/** Asia/Tokyo の YYYY-MM-DD */
export function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function migrateCategory(cat: string): string {
  if (cat === "clean") return "おてつだい";
  if (cat === "study") return "けいこ・れんしゅう";
  return cat;
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("okodukai-demo-v2");
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = createInitialState();
    const masterItems = (parsed.masterItems?.length
      ? parsed.masterItems
      : base.masterItems
    ).map((m) => ({ ...m, category: migrateCategory(String(m.category)) }));

    const fromItems = [...new Set(masterItems.map((m) => m.category))];
    const choreCategories = parsed.choreCategories?.length
      ? parsed.choreCategories.map(migrateCategory)
      : fromItems.length
        ? fromItems
        : base.choreCategories;

    return pruneExpiredCorrectQuestions({
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      questions: parsed.questions?.length ? parsed.questions : base.questions,
      choreCategories,
      masterItems,
      penaltyItems: parsed.penaltyItems?.length
        ? parsed.penaltyItems
        : base.penaltyItems,
      logs: parsed.logs ?? base.logs,
      session: parsed.session
        ? {
            rewardClaimed: false,
            ...parsed.session,
          }
        : null,
    });
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): AppState {
  const state = createInitialState();
  saveState(state);
  return state;
}

export function approvedTotal(logs: MoneyLog[]): number {
  return logs.reduce((sum, log) => {
    if (log.status === "approved" || log.status === "penalty") {
      return sum + log.points;
    }
    return sum;
  }, 0);
}

/** 正解から1か月（30日）経過した問題をプールから削除 */
export const CORRECT_RETENTION_DAYS = 30;

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function isCorrectExpired(lastCorrectAt: string, today: string): boolean {
  return addDaysYmd(lastCorrectAt, CORRECT_RETENTION_DAYS) <= today;
}

/** 正解日からの残り日数（削除予定まで）。期限切れは0 */
export function daysUntilCorrectExpiry(
  lastCorrectAt: string,
  today: string = todayJst(),
): number {
  const expiry = addDaysYmd(lastCorrectAt, CORRECT_RETENTION_DAYS);
  const [ey, em, ed] = expiry.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const exp = Date.UTC(ey, em - 1, ed);
  const now = Date.UTC(ty, tm - 1, td);
  const diff = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export function pruneExpiredCorrectQuestions(state: AppState): AppState {
  const today = todayJst();
  const questions = state.questions.filter(
    (q) => !(q.lastCorrectAt && isCorrectExpired(q.lastCorrectAt, today)),
  );
  if (questions.length === state.questions.length) return state;
  return { ...state, questions };
}

export function pickDailyQuestions(questions: Question[], date: string): Question[] {
  const byGenre = new Map<Genre, Question[]>();
  for (const g of GENRES) byGenre.set(g, []);
  for (const q of questions) {
    byGenre.get(q.genre)?.push(q);
  }

  const picked: Question[] = [];
  for (const g of GENRES) {
    const pool = (byGenre.get(g) ?? []).filter((q) => q.lastAskedDate !== date);
    const fallback = byGenre.get(g) ?? [];
    const candidates = pool.length ? pool : fallback;
    if (!candidates.length) continue;
    const preferred = candidates.filter((q) => q.lastAskedDate !== date);
    const list = preferred.length ? preferred : candidates;
    picked.push(shuffle(list)[0]);
  }

  const reviewPool = shuffle(
    questions.filter(
      (q) =>
        q.wrongFlag &&
        !picked.some((p) => p.id === q.id) &&
        q.lastAskedDate !== date,
    ),
  );

  const maxReview = Math.min(2, reviewPool.length, picked.length);
  for (let i = 0; i < maxReview; i++) {
    const review = reviewPool[i];
    const sameGenreIdx = picked.findIndex((p) => p.genre === review.genre);
    const replaceIdx = sameGenreIdx >= 0 ? sameGenreIdx : picked.length - 1 - i;
    if (replaceIdx >= 0 && replaceIdx < picked.length) {
      picked[replaceIdx] = review;
    }
  }

  return picked;
}

export function ensureTodaySession(state: AppState): AppState {
  state = pruneExpiredCorrectQuestions(state);
  const date = todayJst();
  if (state.session?.date === date) {
    const idsOk = state.session.questionIds.every((id) =>
      state.questions.some((q) => q.id === id),
    );
    if (idsOk) {
      return {
        ...state,
        session: {
          rewardClaimed: false,
          ...state.session,
        },
      };
    }
    // 期限切れ削除で欠けた場合は今日のセットを作り直す
  }

  const picked = pickDailyQuestions(state.questions, date);
  const session: DailySession = {
    date,
    questionIds: picked.map((q) => q.id),
    answers: picked.map(() => null),
    completed: picked.length === 0,
    earnedYen: 0,
    rewardClaimed: false,
  };

  const questions = state.questions.map((q) =>
    picked.some((p) => p.id === q.id) ? { ...q, lastAskedDate: date } : q,
  );

  return { ...state, questions, session };
}

export function answerQuestion(state: AppState, choiceIndex: number): AppState {
  const session = state.session;
  if (!session || session.completed) return state;

  const idx = session.answers.findIndex((a) => a === null);
  if (idx < 0) return state;

  const qid = session.questionIds[idx];
  const question = state.questions.find((q) => q.id === qid);
  if (!question) return state;

  const answers = [...session.answers];
  answers[idx] = choiceIndex;
  const isCorrect = choiceIndex === question.correctIndex;

  const questions = state.questions.map((q) => {
    if (q.id !== qid) return q;
    if (isCorrect) {
      return {
        ...q,
        wrongFlag: false,
        lastCorrectAt: todayJst(),
      };
    }
    return { ...q, wrongFlag: true };
  });

  const allDone = answers.every((a) => a !== null);
  let earnedYen = session.earnedYen;
  let completed = session.completed;

  if (allDone) {
    const correct = answers.reduce((acc, a, i) => {
      const qq = questions.find((x) => x.id === session.questionIds[i]);
      return acc + (qq && a === qq.correctIndex ? 1 : 0);
    }, 0);
    const key = Math.min(5, correct) as 0 | 1 | 2 | 3 | 4 | 5;
    earnedYen = state.settings.rewards[key] ?? 0;
    completed = true;
  }

  return {
    ...state,
    questions,
    session: {
      ...session,
      answers,
      completed,
      earnedYen,
      rewardClaimed: session.rewardClaimed ?? false,
    },
  };
}

export function claimQuizReward(state: AppState): AppState {
  const session = state.session;
  if (!session?.completed || session.rewardClaimed || session.earnedYen <= 0) {
    return state;
  }

  const log: MoneyLog = {
    id: Date.now(),
    itemName: `📝 まいにちクイズ（${session.earnedYen}円）`,
    points: session.earnedYen,
    status: "pending",
    date: todayJst(),
  };

  return {
    ...state,
    logs: [...state.logs, log],
    session: { ...session, rewardClaimed: true },
  };
}

export function submitChoreApplication(
  state: AppState,
  itemName: string,
  points: number,
): AppState {
  const log: MoneyLog = {
    id: Date.now(),
    itemName,
    points,
    status: "pending",
    date: todayJst(),
  };
  return { ...state, logs: [...state.logs, log] };
}

export function submitPenalty(
  state: AppState,
  itemName: string,
  points: number,
): AppState {
  const log: MoneyLog = {
    id: Date.now(),
    itemName,
    points,
    status: "penalty",
    date: todayJst(),
  };
  return { ...state, logs: [...state.logs, log] };
}

export function approveLog(state: AppState, id: number): AppState {
  return {
    ...state,
    logs: state.logs.map((l) =>
      l.id === id ? { ...l, status: "approved" as const } : l,
    ),
  };
}

export function rejectLog(state: AppState, id: number): AppState {
  return {
    ...state,
    logs: state.logs.filter((l) => l.id !== id),
  };
}

export function updateSettings(state: AppState, settings: Settings): AppState {
  return { ...state, settings };
}

export function settleUnpaid(state: AppState): AppState {
  return { ...state, unpaidYen: 0 };
}

export function upsertQuestion(state: AppState, question: Question): AppState {
  const exists = state.questions.some((q) => q.id === question.id);
  const questions = exists
    ? state.questions.map((q) => (q.id === question.id ? question : q))
    : [...state.questions, question];
  return { ...state, questions };
}

export function deleteQuestion(state: AppState, id: string): AppState {
  return {
    ...state,
    questions: state.questions.filter((q) => q.id !== id),
  };
}

export function upsertMasterItem(state: AppState, item: MasterItem): AppState {
  const exists = state.masterItems.some((m) => m.id === item.id);
  const masterItems = exists
    ? state.masterItems.map((m) => (m.id === item.id ? item : m))
    : [...state.masterItems, item];
  const choreCategories = state.choreCategories.includes(item.category)
    ? state.choreCategories
    : [...state.choreCategories, item.category];
  return { ...state, masterItems, choreCategories };
}

export function deleteMasterItem(state: AppState, id: string): AppState {
  return {
    ...state,
    masterItems: state.masterItems.filter((m) => m.id !== id),
  };
}

export function addChoreCategory(state: AppState, name: string): AppState {
  const trimmed = name.trim();
  if (!trimmed || state.choreCategories.includes(trimmed)) return state;
  return {
    ...state,
    choreCategories: [...state.choreCategories, trimmed],
  };
}

export function deleteChoreCategory(
  state: AppState,
  name: string,
): { state: AppState; error?: string } {
  const used = state.masterItems.some((m) => m.category === name);
  if (used) {
    return {
      state,
      error: "このカテゴリを使っているお手伝いがあるので削除できません",
    };
  }
  return {
    state: {
      ...state,
      choreCategories: state.choreCategories.filter((c) => c !== name),
    },
  };
}

export function upsertPenaltyItem(state: AppState, item: PenaltyItem): AppState {
  const normalized = {
    ...item,
    points: item.points > 0 ? -Math.abs(item.points) : item.points,
  };
  const exists = state.penaltyItems.some((p) => p.id === item.id);
  const penaltyItems = exists
    ? state.penaltyItems.map((p) => (p.id === item.id ? normalized : p))
    : [...state.penaltyItems, normalized];
  return { ...state, penaltyItems };
}

export function deletePenaltyItem(state: AppState, id: string): AppState {
  return {
    ...state,
    penaltyItems: state.penaltyItems.filter((p) => p.id !== id),
  };
}

export function newQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newMasterId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newPenaltyId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
