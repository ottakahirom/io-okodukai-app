import type {
  AppState,
  MasterItem,
  MoneyLog,
  PenaltyItem,
  Question,
} from "./types";

export const DEFAULT_REWARDS = {
  0: 0,
  1: 5,
  2: 10,
  3: 20,
  4: 30,
  5: 50,
} as const;

const seedQuestions: Question[] = [
  {
    id: "ja-1",
    genre: "国語",
    stem: "「あおぞら」の反対の意味のことばはどれ？",
    choices: ["曇り空", "夕焼け空", "星空", "夜空"],
    correctIndex: 0,
    wrongFlag: false,
  },
  {
    id: "ja-2",
    genre: "国語",
    stem: "主語と述語の組み合わせとして正しいものは？",
    choices: [
      "ねこが / ねむっている",
      "ねこが / あおい",
      "ねむっている / ねこが",
      "あおい / そらが",
    ],
    correctIndex: 0,
    wrongFlag: false,
  },
  {
    id: "ma-1",
    genre: "算数",
    stem: "1リットルは、何ミリリットル（ml）と同じ？",
    choices: ["10ml", "100ml", "1000ml", "10000ml"],
    correctIndex: 2,
    wrongFlag: false,
  },
  {
    id: "ma-2",
    genre: "算数",
    stem: "36 ÷ 6 はいくつ？",
    choices: ["4", "5", "6", "7"],
    correctIndex: 2,
    wrongFlag: false,
  },
  {
    id: "sc-1",
    genre: "理科",
    stem: "ひまわりの花は、どの季節にさく？",
    choices: ["春", "夏", "秋", "冬"],
    correctIndex: 1,
    wrongFlag: false,
  },
  {
    id: "sc-2",
    genre: "理科",
    stem: "水がこおると何になる？",
    choices: ["水蒸気", "氷", "雲", "湯気"],
    correctIndex: 1,
    wrongFlag: false,
  },
  {
    id: "so-1",
    genre: "社会",
    stem: "日本の国旗「日の丸」のまんなかの円の色は？",
    choices: ["黄色", "青色", "赤色", "黒色"],
    correctIndex: 2,
    wrongFlag: false,
  },
  {
    id: "so-2",
    genre: "社会",
    stem: "日本の首都はどこ？",
    choices: ["大阪", "京都", "東京", "名古屋"],
    correctIndex: 2,
    wrongFlag: false,
  },
  {
    id: "sb-1",
    genre: "ソフトボール",
    stem: "ピッチャーが投げたボールを、バッターが打たずにキャッチャーがノーバウンドで捕ったら？",
    choices: ["ボール", "ストライク", "アウト", "ヒット"],
    correctIndex: 1,
    wrongFlag: false,
  },
  {
    id: "sb-2",
    genre: "ソフトボール",
    stem: "アウトが3つそろうとどうなる？",
    choices: ["得点が2倍", "イニングが変わる", "試合終了", "ストライクからやり直し"],
    correctIndex: 1,
    wrongFlag: false,
  },
  {
    id: "sb-3",
    genre: "ソフトボール",
    stem: "ソフトボールで、打者が打席に立つ場所は？",
    choices: ["ピッチャーズプレート", "ホームベース", "ファーストベース", "ダッグアウト"],
    correctIndex: 1,
    wrongFlag: false,
  },
];

const choreCategories = ["おてつだい", "けいこ・れんしゅう"];

const masterItems: MasterItem[] = [
  { id: "c1", name: "お風呂掃除", points: 50, category: "おてつだい", icon: "🧼" },
  { id: "c2", name: "食器洗い", points: 70, category: "おてつだい", icon: "🍽️" },
  {
    id: "s1",
    name: "素振り50回（パパと）",
    points: 50,
    category: "けいこ・れんしゅう",
    icon: "⚾",
  },
  {
    id: "s2",
    name: "習い事で大活躍！",
    points: 300,
    category: "けいこ・れんしゅう",
    icon: "🏆",
  },
];

const penaltyItems: PenaltyItem[] = [
  { id: "p1", name: "宿題をあしたに回した", points: -50, icon: "📚" },
  { id: "p2", name: "夜22時すぎてもスマホを見た", points: -50, icon: "📱" },
];

const seedLogs: MoneyLog[] = [
  {
    id: 1,
    itemName: "🧼 お風呂掃除",
    points: 50,
    status: "approved",
    date: "2026-07-07",
  },
  {
    id: 2,
    itemName: "🍽️ 食器洗い",
    points: 70,
    status: "approved",
    date: "2026-07-08",
  },
  {
    id: 3,
    itemName: "📱 夜22時すぎてもスマホを見た",
    points: -50,
    status: "penalty",
    date: "2026-07-09",
  },
];

export function createInitialState(): AppState {
  return {
    settings: {
      grade: "小4",
      term: "1学期",
      rewards: { ...DEFAULT_REWARDS },
    },
    questions: seedQuestions.map((q) => ({
      ...q,
      choices: [...q.choices] as Question["choices"],
    })),
    unpaidYen: 0,
    session: null,
    choreCategories: [...choreCategories],
    masterItems: masterItems.map((m) => ({ ...m })),
    penaltyItems: penaltyItems.map((p) => ({ ...p })),
    logs: seedLogs.map((l) => ({ ...l })),
  };
}
