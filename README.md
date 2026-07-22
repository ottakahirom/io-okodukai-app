# 衣緒のおこづかい帳

お手伝いでお小遣いを稼ぎ、その中に「まいにちクイズ」を埋め込んだ Next.js アプリです。

## 起動

```bash
npm install
npm run dev
```

- おうち画面: http://localhost:3000
- 管理ペイン: http://localhost:3000/admin（`ADMIN_PASSWORD` でログイン）

## Neon（DB）接続

1. [Neon](https://console.neon.tech/) でプロジェクトを作成し、接続文字列をコピー
2. `.env.example` をコピーして `.env.local` を作成
3. `DATABASE_URL=` に接続文字列を貼る
4. テーブル作成:

```bash
npm run db:push
```

5. `npm run dev` を再起動

接続できていると管理ペインに「Neon接続中」と出ます。未設定時は自動で localStorage にフォールバックします。

## できること

- おうち画面でお手伝いをタッチ申請
- パパ管理画面で承認 / 却下 / ペナルティ
- 管理ペインでクイズ・お手伝い・ペナルティ・報酬ルール
- 正解済みクイズは30日で自動削除
