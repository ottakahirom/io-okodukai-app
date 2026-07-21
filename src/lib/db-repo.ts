import { createInitialState, DEFAULT_REWARDS } from "@/lib/seed";
import { getPrisma } from "@/lib/db";
import {
  isCorrectExpired,
  pruneExpiredCorrectQuestions,
  todayJst,
} from "@/lib/store";
import type {
  AppState,
  DailySession,
  Genre,
  MasterItem,
  MoneyLog,
  PenaltyItem,
  Question,
  RewardTable,
  Settings,
} from "@/lib/types";

export { daysUntilCorrectExpiry, CORRECT_RETENTION_DAYS } from "@/lib/store";

function asRewardTable(raw: unknown): RewardTable {
  const base = { ...DEFAULT_REWARDS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, number>;
  return {
    0: Number(o["0"] ?? base[0]),
    1: Number(o["1"] ?? base[1]),
    2: Number(o["2"] ?? base[2]),
    3: Number(o["3"] ?? base[3]),
    4: Number(o["4"] ?? base[4]),
    5: Number(o["5"] ?? base[5]),
  };
}

function asChoices(raw: unknown): Question["choices"] {
  if (!Array.isArray(raw) || raw.length !== 4) {
    return ["", "", "", ""];
  }
  return [String(raw[0]), String(raw[1]), String(raw[2]), String(raw[3])];
}

export async function loadAppStateFromDb(): Promise<AppState> {
  const db = getPrisma();
  const count = await db.question.count();
  if (count === 0 && !(await db.settings.findUnique({ where: { id: 1 } }))) {
    await seedDb();
  }

  // 期限切れの正解済み問題を削除
  const today = todayJst();
  const expired = await db.question.findMany({
    where: { lastCorrectAt: { not: null } },
  });
  const toDelete = expired.filter(
    (q) => q.lastCorrectAt && isCorrectExpired(q.lastCorrectAt, today),
  );
  if (toDelete.length) {
    await db.question.deleteMany({
      where: { id: { in: toDelete.map((q) => q.id) } },
    });
  }

  const [settingsRow, questions, categories, masterItems, penaltyItems, logs, sessionRow] =
    await Promise.all([
      db.settings.findUnique({ where: { id: 1 } }),
      db.question.findMany({ orderBy: { id: "asc" } }),
      db.choreCategory.findMany({ orderBy: { sort: "asc" } }),
      db.masterItem.findMany({ orderBy: { id: "asc" } }),
      db.penaltyItem.findMany({ orderBy: { id: "asc" } }),
      db.moneyLog.findMany({ orderBy: { id: "asc" } }),
      db.dailySession.findUnique({ where: { date: today } }),
    ]);

  const settings: Settings = settingsRow
    ? {
        grade: settingsRow.grade,
        term: settingsRow.term,
        rewards: asRewardTable(settingsRow.rewards),
      }
    : createInitialState().settings;

  const state: AppState = {
    settings,
    unpaidYen: settingsRow?.unpaidYen ?? 0,
    questions: questions.map((q) => ({
      id: q.id,
      genre: q.genre as Genre,
      stem: q.stem,
      choices: asChoices(q.choices),
      correctIndex: q.correctIndex as 0 | 1 | 2 | 3,
      wrongFlag: q.wrongFlag,
      lastAskedDate: q.lastAskedDate ?? undefined,
      lastCorrectAt: q.lastCorrectAt ?? undefined,
    })),
    choreCategories: categories.map((c) => c.name),
    masterItems: masterItems.map(
      (m): MasterItem => ({
        id: m.id,
        name: m.name,
        points: m.points,
        category: m.category,
        icon: m.icon,
      }),
    ),
    penaltyItems: penaltyItems.map(
      (p): PenaltyItem => ({
        id: p.id,
        name: p.name,
        points: p.points,
        icon: p.icon,
      }),
    ),
    logs: logs.map(
      (l): MoneyLog => ({
        id: l.id,
        itemName: l.itemName,
        points: l.points,
        status: l.status as MoneyLog["status"],
        date: l.date,
      }),
    ),
    session: sessionRow
      ? {
          date: sessionRow.date,
          questionIds: sessionRow.questionIds as string[],
          answers: sessionRow.answers as (number | null)[],
          completed: sessionRow.completed,
          earnedYen: sessionRow.earnedYen,
          rewardClaimed: sessionRow.rewardClaimed,
        }
      : null,
  };

  return pruneExpiredCorrectQuestions(state);
}

export async function seedDb(): Promise<void> {
  const db = getPrisma();
  const initial = createInitialState();

  await db.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      grade: initial.settings.grade,
      term: initial.settings.term,
      rewards: initial.settings.rewards,
      unpaidYen: 0,
    },
    update: {},
  });

  for (const [i, name] of initial.choreCategories.entries()) {
    await db.choreCategory.upsert({
      where: { name },
      create: { name, sort: i },
      update: { sort: i },
    });
  }

  for (const q of initial.questions) {
    await db.question.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        genre: q.genre,
        stem: q.stem,
        choices: q.choices,
        correctIndex: q.correctIndex,
        wrongFlag: q.wrongFlag,
      },
      update: {},
    });
  }

  for (const m of initial.masterItems) {
    await db.masterItem.upsert({
      where: { id: m.id },
      create: m,
      update: {},
    });
  }

  for (const p of initial.penaltyItems) {
    await db.penaltyItem.upsert({
      where: { id: p.id },
      create: p,
      update: {},
    });
  }

  for (const l of initial.logs) {
    const exists = await db.moneyLog.findFirst({
      where: { itemName: l.itemName, date: l.date, points: l.points },
    });
    if (!exists) {
      await db.moneyLog.create({
        data: {
          itemName: l.itemName,
          points: l.points,
          status: l.status,
          date: l.date,
        },
      });
    }
  }
}

/** AppState 全体を DB に反映（デモ用のシンプル同期） */
export async function saveAppStateToDb(state: AppState): Promise<void> {
  const db = getPrisma();

  await db.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      grade: state.settings.grade,
      term: state.settings.term,
      rewards: state.settings.rewards,
      unpaidYen: state.unpaidYen,
    },
    update: {
      grade: state.settings.grade,
      term: state.settings.term,
      rewards: state.settings.rewards,
      unpaidYen: state.unpaidYen,
    },
  });

  const existingCats = await db.choreCategory.findMany();
  const wantCats = new Set(state.choreCategories);
  for (const c of existingCats) {
    if (!wantCats.has(c.name)) {
      await db.choreCategory.delete({ where: { name: c.name } });
    }
  }
  for (const [i, name] of state.choreCategories.entries()) {
    await db.choreCategory.upsert({
      where: { name },
      create: { name, sort: i },
      update: { sort: i },
    });
  }

  const existingQ = await db.question.findMany({ select: { id: true } });
  const wantQ = new Set(state.questions.map((q) => q.id));
  for (const q of existingQ) {
    if (!wantQ.has(q.id)) await db.question.delete({ where: { id: q.id } });
  }
  for (const q of state.questions) {
    await db.question.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        genre: q.genre,
        stem: q.stem,
        choices: q.choices,
        correctIndex: q.correctIndex,
        wrongFlag: q.wrongFlag,
        lastAskedDate: q.lastAskedDate ?? null,
        lastCorrectAt: q.lastCorrectAt ?? null,
      },
      update: {
        genre: q.genre,
        stem: q.stem,
        choices: q.choices,
        correctIndex: q.correctIndex,
        wrongFlag: q.wrongFlag,
        lastAskedDate: q.lastAskedDate ?? null,
        lastCorrectAt: q.lastCorrectAt ?? null,
      },
    });
  }

  const existingM = await db.masterItem.findMany({ select: { id: true } });
  const wantM = new Set(state.masterItems.map((m) => m.id));
  for (const m of existingM) {
    if (!wantM.has(m.id)) await db.masterItem.delete({ where: { id: m.id } });
  }
  for (const m of state.masterItems) {
    await db.masterItem.upsert({
      where: { id: m.id },
      create: m,
      update: {
        name: m.name,
        points: m.points,
        category: m.category,
        icon: m.icon,
      },
    });
  }

  const existingP = await db.penaltyItem.findMany({ select: { id: true } });
  const wantP = new Set(state.penaltyItems.map((p) => p.id));
  for (const p of existingP) {
    if (!wantP.has(p.id)) await db.penaltyItem.delete({ where: { id: p.id } });
  }
  for (const p of state.penaltyItems) {
    await db.penaltyItem.upsert({
      where: { id: p.id },
      create: p,
      update: { name: p.name, points: p.points, icon: p.icon },
    });
  }

  // logs: replace all (simple demo sync)
  await db.moneyLog.deleteMany();
  if (state.logs.length) {
    await db.moneyLog.createMany({
      data: state.logs.map((l) => ({
        itemName: l.itemName,
        points: l.points,
        status: l.status,
        date: l.date,
      })),
    });
  }

  if (state.session) {
    const s: DailySession = state.session;
    await db.dailySession.upsert({
      where: { date: s.date },
      create: {
        date: s.date,
        questionIds: s.questionIds,
        answers: s.answers,
        completed: s.completed,
        earnedYen: s.earnedYen,
        rewardClaimed: s.rewardClaimed,
      },
      update: {
        questionIds: s.questionIds,
        answers: s.answers,
        completed: s.completed,
        earnedYen: s.earnedYen,
        rewardClaimed: s.rewardClaimed,
      },
    });
  }
}
