export const GENRES = ["国語", "算数", "理科", "社会", "ソフトボール"] as const;
export type Genre = (typeof GENRES)[number];

export type Question = {
  id: string;
  genre: Genre;
  stem: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  wrongFlag: boolean;
  lastAskedDate?: string;
  /** 直近で正解した日（JST YYYY-MM-DD）。あれば1か月後に自動削除 */
  lastCorrectAt?: string;
};

export type RewardTable = {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type Settings = {
  grade: string;
  term: string;
  rewards: RewardTable;
};

export type DailySession = {
  date: string;
  questionIds: string[];
  answers: (number | null)[];
  completed: boolean;
  earnedYen: number;
  rewardClaimed: boolean;
};

export type MasterItem = {
  id: string;
  name: string;
  points: number;
  category: string;
  icon: string;
};

export type PenaltyItem = {
  id: string;
  name: string;
  /** 負の数で保持（例: -50） */
  points: number;
  icon: string;
};

export type LogStatus = "pending" | "approved" | "penalty";

export type MoneyLog = {
  id: number;
  itemName: string;
  points: number;
  status: LogStatus;
  date: string;
};

export type AppState = {
  settings: Settings;
  questions: Question[];
  unpaidYen: number;
  session: DailySession | null;
  choreCategories: string[];
  masterItems: MasterItem[];
  penaltyItems: PenaltyItem[];
  logs: MoneyLog[];
};

export const ADMIN_DEMO_PASSWORD = "papa";
export const STORAGE_KEY = "okodukai-demo-v3";
