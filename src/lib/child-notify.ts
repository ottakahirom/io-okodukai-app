/** 子供端末で「もう見た」お小遣いログID（通知アニメ用） */
const SEEN_LOGS_KEY = "okodukai-seen-money-logs";

export function readSeenLogIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_LOGS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr.filter((n) => typeof n === "number"));
  } catch {
    return new Set();
  }
}

export function writeSeenLogIds(ids: Set<number>) {
  localStorage.setItem(SEEN_LOGS_KEY, JSON.stringify([...ids]));
}

export function markLogsSeen(ids: number[]) {
  const seen = readSeenLogIds();
  for (const id of ids) seen.add(id);
  writeSeenLogIds(seen);
}
