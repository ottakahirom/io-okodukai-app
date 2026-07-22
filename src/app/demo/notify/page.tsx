"use client";

import Link from "next/link";

/** 子供通知デモの手順ページ */
export default function NotifyDemoPage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "24px 16px 48px",
        fontFamily: '"Zen Maru Gothic", sans-serif',
        color: "#334155",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: "1.35rem" }}>子供スマホ通知デモ</h1>
      <p>
        パパ側で承認・ペナルティしても、パパ画面にはアニメは出ません。子供が
        「おうち画面」を開いている端末だけに通知アニメが出ます。
      </p>
      <ol>
        <li>
          <strong>子供用</strong>：下のリンクをスマホで開き、そのまま「おうち画面」を表示しておく
        </li>
        <li>
          <strong>パパ用</strong>：別端末（またはPC）で同じアプリを開き、「パパ管理画面」で承認やペナルティ
        </li>
        <li>数秒以内に、子供側にお祝い／ペナルティのアニメが出る</li>
      </ol>
      <p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "12px 18px",
            background: "#8ccbfd",
            color: "#0f172a",
            borderRadius: 999,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          おうち画面を開く →
        </Link>
      </p>
      <p style={{ fontSize: 13, color: "#64748b" }}>
        同じ端末だけで試す場合：パパ管理で操作 → 「おうち画面」タブに戻ると通知が出ます。
      </p>
    </main>
  );
}
