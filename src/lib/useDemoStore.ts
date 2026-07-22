"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkDatabaseConfigured,
  fetchAppStateAction,
  persistAppStateAction,
} from "@/lib/actions";
import {
  addChoreCategory,
  answerQuestion,
  approveLog,
  claimQuizReward,
  deleteChoreCategory,
  deleteMasterItem,
  deletePenaltyItem,
  deleteQuestion,
  ensureTodaySession,
  loadState,
  rejectLog,
  resetState,
  saveState,
  settleUnpaid,
  submitChoreApplication,
  submitPenalty,
  updateSettings,
  upsertMasterItem,
  upsertPenaltyItem,
  upsertQuestion,
} from "./store";
import type {
  AppState,
  MasterItem,
  PenaltyItem,
  Question,
  Settings,
} from "./types";

export function useDemoStore() {
  const [state, setState] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);
  const [storageMode, setStorageMode] = useState<"neon" | "local">("local");
  const [dbError, setDbError] = useState<string | null>(null);
  const modeRef = useRef<"neon" | "local">("local");

  const persist = useCallback(async (next: AppState) => {
    if (modeRef.current === "neon") {
      const res = await persistAppStateAction(next);
      if (!res.ok) {
        setDbError(res.error ?? "保存に失敗しました");
        // フォールバックでローカルにも残す
        saveState(next);
      }
    } else {
      saveState(next);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configured = await checkDatabaseConfigured();
      if (configured) {
        const res = await fetchAppStateAction();
        if (!cancelled && res.ok && res.state) {
          modeRef.current = "neon";
          setStorageMode("neon");
          setState(res.state);
          setReady(true);
          setDbError(null);
          return;
        }
        if (!cancelled && res.error) {
          setDbError(res.error);
        }
      }
      if (cancelled) return;
      modeRef.current = "local";
      setStorageMode("local");
      const loaded = ensureTodaySession(loadState());
      saveState(loaded);
      setState(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback(
    (fn: (prev: AppState) => AppState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const answer = useCallback(
    (choiceIndex: number) => patch((s) => answerQuestion(s, choiceIndex)),
    [patch],
  );

  const claimQuiz = useCallback(() => patch(claimQuizReward), [patch]);

  const applyChore = useCallback(
    (itemName: string, points: number) =>
      patch((s) => submitChoreApplication(s, itemName, points)),
    [patch],
  );

  const addPenalty = useCallback(
    (itemName: string, points: number) =>
      patch((s) => submitPenalty(s, itemName, points)),
    [patch],
  );

  const approve = useCallback(
    (id: number) => patch((s) => approveLog(s, id)),
    [patch],
  );

  const reject = useCallback(
    (id: number) => patch((s) => rejectLog(s, id)),
    [patch],
  );

  const saveSettings = useCallback(
    (settings: Settings) => patch((s) => updateSettings(s, settings)),
    [patch],
  );

  const settle = useCallback(() => patch(settleUnpaid), [patch]);

  const saveQuestion = useCallback(
    (q: Question) => patch((s) => upsertQuestion(s, q)),
    [patch],
  );

  const removeQuestion = useCallback(
    (id: string) => patch((s) => deleteQuestion(s, id)),
    [patch],
  );

  const saveMasterItem = useCallback(
    (item: MasterItem) => patch((s) => upsertMasterItem(s, item)),
    [patch],
  );

  const removeMasterItem = useCallback(
    (id: string) => patch((s) => deleteMasterItem(s, id)),
    [patch],
  );

  const createCategory = useCallback(
    (name: string) => patch((s) => addChoreCategory(s, name)),
    [patch],
  );

  const removeCategory = useCallback((name: string): string | undefined => {
    let error: string | undefined;
    setState((prev) => {
      if (!prev) return prev;
      const result = deleteChoreCategory(prev, name);
      error = result.error;
      if (!result.error) void persist(result.state);
      return result.error ? prev : result.state;
    });
    return error;
  }, [persist]);

  const savePenaltyItem = useCallback(
    (item: PenaltyItem) => patch((s) => upsertPenaltyItem(s, item)),
    [patch],
  );

  const removePenaltyItem = useCallback(
    (id: string) => patch((s) => deletePenaltyItem(s, id)),
    [patch],
  );

  const reset = useCallback(() => {
    const next = ensureTodaySession(resetState());
    void persist(next);
    setState(next);
  }, [persist]);

  const refreshSession = useCallback(() => {
    patch((prev) => ensureTodaySession({ ...prev, session: null }));
  }, [patch]);

  return {
    state,
    ready,
    storageMode,
    dbError,
    answer,
    claimQuiz,
    applyChore,
    addPenalty,
    approve,
    reject,
    saveSettings,
    settle,
    saveQuestion,
    removeQuestion,
    saveMasterItem,
    removeMasterItem,
    createCategory,
    removeCategory,
    savePenaltyItem,
    removePenaltyItem,
    reset,
    refreshSession,
  };
}
