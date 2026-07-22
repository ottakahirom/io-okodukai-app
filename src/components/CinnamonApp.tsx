"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { approvedTotal } from "@/lib/store";
import { ADMIN_DEMO_PASSWORD } from "@/lib/types";
import { useDemoStore } from "@/lib/useDemoStore";
import type { MasterItem, MoneyLog } from "@/lib/types";

type PageId = "dashboard" | "papa";
type OverlayKind = "success" | "pending" | "danger";

const PAPA_SESSION_KEY = "okodukai-papa";

declare global {
  interface Window {
    confetti?: (opts: Record<string, unknown>) => void;
    Chart?: new (
      ctx: CanvasRenderingContext2D,
      config: Record<string, unknown>,
    ) => { destroy: () => void };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.body.appendChild(s);
  });
}

export function CinnamonApp() {
  const {
    state,
    ready,
    answer,
    claimQuiz,
    applyChore,
    addPenalty,
    approve,
    reject,
  } = useDemoStore();

  const [page, setPage] = useState<PageId>("dashboard");
  const [papaAuthed, setPapaAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [penaltyId, setPenaltyId] = useState("");
  const [strategy, setStrategy] = useState<string>("all");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [overlay, setOverlay] = useState<{
    text: string;
    kind: OverlayKind;
  } | null>(null);
  const [shake, setShake] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(PAPA_SESSION_KEY) === "1") setPapaAuthed(true);
  }, []);

  useEffect(() => {
    if (state?.penaltyItems[0] && !penaltyId) {
      setPenaltyId(state.penaltyItems[0].id);
    }
  }, [state, penaltyId]);

  useEffect(() => {
    void Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/chart.js"),
      loadScript(
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js",
      ),
    ])
      .then(() => setScriptsReady(true))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (page !== "dashboard" || !scriptsReady || !chartRef.current || !window.Chart) {
      return;
    }
    const chartTotal = state ? approvedTotal(state.logs) : 70;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    chartInstance.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "1月",
          "2月",
          "3月",
          "4月",
          "5月",
          "6月",
          "7月",
          "8月",
          "9月",
          "10月",
          "11月",
          "12月",
        ],
        datasets: [
          {
            label: "たまったお小遣い",
            data: [1200, 1550, 950, 1800, 2100, 1400, chartTotal, 0, 0, 0, 0, 0],
            borderColor: "#8ccbfd",
            backgroundColor: "rgba(140, 203, 253, 0.15)",
            borderWidth: 4,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    });
  }, [page, state, scriptsReady]);

  const showOverlay = (text: string, kind: OverlayKind, ms = 2000) => {
    setOverlay({ text, kind });
    if (kind === "danger") setShake(true);
    if (kind === "success" && window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#8ccbfd", "#ffb7c5", "#ffffff"],
      });
    }
    window.setTimeout(() => {
      setOverlay(null);
      setShake(false);
    }, ms);
  };

  const session = state?.session;
  const currentIndex = session?.answers.findIndex((a) => a === null) ?? -1;
  const currentQuestion =
    state && session && currentIndex >= 0
      ? state.questions.find((q) => q.id === session.questionIds[currentIndex])
      : null;

  const correctN = useMemo(() => {
    if (!state?.session) return 0;
    return state.session.answers.reduce<number>((acc, a, i) => {
      const q = state.questions.find((x) => x.id === state.session!.questionIds[i]);
      return acc + (q && a !== null && a === q.correctIndex ? 1 : 0);
    }, 0);
  }, [state]);

  const aiTip = useMemo(() => {
    if (!state) return "";
    const done = new Set(
      state.logs
        .filter((l) => l.status !== "penalty")
        .map((l) => l.itemName.replace(/^[^\s]+\s/, "").trim()),
    );
    const unperformed = state.masterItems.filter((m) => !done.has(m.name));
    if (unperformed.length === 0) {
      return "すごい！今月すべてのお手伝いにチャレンジしたよ！この調子で続けよう♪";
    }
    const tip = unperformed[Math.floor(Math.random() * unperformed.length)];
    return `今月はまだ ${tip.icon}${tip.name} をしていないよ！これを手伝って、お小遣いをあと ${tip.points}円 増やしちゃおう！`;
  }, [state]);

  if (!ready || !state || !session) {
    return (
      <div className={`cin-body ${shake ? "shake-effect" : ""}`}>
        <div className="cin-container">
          <p className="cin-muted">よみこみ中…</p>
        </div>
      </div>
    );
  }

  const total = approvedTotal(state.logs);
  const quizTotal = session.questionIds.length;
  const doneCount = session.answers.filter((a) => a !== null).length;
  const filteredItems =
    strategy === "all"
      ? state.masterItems
      : state.masterItems.filter((i) => i.category === strategy);
  const pendings = state.logs.filter((l) => l.status === "pending");
  const selectedPenalty =
    state.penaltyItems.find((p) => p.id === penaltyId) ?? state.penaltyItems[0];

  const onChoose = (i: number) => {
    if (!currentQuestion || feedback !== "idle") return;
    setPicked(i);
    const ok = i === currentQuestion.correctIndex;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) showOverlay("⭕ せいかい！その調子！", "pending", 1000);
    else
      showOverlay(
        `❌ ぶっぶー！正解は ${["ア", "イ", "ウ", "エ"][currentQuestion.correctIndex]} でした`,
        "danger",
        1200,
      );
  };

  const onNext = () => {
    if (picked === null) return;
    answer(picked);
    setPicked(null);
    setFeedback("idle");
  };

  const tapApplyChore = (item: MasterItem) => {
    applyChore(`${item.icon} ${item.name}`, item.points);
    showOverlay(
      `📬 ${item.name}（+${item.points}円）を\nパパにしんせいしたよ！`,
      "pending",
      2000,
    );
  };

  const statusLabel = (log: MoneyLog) => {
    if (log.status === "approved") return "おっけー！";
    if (log.status === "pending") return "まってるよ";
    return "確定";
  };

  const logoutPapa = () => {
    sessionStorage.removeItem(PAPA_SESSION_KEY);
    setPapaAuthed(false);
    setPassword("");
  };

  return (
    <div className={`cin-body ${shake ? "shake-effect" : ""}`} id="body-element">
      <div className="cin-container">
        <div className="cin-app-header">
          <span className="cin-float">☁️</span> 衣緒のおこづかい帳{" "}
          <span className="cin-float">🥖</span>
        </div>

        <div className="cin-nav-tabs">
          <button
            type="button"
            className={page === "dashboard" ? "cin-nav-tab active" : "cin-nav-tab"}
            onClick={() => setPage("dashboard")}
          >
            🏠 おうち画面
          </button>
          <button
            type="button"
            className={page === "papa" ? "cin-nav-tab active" : "cin-nav-tab"}
            onClick={() => setPage("papa")}
          >
            👨 パパ管理画面
          </button>
        </div>

        {page === "dashboard" && (
          <div className="cin-page">
            {!session.rewardClaimed && (
              <div className="cin-quiz">
                <div className="cin-quiz-header">
                  <div className="cin-quiz-title">📝 今日のまいにちクイズ</div>
                  <div className="cin-quiz-progress">
                    {session.completed
                      ? "おしまい！"
                      : quizTotal === 0
                        ? "じゅんび中"
                        : `${doneCount + 1} / ${quizTotal} 問目`}
                  </div>
                </div>

                {quizTotal === 0 && (
                  <p className="cin-muted">まだ問題のじゅんび中だよ</p>
                )}

                {!session.completed && currentQuestion && (
                  <>
                    <div className="cin-quiz-question">
                      【{currentQuestion.genre}】 {currentQuestion.stem}
                    </div>
                    <div className="cin-quiz-options">
                      {currentQuestion.choices.map((c, i) => {
                        let cls = "cin-quiz-opt";
                        if (feedback !== "idle") {
                          if (i === currentQuestion.correctIndex) cls += " is-correct";
                          else if (i === picked) cls += " is-wrong";
                          else cls += " is-dim";
                        }
                        return (
                          <button
                            key={i}
                            type="button"
                            className={cls}
                            disabled={feedback !== "idle"}
                            onClick={() => onChoose(i)}
                          >
                            {i + 1}. {c}
                          </button>
                        );
                      })}
                    </div>
                    {feedback !== "idle" && (
                      <button type="button" className="cin-btn-submit" onClick={onNext}>
                        つぎへ
                      </button>
                    )}
                  </>
                )}

                {session.completed && quizTotal > 0 && (
                  <div className="cin-quiz-result">
                    <div
                      className={
                        session.earnedYen > 0
                          ? "cin-quiz-result-msg ok"
                          : "cin-quiz-result-msg ng"
                      }
                    >
                      {session.earnedYen > 0
                        ? `🎉 ${quizTotal}もん中 ${correctN}もんせいかい！ ${session.earnedYen}円ゲットできるよ`
                        : `😢 ${quizTotal}もん中 ${correctN}もんせいかい。あしたまたがんばろう！`}
                    </div>
                    {session.earnedYen > 0 && (
                      <button
                        type="button"
                        className="cin-btn-submit"
                        onClick={() => {
                          claimQuiz();
                          showOverlay(
                            `📬 クイズのごほうび${session.earnedYen}円を\nパパに申請したよ！`,
                            "pending",
                            2200,
                          );
                        }}
                      >
                        パパにお小遣いをしんせいする！💰
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="cin-amount-card">
              <div className="cin-amount-title">🧁 今月末にもらえるお小遣い 🧁</div>
              <div className="cin-amount-value">
                <span>{total}</span> 円
              </div>
              <div className="cin-amount-note">
                パパが「いいよ」って言った合計だよ！
              </div>
            </div>

            <div className="cin-ai-box">{aiTip}</div>

            <h3 className="cin-h3">🎯 今日は何で稼ごうかな？</h3>
            <p className="cin-tap-hint">タッチするとパパにしんせいできるよ</p>
            <div className="cin-strategy">
              <div className="cin-strategy-tabs">
                <button
                  type="button"
                  className={
                    strategy === "all" ? "cin-strategy-tag active" : "cin-strategy-tag"
                  }
                  onClick={() => setStrategy("all")}
                >
                  ぜんぶ
                </button>
                {state.choreCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={
                      strategy === cat ? "cin-strategy-tag active" : "cin-strategy-tag"
                    }
                    onClick={() => setStrategy(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="cin-strategy-list">
                {filteredItems.length === 0 && (
                  <p className="cin-muted">このカテゴリのお手伝いはまだないよ</p>
                )}
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="cin-strategy-card is-tappable"
                    onClick={() => tapApplyChore(item)}
                  >
                    <div className="cin-strategy-name">
                      {item.icon} {item.name}
                    </div>
                    <div className="cin-strategy-points">+{item.points}円</div>
                  </button>
                ))}
              </div>
            </div>

            <h3 className="cin-h3">🔹 お手伝いのきろく</h3>
            <div className="cin-history">
              {[...state.logs].reverse().map((log) => (
                <div key={log.id} className="cin-history-item">
                  <div className="cin-cell-main">
                    <div className="cin-item-name">{log.itemName}</div>
                    <div className="cin-item-date">{log.date}</div>
                  </div>
                  <div className="cin-cell-status">
                    <span className={`cin-badge ${log.status}`}>
                      {statusLabel(log)}
                    </span>
                  </div>
                  <div
                    className="cin-cell-points"
                    style={{ color: log.points > 0 ? "#4bcffa" : "#ff758f" }}
                  >
                    {log.points > 0 ? "+" : ""}
                    {log.points}円
                  </div>
                </div>
              ))}
            </div>

            <div className="cin-chart">
              <h3 className="cin-h3">🔹 1年間のグラフ</h3>
              <canvas ref={chartRef} />
            </div>
          </div>
        )}

        {page === "papa" && (
          <div className="cin-page">
            {!papaAuthed ? (
              <div className="cin-papa-login">
                <h2>パパ管理画面</h2>
                <p className="cin-muted">
                  デモ用パスワードは <code>papa</code>
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (password === ADMIN_DEMO_PASSWORD) {
                      sessionStorage.setItem(PAPA_SESSION_KEY, "1");
                      setPapaAuthed(true);
                      setLoginError("");
                      setPassword("");
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
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button type="submit" className="cin-btn-submit">
                    はいる
                  </button>
                </form>
                {loginError && <p className="cin-login-error">{loginError}</p>}
              </div>
            ) : (
              <div>
                <div className="cin-papa-toolbar">
                  <p className="cin-papa-title">
                    承認まち <strong>{pendings.length}</strong> 件
                  </p>
                  <button type="button" className="cin-logout" onClick={logoutPapa}>
                    ログアウト
                  </button>
                </div>

                <h3 className="cin-h3">📥 しんせいの承認</h3>
                <div className="cin-history">
                  {pendings.length === 0 && (
                    <p className="cin-empty">いまは承認まちはないよ！</p>
                  )}
                  {pendings.map((log) => (
                    <div key={log.id} className="cin-history-item">
                      <div className="cin-cell-main">
                        <strong>{log.itemName}</strong>
                        <div className="cin-pending-yen">
                          +{log.points}円のしんせい
                        </div>
                      </div>
                      <div className="cin-approve-btns">
                        <button
                          type="button"
                          className="cin-action ok"
                          onClick={() => {
                            approve(log.id);
                            showOverlay(
                              "🎉 おっけー！！\nおこづかいが増えたよ！✨",
                              "success",
                              2500,
                            );
                          }}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="cin-action ng"
                          onClick={() => {
                            reject(log.id);
                            showOverlay("❌ しんせいを却下しました", "danger", 1800);
                          }}
                        >
                          だめ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="cin-h3 cin-h3-danger">⚠️ ペナルティ登録</h3>
                {state.penaltyItems.length === 0 ? (
                  <p className="cin-empty">
                    ペナルティ項目がありません。管理ペインで追加してください。
                  </p>
                ) : (
                  <>
                    <div className="cin-form-group">
                      <select
                        value={selectedPenalty?.id ?? ""}
                        onChange={(e) => setPenaltyId(e.target.value)}
                      >
                        {state.penaltyItems.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.icon} {p.name} ({p.points}円)
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="cin-btn-submit cin-btn-danger"
                      onClick={() => {
                        if (!selectedPenalty) return;
                        addPenalty(
                          `${selectedPenalty.icon} ${selectedPenalty.name}`,
                          selectedPenalty.points,
                        );
                        showOverlay(
                          "⚡ ペナルティを登録しました\nつぎはがんばろうね",
                          "danger",
                          2000,
                        );
                      }}
                    >
                      ペナルティを決定する ⚡
                    </button>
                  </>
                )}

                <p className="cin-admin-link">
                  <Link href="/admin">⚙️ お小遣い管理ペイン（問題・報酬ルール）→</Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {overlay && (
        <div className="cin-overlay">
          <div className={`cin-animation-card kind-${overlay.kind}`}>
            <div className="cin-animation-text">{overlay.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
