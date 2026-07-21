"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  approvedTotal,
  daysUntilCorrectExpiry,
  newMasterId,
  newPenaltyId,
  newQuestionId,
} from "@/lib/store";
import type {
  Genre,
  MasterItem,
  PenaltyItem,
  Question,
  Settings,
} from "@/lib/types";
import { ADMIN_DEMO_PASSWORD, GENRES } from "@/lib/types";
import { useDemoStore } from "@/lib/useDemoStore";

type ViewId = "dash" | "quiz-mgr" | "chore-mgr" | "penalty-mgr" | "rule-mgr";

const MENU: { id: ViewId; label: string; short: string }[] = [
  { id: "dash", label: "📊 ダッシュボード", short: "📊 状況" },
  { id: "quiz-mgr", label: "📝 クイズ問題管理", short: "📝 クイズ" },
  { id: "chore-mgr", label: "🧹 お手伝い管理", short: "🧹 手伝い" },
  { id: "penalty-mgr", label: "⚠️ ペナルティ管理", short: "⚠️ 減点" },
  { id: "rule-mgr", label: "💰 報酬ルール設定", short: "💰 報酬" },
];

function logoutAdmin() {
  sessionStorage.removeItem("okodukai-admin");
}

const emptyChore = (category: string): MasterItem => ({
  id: newMasterId(),
  name: "",
  points: 50,
  category,
  icon: "✨",
});

const emptyPenalty = (): PenaltyItem => ({
  id: newPenaltyId(),
  name: "",
  points: -50,
  icon: "⚠️",
});

export function AdminPanel() {
  const {
    state,
    ready,
    storageMode,
    dbError,
    saveSettings,
    saveQuestion,
    saveMasterItem,
    removeMasterItem,
    createCategory,
    removeCategory,
    savePenaltyItem,
    removePenaltyItem,
    reset,
  } = useDemoStore();

  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState<ViewId>("dash");
  const [flash, setFlash] = useState("");

  const [subject, setSubject] = useState<Genre>("国語");
  const [qText, setQText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);

  const [rule5, setRule5] = useState(50);
  const [rule4, setRule4] = useState(30);

  const [newCategory, setNewCategory] = useState("");
  const [choreFilter, setChoreFilter] = useState<string>("all");
  const [quizFilter, setQuizFilter] = useState<"all" | Genre>("all");
  const [editingChore, setEditingChore] = useState<MasterItem | null>(null);
  const [editingPenalty, setEditingPenalty] = useState<PenaltyItem | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("okodukai-admin") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!state) return;
    setRule5(state.settings.rewards[5]);
    setRule4(state.settings.rewards[4]);
  }, [state]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2200);
  };

  const rewardSummary = useMemo(() => {
    if (!state) return "—";
    const r = state.settings.rewards;
    return `5問: ${r[5]}円 / 4問: ${r[4]}円`;
  }, [state]);

  if (!ready || !state) {
    return (
      <div className="mgr-login-wrap">
        <p>よみこみ中…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mgr-login-wrap">
        <div className="mgr-login-card">
          <h1>⚙️ お小遣い管理ペイン</h1>
          <p className="mgr-muted">
            デモ用パスワードは <code>papa</code>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password === ADMIN_DEMO_PASSWORD) {
                sessionStorage.setItem("okodukai-admin", "1");
                setAuthed(true);
                setLoginError("");
              } else {
                setLoginError("パスワードが違います");
              }
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoFocus
            />
            <button type="submit">はいる</button>
          </form>
          {loginError && <p className="mgr-error">{loginError}</p>}
          <Link href="/" className="mgr-back">
            ← おうち画面へ
          </Link>
        </div>
      </div>
    );
  }

  const addQuiz = () => {
    if (!qText.trim() || !opts[0].trim()) {
      alert("問題と正解（選択肢1）は必ず入力してね！");
      return;
    }
    if (opts.some((o) => !o.trim())) {
      alert("選択肢は4つすべて入力してね！");
      return;
    }
    const question: Question = {
      id: newQuestionId(),
      genre: subject,
      stem: qText.trim(),
      choices: [opts[0], opts[1], opts[2], opts[3]] as Question["choices"],
      correctIndex: 0,
      wrongFlag: false,
    };
    saveQuestion(question);
    setQText("");
    setOpts(["", "", "", ""]);
    showFlash("問題をプールに保存しました");
  };

  const saveRules = () => {
    const next: Settings = {
      ...state.settings,
      rewards: {
        ...state.settings.rewards,
        5: Number(rule5) || 0,
        4: Number(rule4) || 0,
      },
    };
    saveSettings(next);
    showFlash(`配当ルールを【5問: ${rule5}円 / 4問: ${rule4}円】に更新しました`);
  };

  const defaultCategory = state.choreCategories[0] ?? "おてつだい";

  const filteredChores =
    choreFilter === "all"
      ? state.masterItems
      : state.masterItems.filter((m) => m.category === choreFilter);

  const filteredQuizzes =
    quizFilter === "all"
      ? state.questions
      : state.questions.filter((q) => q.genre === quizFilter);

  const storageLabel =
    storageMode === "neon" ? "Neon接続中" : "localStorage（デモ）";

  const renderShell = () => (
    <div className="mgr-shell">
      <header className="mgr-mobile-bar">
        <div className="mgr-mobile-bar-top">
          <div className="mgr-brand mgr-brand-mobile">⚙️ 管理ペイン</div>
          <div className="mgr-mobile-actions">
            <span className="mgr-storage-hint">{storageLabel}</span>
            <Link href="/">おうち</Link>
            <button
              type="button"
              className="mgr-link-btn"
              onClick={() => {
                logoutAdmin();
                setAuthed(false);
              }}
            >
              退出
            </button>
          </div>
        </div>
        <nav className="mgr-mobile-tabs" aria-label="管理メニュー">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                view === item.id ? "mgr-mobile-tab active" : "mgr-mobile-tab"
              }
              onClick={() => {
                setView(item.id);
                setEditingChore(null);
                setEditingPenalty(null);
              }}
            >
              {item.short}
            </button>
          ))}
        </nav>
      </header>

      <aside className="mgr-sidebar">
        <div className="mgr-brand">⚙️ お小遣い管理ペイン</div>
        <ul className="mgr-menu">
          {MENU.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  view === item.id ? "mgr-sidebar-item active" : "mgr-sidebar-item"
                }
                onClick={() => {
                  setView(item.id);
                  setEditingChore(null);
                  setEditingPenalty(null);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mgr-sidebar-foot">
          <p className="mgr-storage-hint">
            {storageLabel}
            {dbError ? ` · ${dbError}` : ""}
          </p>
          <Link href="/">おうち画面へ</Link>
          <button
            type="button"
            className="mgr-link-btn"
            onClick={() => {
              logoutAdmin();
              setAuthed(false);
            }}
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main className="mgr-main">
        {flash && <div className="mgr-flash">{flash}</div>}

        {view === "dash" && (
          <section className="mgr-view">
            <h2>📊 システム状況</h2>
            <div className="mgr-grid-3">
              <div className="mgr-card">
                <div>今月の娘の獲得お小遣い</div>
                <div className="mgr-stat-num">{approvedTotal(state.logs)} 円</div>
              </div>
              <div className="mgr-card">
                <div>登録済みのクイズ総数</div>
                <div className="mgr-stat-num">{state.questions.length} 問</div>
              </div>
              <div className="mgr-card">
                <div>現在の配当ルール</div>
                <div className="mgr-stat-rule">{rewardSummary}</div>
              </div>
            </div>
            <div className="mgr-grid-3">
              <div className="mgr-card">
                <div>お手伝いメニュー</div>
                <div className="mgr-stat-num">{state.masterItems.length} 件</div>
              </div>
              <div className="mgr-card">
                <div>ペナルティ項目</div>
                <div className="mgr-stat-num">{state.penaltyItems.length} 件</div>
              </div>
              <div className="mgr-card">
                <div>承認待ちの申請</div>
                <div className="mgr-stat-num">
                  {state.logs.filter((l) => l.status === "pending").length} 件
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mgr-btn-ghost"
              onClick={() => {
                if (confirm("デモデータを初期化しますか？")) {
                  reset();
                  showFlash("初期化しました");
                }
              }}
            >
              デモデータ初期化
            </button>
          </section>
        )}

        {view === "quiz-mgr" && (
          <section className="mgr-view">
            <h2>📝 クイズ問題の管理・登録</h2>
            <div className="mgr-card" style={{ marginBottom: 25 }}>
              <h3>✨ 新しい問題を追加する</h3>
              <div className="mgr-form-2">
                <div className="mgr-form-group">
                  <label htmlFor="q-subject">教科・ジャンル</label>
                  <select
                    id="q-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as Genre)}
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mgr-form-group">
                  <label htmlFor="q-text">問題文</label>
                  <input
                    id="q-text"
                    type="text"
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="例: 1リットルは何ミリリットル？"
                  />
                </div>
              </div>
              <div className="mgr-form-4">
                {opts.map((o, i) => (
                  <div className="mgr-form-group" key={i}>
                    <label htmlFor={`q-opt${i}`}>
                      選択肢 {i + 1}
                      {i === 0 ? " (正解)" : ""}
                    </label>
                    <input
                      id={`q-opt${i}`}
                      type="text"
                      value={o}
                      onChange={(e) => {
                        const next = [...opts];
                        next[i] = e.target.value;
                        setOpts(next);
                      }}
                      placeholder={i === 0 ? "正解を入力" : "ハズレ"}
                    />
                  </div>
                ))}
              </div>
              <button type="button" onClick={addQuiz} style={{ marginTop: 10 }}>
                問題をプールに保存する 💾
              </button>
            </div>

            <div className="mgr-card">
              <h3>📋 登録済み問題一覧</h3>
              <p className="mgr-muted" style={{ marginBottom: 8 }}>
                正解した問題は、最後に正解してから1か月（30日）で自動削除されます。
              </p>
              <div className="mgr-filter-tags">
                <button
                  type="button"
                  className={
                    quizFilter === "all"
                      ? "mgr-filter-tag active"
                      : "mgr-filter-tag"
                  }
                  onClick={() => setQuizFilter("all")}
                >
                  ぜんぶ
                  <span className="mgr-filter-count">
                    {state.questions.length}
                  </span>
                </button>
                {GENRES.map((g) => {
                  const count = state.questions.filter((q) => q.genre === g).length;
                  return (
                    <button
                      key={g}
                      type="button"
                      className={
                        quizFilter === g
                          ? "mgr-filter-tag active"
                          : "mgr-filter-tag"
                      }
                      onClick={() => setQuizFilter(g)}
                    >
                      {g}
                      <span className="mgr-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mgr-table-wrap mgr-desktop-only">
                <table className="mgr-table">
                  <thead>
                    <tr>
                      <th>ジャンル</th>
                      <th>問題内容</th>
                      <th>正解の選択肢</th>
                      <th>保存期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuizzes.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ color: "#64748b" }}>
                          このタグの問題はありません
                        </td>
                      </tr>
                    )}
                    {filteredQuizzes.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <span className="mgr-genre-pill">{q.genre}</span>
                        </td>
                        <td style={{ fontWeight: "bold" }}>{q.stem}</td>
                        <td className="mgr-ans">
                          ⭕ {q.choices[q.correctIndex]}
                        </td>
                        <td>
                          {q.lastCorrectAt ? (
                            <span className="mgr-expiry">
                              正解済・残り
                              {daysUntilCorrectExpiry(q.lastCorrectAt)}日
                            </span>
                          ) : (
                            <span className="mgr-muted">未正解（期限なし）</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mgr-item-cards mgr-mobile-only">
                {filteredQuizzes.length === 0 && (
                  <p className="mgr-muted">このタグの問題はありません</p>
                )}
                {filteredQuizzes.map((q) => (
                  <article key={q.id} className="mgr-item-card">
                    <span className="mgr-genre-pill">{q.genre}</span>
                    <p className="mgr-item-title">{q.stem}</p>
                    <p className="mgr-ans">⭕ {q.choices[q.correctIndex]}</p>
                    <p className="mgr-muted small">
                      {q.lastCorrectAt
                        ? `正解済・残り${daysUntilCorrectExpiry(q.lastCorrectAt)}日で削除`
                        : "未正解（期限なし）"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "chore-mgr" && (
          <section className="mgr-view">
            <h2>🧹 お手伝い管理</h2>

            <div className="mgr-card" style={{ marginBottom: 25 }}>
              <h3>📁 カテゴリ</h3>
              <div className="mgr-cat-list">
                {state.choreCategories.map((cat) => (
                  <span key={cat} className="mgr-cat-chip">
                    {cat}
                    <button
                      type="button"
                      className="mgr-chip-x"
                      onClick={() => {
                        const err = removeCategory(cat);
                        if (err) alert(err);
                        else {
                          if (choreFilter === cat) setChoreFilter("all");
                          showFlash(`カテゴリ「${cat}」を削除しました`);
                        }
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mgr-inline-add">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="新しいカテゴリ名"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCategory.trim()) return;
                    createCategory(newCategory.trim());
                    setNewCategory("");
                    showFlash("カテゴリを追加しました");
                  }}
                >
                  追加
                </button>
              </div>
            </div>

            <div className="mgr-card" style={{ marginBottom: 25 }}>
              <div className="mgr-card-head">
                <h3>{editingChore ? "✏️ お手伝いを編集" : "✨ お手伝いを追加"}</h3>
                {!editingChore && (
                  <button
                    type="button"
                    onClick={() => setEditingChore(emptyChore(defaultCategory))}
                  >
                    ＋ 新規
                  </button>
                )}
              </div>

              {editingChore && (
                <>
                  <div className="mgr-form-2">
                    <div className="mgr-form-group">
                      <label>アイコン</label>
                      <input
                        type="text"
                        value={editingChore.icon}
                        onChange={(e) =>
                          setEditingChore({ ...editingChore, icon: e.target.value })
                        }
                      />
                    </div>
                    <div className="mgr-form-group">
                      <label>カテゴリ</label>
                      <select
                        value={editingChore.category}
                        onChange={(e) =>
                          setEditingChore({
                            ...editingChore,
                            category: e.target.value,
                          })
                        }
                      >
                        {state.choreCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mgr-form-group">
                      <label>名前</label>
                      <input
                        type="text"
                        value={editingChore.name}
                        onChange={(e) =>
                          setEditingChore({ ...editingChore, name: e.target.value })
                        }
                        placeholder="例: お風呂掃除"
                      />
                    </div>
                    <div className="mgr-form-group">
                      <label>金額（円）</label>
                      <input
                        type="number"
                        min={0}
                        value={editingChore.points}
                        onChange={(e) =>
                          setEditingChore({
                            ...editingChore,
                            points: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mgr-btn-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingChore.name.trim()) {
                          alert("名前を入力してね");
                          return;
                        }
                        saveMasterItem(editingChore);
                        setEditingChore(null);
                        showFlash("お手伝いを保存しました");
                      }}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="mgr-btn-ghost"
                      onClick={() => setEditingChore(null)}
                    >
                      キャンセル
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mgr-card">
              <h3>📋 お手伝い一覧</h3>
              <div className="mgr-filter-tags">
                <button
                  type="button"
                  className={
                    choreFilter === "all"
                      ? "mgr-filter-tag active"
                      : "mgr-filter-tag"
                  }
                  onClick={() => setChoreFilter("all")}
                >
                  ぜんぶ
                  <span className="mgr-filter-count">{state.masterItems.length}</span>
                </button>
                {state.choreCategories.map((cat) => {
                  const count = state.masterItems.filter(
                    (m) => m.category === cat,
                  ).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={
                        choreFilter === cat
                          ? "mgr-filter-tag active"
                          : "mgr-filter-tag"
                      }
                      onClick={() => setChoreFilter(cat)}
                    >
                      {cat}
                      <span className="mgr-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mgr-table-wrap mgr-desktop-only">
                <table className="mgr-table">
                  <thead>
                    <tr>
                      <th>カテゴリ</th>
                      <th>内容</th>
                      <th>金額</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChores.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ color: "#64748b" }}>
                          このタグのお手伝いはありません
                        </td>
                      </tr>
                    )}
                    {filteredChores.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="mgr-genre-pill">{item.category}</span>
                        </td>
                        <td style={{ fontWeight: "bold" }}>
                          {item.icon} {item.name}
                        </td>
                        <td className="mgr-ans">+{item.points}円</td>
                        <td>
                          <button
                            type="button"
                            className="mgr-table-btn"
                            onClick={() => setEditingChore({ ...item })}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="mgr-table-btn danger"
                            onClick={() => {
                              if (confirm(`「${item.name}」を削除しますか？`)) {
                                removeMasterItem(item.id);
                                showFlash("削除しました");
                              }
                            }}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mgr-item-cards mgr-mobile-only">
                {filteredChores.length === 0 && (
                  <p className="mgr-muted">このタグのお手伝いはありません</p>
                )}
                {filteredChores.map((item) => (
                  <article key={item.id} className="mgr-item-card">
                    <div className="mgr-item-card-top">
                      <span className="mgr-genre-pill">{item.category}</span>
                      <span className="mgr-ans">+{item.points}円</span>
                    </div>
                    <p className="mgr-item-title">
                      {item.icon} {item.name}
                    </p>
                    <div className="mgr-item-actions">
                      <button
                        type="button"
                        className="mgr-table-btn"
                        onClick={() => setEditingChore({ ...item })}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="mgr-table-btn danger"
                        onClick={() => {
                          if (confirm(`「${item.name}」を削除しますか？`)) {
                            removeMasterItem(item.id);
                            showFlash("削除しました");
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "penalty-mgr" && (
          <section className="mgr-view">
            <h2>⚠️ ペナルティ管理</h2>
            <div className="mgr-card" style={{ marginBottom: 25 }}>
              <div className="mgr-card-head">
                <h3>
                  {editingPenalty ? "✏️ ペナルティを編集" : "✨ ペナルティを追加"}
                </h3>
                {!editingPenalty && (
                  <button
                    type="button"
                    onClick={() => setEditingPenalty(emptyPenalty())}
                  >
                    ＋ 新規
                  </button>
                )}
              </div>
              {editingPenalty && (
                <>
                  <div className="mgr-form-2">
                    <div className="mgr-form-group">
                      <label>アイコン</label>
                      <input
                        type="text"
                        value={editingPenalty.icon}
                        onChange={(e) =>
                          setEditingPenalty({
                            ...editingPenalty,
                            icon: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="mgr-form-group">
                      <label>減る金額（円）</label>
                      <input
                        type="number"
                        min={1}
                        value={Math.abs(editingPenalty.points)}
                        onChange={(e) =>
                          setEditingPenalty({
                            ...editingPenalty,
                            points: -(Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                    <div className="mgr-form-group" style={{ gridColumn: "1 / -1" }}>
                      <label>内容</label>
                      <input
                        type="text"
                        value={editingPenalty.name}
                        onChange={(e) =>
                          setEditingPenalty({
                            ...editingPenalty,
                            name: e.target.value,
                          })
                        }
                        placeholder="例: 宿題をあしたに回した"
                      />
                    </div>
                  </div>
                  <div className="mgr-btn-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingPenalty.name.trim()) {
                          alert("内容を入力してね");
                          return;
                        }
                        savePenaltyItem(editingPenalty);
                        setEditingPenalty(null);
                        showFlash("ペナルティを保存しました");
                      }}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="mgr-btn-ghost"
                      onClick={() => setEditingPenalty(null)}
                    >
                      キャンセル
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mgr-card">
              <h3>📋 ペナルティ一覧</h3>
              <div className="mgr-table-wrap mgr-desktop-only">
                <table className="mgr-table">
                  <thead>
                    <tr>
                      <th>内容</th>
                      <th>金額</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.penaltyItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: "bold" }}>
                          {item.icon} {item.name}
                        </td>
                        <td style={{ color: "#dc2626", fontWeight: "bold" }}>
                          {item.points}円
                        </td>
                        <td>
                          <button
                            type="button"
                            className="mgr-table-btn"
                            onClick={() => setEditingPenalty({ ...item })}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="mgr-table-btn danger"
                            onClick={() => {
                              if (confirm(`「${item.name}」を削除しますか？`)) {
                                removePenaltyItem(item.id);
                                showFlash("削除しました");
                              }
                            }}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mgr-item-cards mgr-mobile-only">
                {state.penaltyItems.map((item) => (
                  <article key={item.id} className="mgr-item-card">
                    <div className="mgr-item-card-top">
                      <p className="mgr-item-title" style={{ margin: 0 }}>
                        {item.icon} {item.name}
                      </p>
                      <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                        {item.points}円
                      </span>
                    </div>
                    <div className="mgr-item-actions">
                      <button
                        type="button"
                        className="mgr-table-btn"
                        onClick={() => setEditingPenalty({ ...item })}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="mgr-table-btn danger"
                        onClick={() => {
                          if (confirm(`「${item.name}」を削除しますか？`)) {
                            removePenaltyItem(item.id);
                            showFlash("削除しました");
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "rule-mgr" && (
          <section className="mgr-view">
            <h2>💰 報酬ルール設定</h2>
            <div className="mgr-card" style={{ maxWidth: 500 }}>
              <p className="mgr-muted">
                まいにちクイズの正解数に応じたお小遣いの金額を設定します。
              </p>
              <div className="mgr-rule-row">
                <label htmlFor="rule-5">🎯 5問全問正解 :</label>
                <input
                  id="rule-5"
                  type="number"
                  min={0}
                  value={rule5}
                  onChange={(e) => setRule5(Number(e.target.value))}
                />
                <span className="mgr-yen">円</span>
              </div>
              <div className="mgr-rule-row">
                <label htmlFor="rule-4">✨ 4問正解 :</label>
                <input
                  id="rule-4"
                  type="number"
                  min={0}
                  value={rule4}
                  onChange={(e) => setRule4(Number(e.target.value))}
                />
                <span className="mgr-yen">円</span>
              </div>
              <button type="button" onClick={saveRules} style={{ marginTop: 15 }}>
                配当ルールを更新する 🔄
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );

  return renderShell();
}
