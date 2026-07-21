"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/useDemoStore";

const GENRE_COLOR: Record<string, string> = {
  国語: "#e8792b",
  算数: "#2a6fdb",
  理科: "#1a9b6c",
  社会: "#c45c26",
  ソフトボール: "#0d8a8a",
};

export function ChildQuiz() {
  const { state, ready, answer } = useDemoStore();
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [picked, setPicked] = useState<number | null>(null);

  const session = state?.session;
  const currentIndex = useMemo(() => {
    if (!session) return -1;
    return session.answers.findIndex((a) => a === null);
  }, [session]);

  const currentQuestion = useMemo(() => {
    if (!state || !session || currentIndex < 0) return null;
    const id = session.questionIds[currentIndex];
    return state.questions.find((q) => q.id === id) ?? null;
  }, [state, session, currentIndex]);

  if (!ready || !state || !session) {
    return (
      <div className="screen">
        <p className="muted">よみこみ中…</p>
      </div>
    );
  }

  const total = session.questionIds.length;
  const doneCount = session.answers.filter((a) => a !== null).length;

  if (total === 0) {
    return (
      <div className="screen">
        <header className="topbar">
          <p className="brand">まいにちクイズ</p>
          <span className="demo-badge">デモ</span>
        </header>
        <main className="panel empty">
          <h1>まだ問題のじゅんび中</h1>
          <p>パパが問題を追加するまで待ってね。</p>
          <Link className="text-link" href="/admin">
            おうちのひとへ（かんり画面）
          </Link>
        </main>
      </div>
    );
  }

  if (session.completed) {
    const correct = session.answers.reduce((acc, a, i) => {
      const q = state.questions.find((x) => x.id === session.questionIds[i]);
      return acc + (q && a === q.correctIndex ? 1 : 0);
    }, 0);

    return (
      <div className="screen">
        <header className="topbar">
          <p className="brand">まいにちクイズ</p>
          <span className="demo-badge">デモ</span>
        </header>
        <main className="panel result">
          <p className="eyebrow">きょうのクイズ</p>
          <h1>今日の問題はおわったよ</h1>
          <p className="score">
            {total}もん中 <strong>{correct}</strong> もんせいかい
          </p>
          <div className="yen-card">
            <span>ゲット</span>
            <strong>{session.earnedYen}円</strong>
          </div>
          <p className="muted">みはらいごうけい {state.unpaidYen}円</p>
          <p className="muted small">あしたの 0:00（日本時間）にリセットされます</p>
          <Link className="text-link" href="/admin">
            かんり画面（パパ用）
          </Link>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="screen">
        <p className="muted">よみこみ中…</p>
      </div>
    );
  }

  const onChoose = (i: number) => {
    if (feedback !== "idle") return;
    setPicked(i);
    const ok = i === currentQuestion.correctIndex;
    setFeedback(ok ? "correct" : "wrong");
  };

  const onNext = () => {
    if (picked === null) return;
    answer(picked);
    setPicked(null);
    setFeedback("idle");
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="brand">まいにちクイズ</p>
          <p className="sub">
            {state.settings.grade}・{state.settings.term}
          </p>
        </div>
        <span className="demo-badge">デモ</span>
      </header>

      <div className="progress" aria-hidden>
        <div
          className="progress-bar"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>
      <p className="progress-label">
        {doneCount + 1} / {total} もんめ
      </p>

      <main className="panel quiz">
        <span
          className="genre-pill"
          style={{ background: GENRE_COLOR[currentQuestion.genre] ?? "#555" }}
        >
          {currentQuestion.genre}
        </span>
        <h1 className="stem">{currentQuestion.stem}</h1>

        <ul className="choices">
          {currentQuestion.choices.map((c, i) => {
            let cls = "choice";
            if (feedback !== "idle") {
              if (i === currentQuestion.correctIndex) cls += " is-correct";
              else if (i === picked) cls += " is-wrong";
              else cls += " is-dim";
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  className={cls}
                  onClick={() => onChoose(i)}
                  disabled={feedback !== "idle"}
                >
                  <span className="choice-index">{["ア", "イ", "ウ", "エ"][i]}</span>
                  <span>{c}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {feedback !== "idle" && (
          <div className={`feedback ${feedback}`}>
            <p>{feedback === "correct" ? "せいかい！" : "ざんねん…正解はハイライトだよ"}</p>
            <button type="button" className="primary" onClick={onNext}>
              つぎへ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
